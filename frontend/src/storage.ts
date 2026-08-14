import type { ProjectSnapshot } from './types'

const DB_NAME = 'incluimedia-studio'
const STORE_NAME = 'projects'
const PROJECT_KEY = 'current-project'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveProject(snapshot: ProjectSnapshot): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(snapshot, PROJECT_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function loadProject(): Promise<ProjectSnapshot | null> {
  const db = await openDb()
  const result = await new Promise<ProjectSnapshot | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(PROJECT_KEY)
    request.onsuccess = () => resolve((request.result as ProjectSnapshot | undefined) ?? null)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return result
}
