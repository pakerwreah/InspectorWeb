<template>
    <div id="app">
        <v-app>
            <v-content>
                <v-stepper v-model="current_page" non-linear>
                    <v-stepper-header>
                        <v-stepper-step v-for="page in Pages" :key="page.key" :step="page.key"
                                        :complete="current_page === page.key"
                                        color="primary"
                                        editable>
                            <span>
                                {{ page.text }}
                                <small v-if="page.key === Pages.Network.key && requests > 0"
                                       class="relative"
                                       style="bottom: 1px">
                                    ({{ requests }})
                                </small>
                            </span>
                        </v-stepper-step>
                        <v-spacer></v-spacer>
                        <label style="cursor: pointer; display: flex">
                            <v-flex align-self-center px-3>
                                <v-icon>{{ icon_dark_mode }}</v-icon>
                                <v-switch v-show="false" v-model="dark_mode" />
                            </v-flex>
                        </label>
                    </v-stepper-header>

                    <v-stepper-items>
                        <v-stepper-content :step="Pages.Database.key">
                            <Database />
                        </v-stepper-content>
                        <v-stepper-content :step="Pages.Network.key">
                            <Network :current-page="current_page === Pages.Network.key" @requests="setRequestsCount" />
                        </v-stepper-content>
                    </v-stepper-items>
                </v-stepper>
            </v-content>

            <v-footer app>
                <v-flex xs2>
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
        </v-app>
    </div>
</template>

<script>
    import Database from './views/database/Database'
    import Network from './views/network/Network'

    const Pages = {
        Database: { key: 1, text: 'Database' },
        Network: { key: 2, text: 'Network' }
    }

    export default {
        name: 'App',
        components: {
            Database, Network
        },
        data: () => ({
            current_page: Pages.Database.key,
            requests: 0
        }),
        computed: {
            version () {
                return process.env.VERSION
            },
            Pages: () => Pages,
            icon_dark_mode () {
                return this.dark_mode ? 'mdi-white-balance-sunny' : 'mdi-weather-night'
            },
            baseURL: {
                get () {
                    return this.$http.defaults.baseURL.substr(7)
                },
                set (value) {
                    localStorage.setItem('baseURL', value)
                    this.$http.defaults.baseURL = 'http://' + value
                }
            }
        },
        watch: {
            current_page (page) {
                localStorage.setItem('current_page', page)
            }
        },
        beforeMount () {
            this.baseURL = localStorage.getItem('baseURL') || this.baseURL
            this.dark_mode = JSON.parse(localStorage.getItem('dark')) || false
            this.current_page = parseInt(localStorage.getItem('current_page')) || this.current_page
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
</style>

<style lang="scss">
    .v-footer {
        background-color: var(--v-controls-base) !important;
        padding: 6px !important;
    }

    .ip-field.v-text-field--outlined {
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
</style>
