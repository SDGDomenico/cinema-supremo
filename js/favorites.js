import { db } from "./firebase.js";
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function getFavId(brand, slug) {
  return `${brand}_${slug}`;
}

export async function isFavorite(uid, brand, slug) {
  try {
    const ref = doc(db, "users", uid, "favorites", getFavId(brand, slug));
    const snap = await getDoc(ref);
    return snap.exists();
  } catch {
    return false;
  }
}

export async function addFavorite(uid, brand, slug) {
  const ref = doc(db, "users", uid, "favorites", getFavId(brand, slug));
  await setDoc(ref, {
    brand,
    slug,
    addedAt: new Date().toISOString()
  });
}

export async function removeFavorite(uid, brand, slug) {
  const ref = doc(db, "users", uid, "favorites", getFavId(brand, slug));
  await deleteDoc(ref);
}

export async function getAllFavorites(uid) {
  const ref = collection(db, "users", uid, "favorites");
  const snap = await getDocs(ref);
  return snap.docs.map(d => d.data()).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
}