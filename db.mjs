// LoadPix stores metadata and original images on THIS device in IndexedDB.
// No app code uploads any images, phone numbers or driver details.
const DB_NAME = "loadpix-web-v1";
const DB_VERSION = 1;
let promise;

export function openLoadPixDB() {
  if (!("indexedDB" in globalThis)) return Promise.reject(new Error("This browser does not support private photo storage."));
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", {keyPath: "id"});
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", {keyPath: "id"});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open device storage."));
    request.onblocked = () => reject(new Error("Close other LoadPix tabs and reload."));
  }).catch(error => { promise = undefined; throw error; });
  return promise;
}

const settle = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error("Storage request failed."));
});

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error("Storage transaction aborted."));
    tx.onerror = () => reject(tx.error || new Error("Storage operation failed."));
  });
}

export async function allSessions() {
  const db = await openLoadPixDB();
  const tx = db.transaction("sessions", "readonly");
  const pending = settle(tx.objectStore("sessions").getAll());
  const sessions = await pending;
  return sessions.sort((a,b) => b.createdAt - a.createdAt);
}

export async function loadSession(id) {
  const db = await openLoadPixDB();
  return settle(db.transaction("sessions", "readonly").objectStore("sessions").get(id));
}

export async function saveSession(session) {
  const db = await openLoadPixDB();
  const tx = db.transaction("sessions", "readwrite");
  const done = transactionDone(tx);
  tx.objectStore("sessions").put(session);
  await done;
}

export async function loadPhoto(id) {
  const db = await openLoadPixDB();
  return settle(db.transaction("photos", "readonly").objectStore("photos").get(id));
}

export async function savePhoto(session, file, category, replaceID = null) {
  if (!file?.type?.startsWith("image/")) throw new Error("Select a photo to continue.");
  if (session.photos.length >= 20 && !replaceID) throw new Error("A session can contain up to 20 photos.");
  const id = crypto.randomUUID(), filename = String(file.name || ("photo-" + id + ".jpg")).slice(0, 110);
  const next = structuredClone(session);
  if (replaceID) {
    const index = next.photos.findIndex(p => p.id === replaceID);
    if (index < 0) throw new Error("The original photo was not found.");
    next.photos[index] = {id, category, filename};
  } else {
    next.photos.push({id, category, filename});
  }
  const db = await openLoadPixDB();
  const tx = db.transaction(["sessions", "photos"], "readwrite");
  const done = transactionDone(tx);
  tx.objectStore("photos").put({id, sessionId: session.id, category, filename, blob: file});
  if (replaceID) tx.objectStore("photos").delete(replaceID);
  tx.objectStore("sessions").put(next);
  await done;
  return next;
}

export async function removePhoto(session, photoID) {
  if (!session.photos.some(p => p.id === photoID)) return session;
  const next = structuredClone(session);
  next.photos = next.photos.filter(p => p.id !== photoID);
  const db = await openLoadPixDB();
  const tx = db.transaction(["sessions", "photos"], "readwrite");
  const done = transactionDone(tx);
  tx.objectStore("photos").delete(photoID);
  tx.objectStore("sessions").put(next);
  await done;
  return next;
}

export async function deleteSessions(ids) {
  const selected = new Set(ids);
  const sessions = (await allSessions()).filter(s => selected.has(s.id));
  if (!sessions.length) return 0;
  const db = await openLoadPixDB();
  const tx = db.transaction(["sessions", "photos"], "readwrite");
  const done = transactionDone(tx);
  const photos = tx.objectStore("photos");
  const metadata = tx.objectStore("sessions");
  for (const session of sessions) {
    for (const photo of session.photos) photos.delete(photo.id);
    metadata.delete(session.id);
  }
  await done;
  return sessions.length;
}
