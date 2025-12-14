import { deepToRaw } from '@/lib/utils'

function getDB() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const idb = indexedDB.open('network', 2)

        idb.onupgradeneeded = function () {
            const db = this.result
            if (db.objectStoreNames.contains('requests')) {
                db.deleteObjectStore('requests')
            }
            db.createObjectStore('requests', { keyPath: 'uid' })
        }

        idb.onsuccess = function () {
            resolve(this.result)
        }

        idb.onerror = function () {
            reject(this.error)
        }
    })
}

// FIXME: create this type
export type NetworkRequest = any

export default {
    async putRequest(request: NetworkRequest) {
        const db = await getDB()
        try {
            db.transaction(['requests'], 'readwrite').objectStore('requests').put(deepToRaw(request))
        } catch (e) {
            console.error(e, request)
        }
    },
    async getRequests(): Promise<NetworkRequest[]> {
        const db = await getDB()
        return new Promise((resolve, reject) => {
            const all = db.transaction(['requests']).objectStore('requests').getAll()
            all.onsuccess = function () {
                resolve(this.result)
            }
            all.onerror = function () {
                reject(this.error)
            }
        })
    },
    async clearRequests() {
        const db = await getDB()
        db.transaction(['requests'], 'readwrite').objectStore('requests').clear()
    },
}
