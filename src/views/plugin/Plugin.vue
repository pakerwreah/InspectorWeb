<template>
    <div class="scrollable fill-height">
        <div class="plugin-container absolute-expand overflow-y-auto pa-2">
            <!--suppress HtmlUnknownAttribute - don't break line inside <pre>, thanks! -->
            <pre v-if="json" :class="codestyle" v-highlightjs="body"><code class="json"></code></pre>

            <div v-else v-html="body" />
        </div>
        <v-tooltip left open-delay="1200">
            <template v-slot:activator="{ on }">
                <v-fab-transition hide-on-leave>
                    <v-btn v-show="reload_visible"
                           @click.stop="reload"
                           v-on="on"
                           small
                           fab
                           fixed
                           right
                           bottom
                           v-blur>
                        <v-icon :class="{spin: loading}">mdi-sync</v-icon>
                    </v-btn>
                </v-fab-transition>
            </template>
            <span>Reload {{ plugin.name }}</span>
        </v-tooltip>
    </div>
</template>

<script>
    export default {
        name: 'Plugin',
        props: {
            active: Boolean,
            plugin: Object
        },
        data: () => ({
            loading: false,
            reload_visible: false,
            body: undefined,
            json: false
        }),
        computed: {
            codestyle () {
                return this.dark_mode ? 'dark' : 'light'
            }
        },
        watch: {
            active: {
                handler (active) {
                    if (active) {
                        setTimeout(() => {
                            this.reload_visible = true
                        }, 300)

                        this.reload()
                    } else {
                        this.reload_visible = false
                    }
                },
                immediate: true
            }
        },
        methods: {
            reload () {
                if (this.active && !this.loading) {
                    this.loading = true
                    this.$http.get('/plugins/' + this.plugin.key)
                        .then(({ data, headers }) => {
                            this.json = headers['content-type'] === 'application/json'
                            this.body = this.json ? JSON.stringify(data, null, 2) : data
                        }).finally(() => {
                            this.loading = false
                        })
                }
            }
        }
    }
</script>

<style scoped lang="scss">
    .plugin-container pre {
        word-break: break-all;
    }
</style>

<style lang="scss">
    .plugin-container {
        pre {
            &.dark {
                @import '~highlight.js/scss/night-owl';
            }

            &.light {
                @import '~highlight.js/scss/xcode';
            }
        }
    }
</style>
