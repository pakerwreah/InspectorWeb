const userAgent = navigator.userAgent
const win_mac = userAgent.indexOf('Win') !== -1 || userAgent.indexOf('Mac') !== -1
export const darkModeMatcher = win_mac && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
