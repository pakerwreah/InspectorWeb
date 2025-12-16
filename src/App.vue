<template>
    <v-app>
        <v-tabs v-model="current_page" bg-color="controls">
            <v-tab v-for="(page, i) in pages" :key="i" color="primary">
                <v-row class="px-3">
                    {{ page.name }}
                    <v-col v-if="page.key === 'network' && requests > 0" class="badge step-badge">
                        {{ requests }}
                    </v-col>
                </v-row>
            </v-tab>
            <v-spacer></v-spacer>
            <v-btn icon class="mx-1 align-self-center" @click="settings_popup = true">
                <v-icon>mdi-cog</v-icon>
            </v-btn>
        </v-tabs>

        <v-main class="flex-1-1-0 overflow-hidden">
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
                    <Plugin :active="current_page === i + 2" :plugin="plugin" />
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
                        <v-col cols="1">
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

<script lang="ts">
    import Database from './views/database/Database.vue'
    import Network from './views/network/Network.vue'
    import Plugin from './views/plugin/Plugin.vue'
    import Settings from './views/settings/Settings.vue'
    import DevicePicker from './components/DevicePicker.vue'
    import IPTextField from './components/IPTextField.vue'
    import { defaultsDeep, orderBy, debounce, uniqBy, pick } from 'lodash'
    import http from './lib/http'
    import { defaultSettings } from './lib/settings'
    import checkUpdate from './plugins/update'
    import { defineComponent } from 'vue'

    type Device = {
        name: string
        adapter: string
        ip: string
        since: number
    }

    type Release = {
        name: string
        url: string
    }

    type Host = {
        ip: string
    }

    type Page = {
        key: string
        name: string
    }

    const fixed_pages: Page[] = [
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

    export default defineComponent({
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
            plugins: [] as Page[],
            current_page: -1,
            requests: 0,
            settings_popup: false,
            settings: defaultSettings,
            host: { ip: '' } as Host,
            m_devices: [] as Device[],
            now: Date.now(),
            release: undefined as Release | undefined,
            show_device_picker: false,
            tickerInterval: 0,
            loadPluginsAbortController: new AbortController(),
        }),
        computed: {
            electron() {
                return (window as any).electron
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

                    type DeviceInfo = {
                        type: string
                        name: string
                        appId: string
                        version: string
                    }

                    type IPAddress = {
                        ip: string
                        adapter: string
                    }

                    type NewDevice = DeviceInfo & { addresses: IPAddress[] }

                    ipcRenderer.on('search-devices', (_: void, newDevice: NewDevice) => {
                        const { addresses, ...device } = newDevice
                        const devices = this.devices
                        const since = Date.now()
                        for (const addr of addresses) {
                            const obj: Device = {
                                ...device,
                                ...addr,
                                since,
                            }
                            devices.push(obj)
                        }
                        const keys = ['name', 'adapter', 'ip', 'appId', 'version']
                        this.m_devices = orderBy(
                            uniqBy(devices, (elem) => JSON.stringify(pick(elem, keys))),
                            keys,
                        )
                    })
                }
            },
        },
        beforeUnmount() {
            clearInterval(this.tickerInterval)
        },
        created() {
            if (this.electron) {
                this.electron.ipcRenderer.removeAllListeners('search-devices')
                this.tickerInterval = setInterval(this.ticker, deviceTimeout)
            }

            const getStorageItem = (key: string) => {
                const item = localStorage.getItem(key)
                if (item)
                    try {
                        return JSON.parse(item)
                    } catch (e) {
                        console.error(e)
                    }
            }

            this.settings = defaultsDeep(getStorageItem('settings'), defaultSettings)
            this.host = getStorageItem('host') ?? {}
            this.show_device_picker = getStorageItem('show_device_picker') || !!this.electron

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
            saveHost(host: Host) {
                http.defaults.baseURL = `http://${host.ip}:${this.settings.port}`
                localStorage.setItem('host', JSON.stringify(host))
            },
            async loadPlugins() {
                try {
                    this.loadPluginsAbortController.abort()
                    this.loadPluginsAbortController = new AbortController()

                    const { data } = await http.get('/plugins', {
                        signal: this.loadPluginsAbortController.signal,
                    })
                    this.plugins = data
                } finally {
                    const current_page = parseInt(localStorage.getItem('current_page') ?? '0')
                    this.current_page = Math.min(current_page, this.pages.length - 1)
                }
            },
            setRequestsCount(count: number) {
                this.requests = count
            },
        },
    })
</script>

<style scoped lang="scss">
    .version {
        font-size: 12px;
        opacity: 0.7;
    }

    .step-badge {
        color: rgb(var(--v-theme-text));
        position: relative;
        left: 8px;
        padding: 0 3px 0 2px !important;
    }

    .strike {
        text-decoration: line-through;
    }
</style>
