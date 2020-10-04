import { darkModeMatcher } from './utils'

export const settings = {
  dark_mode: darkModeMatcher ? 'auto' : 'dark',
  network: {
    sleep: true,
    sort_params: true
  },
  port: '30000',
  adapter_blacklist: 'vbox0 pdp_ip0'
}
