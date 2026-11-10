import { apiBase, backendEnabled } from './config';

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cityguard-local', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Browser storage is unavailable. Allow site storage to save reports.'));
  });
}

async function localOperation(mode, operation) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('reports', mode);
      const request = operation(transaction.objectStore('reports'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(new Error('Could not save or load reports in browser storage.'));
    });
  } finally { db.close(); }
}

export async function loadReports() {
  if (backendEnabled) {
    const response = await fetch(`${apiBase}/reports`);
    if (!response.ok) throw new Error('Could not load reports from the configured server.');
    return (await response.json()).reports;
  }
  return localOperation('readonly', store => store.getAll());
}

export async function saveReport(data) {
  const latitude = Number(data.get('latitude')), longitude = Number(data.get('longitude'));
  if (!data.get('latitude') || !data.get('longitude') || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error('Select a valid report location on the map.');
  }
  if (backendEnabled) {
    const response = await fetch(`${apiBase}/submit`, { method: 'POST', body: data });
    if (!response.ok) throw new Error('Could not save the report to the configured server.');
    return response.json();
  }
  const files = data.getAll('image').filter(file => file.size);
  if (files.some(file => !file.type.startsWith('image/')) || files.reduce((sum, f) => sum + f.size, 0) > 5 * 1024 * 1024) {
    throw new Error('Choose images totalling no more than 5 MB.');
  }
  return localOperation('readwrite', store => store.add({
    name: data.get('name'), category: data.get('category'), description: data.get('description'),
    latitude, longitude, images: files, createdAt: new Date().toISOString(),
  }));
}
