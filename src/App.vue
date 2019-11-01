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
                            {{ page.text }}
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
                            ¯\_(ツ)_/¯
                        </v-stepper-content>
                    </v-stepper-items>
                </v-stepper>
            </v-content>

            <v-footer app>
                <span>&copy; 2019</span>
            </v-footer>
        </v-app>
    </div>
</template>

<script>
    import Database from './views/Database'

    const Pages = {
        Database: { key: 1, text: 'Database' },
        Network: { key: 2, text: 'Network' }
    }

    export default {
        name: 'App',
        components: {
            Database
        },
        data: () => ({
            current_page: Pages.Database.key
        }),
        computed: {
            Pages: () => Pages,
            icon_dark_mode () {
                return this.$vuetify.theme.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'
            },
            theme () {
                return this.$vuetify.theme
            },
            dark_mode: {
                get () {
                    return this.theme.dark
                },
                set (val) {
                    this.theme.dark = val
                    localStorage.setItem('dark', JSON.stringify(val))
                }
            }
        },
        beforeMount () {
            this.theme.dark = JSON.parse(localStorage.getItem('dark'))
        }
    }
</script>

<style lang="scss">
    @import "styles/application";

    #app {
        .v-stepper {
            border-radius: 0;
        }

        .v-stepper__step {
            padding: 0 20px;
        }
        .v-stepper__step--active {
            border-bottom: solid 2px var(--v-primary-base);
        }
        .v-stepper__step__step {
            display: none;
        }
        .v-stepper__header {
            justify-content: flex-start;
            height: 40px;
        }
        .v-stepper__label {
            display: flex !important;
        }
        .v-stepper__content {
            padding: 0;
        }
        .v-stepper, .v-stepper__items, .v-stepper__content, .v-stepper__wrapper {
            height: 100%;
        }
    }
</style>
