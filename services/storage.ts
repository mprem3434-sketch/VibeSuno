
import { Song } from '../types';

const DB_NAME = 'VibeSunDB';
const STORE_NAME = 'songs';
const DB_VERSION = 1;

export interface StoredSong extends Omit<Song, 'audioUrl'> {
  blob: Blob;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveSong = async (song: Song, file: File): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // We don't store the temporary audioUrl, we store the actual blob
    const { audioUrl, ...songData } = song;
    const storedItem: StoredSong = {
      ...songData,
      blob: file
    };

    const request = store.put(storedItem);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getAllStoredSongs = async (): Promise<Song[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results: StoredSong[] = request.result;
      const songs: Song[] = results.map(item => ({
        ...item,
        audioUrl: URL.createObjectURL(item.blob)
      }));
      resolve(songs);
    };
  });
};

export const deleteStoredSong = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
