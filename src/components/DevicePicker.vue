<template>
    <v-select
        v-model="host"
        :items="devices"
        class="device-picker"
        ref="devices"
        height="28"
        append-icon=""
        item-value="ip"
        item-text="name"
        :disabled="!devices.length"
        :placeholder="devices.length ? 'Select your device' : 'No devices detected'"
        :menu-props="{ top: true, offsetY: true, maxHeight: '100%', nudgeTop: 8 }"
        return-object
        outlined
        hide-details
        hide-selected
    >
        <template v-slot:prepend-inner v-if="!selected">
            <v-col align-self-center shrink text-center>
                <div v-if="devices.length" class="badge text-controls text">{{ devices.length }}</div>
                <v-icon v-else dense class="neutral--text">mdi-help-circle-outline</v-icon>
            </v-col>
        </template>
        <template v-slot:selection="{ item }">
            <v-layout>
                <v-col shrink align-self-center mr-2>
                    <v-icon dense>{{ deviceIcon(item.type) }}</v-icon>
                </v-col>
                <v-col align-self-center class="text-no-wrap overflow-hidden"> {{ item.name }} - {{ item.ip }} </v-col>
            </v-layout>
        </template>
        <template v-slot:item="{ item }">
            <v-layout>
                <v-col shrink align-self-center mr-4>
                    <v-icon>{{ deviceIcon(item.type) }}</v-icon>
                </v-col>
                <v-col>
                    <v-col>
                        <v-row>{{ item.name }}</v-row>
                        <v-row>
                            <v-label v-if="item.appId" disabled>
                                <small>{{ item.appId }} ({{ item.version }})</small>
                            </v-label>
                        </v-row>
                        <v-row
                            ><small>{{ item.adapter }}: {{ item.ip }}</small></v-row
                        >
                    </v-col>
                </v-col>
            </v-layout>
        </template>
    </v-select>
</template>

<script>
    export default {
        name: 'DevicePicker',
        props: {
            value: Object,
            devices: Array,
        },
        computed: {
            host: {
                get() {
                    return this.value
                },
                set(value) {
                    this.$emit('input', value)
                },
            },
            selected() {
                return !!this.devices.find((d) => d.ip === this.host.ip)
            },
        },
        watch: {
            devices() {
                this.$refs.devices.$refs.menu.onResize()
            },
        },
        methods: {
            deviceIcon(type) {
                return (
                    {
                        ios: 'mdi-apple',
                        android: 'mdi-android',
                    }[type] || 'mdi-laptop'
                )
            },
        },
    }
</script>

<style lang="scss">
    .device-picker {
        min-width: min-content;

        .v-field__field > * {
            min-height: 0;
            padding-block: 4px;
        }

        .v-text-field__prefix {
            transition: color 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
        }

        &.v-input--error .v-text-field__prefix {
            color: rgb(var(--v-theme-error));
        }

        &.v-input--focused:not(.v-input--error) .v-text-field__prefix {
            color: rgb(var(--v-theme-primary));
        }
    }
</style>
