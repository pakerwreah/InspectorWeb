function getDB () {
  return new Promise((resolve, reject) => {
    const idb = indexedDB.open('network', 1)

    idb.onupgradeneeded = (e) => {
      const db = e.target.result
      db.createObjectStore('requests', { keyPath: 'uid' })
    }

    idb.onsuccess = (e) => {
      resolve(e.target.result)
    }

    idb.onerror = (e) => {
      reject(e)
    }
  })
}

export default {
  async putRequest (request) {
    const db = await getDB()
    db.transaction(['requests'], 'readwrite').objectStore('requests').put(request)
  },
  async getRequests () {
    const db = await getDB()
    return new Promise((resolve, reject) => {
      const all = db.transaction(['requests']).objectStore('requests').getAll()
      all.onsuccess = (e) => {
        resolve(e.target.result)
      }
      all.onerror = (e) => {
        reject(e)
      }
    })
  },
  async clearRequests () {
    const db = await getDB()
    db.transaction(['requests'], 'readwrite').objectStore('requests').clear()
  }
}
