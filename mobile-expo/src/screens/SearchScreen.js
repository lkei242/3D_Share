// src/screens/SearchScreen.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs, limit, startAfter, where, documentId } from 'firebase/firestore';
import { db } from './config/firebase';
import { formatViews } from './config/formatViews';
import { auth } from './config/firebase';
import { getBlockedUids } from './config/userActions';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
// 🆕 SDK de Google AdMob para anuncios nativos
import mobileAds, {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  TestIds,
} from 'react-native-google-mobile-ads';

// 🆕 ID del bloque de anuncios "Nativo avanzado".
// Mientras probás, usa el ID de test de Google (TestIds.NATIVE).
// Cuando AdMob apruebe tu bloque real, reemplazá el string de producción.
const NATIVE_AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'; // TODO: poné aquí tu ID real

// 🆕 Cuántos anuncios nativos mantener precargados en memoria
const AD_POOL_TARGET = 4;

// 🆕 Genera un número entero al azar entre min y max (inclusive)
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 🆕 TEMPORAL PARA TESTING: bajá este rango mientras tengas pocos posts de prueba.
// Con 12-20 posts necesitás al menos ~14-22 posts cargados para ver un solo anuncio.
// Cuando tengas más contenido real, volvé a subirlo (ej: 12, 20).
const AD_GAP_MIN = 3;
const AD_GAP_MAX = 5;

// ============================================================
// 🆕 COMPONENTE: VideoPreview (autoplay muted, loop)
// ============================================================
const VideoPreview = React.memo(function VideoPreview({ uri, isVisible }) {
  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
  });

  useEffect(() => {
    if (isVisible) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible]);

  return (
    <VideoView
      player={player}
      style={styles.image}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      nativeControls={false}
    />
  );
});

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isDark = colors.text === '#FFFFFF';
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [blockedUids, setBlockedUids] = useState([]);
  const [visibleItems, setVisibleItems] = useState(new Set());

  // 🆕 Pool de anuncios nativos precargados. Usamos un ref para tener siempre
  // el valor más reciente dentro del efecto que construye la grilla, y un
  // contador (nativeAdsVersion) para forzar la reconstrucción cuando llega uno nuevo.
  const nativeAdsRef = useRef([]);
  const [nativeAdsVersion, setNativeAdsVersion] = useState(0);

  // 🆕 Cronograma de "gaps" (cada cuántos posts va un anuncio). Se genera una
  // sola vez y crece de forma perezosa, para que la posición de cada anuncio
  // sea siempre la misma aunque reconstruyamos toda la grilla varias veces.
  const adScheduleRef = useRef([]);
  const getScheduledGap = (idx) => {
    while (adScheduleRef.current.length <= idx) {
      adScheduleRef.current.push(randomBetween(AD_GAP_MIN, AD_GAP_MAX));
    }
    return adScheduleRef.current[idx];
  };
  const [gridRows, setGridRows] = useState([]);

  // 🆕 Pide un anuncio nativo nuevo a AdMob y lo agrega al pool
  const loadOneNativeAd = async () => {
    try {
      const ad = await NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: true, // TODO: ajustar según el consentimiento real del usuario (GDPR/ATT)
      });
      nativeAdsRef.current = [...nativeAdsRef.current, ad];
      setNativeAdsVersion((v) => v + 1);
    } catch (error) {
      console.log('[ADS] Error cargando anuncio nativo:', error);
    }
  };

  // 🆕 Inicializa el SDK de AdMob y precarga el pool de anuncios nativos
  useEffect(() => {
    mobileAds()
      .initialize()
      .then(() => {
        for (let i = 0; i < AD_POOL_TARGET; i++) {
          loadOneNativeAd();
        }
      })
      .catch((err) => console.log('[ADS] Error inicializando mobileAds():', err));

    return () => {
      // Importante: liberar los anuncios al desmontar para evitar memory leaks
      nativeAdsRef.current.forEach((ad) => ad.destroy && ad.destroy());
    };
  }, []);

  const fetchBlockedUsers = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const blocked = await getBlockedUids(user.uid);
    setBlockedUids(blocked);
  };

  const fetchPosts = async (reset = false) => {
    if (loading) return;
    if (!reset && !hasMore) return;
    setLoading(true);

    try {
      const postsRef = collection(db, 'posts');
      let q;

      if (reset) {
        q = query(postsRef, orderBy('createdAt', 'desc'), limit(30));
      } else if (lastVisible) {
        q = query(postsRef, orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(30));
      } else {
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(q);

      const authorUids = [...new Set(querySnapshot.docs.map(d => d.data().autor).filter(Boolean))];
      const authorsMap = {};

      if (authorUids.length > 0) {
        for (let i = 0; i < authorUids.length; i += 10) {
          const chunk = authorUids.slice(i, i + 10);
          const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const usersSnap = await getDocs(usersQuery);
          usersSnap.forEach(uDoc => {
            const d = uDoc.data();
            authorsMap[uDoc.id] = {
              profileName: d.profileName || d.username || 'Usuario',
              username: d.username || 'usuario',
              profilePicture: d.profilePicture || '',
            };
          });
        }
      }

      const list = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const authorInfo = authorsMap[data.autor] || { profileName: 'Usuario', username: 'usuario', profilePicture: '' };
        const mediaArray = data.media || (data.imagenes || []).map(url => ({ url, type: 'image' }));
        return {
          id: doc.id,
          image: mediaArray.length > 0 ? mediaArray[0].url : 'https://picsum.photos/seed/placeholder/400/300',
          title: data.titulo || '',
          description: data.descripcion || '',
          price: data.precio ? `$${data.precio}` : null,
          webLink: data.webLink || null,
          views: formatViews(data.vistas || 0),
          totalImages: mediaArray.length,
          media: mediaArray,
          hasVideo: mediaArray.some(m => m.type === 'video'),
          author: data.autor,
          authorProfileName: authorInfo.profileName,
          authorUsername: authorInfo.username,
          authorProfilePicture: authorInfo.profilePicture,
        };
      });

      const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);

      if (reset) {
        setPosts(list);
      } else {
        setPosts(prev => [...prev, ...list]);
      }

      setHasMore(querySnapshot.docs.length === 30);
    } catch (error) {
      console.log("Error buscando posts en Firestore: ", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (usersLoading) return;
    setUsersLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(100));
      const snapshot = await getDocs(q);
      const currentUid = auth.currentUser?.uid;
      const usersList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          uid: doc.id,
          profileName: doc.data().profileName || doc.data().username || 'Usuario',
          username: doc.data().username || 'usuario',
          profilePicture: doc.data().profilePicture || '',
        }))
        .filter(user => user.uid !== currentUid);
      setUsers(usersList);
    } catch (error) {
      console.log("Error buscando usuarios:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setLastVisible(null);
    setHasMore(true);
    await fetchBlockedUsers();
    await Promise.all([fetchPosts(true), fetchUsers()]);
    setRefreshing(false);
  };

  const hasFetched = React.useRef(false);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!hasFetched.current) {
        fetchBlockedUsers().then(() => {
          fetchPosts(true);
          fetchUsers();
        });
        hasFetched.current = true;
      }
    });
    return unsubscribe;
  }, [navigation]);

  const filteredPosts = useMemo(() =>
    posts.filter(post =>
      !blockedUids.includes(post.author) && (
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (post.authorProfileName && post.authorProfileName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (post.authorUsername && post.authorUsername.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    ),
    [posts, blockedUids, searchQuery]
  );

  const filteredUsers = useMemo(() =>
    users.filter(user =>
      !blockedUids.includes(user.uid) && (
        user.profileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ),
    [users, blockedUids, searchQuery]
  );

  // 🆕 Construye "filas" para la grilla: la mayoría son filas normales de 3 posts,
  // pero cada tanto (según el cronograma) se inserta una fila especial con el
  // anuncio ocupando 2x2 celdas + 2 posts normales apilados al costado.
  // 🆕 Se reconstruye TODA la grilla en cada cambio (posts o anuncios nuevos),
  // en vez de ir "sellando" filas de a poco — así, si un anuncio llega después
  // de que los posts ya se hayan renderizado como fila normal, igual se inserta
  // en su posición programada la próxima vez que se recalcula.
  useEffect(() => {
    const isSearching = searchQuery.trim() !== '';
    const rows = [];
    let i = 0;
    let sinceLastAd = 0;
    let adIndex = 0;
    let gapCount = 0;

    while (i < filteredPosts.length) {
      const nextGap = getScheduledGap(gapCount);
      const adReady = !isSearching && nativeAdsRef.current[adIndex];
      const canInsertAd = adReady && sinceLastAd >= nextGap && i + 2 <= filteredPosts.length;

      if (canInsertAd) {
        const side = [filteredPosts[i], filteredPosts[i + 1]];
        rows.push({
          type: 'ad',
          id: `ad-${filteredPosts[i].id}`,
          side,
          ad: nativeAdsRef.current[adIndex],
        });
        i += 2;
        adIndex += 1;
        sinceLastAd = 0;
        gapCount += 1;

        // Si el pool se está agotando, pedimos otro anuncio para el próximo turno
        if (adIndex >= nativeAdsRef.current.length - 1) {
          loadOneNativeAd();
        }
      } else {
        const chunk = filteredPosts.slice(i, i + 3);
        rows.push({ type: 'posts', id: `row-${filteredPosts[i].id}`, items: chunk });
        i += chunk.length;
        sinceLastAd += chunk.length;
      }
    }

    setGridRows(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPosts, searchQuery, nativeAdsVersion]);

  // 🆕 Detectar qué items son visibles (para autoplay).
  // Ahora cada item del FlatList es una "fila" que puede contener varios posts.
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const visibleIds = new Set();
    viewableItems.forEach((v) => {
      const row = v.item;
      if (row.type === 'posts') {
        row.items.forEach((p) => visibleIds.add(p.id));
      } else if (row.type === 'ad') {
        row.side.forEach((p) => visibleIds.add(p.id));
      }
    });
    // Solo actualiza el estado si los IDs visibles realmente cambiaron
    setVisibleItems(prev => {
      if (prev.size === visibleIds.size && [...visibleIds].every(id => prev.has(id))) return prev;
      return visibleIds;
    });
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  });

  // 🆕 Contenido de una card individual (post normal), extraído para poder
  // reutilizarlo tanto en las filas normales como en los 2 huecos que quedan
  // al costado del anuncio.
  const renderPostCard = (item) => {
    const firstMedia = item.media[0];
    const isFirstMediaVideo = firstMedia?.type === 'video';
    const isVisible = visibleItems.has(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => navigation.navigate('PostDetail', { post: item, posts: filteredPosts })}
      >
        <View style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* 🆕 Si el primer elemento es video, reproducirlo; si no, mostrar imagen */}
          {isFirstMediaVideo ? (
            <VideoPreview uri={firstMedia.url} isVisible={isVisible} />
          ) : (
            <Image
              source={{ uri: item.image }}
              style={styles.image}
              resizeMode="cover"
            />
          )}

          {/* 🆕 Badge de video solo si el primer elemento es video */}
          {isFirstMediaVideo && (
            <View style={styles.videoBadge}>
              <MaterialCommunityIcons name="video" size={12} color="#FFF" />
            </View>
          )}

          {item.price && (
            <LinearGradient
              colors={['#546f1c00', '#546f1c99', '#546F1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.priceBadge}
            >
              <Text style={styles.priceBadgeText}>$</Text>
            </LinearGradient>
          )}

          {item.webLink && (
            <LinearGradient
              colors={['#E8E8E8', '#FFFFFF', '#B8B8B8', '#D0D0D0', '#A0A0A0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modelBadge}
            >
              <Text style={[styles.priceBadgeText2, { color: '#333' }]}>M</Text>
            </LinearGradient>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 🆕 Fila especial con el anuncio nativo ocupando 2x2 celdas (4 cuadrículas)
  // y 2 posts normales apilados en la columna restante.
  const renderAdRow = (row) => {
    const { ad, side } = row;
    return (
      <View style={styles.adRow}>
        <View style={styles.adTile}>
          <NativeAdView nativeAd={ad} style={styles.adTileInner}>
            <NativeMediaView style={styles.adMedia} resizeMode="cover" />

            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>Publicidad</Text>
            </View>

            <View style={styles.adFooter}>
              {ad.icon?.url ? (
                <NativeAsset assetType={NativeAssetType.ICON}>
                  <Image source={{ uri: ad.icon.url }} style={styles.adIcon} />
                </NativeAsset>
              ) : null}

              <View style={{ flex: 1, marginLeft: 6 }}>
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                  <Text style={styles.adHeadline} numberOfLines={1}>
                    {ad.headline}
                  </Text>
                </NativeAsset>
              </View>

              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <View style={styles.adCta}>
                  <Text style={styles.adCtaText}>{ad.callToAction}</Text>
                </View>
              </NativeAsset>
            </View>
          </NativeAdView>
        </View>

        <View style={styles.adSideColumn}>
          {side.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.adSideCell}
              onPress={() => navigation.navigate('PostDetail', { post, posts: filteredPosts })}
            >
              <Image source={{ uri: post.image }} style={styles.image} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // 🆕 Renderiza cada item del FlatList: una fila normal de 3 posts, o la fila del anuncio
  const renderGridRow = ({ item }) => {
    if (item.type === 'ad') return renderAdRow(item);
    return <View style={styles.postsRow}>{item.items.map(renderPostCard)}</View>;
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5' }]}
      onPress={() => {
        if (item.uid === auth.currentUser?.uid) {
          navigation.navigate('MainTabs', { screen: 'Profile' });
        } else {
          navigation.navigate('UserProfile', {
            userId: item.uid,
            profileName: item.profileName,
            username: item.username,
            profilePicture: item.profilePicture,
          });
        }
      }}
    >
      {item.profilePicture ? (
        <Image source={{ uri: item.profilePicture }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatarFallback, { backgroundColor: isDark ? '#2A2A2A' : '#E8E8E8' }]}>
          <Ionicons
            name="person-circle-outline"
            size={50}
            color="#94BA46"
          />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
          {item.profileName}
        </Text>
        <Text style={[styles.userHandle, { color: isDark ? '#888' : '#666' }]} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5', paddingTop: insets.top + 8 }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
        />
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#273500' : '#E8E8E8' }]}>
          <Ionicons
            name="search"
            size={20}
            color={isDark ? '#FFF' : '#666'}
          />
          <TextInput
            placeholder="Buscar publicaciones o usuarios..."
            placeholderTextColor={isDark ? '#AAA' : '#888'}
            style={[styles.input, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && { borderBottomColor: '#9DBD3F' }]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'posts' ? '#9DBD3F' : (isDark ? '#888' : '#666') }]}>
            Publicaciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && { borderBottomColor: '#9DBD3F' }]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'users' ? '#9DBD3F' : (isDark ? '#888' : '#666') }]}>
            Usuarios
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resultados */}
      {activeTab === 'posts' ? (
        <FlatList
          key="posts-grid"
          data={gridRows}
          renderItem={renderGridRow}
          keyExtractor={(row) => row.id}
          showsVerticalScrollIndicator={false}
          onEndReached={() => fetchPosts(false)}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={7}
          initialNumToRender={18}
          // 🆕 Detectar items visibles
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#546F1C']}
              tintColor="#546F1C"
            />
          }
          ListFooterComponent={
            loading ? (
              <ActivityIndicator
                size="large"
                color="#9DBD3F"
                style={{ marginVertical: 15 }}
              />
            ) : null
          }
        />
      ) : (
        <FlatList
          key="users-list"
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#546F1C']}
              tintColor="#546F1C"
            />
          }
          ListFooterComponent={
            usersLoading ? (
              <ActivityIndicator
                size="large"
                color="#9DBD3F"
                style={{ marginVertical: 15 }}
              />
            ) : null
          }
          ListEmptyComponent={
            !usersLoading && filteredUsers.length === 0 ? (
              <Text style={[styles.emptyText, { color: isDark ? '#888' : '#666' }]}>
                No se encontraron usuarios
              </Text>
            ) : null
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  logo: {
    width: 35,
    height: 35,
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  card: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 1,
  },
  // 🆕 Fila normal de 3 posts (reemplaza al numColumns={3} del FlatList)
  postsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  // 🆕 Fila especial: anuncio (2x2) + columna con 2 posts apilados
  adRow: {
    flexDirection: 'row',
    width: '100%',
  },
  adTile: {
    width: '66.666%',
    aspectRatio: 1,
    padding: 1,
  },
  adTileInner: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#EEE',
  },
  adMedia: {
    width: '100%',
    height: '72%',
  },
  adBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
  },
  adFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    height: '28%',
  },
  adIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  adHeadline: {
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
    color: '#222',
  },
  adCta: {
    backgroundColor: '#9DBD3F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
  },
  adCtaText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Nunito-Bold',
  },
  adSideColumn: {
    width: '33.333%',
    flexDirection: 'column',
  },
  adSideCell: {
    width: '100%',
    aspectRatio: 1,
    padding: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // 🆕 Badge de video
  videoBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 10,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
  },
  userHandle: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
  },
  userAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelBadge: {
    position: 'absolute',
    bottom: 4,
    left: 28,
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#999',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
  priceBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    lineHeight: 14,
  },
  priceBadgeText2: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    lineHeight: 14,
  },
});