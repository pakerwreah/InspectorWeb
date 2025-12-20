<template>
    <v-dialog max-width="600" v-model="m_open" attach>
        <v-card>
            <DialogHeader title="Settings" @close="m_open = false" />

            <v-card-text class="pa-0 settings-content relative">
                <v-row class="absolute-expand">
                    <v-col cols="4">
                        <v-list v-model:selected="selected" :items="pages" mandatory class="pt-0 fill-height" />
                    </v-col>
                    <v-col>
                        <v-container v-if="selected[0] === 'Theme'">
                            <v-radio-group v-model="m_settings.dark_mode" inline color="accent">
                                <v-radio
                                    label="Light"
                                    value="light"
                                    true-icon="mdi-white-balance-sunny"
                                    class="flex-fill"
                                />
                                <v-radio label="Dark" value="dark" true-icon="mdi-weather-night" class="flex-fill" />
                                <v-radio
                                    v-if="supportsThemeDetection"
                                    label="Automatic"
                                    value="auto"
                                    true-icon="mdi-theme-light-dark"
                                    class="flex-fill"
                                />
                            </v-radio-group>
                        </v-container>
                        <v-container v-if="selected[0] === 'Network'">
                            <v-switch
                                v-model="m_settings.network.sleep"
                                label="Disconnect when Network is not selected"
                                color="accent"
                                hide-details
                            />
                            <v-col offset-xs1>
                                <small>(This helps to prevent unnecessary memory and cpu usage)</small>
                            </v-col>
                            <v-switch
                                v-model="m_settings.network.sort_params"
                                label="Sort request parameters"
                                color="accent"
                                hide-details
                            />
                            <v-row class="mt-2">
                                <v-col>
                                    <v-text-field
                                        label="Port"
                                        v-model="m_settings.port"
                                        v-mask="'#####'"
                                        hide-details
                                    />
                                </v-col>
                                <v-col>
                                    <v-text-field
                                        label="Clear requests after"
                                        v-model="m_settings.network.limit"
                                        v-mask="'#####'"
                                        hide-details
                                    />
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col>
                                    <v-text-field
                                        label="Adapter blacklist"
                                        v-model="m_settings.adapter_blacklist"
                                        hide-details
                                    />
                                </v-col>
                            </v-row>
                        </v-container>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import { defineComponent, type PropType } from 'vue'
    import { vMaska } from 'maska/vue'
    import theme from '@/mixins/theme'
    import { darkModeMatcher, type Settings } from '@/lib/settings'
    import DialogHeader from '@/components/DialogHeader.vue'

    const pages = ['Theme', 'Network'] as const
    type Page = (typeof pages)[number]

    export default defineComponent({
        name: 'Settings',
        components: { DialogHeader },
        directives: {
            mask: vMaska,
        },
        mixins: [theme],
        props: {
            open: {
                type: Boolean,
                required: true,
            },
            settings: {
                type: Object as PropType<Settings>,
                required: true,
            },
        },
        data() {
            return {
                selected: [pages[0]] as Page[],
                m_settings: this.settings,
            }
        },
        computed: {
            m_open: {
                get() {
                    return this.open
                },
                set(value: boolean) {
                    this.$emit('update:open', value)
                },
            },
            supportsThemeDetection() {
                return !!darkModeMatcher
            },
            pages() {
                return pages
            },
            settings_dark_mode() {
                return this.settings.dark_mode
            },
        },
        watch: {
            m_settings: {
                handler(value: Settings) {
                    this.$emit('update:settings', value)
                },
                deep: true,
            },
            settings_dark_mode: {
                handler(value: Settings['dark_mode']) {
                    if (value === 'auto') {
                        this.dark_mode = !!darkModeMatcher?.matches
                    } else {
                        this.dark_mode = value === 'dark'
                    }
                },
                immediate: true,
            },
        },
        mounted() {
            darkModeMatcher?.addEventListener('change', (e) => this.darkModeObserver(e))
        },
        beforeUnmount() {
            darkModeMatcher?.removeEventListener('change', (e) => this.darkModeObserver(e))
        },
        methods: {
            darkModeObserver(e: MediaQueryListEvent) {
                if (this.settings.dark_mode === 'auto') {
                    this.dark_mode = e.matches
                }
            },
        },
    })
</script>

<style lang="scss" scoped>
    .settings-content {
        min-height: 400px;
    }
</style>
