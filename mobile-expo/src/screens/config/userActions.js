import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
