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
                                        class="badge"
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
                            <Network :active="current_page === 2" :settings="settings.network" @requests="setRequestsCount" />
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
                                  height="28"
                                  append-icon=""
                                  item-value='ip'
                                  item-text='name'
                                  :loading="!devices.length"
                                  :menu-props="{ top: true, offsetY: true }"
                                  return-object
                                  outlined
                                  hide-details>
                            <template v-slot:selection="{item}">
                                <v-layout>
                                    <v-flex shrink align-self-center mr-5>
                                        <v-icon>{{ deviceIcon(item.type) }}</v-icon>
                                    </v-flex>
                                    <v-flex align-self-center>
                                        {{ [item.name, item.ip].filter(i => i).join(' - ') }}
                                    </v-flex>
                                </v-layout>
                            </template>
                            <template v-slot:item="{item}">
                                <v-layout>
                                    <v-flex shrink align-self-center mr-5>
                                        <v-icon>{{ deviceIcon(item.type) }}</v-icon>
                                    </v-flex>
                                    <v-flex>
                                        <v-col>
                                            <v-row>{{ item.name }}</v-row>
                                            <v-row><small>{{ item.ip }}</small></v-row>
                                        </v-col>
                                    </v-flex>
                                </v-layout>
                            </template>
                        </v-select>
                        <v-text-field v-else
                                      v-model="baseURL"
                                      class="ip-field"
                                      height="25"
                                      :error="baseURL.includes(':')"
                                      outlined
                                      hide-details />
                    </v-flex>
                    <v-flex shrink align-self-center>
                        <span class="version">
                            v{{ version }}
                        </span>
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

    const pages = [
        { key: 'database', name: 'Database' },
        { key: 'network', name: 'Network' }
    ]

    export default {
        name: 'App',
        components: {
            Database, Network, Plugin, Settings
        },
        data: () => ({
            plugins: [],
            current_page: -1,
            requests: 0,
            settings_popup: false,
            settings: default_settings,
            host: { ip: '' },
            devices: []
        }),
        computed: {
            electron () {
                return window.require && window.require('electron')
            },
            version () {
                return process.env.VERSION
            },
            baseURL: {
                get () {
                    return this.host.ip
                },
                set (ip) {
                    this.host = { ip }
                }
            },
            pages () {
                return pages.concat(this.plugins)
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
                this.$http.defaults.baseURL = `http://${host.ip}:${this.settings.port}`
                localStorage.setItem('host', JSON.stringify(host))
                this.reloadPlugins()
            },
            'settings.port' (port) {
                if (this.electron) {
                    const { ipcRenderer } = this.electron
                    ipcRenderer.send('search-devices', port)
                    ipcRenderer.on('search-devices', (e, newDevice) => {
                        const devices = this.devices.filter(it => it.name !== newDevice.name)
                        const { addresses, ...device } = newDevice
                        for (const addr of addresses) {
                            devices.push({ ...device, ...addr })
                        }
                        this.devices = orderBy(devices, ['name'])
                    })
                }
            }
        },
        beforeMount () {
            if (this.electron) {
                this.electron.ipcRenderer.removeAllListeners('search-devices')
            }

            this.host = JSON.parse(localStorage.getItem('host')) || { ip: 'localhost' }
            this.settings = defaultsDeep(JSON.parse(localStorage.getItem('settings')), default_settings)
            const current_page = parseInt(localStorage.getItem('current_page')) || 1

            this.loadPlugins(current_page)
        },
        methods: {
            loadPlugins (current_page) {
                return this.$http.get('/plugins').then(({ data }) => {
                    this.plugins = data
                }).finally(() => {
                    this.current_page = Math.min(current_page, this.pages.length)
                })
            },
            reloadPlugins: debounce(function () {
                this.current_page = 1
                this.loadPlugins(this.current_page)
            }, 1500),
            setRequestsCount (count) {
                this.requests = count
            },
            deviceIcon (type) {
                switch (type) {
                    case 'ios': return 'mdi-cellphone-iphone'
                    case 'android': return 'mdi-cellphone-android'
                    default: return 'mdi-laptop'
                }
            }
        }
    }
</script>
<style scoped lang='scss'>
    .version {
        font-size: 12px;
        opacity: 0.7;
        margin-right: 10px;
    }

    .badge {
        font-size: 9px;
        border-radius: 8px;
        line-height: 16px;
        min-width: 16px;
        background-color: #aaaaaa88;
        padding: 0 3px 0 2px;
        position: relative;
        left: 8px;
    }
</style>

<style lang="scss">
    .v-footer {
        background-color: var(--v-controls-base) !important;
        padding: 6px !important;

        .ip-field {
            width: 350px;
        }

        .v-text-field {
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

                    input {
                        opacity: 0.7;
                    }
                }
            }
        }
    }
</style>
