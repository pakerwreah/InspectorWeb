<template>
    <v-app>
        <v-tabs v-model="current_page" bg-color="controls">
            <v-tab v-for="(page, i) in pages" :key="i" color="primary">
                <v-row class="px-3 text-none">
                    {{ page.name }}
                    <v-col v-if="page.key === 'network' && requests > 0" class="badge tab-badge">
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
                <v-tabs-window-item v-for="(plugin, i) in plugins" :key="plugin.key">
                    <Plugin :active="current_page === i + 2" :plugin="plugin" />
                </v-tabs-window-item>
            </v-tabs-window>
        </v-main>

        <v-footer app color="controls">
            <v-row>
                <v-col class="d-flex flex-row align-center ga-2">
                    <div class="flex-shrink-1">
                        <DevicePicker v-if="show_device_picker" v-model:host="host" :settings="settings" />
                        <IPTextField v-else v-model="host" />
                    </div>
                    <v-btn v-if="electron" size="small" icon @click="show_device_picker = !show_device_picker">
                        <v-icon>{{ show_device_picker ? 'mdi-pencil' : 'mdi-radar' }}</v-icon>
                    </v-btn>
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
    import { defaultsDeep, debounce } from 'lodash'
    import http from './lib/http'
    import { defaultSettings } from './lib/settings'
    import { checkUpdate } from './plugins/update'
    import { defineComponent } from 'vue'
    import type { Device, Host } from '@/types'
    import type { ElectronAPI } from '@electron-toolkit/preload'

    type Release = {
        name: string
        url: string
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
            release: undefined as Release | undefined,
            show_device_picker: false,
            loadPluginsAbortController: new AbortController(),
        }),
        computed: {
            electron(): ElectronAPI {
                return (window as any).electron
            },
            version() {
                return APP_VERSION
            },
            pages() {
                return fixed_pages.concat(this.plugins)
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
                    if (this.mounted) {
                        this.reloadPlugins()
                    }
                }
            },
        },
        created() {
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

    .tab-badge {
        color: rgb(var(--v-theme-text));
        position: relative;
        left: 8px;
        padding: 0 3px 0 2px !important;
    }

    .strike {
        text-decoration: line-through;
    }
</style>
