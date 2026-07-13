import { db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore';

export async function deleteAllUserData(uid) {
  const batch = writeBatch(db);
  let ops = 0;

  const addDelete = (ref) => {
    if (ops >= 490) throw new Error('Batch demasiado grande, abortando.');
    batch.delete(ref);
    ops++;
  };

  const commitAndContinue = async () => {
    await batch.commit();
    ops = 0;
  };

  
  const postsSnap = await getDocs(query(collection(db, 'posts'), where('autor', '==', uid)));
  const postIds = [];
  postsSnap.forEach((p) => {
    postIds.push(p.id);
    addDelete(p.ref);
  });

  if (ops >= 400) await commitAndContinue();

  
  const likesSnap = await getDocs(query(collection(db, 'likes'), where('userId', '==', uid)));
  likesSnap.forEach((l) => addDelete(l.ref));

  if (ops >= 400) await commitAndContinue();

  
  if (postIds.length > 0) {
    const likesOnPostsSnap = await getDocs(query(collection(db, 'likes'), where('postAuthor', '==', uid)));
    likesOnPostsSnap.forEach((l) => addDelete(l.ref));
  }

  if (ops >= 400) await commitAndContinue();

  
  const commentsSnap = await getDocs(query(collection(db, 'comments'), where('userId', '==', uid)));
  commentsSnap.forEach((c) => addDelete(c.ref));

  if (ops >= 400) await commitAndContinue();

  
  for (const postId of postIds) {
    const commentsOnPostSnap = await getDocs(query(collection(db, 'comments'), where('postId', '==', postId)));
    commentsOnPostSnap.forEach((c) => addDelete(c.ref));
    if (ops >= 400) await commitAndContinue();
  }

  
  const viewsSnap = await getDocs(query(collection(db, 'views'), where('userId', '==', uid)));
  viewsSnap.forEach((v) => addDelete(v.ref));

  if (ops >= 400) await commitAndContinue();

  
  const savedSnap = await getDocs(query(collection(db, 'saved'), where('userId', '==', uid)));
  savedSnap.forEach((s) => addDelete(s.ref));

  if (ops >= 400) await commitAndContinue();

  
  const followersAsFollower = await getDocs(query(collection(db, 'followers'), where('followerId', '==', uid)));
  followersAsFollower.forEach((f) => addDelete(f.ref));
  const followersAsTarget = await getDocs(query(collection(db, 'followers'), where('userId', '==', uid)));
  followersAsTarget.forEach((f) => addDelete(f.ref));

  if (ops >= 400) await commitAndContinue();

  
  const blockedSnap = await getDocs(query(collection(db, 'blocked'), where('userId', '==', uid)));
  blockedSnap.forEach((b) => addDelete(b.ref));

  if (ops >= 400) await commitAndContinue();

  
  addDelete(doc(db, 'users', uid));

  if (ops > 0) await batch.commit();
}
