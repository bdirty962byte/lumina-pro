import { openDB } from 'idb';

const DB_NAME = 'lumina_pro_db';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

export async function initDB() {
    const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('timestamp', 'timestamp');
            }
        },
    });
    return db;
}

export async function savePhoto(photoBlob, name) {
    const db = await initDB();
    const photo = {
        blob: photoBlob,
        name: name,
        timestamp: Date.now(),
    };
    return db.add(STORE_NAME, photo);
}

export async function getAllPhotos() {
    const db = await initDB();
    return db.getAllFromIndex(STORE_NAME, 'timestamp');
}

export async function deletePhoto(id) {
    const db = await initDB();
    return db.delete(STORE_NAME, id);
}

export async function updatePhoto(id, updates) {
    const db = await initDB();
    const photo = await db.get(STORE_NAME, id);
    if (photo) {
        const updatedPhoto = { ...photo, ...updates };
        return db.put(STORE_NAME, updatedPhoto);
    }
}
