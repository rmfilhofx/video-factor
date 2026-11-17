import type {Credit} from '../server/commons';

export type Generated = {
  id: number;
  label: string;
  format: string;
  seconds: number;
  credits: Credit[];
  file: Blob;
};

type Stored = Generated | (Omit<Generated, 'file'> & {bytes: ArrayBuffer});

function openHistory(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('video-factory', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('videos', {keyPath: 'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readHistory(): Promise<Generated[]> {
  const db = await openHistory();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction('videos').objectStore('videos').getAll();
      req.onsuccess = () => resolve((req.result as Stored[]).reverse().map((record) => {
        if ('file' in record) return record;
        const {bytes, ...metadata} = record;
        return {...metadata, file: new Blob([bytes], {type: 'video/mp4'})};
      }));
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveVideo({file, ...metadata}: Generated) {
  const bytes = await file.arrayBuffer();
  const db = await openHistory();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('videos', 'readwrite');
      const store = tx.objectStore('videos');
      store.put({...metadata, bytes});
      const keys = store.getAllKeys();
      keys.onsuccess = () => keys.result.slice(0, -8).forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
