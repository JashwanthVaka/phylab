import { learningOwner } from './learningStorage.js';
const DB='phylab-sync',STORE='operations';
const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const operation = (db, mode, work) => new Promise((resolve, reject) => {
  const tx = db.transaction(STORE, mode);
  const request = work(tx.objectStore(STORE));
  tx.oncomplete = () => resolve(request.result);
  tx.onerror = () => reject(tx.error);
});
export const offlineSyncService = {
  async enqueue(type, payload) {
    const userId = learningOwner();
    if (!userId || userId === 'unverified') throw new Error('Sign in before saving an offline bookmark.');
    const db = await open();
    try {
      const item = { id: crypto.randomUUID(), userId, type, payload, created_at: new Date().toISOString() };
      await operation(db, 'readwrite', store => store.put(item));
      return item;
    } finally { db.close(); }
  },
  async status() {
    const db = await open();
    try {
      const items = await operation(db, 'readonly', store => store.getAll());
      return { online: navigator.onLine, pending: items.filter(item => item.userId === learningOwner()).length };
    } finally { db.close(); }
  },
  async flush(handlers) {
    if (!navigator.onLine || !learningOwner() || learningOwner() === 'unverified') return;
    const owner = learningOwner();
    const db = await open();
    try {
      const items = await operation(db, 'readonly', store => store.getAll());
      for (const item of items) {
        // Unowned legacy entries stay on the device, never in a new account.
        if (item.userId !== owner || learningOwner() !== owner || !handlers[item.type]) continue;
        const result = await handlers[item.type](item.payload);
        if (result?.error || result?.offline) continue;
        await operation(db, 'readwrite', store => store.delete(item.id));
      }
    } finally { db.close(); }
  }
};
