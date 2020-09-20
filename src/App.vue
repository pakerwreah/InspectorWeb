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
                <v-flex>
                    <v-text-field
                            v-model="baseURL"
                            class="ip-field"
                            height="25"
                            outlined
                            hide-details />
                </v-flex>
                <v-spacer />
                <span class="version">
                    v{{ version }}
                </span>
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
            settings: default_settings
        }),
        computed: {
            version () {
                return process.env.VERSION
            },
            baseURL: {
                get () {
                    return this.$http.defaults.baseURL.substr(7)
                },
                set (value) {
                    localStorage.setItem('baseURL', value)
                    this.$http.defaults.baseURL = location.protocol + '//' + value
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
            }
        },
        beforeMount () {
            this.baseURL = localStorage.getItem('baseURL') || this.baseURL
            this.settings = { ...default_settings, ...JSON.parse(localStorage.getItem('settings')) }
            const current_page = parseInt(localStorage.getItem('current_page')) || 1

            this.$http.get('/plugins').then(({ data }) => {
                this.plugins = data
            }).finally(() => {
                this.current_page = Math.min(current_page, this.pages.length)
            })
        },
        methods: {
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
    }

    .ip-field {
        width: 200px;

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
</style>
