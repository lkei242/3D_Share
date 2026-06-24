// src/screens/PostDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
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

const { width: screenWidth } = Dimensions.get('window');

export default function PostDetailScreen({ route, navigation }) {
    const { post } = route.params;
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const isDark = colors.text === '#FFFFFF';
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [sendingComment, setSendingComment] = useState(false);

    const inputRef = useRef(null);

    if (!post) return null;

    const currentUser = auth.currentUser;
    const isOwnPost = currentUser && post.author === currentUser.uid;

    // Nombre del autor
    const displayName = isOwnPost
        ? (
            currentUser?.displayName ||
            currentUser?.email?.split('@')[0] ||
            'Usuario'
        )
        : 'Creador3D';
    const displayHandle = '@' + displayName.toLowerCase().replace(/\s+/g, '');

    // Consultar Firestore al montar la pantalla
    useEffect(() => {
        if (!post || !currentUser) {
            setLiked(false);
            setSaved(false);
            return;
        }

        const checkStatus = async () => {
            const likeRef = doc(db, 'likes', `${currentUser.uid}_${post.id}`);
            const savedRef = doc(db, 'saved', `${currentUser.uid}_${post.id}`);

            try {
                const likeSnap = await getDoc(likeRef);
                setLiked(likeSnap.exists());
            } catch (e) {
                console.log('Error checking like:', e);
                setLiked(false);
            }

            try {
                const savedSnap = await getDoc(savedRef);
                setSaved(savedSnap.exists());
            } catch (e) {
                console.log('Error checking saved:', e);
                setSaved(false);
            }
        };

        checkStatus();
        fetchComments();
    }, [post, currentUser]);

    const fetchComments = async () => {
        if (!post) return;

        setLoadingComments(true);

        try {
            const q = query(
                collection(db, 'comments'),
                where('postId', '==', post.id),
                orderBy('createdAt', 'asc')
            );

            const snapshot = await getDocs(q);

            setComments(
                snapshot.docs.map((d) => ({
                    docId: d.id,
                    ...d.data(),
                }))
            );
        } catch (e) {
            console.log('Error fetching comments:', e);
        } finally {
            setLoadingComments(false);
        }
    };
    // Funciones para manejar like y guardado
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
    const handleSendComment = async () => {
        const text = commentText.trim();

        if (!text || !currentUser || !post) return;

        setSendingComment(true);

        try {
            const displayName =
                currentUser.displayName ||
                currentUser.email.split('@')[0];

            const newComment = {
                userId: currentUser.uid,
                postId: post.id,
                postImage: post.image,
                postTitle: post.title,
                text,
                userDisplayName: displayName,
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(
                collection(db, 'comments'),
                newComment
            );

            setComments((prev) => [
                ...prev,
                {
                    docId: docRef.id,
                    ...newComment,
                    createdAt: {
                        toMillis: () => Date.now(),
                    },
                },
            ]);

            setCommentText('');
        } catch (e) {
            console.log('Error sending comment:', e);
        } finally {
            setSendingComment(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.background,
                        paddingTop: insets.top,
                    },
                ]}
            >

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

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

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

                    {/* POST IMAGE */}
                    <View style={styles.imageWrapper}>
                        <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />

                        {/* PRICE OVERLAY */}
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
                                <Feather
                                    name="thumbs-up"
                                    size={22}
                                    color={liked ? '#9DBD3F' : colors.text}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => inputRef.current?.focus()}
                            >
                                <Feather
                                    name="message-circle"
                                    size={22}
                                    color={colors.text}
                                />
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
                            <Feather
                                name="bookmark"
                                size={22}
                                color={saved ? '#9DBD3F' : colors.text}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* DESCRIPTION */}
                    <View style={[styles.descriptionCard, { backgroundColor: isDark ? '#1C1C1C' : '#F5F5F5' }]}>
                        <Text style={[styles.descriptionTitle, { color: colors.text }]}>{post.title}</Text>
                        <Text style={[styles.descriptionText, { color: isDark ? '#ccc' : '#444' }]}>
                            {post.description || 'Sin descripción adicional.'}
                        </Text>
                    </View>

                    {/* COMMENTS */}
                    <View
                        style={[
                            styles.commentsCard,
                            {
                                backgroundColor: isDark
                                    ? '#1C1C1C'
                                    : '#F5F5F5',
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.commentsHeader,
                                { color: colors.text },
                            ]}
                        >
                            Comentarios
                            {comments.length > 0
                                ? ` (${comments.length})`
                                : ''}
                        </Text>

                        {loadingComments ? (
                            <ActivityIndicator
                                size="small"
                                color="#546F1C"
                                style={{ marginVertical: 12 }}
                            />
                        ) : comments.length === 0 ? (
                            <Text
                                style={[
                                    styles.noCommentsText,
                                    {
                                        color: isDark
                                            ? '#555'
                                            : '#BBB',
                                    },
                                ]}
                            >
                                Sé el primero en comentar
                            </Text>
                        ) : (
                            comments.map((c) => (
                                <View
                                    key={c.docId}
                                    style={styles.commentItem}
                                >
                                    <Text
                                        style={[
                                            styles.commentUser,
                                            { color: colors.text },
                                        ]}
                                    >
                                        @{c.userDisplayName || 'usuario'}
                                    </Text>

                                    <Text
                                        style={[
                                            styles.commentText,
                                            {
                                                color: isDark
                                                    ? '#bbb'
                                                    : '#555',
                                            },
                                        ]}
                                    >
                                        {c.text}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>

                </ScrollView>
                <View
                    style={[
                        styles.commentInputRow,
                        {
                            backgroundColor: colors.background,
                            borderTopColor: isDark
                                ? '#2C2C2C'
                                : '#E0E0E0',
                        },
                    ]}
                >
                    <TextInput
                        ref={inputRef}
                        style={[
                            styles.commentInput,
                            {
                                backgroundColor: isDark
                                    ? '#1C1C1C'
                                    : '#F0F0F0',
                                color: colors.text,
                            },
                        ]}
                        placeholder="Agregar un comentario..."
                        placeholderTextColor={
                            isDark ? '#555' : '#AAA'
                        }
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        onSubmitEditing={handleSendComment}
                    />

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            {
                                opacity:
                                    commentText.trim().length === 0 ||
                                        sendingComment
                                        ? 0.4
                                        : 1,
                            },
                        ]}
                        onPress={handleSendComment}
                        disabled={
                            commentText.trim().length === 0 ||
                            sendingComment
                        }
                    >
                        {sendingComment ? (
                            <ActivityIndicator
                                size="small"
                                color="#9DBD3F"
                            />
                        ) : (
                            <Ionicons
                                name="send"
                                size={22}
                                color="#9DBD3F"
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Nunito-Bold',
        letterSpacing: 1,
    },
    moreButton: {
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 100,
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    userNameContainer: {
        flex: 1,
        marginLeft: 10,
    },
    userNameText: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
    },
    userHandleText: {
        fontSize: 12,
        fontFamily: 'Nunito-Regular',
        marginTop: 1,
    },
    imageWrapper: {
        width: '100%',
        height: screenWidth - 32,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#000',
    },
    postImage: {
        width: '100%',
        height: '100%',
    },
    priceOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    priceText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
    },
    interactionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#333',
        marginBottom: 14,
    },
    leftIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconButton: {
        padding: 4,
    },
    viewsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 5,
    },
    viewsText: {
        fontSize: 12,
        fontFamily: 'Nunito-Regular',
    },
    descriptionCard: {
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    descriptionTitle: {
        fontSize: 15,
        fontFamily: 'Nunito-Bold',
        marginBottom: 6,
    },
    descriptionText: {
        fontSize: 13,
        fontFamily: 'Nunito-Regular',
        lineHeight: 18,
    },
    commentsCard: {
        borderRadius: 10,
        padding: 12,
    },
    commentsHeader: {
        fontSize: 14,
        fontFamily: 'Nunito-Bold',
        marginBottom: 10,
    },
    commentItem: {
        marginBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingBottom: 8,
    },
    commentUser: {
        fontSize: 12,
        fontFamily: 'Nunito-Bold',
        marginBottom: 2,
    },
    commentText: {
        fontSize: 12,
        fontFamily: 'Nunito-Regular',
        lineHeight: 16,
    },
    noCommentsText: {
        fontSize: 13,
        fontFamily: 'Nunito-Regular',
        textAlign: 'center',
        paddingVertical: 8,
    },

    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        gap: 10,
    },

    commentInput: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        fontSize: 14,
        fontFamily: 'Nunito-Regular',
        maxHeight: 100,
    },

    sendButton: {
        padding: 6,
    },
});
