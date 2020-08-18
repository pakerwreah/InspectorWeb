<template>
    <div class="scrollable fill-height">
        <div class="plugin-container absolute-expand overflow-y-auto pa-2">
            <!--suppress HtmlUnknownAttribute - don't break line inside <pre>, thanks! -->
            <pre v-if="json" :class="codestyle" v-highlightjs="body"><code class="json"></code></pre>

            <div v-else-if="plugin.live" class='absolute-expand d-flex'>
                <iframe ref="iframe" class='flex' :src='frame_src' @load="frame_loaded"></iframe>
            </div>

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
            load_uid: null,
            loaded: false,
            loading: false,
            reload_visible: false,
            body: undefined,
            json: false
        }),
        computed: {
            codestyle () {
                return this.dark_mode ? 'dark' : 'light'
            },
            frame_src () {
                return this.load_uid && `${this.$http.defaults.baseURL}/plugins/${this.plugin.key}?${this.load_uid}`
            }
        },
        watch: {
            active: {
                handler (active) {
                    if (active) {
                        setTimeout(() => {
                            this.reload_visible = true
                        }, 300)

                        if (!this.loaded) {
                            this.reload()
                        }
                    } else {
                        this.reload_visible = false
                    }
                },
                immediate: true
            },
            codestyle: 'syncFrame'
        },
        methods: {
            sendMessage (message) {
                const iframe = this.$refs.iframe
                if (iframe) {
                    iframe.contentWindow.postMessage(message, '*')
                }
            },
            syncFrame () {
                this.sendMessage({
                    plugin: this.plugin.key,
                    host: this.$http.defaults.baseURL,
                    theme: this.codestyle,
                    colors: this.$vuetify.theme.currentTheme
                })
            },
            frame_loaded () {
                if (this.frame_src) {
                    this.loaded = true
                    this.loading = false
                    this.syncFrame()
                }
            },
            reload () {
                if (this.active && !this.loading) {
                    this.loading = true
                    if (this.plugin.live) {
                        this.load_uid = Date.now()
                    } else {
                        this.$http.get('/plugins/' + this.plugin.key)
                            .then(({ data, headers }) => {
                                this.loaded = true
                                this.json = headers['content-type'] === 'application/json'
                                this.body = this.json ? JSON.stringify(data, null, 2) : data
                            }).finally(() => {
                                this.loading = false
                            })
                    }
                }
            }
        }
    }
</script>

<style scoped lang="scss">
    .plugin-container pre {
        word-break: break-all;
    }
    iframe {
        border: none;
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
