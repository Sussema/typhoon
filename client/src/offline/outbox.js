import Dexie from 'dexie';

export const db = new Dexie('circularlink');
db.version(1).stores({ outbox: 'clientId, createdAt' });

export async function submit(path, body) {
  const clientId = crypto.randomUUID();
  await db.outbox.add({
    clientId,
    path,
    createdAt: Date.now(),
    body: { ...body, clientId, capturedAt: new Date().toISOString() }
  });
  syncOutbox(); // try now; fine if offline
  return clientId;
}

let syncing = false;
export async function syncOutbox() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const items = await db.outbox.orderBy('createdAt').toArray();
    for (const item of items) {
      if (item.error) continue; // needs a human, skip
      let res;
      try {
        res = await fetch(`/api${item.path}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body)
        });
      } catch {
        break; // network dropped: try later
      }
      if (res.ok) {
        await db.outbox.delete(item.clientId);
      } else if (res.status === 401) {
        break; // login expired: ask user to log in
      } else if (res.status < 500) {
        await db.outbox.update(item.clientId, { error: await res.text() });
      } else {
        break; // server problem: retry later
      }
    }
  } finally {
    syncing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOutbox);
  setInterval(syncOutbox, 30_000);
}
