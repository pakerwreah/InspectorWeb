<template>
    <div id="app">
        <v-app>
            <v-content>
                <v-stepper class="fill-height" v-model="current_page" non-linear>
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
                                <v-switch v-show="false" v-model="$vuetify.theme.dark" />
                            </v-flex>
                        </label>
                    </v-stepper-header>

                    <v-stepper-items>
                        <v-stepper-content :step="Pages.Database.key">
                            <HelloWorld />
                        </v-stepper-content>
                    </v-stepper-items>
                    <v-stepper-items>
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
    import HelloWorld from './views/HelloWorld'

    const Pages = {
        Database: { key: 1, text: 'Database' },
        Network: { key: 2, text: 'Network' }
    }

    export default {
        name: 'App',
        components: {
            HelloWorld
        },
        data: () => ({
            current_page: Pages.Database.key
        }),
        computed: {
            Pages: () => Pages,
            icon_dark_mode () {
                return this.$vuetify.theme.dark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'
            }
        }
    }
</script>

<style lang="scss">
    @import "styles/application";

    #app {
        .v-stepper__step {
            padding: 0 20px;
            height: 100%;
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
    }
</style>
