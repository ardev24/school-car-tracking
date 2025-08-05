import { openDB } from 'idb';
// NOTE: Firebase is NOT imported at the top of the file. This is intentional.
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';


const DB_NAME = 'SchoolCarDB';
const STORE_NAME = 'locations_queue';
const DB_VERSION = 1;


/**
 * Initializes the IndexedDB database and the object store.
 * @returns {Promise<IDBDatabase>} A promise that resolves to the database instance.
 */
const initDB = async () => {
  const database = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    },
  });
  return database;
};


/**
 * Adds a location data object to the offline queue in IndexedDB.
 * @param {object} locationData - The location object to be queued.
 */
export const addLocationToQueue = async (locationData) => {
  const db = await initDB();
  await db.add(STORE_NAME, locationData);
  console.log('Location added to offline queue.');
};


/**
 * Processes the offline queue. If online, it sends all queued items
 * to Firebase Firestore in a single batch and clears the queue upon success.
 */
export const processQueue = async () => {
  console.log('Checking for network and processing queue...');


  // 1. Check for an active internet connection.
  if (!navigator.onLine) {
    console.log('Offline. Skipping queue processing.');
    return;
  }


  // 2. Dynamically import the Firestore 'db' instance.
  // This resolves module loading issues by ensuring we get the fully initialized object.
  const { db } = await import('./firebase.js');


  // 3. Open the local IndexedDB and get all queued items.
  const localDB = await initDB();
  const queue = await localDB.getAll(STORE_NAME);


  if (queue.length === 0) {
    console.log('Queue is empty. Nothing to process.');
    return;
  }


  console.log(`Processing ${queue.length} items from the queue...`);


  // 4. Prepare a batched write to send all data to Firestore at once.
  const batch = writeBatch(db);
  const locationCollectionRef = collection(db, 'locations');


  queue.forEach(item => {
    const docRef = doc(locationCollectionRef); // Create a new document for each location
    batch.set(docRef, {
        ...item,
        syncedAt: serverTimestamp() // Add a server-side timestamp for when it was synced
    });
  });


  // 5. Execute the batch and handle the result.
  try {
    await batch.commit();
    console.log(`Successfully synced batch of ${queue.length} items to Firebase!`);


    // If the sync was successful, clear the local queue.
    const tx = await localDB.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    console.log('Offline queue cleared.');


  } catch (error) {
    console.error('Error syncing batch to Firebase: ', error);
  }
};