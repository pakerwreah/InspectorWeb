<template>
    <div id="app">
        <v-app>
            <v-content>
                <v-stepper v-model="current_page" non-linear>
                    <v-stepper-header>
                        <v-stepper-step v-for="(page, i) in pages"
                                        :key="i"
                                        :step="i+1"
                                        :complete="current_page === i+1"
                                        color="primary"
                                        editable>
                            <v-layout>
                                {{ page.name }}
                                <v-flex v-if="page.key === 'network' && requests > 0"
                                        class="badge step-badge"
                                        align-self-center
                                        text-center>
                                    {{ requests }}
                                </v-flex>
                            </v-layout>
                        </v-stepper-step>
                        <v-spacer></v-spacer>
                        <v-flex align-self-center pr-1 shrink>
                            <v-flex align-self-center pr-1 shrink>
                                <v-btn icon @click="settings_popup = true">
                                    <v-icon>mdi-cog</v-icon>
                                </v-btn>
                            </v-flex>
                        </v-flex>
                    </v-stepper-header>

                    <v-stepper-items>
                        <v-stepper-content :step="1">
                            <Database />
                        </v-stepper-content>
                        <v-stepper-content :step="2">
                            <Network :active="current_page === 2" :settings="settings.network" :ip="ip" :port="settings.port" @requests="setRequestsCount" />
                        </v-stepper-content>
                        <v-stepper-content v-for="(plugin, i) in plugins" :key="plugin.key" :step="i+3">
                            <Plugin :active="current_page === i+3" :plugin="plugin" />
                        </v-stepper-content>
                    </v-stepper-items>
                </v-stepper>
            </v-content>

            <v-footer app>
                <v-layout>
                    <v-flex>
                        <v-select v-if="electron"
                                  v-model="host"
                                  :items="devices"
                                  class="ip-field"
                                  ref="devices"
                                  height="28"
                                  append-icon=""
                                  item-value='ip'
                                  item-text='name'
                                  :disabled="!devices.length"
                                  :placeholder="devices.length ? 'Select your device' : 'No devices detected'"
                                  :menu-props="{ top: true, offsetY: true, maxHeight: '100%', nudgeTop: 8 }"
                                  return-object
                                  outlined
                                  hide-details>
                            <template v-slot:prepend-inner v-if="!deviceSelected">
                                <v-flex align-self-center shrink text-center>
                                    <div v-if="devices.length" class="badge controls--text text">{{ devices.length }}</div>
                                    <v-icon v-else dense class="help neutral--text">mdi-help-circle-outline</v-icon>
                                </v-flex>
                            </template>
                            <template v-slot:selection="{item}">
                                <v-layout>
                                    <v-flex shrink align-self-center mr-2>
                                        <v-icon dense>{{ deviceIcon(item.type) }}</v-icon>
                                    </v-flex>
                                    <v-flex align-self-center class="text-no-wrap overflow-hidden">
                                        {{ item.name }} - {{ item.ip }}
                                    </v-flex>
                                </v-layout>
                            </template>
                            <template v-slot:item="{item}">
                                <v-layout>
                                    <v-flex shrink align-self-center mr-4>
                                        <v-icon>{{ deviceIcon(item.type) }}</v-icon>
                                    </v-flex>
                                    <v-flex>
                                        <v-col>
                                            <v-row>{{ item.name }}</v-row>
                                            <v-row><small>{{ item.adapter }}: {{ item.ip }}</small></v-row>
                                        </v-col>
                                    </v-flex>
                                </v-layout>
                            </template>
                        </v-select>
                        <v-text-field v-else
                                      v-model="ip"
                                      prefix="IP Address: "
                                      class="ip-field"
                                      placeholder="___.___.___.___"
                                      height="28"
                                      :error="ip.includes(':')"
                                      outlined
                                      hide-details />
                    </v-flex>
                    <v-flex shrink align-self-center>
                        <v-fade-transition>
                            <v-row v-show="current_page === 1" class="mr-2">
                                <span class="version">
                                    <span :class="{strike: release.name}">v{{ version }}</span>
                                    <span v-if="release.name" class="white--text ml-2">v{{ release.name }}</span>
                                </span>
                                <v-icon v-if="release.name"
                                        @click="open(release.url)"
                                        class="green--text pointer ml-1"
                                        small>
                                    mdi-download
                                </v-icon>
                            </v-row>
                        </v-fade-transition>
                    </v-flex>
                </v-layout>
            </v-footer>
            <Settings v-model="settings_popup" :settings.sync="settings" />
        </v-app>
    </div>
</template>

<script>
    import Database from './views/database/Database'
    import Network from './views/network/Network'
    import Plugin from './views/plugin/Plugin'
    import Settings from './views/settings/Settings'
    import { settings as default_settings } from './views/settings/defaults'
    import { defaultsDeep, orderBy, debounce } from 'lodash'
    import { cancelRequests } from './plugins/http'

    const pages = [
        { key: 'database', name: 'Database' },
        { key: 'network', name: 'Network' }
    ]

    const deviceTimeout = 8000

    export default {
        name: 'App',
        components: {
            Database, Network, Plugin, Settings
        },
        data: () => ({
            mounted: false,
            plugins: [],
            current_page: -1,
            requests: 0,
            settings_popup: false,
            settings: default_settings,
            host: { ip: '' },
            m_devices: [],
            now: Date.now(),
            release: { name: '', url: '' }
        }),
        computed: {
            electron () {
                return window.require && window.require('electron')
            },
            version () {
                return process.env.VERSION
            },
            ip: {
                get () {
                    return this.host.ip || ''
                },
                set (ip) {
                    this.host = { ip }
                }
            },
            pages () {
                return pages.concat(this.plugins)
            },
            devices () {
                return this.m_devices
                    .filter(d => !this.settings.adapter_blacklist.split(' ').includes(d.adapter))
                    .filter(d => this.now - d.since < deviceTimeout)
            },
            deviceSelected () {
                return !!this.devices.find(d => d.ip === this.host.ip)
            },
            reloadPlugins () {
                return debounce(() => {
                    this.loadPlugins()
                }, this.electron ? 100 : 1500)
            }
        },
        watch: {
            current_page (page) {
                localStorage.setItem('current_page', page)
            },
            settings_popup (open) {
                if (!open) {
                    localStorage.setItem('settings', JSON.stringify(this.settings))
                }
            },
            host (host) {
                if (host.ip) {
                    this.saveHost(host)
                    if (this.mounted && (!this.electron || this.deviceSelected)) {
                        this.reloadPlugins()
                    }
                }
            },
            deviceSelected (selected) {
                if (selected) {
                    this.saveHost(this.host)
                    this.loadPlugins()
                }
            },
            devices () {
                this.$refs.devices.$refs.menu.onResize()
            },
            settings ({ port }) {
                if (this.electron) {
                    const { ipcRenderer } = this.electron
                    ipcRenderer.removeAllListeners('search-devices')
                    ipcRenderer.send('search-devices', port)
                    ipcRenderer.on('search-devices', (e, newDevice) => {
                        const { addresses, ...device } = newDevice
                        let devices = [...this.m_devices]
                        const since = Date.now()
                        for (const addr of addresses) {
                            devices = devices.filter(it => it.ip !== addr.ip)
                            devices.push({ ...device, ...addr, since })
                        }
                        this.m_devices = orderBy(devices, ['name', 'adapter', 'ip'])
                    })
                }
            }
        },
        created () {
            this.$http.defaults.baseURL = ''
            setInterval(this.ticker, deviceTimeout)
        },
        beforeMount () {
            if (this.electron) {
                this.electron.ipcRenderer.removeAllListeners('search-devices')
            }

            this.settings = defaultsDeep(JSON.parse(localStorage.getItem('settings')), default_settings)
            this.host = JSON.parse(localStorage.getItem('host')) || {}

            if (this.host.ip) {
                this.$nextTick(() => {
                    this.loadPlugins()
                })
            }
        },
        mounted () {
            this.$nextTick(() => {
                this.mounted = true
            })
            this.checkUpdate()
        },
        methods: {
            open,
            ticker () {
                this.now = Date.now()
            },
            saveHost (host) {
                this.$http.defaults.baseURL = `http://${host.ip}:${this.settings.port}`
                localStorage.setItem('host', JSON.stringify(host))
            },
            loadPlugins () {
                cancelRequests()
                return this.$http.get('/plugins').then(({ data }) => {
                    this.plugins = data
                }).finally(() => {
                    const current_page = parseInt(localStorage.getItem('current_page'))
                    this.current_page = Math.min(Math.max(1, current_page), this.pages.length)
                })
            },
            setRequestsCount (count) {
                this.requests = count
            },
            deviceIcon (type) {
                return {
                    ios: 'mdi-cellphone-iphone',
                    android: 'mdi-cellphone-android'
                }[type] || 'mdi-laptop'
            },
            checkUpdate () {
                this.$http.get('https://api.github.com/repos/pakerwreah/InspectorWeb/releases/latest')
                    .then(({ data }) => {
                        const { html_url, name } = data
                        if (name) {
                            const new_version = name.replace(/[^\d.]/, '')
                            if (name !== new_version) {
                                const p_old = this.version.split('.')
                                const p_new = new_version.split('.')

                                if (p_old.length === p_new.length) {
                                    for (let i = 0; i < p_new.length; i++) {
                                        if (parseInt(p_new[i]) < parseInt(p_old[i])) {
                                            return
                                        }
                                    }
                                    this.release = {
                                        name: new_version,
                                        url: html_url
                                    }
                                }
                            }
                        }
                    })
            }
        }
    }
</script>
<style scoped lang='scss'>
    .version {
        font-size: 12px;
        opacity: 0.7;
    }

    .badge {
        font-size: 9px;
        border-radius: 8px;
        line-height: 16px;
        min-width: 16px;
        background-color: #aaaaaa88;
        padding: 0 2px 0 2px;

        &.step-badge {
            position: relative;
            left: 8px;
            padding: 0 3px 0 2px;
        }
    }
</style>

<style lang="scss">
    .v-footer {
        background-color: var(--v-controls-base) !important;
        padding: 6px !important;

        .ip-field {
            width: 245px;
            min-width: min-content;

            &.error--text input {
                color: var(--v-error-base);
            }

            &.v-text-field--outlined {
                fieldset {
                    border-width: 0 !important;
                }

                .v-input__slot {
                    min-height: 0 !important;
                    background-color: var(--v-controls-darken1);

                    input:not(:disabled):not(:empty)::placeholder {
                        color: var(--v-text-base);
                    }

                    .v-input__prepend-inner, .v-input__append-inner {
                        margin-top: auto;
                        margin-bottom: auto;
                        opacity: 0.7;
                        font-weight: bold;
                        width: 30px;

                        .badge {
                            font-size: 12px;
                        }
                    }

                    .v-select__selections {
                        flex-wrap: nowrap;
                    }
                }
            }

            &.v-input--is-label-active .v-input__append-inner {
                display: none;
            }
        }

        .strike {
            text-decoration: line-through;
        }
    }
</style>
