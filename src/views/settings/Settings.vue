<template>
    <v-dialog max-width="600" v-model="open" attach>
        <v-card>
            <DialogHeader title="Settings" @close="open = false" />

            <v-card-text class="pa-0 settings-content relative">
                <v-row class="absolute-expand">
                    <v-col cols="4">
                        <v-list v-model:selected="selected" :items="pages" mandatory class="pt-0 fill-height" />
                    </v-col>
                    <v-col>
                        <v-container v-if="selected[0] === 'Theme'">
                            <v-radio-group v-model="settings.dark_mode" inline color="accent">
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
                                v-model="settings.network.sleep"
                                label="Disconnect when Network is not selected"
                                color="accent"
                                hide-details
                            />
                            <v-col offset-xs1>
                                <small>(This helps to prevent unnecessary memory and cpu usage)</small>
                            </v-col>
                            <v-switch
                                v-model="settings.network.sort_params"
                                label="Sort request parameters"
                                color="accent"
                                hide-details
                            />
                            <v-row class="mt-2">
                                <v-col>
                                    <v-text-field label="Port" v-model="settings.port" v-mask="'#####'" hide-details />
                                </v-col>
                                <v-col>
                                    <v-text-field
                                        label="Clear requests after"
                                        v-model="settings.network.limit"
                                        v-mask="'#####'"
                                        hide-details
                                    />
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col>
                                    <v-text-field
                                        label="Adapter blacklist"
                                        v-model="settings.adapter_blacklist"
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
    import { type PropType } from 'vue'
    import { vMaska } from 'maska/vue'
    import theme from '@/mixins/theme'
    import { darkModeMatcher, type Settings } from '@/lib/settings'
    import DialogHeader from '@/components/DialogHeader.vue'

    const pages = ['Theme', 'Network'] as const
    type Page = (typeof pages)[number]

    export default {
        name: 'Settings',
        components: { DialogHeader },
        directives: {
            mask: vMaska,
        },
        mixins: [theme],
        props: {
            modelValue: Boolean,
            settings: {
                type: Object as PropType<Settings>,
                required: true,
            },
        },
        data: () => ({
            selected: [pages[0]] as Page[],
        }),
        computed: {
            open: {
                get() {
                    return this.modelValue
                },
                set(value: boolean) {
                    this.$emit('update:modelValue', value)
                },
            },
            supportsThemeDetection() {
                return !!darkModeMatcher
            },
            pages() {
                return pages
            },
        },
        watch: {
            'settings.dark_mode': {
                handler(value) {
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
    }
</script>

<style lang="scss" scoped>
    .settings-content {
        min-height: 400px;
    }
</style>
