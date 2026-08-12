import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc, Unsubscribe } from "firebase/firestore";
import { firestoreDb } from "./firebase";

const JY_EMAILS = new Set(["allison@taiwanbar.cc", "past795@gmail.com"]);

// Firestore rejects `undefined` anywhere inside nested objects. Legacy trips
// from Apps Script legitimately contain optional fields with that value, so
// remove only those missing fields before writing without changing the data.
const firestoreSafe = <T>(value: T): T => JSON.parse(JSON.stringify(value));

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

export const saveFirestoreTrip = async (personId: string, role: "owner" | "member", trip: any, expenses: any[], inviteCode = "") => {
  const tripRef = doc(firestoreDb, "trips", trip.id);
  // Register this device/account as a member first. Existing trips require
  // membership before their root document or shared state may be updated.
  await setDoc(doc(tripRef, "members", personId), {
    personId,
    displayName: personId === "person-jy" ? "JY" : "旅伴",
    role,
    updatedAt: serverTimestamp()
  }, { merge: true });
  if (role === "owner") {
    await setDoc(tripRef, {
      ownerId: personId,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate || "",
      endDate: trip.endDate || "",
      inviteCode,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  const stateRef = doc(tripRef, "state", "current");
  const cloudState = await getDoc(stateRef);
  // Bootstrap only when this trip has never been stored in Firestore. A fresh
  // browser must download the existing cloud copy instead of replacing it with
  // empty/default local data.
  if (!cloudState.exists()) {
    await setDoc(stateRef, {
      trip: firestoreSafe(trip),
      expenses: firestoreSafe(expenses),
      updatedBy: personId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  await setDoc(doc(firestoreDb, "users", personId, "trips", trip.id), {
    tripId: trip.id,
    role,
    title: trip.title,
    inviteCode,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const updateFirestoreTripState = async (personId: string, trip: any, expenses: any[]) => {
  await setDoc(doc(firestoreDb, "trips", trip.id, "state", "current"), {
    trip: firestoreSafe(trip),
    expenses: firestoreSafe(expenses),
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

export const repairFirestoreTripLink = async (personId: string, tripId: string) => {
  const tripRef = doc(firestoreDb, "trips", tripId);
  const [stateSnapshot, memberSnapshot, tripSnapshot] = await Promise.all([
    getDoc(doc(tripRef, "state", "current")),
    getDoc(doc(tripRef, "members", personId)),
    getDoc(tripRef)
  ]);
  if (!stateSnapshot.exists() || !memberSnapshot.exists()) return false;
  const trip = stateSnapshot.data()?.trip;
  await setDoc(doc(firestoreDb, "users", personId, "trips", tripId), {
    tripId,
    role: memberSnapshot.data()?.role === "owner" ? "owner" : "member",
    title: trip?.title || tripSnapshot.data()?.title || "旅行",
    inviteCode: String(tripSnapshot.data()?.inviteCode || ""),
    updatedAt: serverTimestamp()
  }, { merge: true });
  return true;
};

export const deleteFirestoreTrip = async (personId: string, tripId: string) => {
  const tripRef = doc(firestoreDb, "trips", tripId);
  const members = await getDocs(collection(tripRef, "members"));
  // Remove shared state and every member's dashboard link while the trip root
  // still exists, allowing the owner rule to authorize the cleanup.
  await deleteDoc(doc(tripRef, "state", "current"));
  await Promise.all(members.docs.map((member) =>
    deleteDoc(doc(firestoreDb, "users", member.id, "trips", tripId))
  ));
  await deleteDoc(doc(firestoreDb, "users", personId, "trips", tripId));
  await deleteDoc(tripRef);
};

export const leaveFirestoreTrip = async (personId: string, tripId: string) => {
  await deleteDoc(doc(firestoreDb, "users", personId, "trips", tripId));
  await deleteDoc(doc(firestoreDb, "trips", tripId, "members", personId));
};
