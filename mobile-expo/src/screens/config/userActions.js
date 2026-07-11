import { doc, getDoc, setDoc, deleteDoc, addDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// ===================== SEGUIR / DEJAR DE SEGUIR =====================

export const checkIfFollowing = async (followerUid, targetUid) => {
  if (!followerUid || !targetUid || followerUid === targetUid) return false;
  try {
    const followDoc = await getDoc(doc(db, 'followers', `${targetUid}_${followerUid}`));
    return followDoc.exists();
  } catch (error) {
    console.log('Error checking follow status:', error);
    return false;
  }
};

export const followUser = async (followerUid, targetUid) => {
  if (!followerUid || !targetUid) return false;
  try {
    await setDoc(doc(db, 'followers', `${targetUid}_${followerUid}`), {
      userId: targetUid,
      followerId: followerUid,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.log('Error following user:', error);
    return false;
  }
};

export const unfollowUser = async (followerUid, targetUid) => {
  if (!followerUid || !targetUid) return false;
  try {
    await deleteDoc(doc(db, 'followers', `${targetUid}_${followerUid}`));
    return true;
  } catch (error) {
    console.log('Error unfollowing user:', error);
    return false;
  }
};

export const getFollowersCount = async (targetUid) => {
  if (!targetUid) return 0;
  try {
    const q = query(collection(db, 'followers'), where('userId', '==', targetUid));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.log('Error fetching followers count:', error);
    return 0;
  }
};

// ===================== DENUNCIAR USUARIO =====================

export const reportUser = async (reporterUid, reportedUid, reason) => {
  if (!reporterUid || !reportedUid) return false;
  try {
    // Usamos addDoc (ID autogenerado) en vez de setDoc con ID fijo.
    // Con un ID fijo (`${reporterUid}_${reportedUid}`), la segunda vez que el
    // mismo usuario denuncia al mismo usuario, Firestore ya no lo trata como
    // "create" sino como "update" (el doc ya existe), y como las reglas de
    // /userReports solo permiten create/read/delete (no update), la escritura
    // se rechaza con "Missing or insufficient permissions". Con addDoc cada
    // denuncia es siempre un documento nuevo, así que siempre pasa por la
    // regla de "create".
    await addDoc(collection(db, 'userReports'), {
      reporterId: reporterUid,
      reportedId: reportedUid,
      reason: reason || '',
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.log('Error reporting user:', error);
    return false;
  }
};

// ===================== DENUNCIAR PUBLICACIÓN =====================

export const reportPost = async (reporterUid, postId, reason) => {
  if (!reporterUid || !postId) return false;
  try {
    await addDoc(collection(db, 'postReports'), {
      reporterId: reporterUid,
      postId: postId,
      reason: reason || '',
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.log('Error reporting post:', error);
    return false;
  }
};

// ===================== SILENCIAR / DESILENCIAR =====================

export const checkIfMuted = async (mutedByUid, targetUid) => {
  if (!mutedByUid || !targetUid) return false;
  try {
    const muteDoc = await getDoc(doc(db, 'muted', `${mutedByUid}_${targetUid}`));
    return muteDoc.exists();
  } catch (error) {
    console.log('Error checking mute status:', error);
    return false;
  }
};

export const muteUser = async (mutedByUid, targetUid) => {
  if (!mutedByUid || !targetUid) return false;
  try {
    await setDoc(doc(db, 'muted', `${mutedByUid}_${targetUid}`), {
      userId: mutedByUid,
      mutedId: targetUid,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.log('Error muting user:', error);
    return false;
  }
};

export const unmuteUser = async (mutedByUid, targetUid) => {
  if (!mutedByUid || !targetUid) return false;
  try {
    await deleteDoc(doc(db, 'muted', `${mutedByUid}_${targetUid}`));
    return true;
  } catch (error) {
    console.log('Error unmuting user:', error);
    return false;
  }
};

export const getMutedUids = async (mutedByUid) => {
  if (!mutedByUid) return [];
  try {
    const q = query(collection(db, 'muted'), where('userId', '==', mutedByUid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().mutedId);
  } catch (error) {
    console.log('Error fetching muted users:', error);
    return [];
  }
};

// ===================== BLOQUEAR / DESBLOQUEAR =====================

export const checkIfBlocked = async (blockerUid, targetUid) => {
  if (!blockerUid || !targetUid) return false;
  try {
    const blockDoc = await getDoc(doc(db, 'blocked', `${blockerUid}_${targetUid}`));
    return blockDoc.exists();
  } catch (error) {
    console.log('Error checking block status:', error);
    return false;
  }
};

export const blockUser = async (blockerUid, targetUid) => {
  if (!blockerUid || !targetUid) return false;
  try {
    await setDoc(doc(db, 'blocked', `${blockerUid}_${targetUid}`), {
      userId: blockerUid,
      blockedId: targetUid,
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.log('Error blocking user:', error);
    return false;
  }
};

export const unblockUser = async (blockerUid, targetUid) => {
  if (!blockerUid || !targetUid) return false;
  try {
    await deleteDoc(doc(db, 'blocked', `${blockerUid}_${targetUid}`));
    return true;
  } catch (error) {
    console.log('Error unblocking user:', error);
    return false;
  }
};

export const getBlockedUids = async (blockerUid) => {
  if (!blockerUid) return [];
  try {
    const q = query(collection(db, 'blocked'), where('userId', '==', blockerUid));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().blockedId);
  } catch (error) {
    console.log('Error fetching blocked users:', error);
    return [];
  }
};

// ===================== SOLICITUDES DE MENSAJE =====================

export const sendMessageRequest = async (senderId, receiverId) => {
  if (!senderId || !receiverId) return false;
  try {
    await setDoc(doc(db, 'messageRequests', `${senderId}_${receiverId}`), {
      senderId,
      receiverId,
      status: 'pending',
      createdAt: new Date(),
    });
    return true;
  } catch (error) {
    console.log('Error sending message request:', error);
    return false;
  }
};

export const getMessageRequest = async (senderId, receiverId) => {
  if (!senderId || !receiverId) return null;
  try {
    const docRef = await getDoc(doc(db, 'messageRequests', `${senderId}_${receiverId}`));
    if (docRef.exists()) return { id: docRef.id, ...docRef.data() };
    return null;
  } catch (error) {
    console.log('Error getting message request:', error);
    return null;
  }
};

export const approveMessageRequest = async (docId) => {
  try {
    await updateDoc(doc(db, 'messageRequests', docId), { status: 'approved', updatedAt: new Date() });
    return true;
  } catch (error) {
    console.log('Error approving message request:', error);
    return false;
  }
};

export const rejectMessageRequest = async (docId) => {
  try {
    await updateDoc(doc(db, 'messageRequests', docId), { status: 'rejected', updatedAt: new Date() });
    return true;
  } catch (error) {
    console.log('Error rejecting message request:', error);
    return false;
  }
};

export const cancelMessageRequest = async (docId) => {
  try {
    await deleteDoc(doc(db, 'messageRequests', docId));
    return true;
  } catch (error) {
    console.log('Error canceling message request:', error);
    return false;
  }
};

export const getSentRequests = async (userId) => {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'messageRequests'), where('senderId', '==', userId));
    const snap = await getDocs(q);
    return Promise.all(snap.docs.map(async (d) => {
      const data = d.data();
      const userDoc = await getDoc(doc(db, 'users', data.receiverId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      return {
        id: d.id,
        userId: data.receiverId,
        name: userData.profileName || userData.username || 'Usuario',
        username: userData.username || '',
        profilePicture: userData.profilePicture || '',
        status: data.status,
        createdAt: data.createdAt,
      };
    }));
  } catch (error) {
    console.log('Error getting sent requests:', error);
    return [];
  }
};

export const getReceivedRequests = async (userId) => {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'messageRequests'), where('receiverId', '==', userId), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    return Promise.all(snap.docs.map(async (d) => {
      const data = d.data();
      const userDoc = await getDoc(doc(db, 'users', data.senderId));
      const userData = userDoc.exists() ? userDoc.data() : {};
      return {
        id: d.id,
        userId: data.senderId,
        name: userData.profileName || userData.username || 'Usuario',
        username: userData.username || '',
        profilePicture: userData.profilePicture || '',
        status: data.status,
        createdAt: data.createdAt,
      };
    }));
  } catch (error) {
    console.log('Error getting received requests:', error);
    return [];
  }
};

export const getUserMessagePreference = async (userId) => {
  if (!userId) return true;
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.allowMessagesWithoutMutualFollow !== false;
    }
    return true;
  } catch (error) {
    console.log('Error getting message preference:', error);
    return true;
  }
};

export const checkMutualFollow = async (uid1, uid2) => {
  if (!uid1 || !uid2) return false;
  try {
    const doc1 = await getDoc(doc(db, 'followers', `${uid2}_${uid1}`));
    const doc2 = await getDoc(doc(db, 'followers', `${uid1}_${uid2}`));
    return doc1.exists() && doc2.exists();
  } catch (error) {
    console.log('Error checking mutual follow:', error);
    return false;
  }
};