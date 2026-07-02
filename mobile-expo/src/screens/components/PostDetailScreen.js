// src/screens/PostDetailScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    FlatList,
    Keyboard,
    ScrollView,
    Modal,
    Alert,
    Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { blockUser } from '../config/userActions';
import CommentModal from './CommentModal';
import PostMenuModal from './PostMenuModal';
import MediaViewerModal from '../chats_screens/Mediaviewer';
import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    serverTimestamp,
    increment,
    // onSnapshot,
} from 'firebase/firestore';
import { formatViews } from '../config/formatViews';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ============================================================
// COMPONENTE: PostItem (un post individual, autónomo)
// ============================================================

const PostItem = React.memo(function PostItem({ post, isOwnPost, displayName, displayHandle, authorProfilePicture, colors, isDark, pageHeight, onOpenComments, onAuthorPress, onMorePress, onOpenMediaViewer }) {
    const currentUser = auth.currentUser;
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [postViews, setPostViews] = useState(post.views || 0);
    const [descExpanded, setDescExpanded] = useState(false);
    const moreButtonRef = React.useRef(null);

    const DESCRIPTION_LIMIT = 100;
    const fullDescription = post.description || 'Sin descripción adicional.';
    const isLongDescription = fullDescription.length > DESCRIPTION_LIMIT;
    const truncatedDescription = isLongDescription
        ? fullDescription.slice(0, DESCRIPTION_LIMIT).trimEnd()
        : fullDescription;

    const handleOpenLink = () => {
        if (post.webLink) {
            Linking.openURL(post.webLink).catch(() => {
                Alert.alert('No se pudo abrir el enlace', 'El enlace parece no ser válido.');
            });
        }
    };

    // Escuchar cambios en tiempo real del post
    // Leer vistas una sola vez (sin listener en tiempo real)
    useEffect(() => {
        if (!post?.id) return;
        let cancelled = false;
        const postRef = doc(db, 'posts', post.id);
        getDoc(postRef).then((snapshot) => {
            if (!cancelled && snapshot.exists()) {
                setPostViews(snapshot.data().vistas || 0);
            }
        });
        return () => { cancelled = true; };
    }, [post?.id]);

    // Cargar estado inicial (like, saved, comments)





    const handleLike = async () => {
        if (!currentUser || !post) return;
        const likeRef = doc(db, 'likes', `${currentUser.uid}_${post.id}`);
        if (liked) {
            await deleteDoc(likeRef);
            setLiked(false);
        } else {
            await setDoc(likeRef, {
                userId: currentUser.uid,
                postId: post.id,
                postImage: post.image,
                postTitle: post.title,
                postAuthor: post.author,
                createdAt: new Date(),
            });
            setLiked(true);
        }
    };

    const handleSave = async () => {
        if (!currentUser || !post) return;
        const savedRef = doc(db, 'saved', `${currentUser.uid}_${post.id}`);
        if (saved) {
            await deleteDoc(savedRef);
            setSaved(false);
        } else {
            await setDoc(savedRef, {
                userId: currentUser.uid,
                postId: post.id,
                postImage: post.image,
                postTitle: post.title,
                postAuthor: post.author,
                createdAt: new Date(),
            });
            setSaved(true);
        }
    };


    return (
        <View
            style={{
                height: pageHeight,
                backgroundColor: colors.background,
                position: 'relative',
            }}
        >
            {/* USER INFO */}
            <TouchableOpacity style={styles.userInfoRow} onPress={onAuthorPress} activeOpacity={0.7}>
                <View style={[styles.avatarContainer, { borderColor: colors.avatarborder }]}>
                    {authorProfilePicture ? (
                        <Image source={{ uri: authorProfilePicture }} style={styles.avatarImage} />
                    ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                            <Ionicons name="person-circle-outline" size={38} color="#94BA46" />
                        </View>
                    )}
                </View>
                <View style={styles.userNameContainer}>
                    <Text style={[styles.userNameText, { color: colors.text }]}>{displayName}</Text>
                    <Text style={[styles.userHandleText, { color: isDark ? '#aaa' : '#666' }]}>{displayHandle}</Text>
                </View>
                <TouchableOpacity
                    ref={moreButtonRef}                                 // ← NUEVO
                    style={styles.moreButton}
                    onPress={() => {
                        moreButtonRef.current?.measureInWindow((x, y, width, height) => {
                        onMorePress({ x, y, width, height });           // ← pasa la posición
                        });
                    }}
                    >
                      <Feather name="more-vertical" size={20} color={colors.text} />
                </TouchableOpacity>
            </TouchableOpacity>

            {/* CONTENIDO SCROLLEABLE INTERNO */}
            <View
                style={{
                    flex: 1,
                    height: pageHeight - 70, // Altura fija restando header de usuario
                }}
            >
                {/* POST IMAGE */}
                <View style={styles.imageWrapper}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => onOpenMediaViewer?.(post)}>
                        <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />
                    </TouchableOpacity>
                </View>

                {/* INTERACTION BAR */}
                <View style={styles.interactionBar}>
                    <View style={styles.leftIcons}>
                        <TouchableOpacity onPress={handleLike} style={styles.iconButton}>
                            <Feather name="thumbs-up" size={22} color={liked ? '#9DBD3F' : colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => onOpenComments(post)}
                        >
                            <Feather name="message-circle" size={22} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Feather name="send" size={20} color={colors.text} />
                        </TouchableOpacity>
                        <View style={styles.viewsContainer}>
                            <Feather name="bar-chart-2" size={16} color={isDark ? '#888' : '#666'} />
                            <Text style={[styles.viewsText, { color: isDark ? '#888' : '#666' }]}>{formatViews(postViews)}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
                        <Feather name="bookmark" size={22} color={saved ? '#9DBD3F' : colors.text} />
                    </TouchableOpacity>
                </View>

                {/* DESCRIPTION */}
                <View style={[styles.descriptionCard, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5' }]}>
                    <Text style={[styles.descriptionTitle, { color: colors.text }]}>{post.title}</Text>
                    <Text style={[styles.descriptionText, { color: isDark ? '#ccc' : '#444' }]}>
                        {descExpanded || !isLongDescription ? fullDescription : `${truncatedDescription}... `}
                        {isLongDescription && (
                            <Text
                                style={styles.seeMoreText}
                                onPress={() => setDescExpanded(!descExpanded)}
                            >
                                {descExpanded ? ' ver menos' : 'ver más'}
                            </Text>
                        )}
                    </Text>

                    {post.webLink && (
                        <TouchableOpacity style={styles.webLinkRow} onPress={handleOpenLink} activeOpacity={0.7}>
                            <Feather name="link" size={14} color="#9DBD3F" />
                            <Text style={styles.webLinkText} numberOfLines={1}>
                                {post.webLink}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

            </View>
            
        </View>
    );
});

// ============================================================
// COMPONENTE PRINCIPAL: PostDetailScreen
// ============================================================
export default function PostDetailScreen({ route, navigation }) {
    const { post, posts = [] } = route.params;
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const isDark = colors.text === '#FFFFFF';
    const currentUser = auth.currentUser;
    const HEADER_HEIGHT = 50;
    const PAGE_HEIGHT = screenHeight - insets.top - HEADER_HEIGHT;

    const initialIndex = posts.findIndex((p) => p.id === post.id);
    const validIndex = initialIndex >= 0 ? initialIndex : 0;
    const [mediaViewerPost, setMediaViewerPost] = useState(null);
    const [commentsPost, setCommentsPost] = useState(null);
    const [menuPost, setMenuPost] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);  
    /*
    
    
    
    
    
    */
    if (!post) return null;

    const flatListRef = useRef(null);

    // Hacer scroll al post seleccionado después del montaje
    useEffect(() => {
        if (flatListRef.current && validIndex > 0) {
            // Pequeño delay para asegurar que el FlatList esté renderizado
            const timer = setTimeout(() => {
                flatListRef.current.scrollToIndex({
                    index: validIndex,
                    animated: false,
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [validIndex]);

    // Manejar fallo de scroll a índice
    const onScrollToIndexFailed = useCallback((info) => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({
                offset: info.index * PAGE_HEIGHT,
                animated: false,
            });
            setTimeout(() => {
                if (flatListRef.current) {
                    flatListRef.current.scrollToIndex({
                        index: info.index,
                        animated: false,
                    });
                }
            }, 100);
        }
    }, [PAGE_HEIGHT]);

    // Ref para trackear posts ya vistos en esta sesión
    const viewedPosts = useRef(new Set());

    // Función para incrementar vista
    const incrementView = async (postId) => {
        if (!currentUser || !postId || viewedPosts.current.has(postId)) return;
        viewedPosts.current.add(postId);

        const viewDocId = `${currentUser.uid}_${postId}`;
        const viewRef = doc(db, 'views', viewDocId);
        const postRef = doc(db, 'posts', postId);

        try {
            const snap = await getDoc(viewRef);
            if (!snap.exists()) {
                await setDoc(viewRef, {
                    userId: currentUser.uid,
                    postId: postId,
                    createdAt: new Date(),
                });
                await updateDoc(postRef, { vistas: increment(1) });
            }
        } catch (error) {
            console.log('Error incrementando vista:', error);
        }
    };

    // Callback cuando cambia la visibilidad de items
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        viewableItems.forEach((item) => {
            if (item.isViewable && item.item?.id) {
                incrementView(item.item.id);
            }
        });
    });

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 });

    // onScroll como respaldo: detecta el post visible según la posición del scroll
    const onScroll = useRef((e) => {
        const offsetY = e.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / PAGE_HEIGHT);
        if (posts[index]?.id) {
            incrementView(posts[index].id);
        }
    });

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: colors.card, paddingTop: insets.top }]}>
                {/* HEADER */}
                <View style={[styles.header, { borderBottomColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={26} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>PUBLICACIONES</Text>
                    <View style={{ width: 28 }} />
                </View>

                <FlatList
                    ref={flatListRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingBottom: 20,
                    }}
                    data={posts}
                    keyExtractor={(item) => item.id}
                    getItemLayout={(data, index) => ({
                        length: PAGE_HEIGHT,
                        offset: PAGE_HEIGHT * index,
                        index,
                    })}
                    renderItem={({ item }) => (
                        <PostItem
                            post={item}
                            isOwnPost={currentUser && item.author === currentUser.uid}
                            displayName={item.authorProfileName || 'Usuario'}
                            displayHandle={'@' + (item.authorUsername || 'usuario')}
                            authorProfilePicture={item.authorProfilePicture || ''}
                            onOpenMediaViewer={(post) => setMediaViewerPost(post)}
                            onOpenComments={(post) => {
                                setCommentsPost(post);
                            }}
                            onAuthorPress={() => {
                                if (currentUser && item.author === currentUser.uid) {
                                    navigation.navigate('MainTabs', { screen: 'Profile' });
                                } else {
                                    navigation.navigate('UserProfile', {
                                        userId: item.author,
                                        profileName: item.authorProfileName || 'Usuario',
                                        username: item.authorUsername || 'usuario',
                                        profilePicture: item.authorProfilePicture || '',
                                    });
                                }
                            }}
                            onMorePress={(anchor) => {
                                setMenuAnchor(anchor);   // ← guarda la posición
                                setMenuPost(item);
                                }}
                            colors={colors}
                            isDark={isDark}
                            pageHeight={PAGE_HEIGHT}
                        />
                    )}
                    onViewableItemsChanged={onViewableItemsChanged.current}
                    viewabilityConfig={viewabilityConfig.current}
                    onScroll={onScroll.current}
                    scrollEventThrottle={16}
                    horizontal={false}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={false}
                    windowSize={5}
                    onScrollToIndexFailed={onScrollToIndexFailed}
                    keyboardShouldPersistTaps="handled"
                />
            </View>
            <CommentModal
                visible={commentsPost !== null}
                post={commentsPost}
                onClose={() => setCommentsPost(null)}
                isDark={isDark}
                colors={colors}
            />
            <PostMenuModal
                visible={menuPost !== null}
                onClose={() => setMenuPost(null)}
                isOwnPost={currentUser && menuPost?.author === currentUser.uid}
                anchorPosition={menuAnchor}                          // ← NUEVO
                onOptionPress={(key) => {
                    if (key === 'block') {
                        Alert.alert(
                            'Bloquear usuario',
                            `¿Querés bloquear a ${menuPost?.authorProfileName || 'este usuario'}? No verás sus publicaciones ni podrán interactuar.`,
                            [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                    text: 'Bloquear',
                                    style: 'destructive',
                                    onPress: async () => {
                                        const ok = await blockUser(currentUser.uid, menuPost.author);
                                        if (ok) {
                                            setMenuPost(null);
                                            navigation.goBack();
                                        }
                                    },
                                },
                            ]
                        );
                    }
                    if (key === 'delete') {
                        Alert.alert(
                            'Eliminar publicación',
                            '¿Querés eliminar esta publicación? Esta acción no se puede deshacer.',
                            [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                    text: 'Eliminar',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            const postId = menuPost.id;
                                            // Eliminar el post primero (lo más importante)
                                            await deleteDoc(doc(db, 'posts', postId));
                                            // Luego intentar limpiar colecciones relacionadas (falla si las reglas de seguridad lo bloquean)
                                            const collections = ['likes', 'views', 'saved', 'comments'];
                                            for (const col of collections) {
                                                try {
                                                    const q = query(collection(db, col), where('postId', '==', postId));
                                                    const snap = await getDocs(q);
                                                    for (const d of snap.docs) {
                                                        try { await deleteDoc(d.ref); } catch (e) {}
                                                    }
                                                } catch (e) {}
                                            }
                                            setMenuPost(null);
                                            navigation.goBack();
                                        } catch (error) {
                                            console.log('Error eliminando publicación:', error);
                                            Alert.alert('Error', 'No se pudo eliminar la publicación. Revisá tu conexión o intentá de nuevo.');
                                        }
                                    },
                                },
                            ]
                        );
                    }
                    if (key === 'edit') {
                        setMenuPost(null);
                        navigation.navigate('EditPost', { post: menuPost });
                    }
                }}
            />
            <MediaViewerModal
                visible={mediaViewerPost !== null}
                items={mediaViewerPost ? [{ id: mediaViewerPost.id, mediaUrl: mediaViewerPost.image, type: 'image' }] : []}
                initialIndex={0}
                onClose={() => setMediaViewerPost(null)}
            />
        </KeyboardAvoidingView>
    );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: { padding: 4 },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    moreButton: { padding: 4 },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        overflow: 'hidden',
    },
    avatarImage: { 
        width: '100%', 
        height: '100%',
    },
    avatarFallback: {
        width: 40.7, // Ajustado para compensar el border del contenedor
        height: 40.7,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userNameContainer: { marginLeft: 10, flex: 1 },
    userNameText: { fontSize: 15, fontWeight: '600' },
    userHandleText: { fontSize: 13 },
    imageWrapper: {
        width: screenWidth,
        flex: 1,
        position: 'relative',
    },
    postImage: { width: '100%', height: '100%' },
    priceOverlay: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    priceText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    interactionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    leftIcons: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { marginRight: 16 },
    viewsContainer: { flexDirection: 'row', alignItems: 'center' },
    viewsText: { fontSize: 13, marginLeft: 4 },
    descriptionCard: {
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 12,
        borderRadius: 10,
    },
    descriptionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    descriptionText: { fontSize: 14, lineHeight: 20 },
    seeMoreText: { fontSize: 14, fontWeight: '700', color: '#9DBD3F' },
    webLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    webLinkText: { fontSize: 13, color: '#9DBD3F', flex: 1, textDecorationLine: 'underline' }
  
});