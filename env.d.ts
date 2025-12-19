/// <reference types="vite/client" />

declare const APP_VERSION: string

declare namespace NodeJS {
    type Timeout = ReturnType<typeof setTimeout>
}
