<template>
    <v-app>
        <v-tabs v-model="current_page" bg-color="controls">
            <v-tab v-for="(page, i) in pages" :key="i" color="primary">
                <v-layout>
                    {{ page.name }}
                    <v-col
                        v-if="page.key === 'network' && requests > 0"
                        class="badge step-badge"
                        align-self-center
                        text-center
                    >
                        {{ requests }}
                    </v-col>
                </v-layout>
            </v-tab>
            <v-spacer></v-spacer>
            <v-btn icon class="mx-1 align-self-center" @click="settings_popup = true">
                <v-icon>mdi-cog</v-icon>
            </v-btn>
        </v-tabs>

        <v-main>
            <v-tabs-window v-model="current_page">
                <v-tabs-window-item>
                    <Database />
                </v-tabs-window-item>
                <v-tabs-window-item>
                    <Network
                        :active="current_page === 1"
                        :settings="settings.network"
                        :ip="host.ip"
                        :port="settings.port"
                        @requests="setRequestsCount"
                    />
                </v-tabs-window-item>
                <v-tabs-window-item v-for="(plugin, i) in plugins" :key="plugin.key" :step="i + 3">
                    <Plugin :active="current_page === i + 3" :plugin="plugin" />
                </v-tabs-window-item>
            </v-tabs-window>
        </v-main>

        <v-footer app color="controls">
            <v-row>
                <v-col>
                    <v-row>
                        <v-col>
                            <DevicePicker v-if="show_device_picker" v-model:value="host" :devices="devices" />
                            <IPTextField v-else v-model="host" />
                        </v-col>
                        <v-col>
                            <v-btn
                                v-if="electron"
                                style="margin: -5px 0"
                                fab
                                x-small
                                icon
                                @click="show_device_picker = !show_device_picker"
                            >
                                <v-icon v-text="show_device_picker ? 'mdi-pencil' : 'mdi-radar'" />
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-col>
                <v-spacer />
                <div class="align-self-center mr-2">
                    <v-fade-transition>
                        <v-row v-show="current_page === 0" class="mr-2">
                            <span class="version">
                                <span :class="{ strike: release }">v{{ version }}</span>
                                <span v-if="release" class="text-white ml-2">v{{ release.name }}</span>
                            </span>
                            <v-icon v-if="release" @click="open(release.url)" class="text-green pointer ml-1">
                                mdi-download
                            </v-icon>
                        </v-row>
                    </v-fade-transition>
                </div>
            </v-row>
        </v-footer>
        <Settings v-model="settings_popup" v-model:settings="settings" />
    </v-app>
</template>

<script>
    import Database from './views/database/Database.vue'
    import Network from './views/network/Network.vue'
    import Plugin from './views/plugin/Plugin.vue'
    import Settings from './views/settings/Settings.vue'
    import DevicePicker from './components/DevicePicker.vue'
    import IPTextField from './components/IPTextField.vue'
    import { defaultsDeep, orderBy, debounce } from 'lodash'
    import http, { cancelRequests } from './lib/http'
    import { defaultSettings } from './lib/settings'
    import checkUpdate from './plugins/update'

    const fixed_pages = [
        {
            key: 'database',
            name: 'Database',
        },
        {
            key: 'network',
            name: 'Network',
        },
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
            IPTextField,
        },
        data: () => ({
            mounted: false,
            plugins: [],
            current_page: -1,
            requests: 0,
            settings_popup: false,
            settings: defaultSettings,
            host: { ip: '' },
            m_devices: [],
            now: Date.now(),
            release: undefined,
            show_device_picker: false,
        }),
        computed: {
            electron() {
                return window.electron
            },
            version() {
                return APP_VERSION
            },
            pages() {
                return fixed_pages.concat(this.plugins)
            },
            devices() {
                return this.m_devices
                    .filter((d) => !this.settings.adapter_blacklist.split(' ').includes(d.adapter))
                    .filter((d) => this.now - d.since < deviceTimeout)
            },
            deviceSelected() {
                return !!this.devices.find((d) => d.ip === this.host.ip)
            },
            reloadPlugins() {
                return debounce(
                    () => {
                        this.loadPlugins()
                    },
                    this.electron ? 100 : 1500,
                )
            },
        },
        watch: {
            current_page(page) {
                localStorage.setItem('current_page', page)
            },
            show_device_picker(show) {
                localStorage.setItem('show_device_picker', show)
            },
            settings_popup(open) {
                if (!open) {
                    localStorage.setItem('settings', JSON.stringify(this.settings))
                }
            },
            host(host) {
                if (host.ip) {
                    this.saveHost(host)
                    if (this.mounted && (!this.electron || this.deviceSelected)) {
                        this.reloadPlugins()
                    }
                }
            },
            deviceSelected(selected) {
                if (selected) {
                    this.saveHost(this.host)
                    this.loadPlugins()
                }
            },
            settings({ port }) {
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
                                since,
                            }
                            devices = devices.filter((it) => keys.some((k) => it[k] !== obj[k]))
                            devices.push(obj)
                        }
                        this.m_devices = orderBy(devices, keys)
                    })
                }
            },
        },
        created() {
            http.defaults.baseURL = ''
            setInterval(this.ticker, deviceTimeout)
        },
        beforeMount() {
            if (this.electron) {
                this.electron.ipcRenderer.removeAllListeners('search-devices')
            }

            this.settings = defaultsDeep(JSON.parse(localStorage.getItem('settings')), defaultSettings)
            this.host = JSON.parse(localStorage.getItem('host')) || {}
            this.show_device_picker = JSON.parse(localStorage.getItem('show_device_picker') || !!this.electron)

            if (this.host.ip) {
                this.$nextTick(() => {
                    this.loadPlugins()
                })
            }
        },
        mounted() {
            this.$nextTick(() => {
                this.mounted = true
            })
            checkUpdate(this.version).then((data) => {
                this.release = data
            })
        },
        methods: {
            open: open.bind(window),
            ticker() {
                this.now = Date.now()
            },
            saveHost(host) {
                http.defaults.baseURL = `http://${host.ip}:${this.settings.port}`
                localStorage.setItem('host', JSON.stringify(host))
            },
            async loadPlugins() {
                cancelRequests()
                try {
                    const { data } = await http.get('/plugins')
                    this.plugins = data
                } finally {
                    const current_page = parseInt(localStorage.getItem('current_page')) || 0
                    this.current_page = Math.min(current_page, this.pages.length - 1)
                }
            },
            setRequestsCount(count) {
                this.requests = count
            },
        },
    }
</script>

<style scoped lang="scss">
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
