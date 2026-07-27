/**
 * LEVEL UP — Database layer
 *
 * The ONLY module that talks to IndexedDB directly. Every feature
 * module (dashboard, workouts, martial arts, brain, health, goals...)
 * should go through the generic helpers exported here rather than
 * opening its own connection or writing raw IDB code.
 *
 * Schema is defined once in STORE_CONFIG and created in
 * onupgradeneeded — see the table in the Phase 3 write-up for what
 * each store is for.
 */

const DB_NAME = "levelup-db";
const DB_VERSION = 1;

/**
 * Declarative schema: each entry describes one object store and its
 * indexes. Adding a new store/index later means bumping DB_VERSION
 * and adding an entry here — onupgradeneeded loops over this list.
 */
const STORE_CONFIG = [
  { name: "profile", options: { keyPath: "id" }, indexes: [] },
  {
    name: "taskTemplates",
    options: { keyPath: "id" },
    indexes: [{ name: "category", keyPath: "category" }],
  },
  {
    name: "taskLogs",
    options: { keyPath: "logId", autoIncrement: true },
    indexes: [
      { name: "date", keyPath: "date" },
      { name: "taskId", keyPath: "taskId" },
    ],
  },
  {
    name: "workouts",
    options: { keyPath: "id", autoIncrement: true },
    indexes: [{ name: "date", keyPath: "date" }],
  },
  {
    name: "exercises",
    options: { keyPath: "id" },
    indexes: [{ name: "category", keyPath: "category" }],
  },
  {
    name: "martialArtsSessions",
    options: { keyPath: "id", autoIncrement: true },
    indexes: [
      { name: "date", keyPath: "date" },
      { name: "discipline", keyPath: "discipline" },
    ],
  },
  {
    name: "techniques",
    options: { keyPath: "id" },
    indexes: [{ name: "discipline", keyPath: "discipline" }],
  },
  {
    name: "brainTraining",
    options: { keyPath: "id", autoIncrement: true },
    indexes: [
      { name: "date", keyPath: "date" },
      { name: "type", keyPath: "type" },
    ],
  },
  {
    name: "healthRecords",
    options: { keyPath: "id", autoIncrement: true },
    indexes: [{ name: "date", keyPath: "date" }],
  },
  {
    name: "goals",
    options: { keyPath: "id", autoIncrement: true },
    indexes: [{ name: "period", keyPath: "period" }],
  },
  {
    name: "streaks",
    options: { keyPath: "id", autoIncrement: true },
    indexes: [{ name: "date", keyPath: "date" }],
  },
  { name: "achievements", options: { keyPath: "id" }, indexes: [] },
  { name: "settings", options: { keyPath: "key" }, indexes: [] },
];

export const STORE_NAMES = STORE_CONFIG.map((s) => s.name);

let dbPromise = null;

/**
 * Opens (and if needed, creates/upgrades) the database. Cached so
 * repeated calls reuse the same connection.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORE_CONFIG) {
        if (db.objectStoreNames.contains(store.name)) continue;
        const objectStore = db.createObjectStore(store.name, store.options);
        for (const index of store.indexes) {
          objectStore.createIndex(index.name, index.keyPath);
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/** @returns {Promise<IDBObjectStore>} */
async function getStore(storeName, mode = "readonly") {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

/** Wraps an IDBRequest in a Promise. */
function wrapRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Inserts a new record. Fails if the key already exists. */
export async function dbAdd(storeName, value) {
  const store = await getStore(storeName, "readwrite");
  return wrapRequest(store.add(value));
}

/** Inserts or updates a record (upsert). */
export async function dbPut(storeName, value) {
  const store = await getStore(storeName, "readwrite");
  return wrapRequest(store.put(value));
}

/** Fetches a single record by its key. */
export async function dbGet(storeName, key) {
  const store = await getStore(storeName);
  return wrapRequest(store.get(key));
}

/** Fetches every record in a store. */
export async function dbGetAll(storeName) {
  const store = await getStore(storeName);
  return wrapRequest(store.getAll());
}

/** Fetches every record matching a value on a given index. */
export async function dbGetAllByIndex(storeName, indexName, value) {
  const store = await getStore(storeName);
  return wrapRequest(store.index(indexName).getAll(value));
}

/** Deletes a record by key. */
export async function dbDelete(storeName, key) {
  const store = await getStore(storeName, "readwrite");
  return wrapRequest(store.delete(key));
}

/** Removes every record in a store. */
export async function dbClear(storeName) {
  const store = await getStore(storeName, "readwrite");
  return wrapRequest(store.clear());
}

/** Counts records in a store. */
export async function dbCount(storeName) {
  const store = await getStore(storeName);
  return wrapRequest(store.count());
}
