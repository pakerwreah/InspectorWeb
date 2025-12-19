import { defineConfig } from 'electron-vite'
import viteConfig from './vite.config'

export default defineConfig({
    main: {
        build: {
            lib: {
                entry: './src/electron/main',
            },
        },
    },
    preload: {
        build: {
            lib: {
                entry: './src/electron/preload',
            },
        },
    },
    renderer: {
        ...viteConfig,
        root: './',
        build: {
            rollupOptions: {
                input: './index.html',
            },
        },
    },
})
