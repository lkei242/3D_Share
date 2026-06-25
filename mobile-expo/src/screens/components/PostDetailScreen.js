// src/screens/PostDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import CommentModal from './CommentModal';
import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ============================================================
// COMPONENTE: PostItem (un post individual, autónomo)
// ============================================================

function PostItem({ post, isOwnPost, displayName, displayHandle, colors, isDark, pageHeight, onOpenComments }) {
    const currentUser = auth.currentUser;
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
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
                flex: 1,
                backgroundColor: colors.background,
                position: 'relative',
            }}
        >
            {/* USER INFO */}
            <View style={styles.userInfoRow}>
                <View style={[styles.avatarContainer, { borderColor: colors.avatarborder }]}>
                    <Image
                        source={isOwnPost ? require('../../../assets/profile_picture.jpg') : require('../../../assets/logo.png')}
                        style={styles.avatarImage}
                    />
                </View>
                <View style={styles.userNameContainer}>
                    <Text style={[styles.userNameText, { color: colors.text }]}>{displayName}</Text>
                    <Text style={[styles.userHandleText, { color: isDark ? '#aaa' : '#666' }]}>{displayHandle}</Text>
                </View>
            </View>

            {/* CONTENIDO SCROLLEABLE INTERNO */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                bounces={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* POST IMAGE */}
                <View style={styles.imageWrapper}>
                    <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />
                    {post.price && (
                        <View style={styles.priceOverlay}>
                            <Text style={styles.priceText}>Precio: {post.price}</Text>
                        </View>
                    )}
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
                            <Text style={[styles.viewsText, { color: isDark ? '#888' : '#666' }]}>{post.views}</Text>
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
                        {post.description || 'Sin descripción adicional.'}
                    </Text>
                </View>

            </ScrollView>
        </View>
    );
}

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
    //
    //
    //
    //
    //
    const [commentsPost, setCommentsPost] = useState(null);
    /*
    
    
    
    
    
    */
    if (!post) return null;

    const getItemLayout = (data, index) => ({
        length: PAGE_HEIGHT,
        offset: PAGE_HEIGHT * index,
        index,
    });

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
                {/* HEADER */}
                <View style={[styles.header, { borderBottomColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={26} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>PUBLICACIONES</Text>
                    <TouchableOpacity style={styles.moreButton}>
                        <Feather name="more-vertical" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingBottom: 20,
                    }}
                    data={posts}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <PostItem
                            post={item}
                            isOwnPost={currentUser && item.author === currentUser.uid}
                            displayName={
                                currentUser && item.author === currentUser.uid
                                    ? currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario'
                                    : 'Creador3D'
                            }
                            displayHandle={
                                '@' + (
                                    currentUser && item.author === currentUser.uid
                                        ? (currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario')
                                        : 'Creador3D'
                                ).toLowerCase().replace(/\s+/g, '')
                            }
                            onOpenComments={(post) => {
                                setCommentsPost(post);
                            }}
                            colors={colors}
                            isDark={isDark}
                            pageHeight={PAGE_HEIGHT}
                            //
                        />
                    )}
                    horizontal={false}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={false}
                    windowSize={5}
                    initialScrollIndex={validIndex}
                    getItemLayout={getItemLayout}
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
    avatarImage: { width: '100%', height: '100%' },
    userNameContainer: { marginLeft: 10 },
    userNameText: { fontSize: 15, fontWeight: '600' },
    userHandleText: { fontSize: 13 },
    imageWrapper: {
        width: screenWidth,
        height: screenHeight * 0.45,
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
    descriptionText: { fontSize: 14, lineHeight: 20 }
});