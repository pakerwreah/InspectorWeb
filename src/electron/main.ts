import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import searchDevices from './device-scanner'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/preload.mjs'),
            sandbox: false,
        },
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.on('close', (event) => {
        // macOS: close button hides the window
        if (process.platform === 'darwin') {
            event.preventDefault()
            mainWindow.hide()
        }
    })

    // Prevents the close → hide logic from blocking Cmd-Q.
    app.on('before-quit', () => {
        mainWindow.removeAllListeners('close')
    })

    app.on('activate', function () {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        void shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        void mainWindow.loadFile(join(__dirname, '../../index.html'))
    }

    return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('br.pakerwreah.inspector')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()
})

app.on('window-all-closed', () => {
    app.quit()
})

ipcMain.on('search-devices-init', (e, port) => {
    searchDevices(port).on('message', (message: string) => {
        e.reply('search-devices', JSON.parse(message))
    })
})
