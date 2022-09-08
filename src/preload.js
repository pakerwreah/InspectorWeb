const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send (channel, args) {
      ipcRenderer.send(channel, args)
    },
    on (channel, callback) {
      ipcRenderer.on(channel, callback)
    },
    removeAllListeners () {
      ipcRenderer.removeAllListeners()
    }
  }
})
