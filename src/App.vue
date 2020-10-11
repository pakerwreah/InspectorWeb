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
                            <Network :active="current_page === 2" :settings="settings.network" :ip="host.ip" :port="settings.port" @requests="setRequestsCount" />
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
                        <DevicePicker v-if="electron" v-model="host" :devices="devices" />
                        <IPTextField v-else v-model="host" />
                    </v-flex>
                    <v-flex shrink align-self-center>
                        <v-fade-transition>
                            <v-row v-show="current_page <= 1" class="mr-2">
                                <span class="version">
                                    <span :class="{strike: release}">v{{ version }}</span>
                                    <span v-if="release" class="white--text ml-2">v{{ release.name }}</span>
                                </span>
                                <v-icon v-if="release"
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
    import DevicePicker from './components/DevicePicker'
    import IPTextField from './components/IPTextField'
    import { settings as default_settings } from './views/settings/defaults'
    import { defaultsDeep, orderBy, debounce } from 'lodash'
    import { cancelRequests } from './plugins/http'
    import checkUpdate from './plugins/update'

    const pages = [
        {
            key: 'database',
            name: 'Database'
        },
        {
            key: 'network',
            name: 'Network'
        }
    ]

    const deviceTimeout = 8000

    export default {
        name: 'App',
        components: {
            Database,
            Network,
            Plugin,
            Settings,
            DevicePicker,
            IPTextField
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
            release: undefined
        }),
        computed: {
            electron () {
                return window.require && window.require('electron')
            },
            version () {
                return process.env.VERSION
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
            settings ({ port }) {
                if (this.electron) {
                    const { ipcRenderer } = this.electron
                    ipcRenderer.removeAllListeners('search-devices')
                    ipcRenderer.send('search-devices', port)
                    ipcRenderer.on('search-devices', (e, newDevice) => {
                        const { addresses, ...device } = newDevice
                        let devices = this.devices
                        const since = Date.now()
                        const keys = ['name', 'adapter', 'ip', 'appId', 'version']
                        for (const addr of addresses) {
                            const obj = {
                                ...device,
                                ...addr,
                                since
                            }
                            devices = devices.filter(it => keys.some(k => it[k] !== obj[k]))
                            devices.push(obj)
                        }
                        this.m_devices = orderBy(devices, keys)
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
            checkUpdate(this.version).then(data => {
                this.release = data
            })
        },
        methods: {
            open: open.bind(window),
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
            }
        }
    }
</script>
<style scoped lang='scss'>
    .version {
        font-size: 12px;
        opacity: 0.7;
    }

    .step-badge {
        position: relative;
        left: 8px;
        padding: 0 3px 0 2px !important;
    }

    .strike {
        text-decoration: line-through;
    }
</style>

<style lang="scss">
    .v-footer {
        background-color: var(--v-controls-base) !important;
        padding: 6px !important;

        .v-text-field {
            width: 245px;
        }
    }
</style>
