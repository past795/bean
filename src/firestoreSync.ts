import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, Unsubscribe } from "firebase/firestore";
import { firestoreDb } from "./firebase";

const JY_EMAILS = new Set(["allison@taiwanbar.cc", "past795@gmail.com"]);

export const firestorePersonId = (email: string, firebaseUid: string) =>
  JY_EMAILS.has(email.trim().toLowerCase()) ? "person-jy" : firebaseUid;

export const ensureFirestoreUser = async (personId: string, profile: { name: string; email: string; picture?: string }) => {
  await setDoc(doc(firestoreDb, "users", personId), {
    displayName: profile.name,
    primaryEmail: profile.email,
    emails: JY_EMAILS.has(profile.email.trim().toLowerCase()) ? [...JY_EMAILS] : [profile.email],
    picture: profile.picture || "",
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const saveFirestoreFavorites = async (personId: string, favorites: unknown[]) => {
  await setDoc(doc(firestoreDb, "users", personId), {
    favorites,
    favoritesUpdatedAt: serverTimestamp()
  }, { merge: true });
};

export const seedFirestoreFavorites = async (personId: string, favorites: unknown[]) => {
  const reference = doc(firestoreDb, "users", personId);
  const snapshot = await getDoc(reference);
  if (!Array.isArray(snapshot.data()?.favorites) && favorites.length) await saveFirestoreFavorites(personId, favorites);
};

export const listenFirestoreFavorites = (personId: string, callback: (favorites: any[]) => void): Unsubscribe =>
  onSnapshot(doc(firestoreDb, "users", personId), (snapshot) => {
    const favorites = snapshot.data()?.favorites;
    if (Array.isArray(favorites)) callback(favorites);
  });

export const saveFirestoreTrip = async (personId: string, role: "owner" | "member", trip: any, expenses: any[]) => {
  const tripRef = doc(firestoreDb, "trips", trip.id);
  if (role === "owner") {
    await setDoc(tripRef, {
      ownerId: personId,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate || "",
      endDate: trip.endDate || "",
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  await setDoc(doc(tripRef, "members", personId), {
    personId,
    displayName: personId === "person-jy" ? "JY" : "旅伴",
    role,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await setDoc(doc(tripRef, "state", "current"), {
    trip,
    expenses,
    updatedBy: personId,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await setDoc(doc(firestoreDb, "users", personId, "trips", trip.id), {
    tripId: trip.id,
    role,
    title: trip.title,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const updateFirestoreTripState = async (personId: string, trip: any, expenses: any[]) => {
  await setDoc(doc(firestoreDb, "trips", trip.id, "state", "current"), {
    trip,
    expenses,
    updatedBy: personId,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const listenFirestoreTrip = (tripId: string, callback: (trip: any, expenses: any[]) => void): Unsubscribe =>
  onSnapshot(doc(firestoreDb, "trips", tripId, "state", "current"), (snapshot) => {
    const data = snapshot.data();
    if (data?.trip) callback(data.trip, Array.isArray(data.expenses) ? data.expenses : []);
  });

export const listenFirestoreTripLinks = (personId: string, callback: (links: any[]) => void): Unsubscribe =>
  onSnapshot(collection(firestoreDb, "users", personId, "trips"), (snapshot) => {
    callback(snapshot.docs.map((item) => item.data()));
  });
