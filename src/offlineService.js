import { openDB } from 'idb';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

const DB_NAME     = 'SchoolCarDB';
const STORE_NAME  = 'locations_queue';
const DB_VERSION  = 1;

// ──────────────────────────────────────────
//  IndexedDB helper
// ──────────────────────────────────────────
const initDB = async () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    },
  });

// ──────────────────────────────────────────
//  Queue add
// ──────────────────────────────────────────
export const addLocationToQueue = async (location) => {
  const db = await initDB();
  await db.add(STORE_NAME, location);
};

// ──────────────────────────────────────────
//  Queue flush → Firebase
// ──────────────────────────────────────────
export const processQueue = async () => {
  if (!navigator.onLine) return;

  // import Firebase only when needed
  const { db } = await import('./firebase.js');

  const localDB = await initDB();
  let queue = await localDB.getAll(STORE_NAME);
  if (!queue.length) return;

  // Priority first: manual drop-offs carry priority:1
  queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const batch = writeBatch(db);
  const col   = collection(db, 'locations');

  queue.forEach((item) => {
    const ref = doc(col);
    batch.set(ref, { ...item, syncedAt: serverTimestamp() });
  });

  try {
    await batch.commit();
    // clear store after successful sync
    const tx = localDB.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
  } catch (err) {
    console.error('Queue sync failed:', err);
  }
};