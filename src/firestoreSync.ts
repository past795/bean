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
  // Create/update the protected root first so the member rule can verify the
  // owner or invitation code instead of allowing an unscoped member write.
  if (role === "owner") {
    await setDoc(tripRef, {
      ownerId: personId,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate || "",
      endDate: trip.endDate || "",
      ...(inviteCode ? { inviteCode } : {}),
      updatedAt: serverTimestamp()
    }, { merge: true });
    // A short invite code is the only thing a travel companion needs.  Its
    // separate document lets a signed-in user resolve the trip without being
    // shown (or having to type) the internal trip ID.
    if (inviteCode) {
      await setDoc(doc(firestoreDb, "invites", inviteCode), {
        tripId: trip.id,
        ownerId: personId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  }
  await setDoc(doc(tripRef, "members", personId), {
    personId,
    displayName: personId === "person-jy" ? "JY" : "旅伴",
    role,
    ...(inviteCode ? { inviteCode } : {}),
    updatedAt: serverTimestamp()
  }, { merge: true });
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
    ...(inviteCode ? { inviteCode } : {}),
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const joinFirestoreTrip = async (personId: string, tripId: string, inviteCode: string, displayName: string) => {
  const tripRef = doc(firestoreDb, "trips", tripId);
  // The rule validates this code against the trip root before granting membership.
  await setDoc(doc(tripRef, "members", personId), {
    personId,
    displayName,
    role: "member",
    inviteCode,
    updatedAt: serverTimestamp()
  });
  const [tripSnapshot, stateSnapshot] = await Promise.all([getDoc(tripRef), getDoc(doc(tripRef, "state", "current"))]);
  if (!tripSnapshot.exists() || !stateSnapshot.exists() || !stateSnapshot.data()?.trip) throw new Error("找不到旅行或邀請碼不正確");
  const storedCode = String(tripSnapshot.data()?.inviteCode || "");
  if (!storedCode || storedCode !== inviteCode) throw new Error("邀請碼不正確");
  const trip = stateSnapshot.data()!.trip;
  await setDoc(doc(firestoreDb, "users", personId, "trips", tripId), {
    tripId,
    role: "member",
    title: trip?.title || tripSnapshot.data()?.title || "旅行",
    inviteCode: storedCode,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return { trip, expenses: Array.isArray(stateSnapshot.data()?.expenses) ? stateSnapshot.data()!.expenses : [] };
};

export const joinFirestoreTripByInvite = async (personId: string, inviteCode: string, displayName: string) => {
  const inviteSnapshot = await getDoc(doc(firestoreDb, "invites", inviteCode));
  const tripId = String(inviteSnapshot.data()?.tripId || "");
  if (!tripId) throw new Error("找不到這組邀請碼，請請建立者重新分享。 ");
  const joined = await joinFirestoreTrip(personId, tripId, inviteCode, displayName);
  return { ...joined, tripId };
};

export const updateFirestoreTripState = async (personId: string, trip: any, expenses: any[]) => {
  await setDoc(doc(firestoreDb, "trips", trip.id, "state", "current"), {
    trip: firestoreSafe(trip),
    expenses: firestoreSafe(expenses),
    updatedBy: personId,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

// Archiving deliberately keeps the shared trip state in Firestore for 30 days,
// but removes it from the traveller's active dashboard.  This makes a reload
// behave exactly like the current screen instead of bringing an archived trip
// back from the realtime listener.
export const archiveFirestoreTrip = async (personId: string, tripId: string, email: string) => {
  const archivedAt = new Date();
  const deleteAt = new Date(archivedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  await setDoc(doc(firestoreDb, "users", personId, "trips", tripId), {
    archived: true,
    archivedAt: archivedAt.toISOString(),
    deleteAt: deleteAt.toISOString(),
    archiveEmail: email,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const restoreFirestoreTrip = async (personId: string, tripId: string) => {
  await setDoc(doc(firestoreDb, "users", personId, "trips", tripId), {
    archived: false,
    archivedAt: "",
    deleteAt: "",
    archiveEmail: "",
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
