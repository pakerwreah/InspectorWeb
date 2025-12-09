const userAgent = navigator.userAgent
const win_mac = userAgent.indexOf('Win') !== -1 || userAgent.indexOf('Mac') !== -1
export const darkModeMatcher = win_mac ? window.matchMedia?.('(prefers-color-scheme: dark)') : null

export type Settings = {
    dark_mode: 'auto' | 'light' | 'dark'
    network: {
        sleep: true
        sort_params: true
        limit: '250'
    }
    port: string
    adapter_blacklist: string
}

export const defaultSettings: Settings = {
    dark_mode: darkModeMatcher ? 'auto' : 'dark',
    network: {
        sleep: true,
        sort_params: true,
        limit: '250',
    },
    port: '30000',
    adapter_blacklist: 'pdp_ip0 vboxnet4 lo0',
}
