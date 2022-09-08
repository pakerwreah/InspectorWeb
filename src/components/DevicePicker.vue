<template>
    <v-select v-model="host"
              :items="devices"
              class="device-picker"
              ref="devices"
              height="28"
              append-icon=""
              item-value='ip'
              item-text='name'
              :disabled="!devices.length"
              :placeholder="devices.length ? 'Select your device' : 'No devices detected'"
              :menu-props="{ top: true, offsetY: true, maxHeight: '100%', nudgeTop: 8 }"
              return-object
              outlined
              hide-details
              hide-selected>
        <template v-slot:prepend-inner v-if="!selected">
            <v-flex align-self-center shrink text-center>
                <div v-if="devices.length" class="badge controls--text text">{{ devices.length }}</div>
                <v-icon v-else dense class="neutral--text">mdi-help-circle-outline</v-icon>
            </v-flex>
        </template>
        <template v-slot:selection="{item}">
            <v-layout>
                <v-flex shrink align-self-center mr-2>
                    <v-icon dense>{{ deviceIcon(item.type) }}</v-icon>
                </v-flex>
                <v-flex align-self-center class="text-no-wrap overflow-hidden">
                    {{ item.name }} - {{ item.ip }}
                </v-flex>
            </v-layout>
        </template>
        <template v-slot:item="{item}">
            <v-layout>
                <v-flex shrink align-self-center mr-4>
                    <v-icon>{{ deviceIcon(item.type) }}</v-icon>
                </v-flex>
                <v-flex>
                    <v-col>
                        <v-row>{{ item.name }}</v-row>
                        <v-row>
                            <v-label v-if="item.appId" disabled>
                                <small>{{ item.appId }} ({{ item.version }})</small>
                            </v-label>
                        </v-row>
                        <v-row><small>{{ item.adapter }}: {{ item.ip }}</small></v-row>
                    </v-col>
                </v-flex>
            </v-layout>
        </template>
    </v-select>
</template>

<script>
    export default {
        name: 'DevicePicker',
        props: {
            value: Object,
            devices: Array
        },
        computed: {
            host: {
                get () {
                    return this.value
                },
                set (value) {
                    this.$emit('input', value)
                }
            },
            selected () {
                return !!this.devices.find(d => d.ip === this.host.ip)
            }
        },
        watch: {
            devices () {
                this.$refs.devices.$refs.menu.onResize()
            }
        },
        methods: {
            deviceIcon (type) {
                return {
                    ios: 'mdi-apple',
                    android: 'mdi-android'
                }[type] || 'mdi-laptop'
            }
        }
    }
</script>

<style lang="scss">
    .device-picker {
        min-width: min-content;

        &.v-text-field--outlined {
            fieldset {
                border-width: 0 !important;
            }

            .v-input__slot {
                min-height: 0 !important;

                input:not(:disabled):not(:empty)::placeholder {
                    color: var(--v-text-base);
                }

                .v-input__prepend-inner {
                    margin-top: auto;
                    margin-bottom: auto;
                    opacity: 0.7;
                    font-weight: bold;
                    width: 30px;
                }

                .v-select__selections {
                    flex-wrap: nowrap;
                }
            }
        }
    }
</style>
