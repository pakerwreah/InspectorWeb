<template>
    <div class="scrollable fill-height bg-panel">
        <div class="plugin-container absolute-expand overflow-y-auto pa-2">
            <highlightjs v-if="json" :class="codestyle" :code="body" language="json" />

            <div v-else-if="plugin.live" class="absolute-expand d-flex">
                <iframe ref="iframe" class="flex-1-1" :src="frame_src" @load="frame_loaded"></iframe>
            </div>

            <div v-else v-html="body" />
        </div>

        <div class="floating-buttons">
            <v-fab-transition hide-on-leave>
                <v-fab v-show="reload_visible" @click.stop="reload" icon>
                    <v-icon :class="{ spin: loading }">mdi-sync</v-icon>
                    <v-tooltip location="start" activator="parent" :open-delay="1200">
                        Reload {{ plugin.name }}
                    </v-tooltip>
                </v-fab>
            </v-fab-transition>
        </div>
    </div>
</template>

<script>
    import http from '@/lib/http'
    import theme from '@/mixins/theme'
    import { highlightjs } from '@/plugins/highlight'
    import { deepToRaw } from '@/lib/utils'

    export default {
        name: 'Plugin',
        components: { highlightjs },
        mixins: [theme],
        props: {
            active: Boolean,
            plugin: Object,
        },
        data: () => ({
            load_uid: null,
            loaded: false,
            loading: false,
            reload_visible: false,
            body: undefined,
            json: false,
        }),
        computed: {
            codestyle() {
                return this.dark_mode ? 'dark' : 'light'
            },
            frame_src() {
                return this.load_uid && `${http.defaults.baseURL}/plugins/${this.plugin.key}?${this.load_uid}`
            },
        },
        watch: {
            active: {
                handler(active) {
                    if (active) {
                        setTimeout(() => {
                            this.reload_visible = true
                        }, 500)

                        if (!this.loaded) {
                            this.reload()
                        }
                    } else {
                        this.reload_visible = false
                    }
                },
                immediate: true,
            },
            codestyle: 'syncFrame',
        },
        methods: {
            sendMessage(message) {
                const iframe = this.$refs.iframe
                if (iframe) {
                    iframe.contentWindow.postMessage(deepToRaw(message), '*')
                }
            },
            syncFrame() {
                this.sendMessage({
                    plugin: this.plugin.key,
                    host: http.defaults.baseURL,
                    theme: this.codestyle,
                    colors: this.$vuetify.theme.current.colors,
                })
            },
            frame_loaded() {
                if (this.frame_src) {
                    this.loaded = true
                    this.loading = false
                    this.syncFrame()
                }
            },
            reload() {
                if (this.active && !this.loading) {
                    this.loading = true
                    if (this.plugin.live) {
                        this.load_uid = Date.now()
                    } else {
                        http.get('/plugins/' + this.plugin.key)
                            .then(({ data, headers }) => {
                                this.loaded = true
                                this.json = headers['content-type'] === 'application/json'
                                this.body = this.json ? JSON.stringify(data, null, 2) : data
                            })
                            .finally(() => {
                                this.loading = false
                            })
                    }
                }
            },
        },
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
    @use 'sass:meta';

    .plugin-container {
        pre {
            &.dark {
                @include meta.load-css('highlight.js/scss/night-owl');
            }

            &.light {
                @include meta.load-css('highlight.js/scss/xcode');
            }
        }
    }
</style>
