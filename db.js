//------------------------------------------------------------
// IndexedDB – lokale Datenbank für Spieler
//------------------------------------------------------------

const DB_NAME = "wenau_vertraege_db";
const DB_VERSION = 1;
const STORE_NAME = "spieler";

let db;

// DB öffnen/erstellen
export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            let database = e.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve();
        };

        request.onerror = (e) => reject(e);
    });
}

// Spieler speichern
export function savePlayer(player) {
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);

        if (player.id) {
            store.put(player);
        } else {
            store.add(player);
        }

        tx.oncomplete = () => resolve("Gespeichert!");
    });
}

// Alle Spieler laden
export function getPlayers() {
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
    });
}

// Spieler löschen
export function deletePlayer(id) {
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve("Gelöscht!");
    });
}
