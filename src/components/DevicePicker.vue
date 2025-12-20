<template>
    <v-select
        v-model="selected"
        :items="devices"
        class="device-picker"
        variant="solo"
        item-title="name"
        item-value="_id"
        :disabled="!devices.length"
        :placeholder="devices.length ? 'Select your device' : 'No devices detected'"
        return-object
        hide-details
    >
        <template #prepend-inner v-if="!selected">
            <div v-if="devices.length" class="badge">{{ devices.length }}</div>
            <v-icon v-else size="small" color="neutral">mdi-help-circle-outline</v-icon>
        </template>

        <template #selection="{ item: { raw: item } }">
            <v-icon>{{ deviceIcon(item.type) }}</v-icon>
            <div class="text-truncate ml-3">{{ item.name }} - {{ item.ip }}</div>
        </template>

        <template #item="{ item: { raw: item }, props }">
            <!-- v-select::hide-selected is not working -->
            <v-list-item v-if="item._id !== selected?._id" v-bind="props" class="d-flex flex-row">
                <template #prepend>
                    <v-icon>{{ deviceIcon(item.type) }}</v-icon>
                </template>

                <template #title>
                    <v-list-item-title>
                        <span>{{ item.name }}</span>
                    </v-list-item-title>
                </template>

                <template #subtitle>
                    <div class="d-flex flex-column">
                        <span class="text-neutral" v-if="item.appId">{{ item.appId }} ({{ item.version }})</span>
                        <span class="text-primary font-weight-bold">{{ item.adapter }}: {{ item.ip }}</span>
                    </div>
                </template>
            </v-list-item>
        </template>
    </v-select>
</template>

<script lang="ts">
    import { orderBy, pick, uniqBy } from 'lodash'
    import type { ElectronAPI } from '@electron-toolkit/preload'
    import { defineComponent, type PropType } from 'vue'
    import type { Device, Host } from '@/types'
    import type { Settings } from '@/lib/settings'

    const deviceTimeout = 8000

    type DeviceItem = Device & { _id: string }

    export default defineComponent({
        name: 'DevicePicker',
        props: {
            host: Object as PropType<Host>,
            settings: { type: Object as PropType<Settings>, required: true },
        },
        data: () => ({
            selected: undefined as DeviceItem | undefined,
            m_devices: [] as DeviceItem[],
            tickerInterval: 0,
            now: Date.now(),
        }),
        computed: {
            electron(): ElectronAPI {
                return (window as any).electron
            },
            devices() {
                return this.m_devices
                    .filter((d) => !this.settings.adapter_blacklist.split(' ').includes(d.adapter))
                    .filter((d) => this.now - d.since < deviceTimeout)
            },
            port() {
                return this.settings.port
            },
        },
        watch: {
            selected() {
                this.$emit('update:host', pick(this.selected, 'ip'))
            },
            devices() {
                if (!this.selected && this.host?.ip && this.devices.length) {
                    const ip = this.host.ip
                    this.selected = this.devices.find((d) => d.ip === ip)
                }
            },
            port: {
                immediate: true,
                handler(port: Settings['port']) {
                    const { ipcRenderer } = this.electron
                    ipcRenderer.removeAllListeners('search-devices')
                    ipcRenderer.send('search-devices-init', port)

                    type DeviceInfo = {
                        type: string
                        name: string
                        appId: string
                        version: string
                    }

                    type IPAddress = {
                        ip: string
                        adapter: string
                    }

                    type NewDevice = DeviceInfo & { addresses: IPAddress[] }

                    this.$nextTick(() => {
                        ipcRenderer.on('search-devices', (_, newDevice: NewDevice) => {
                            const { addresses, ...device } = newDevice
                            const since = Date.now()
                            // uniqBy will keep the first occurencies
                            // we want to keep the most recent `since`
                            const devices = addresses
                                .map((addr): DeviceItem => {
                                    const info = { ...device, ...addr }
                                    const _id = JSON.stringify(info)
                                    return { _id, ...device, ...addr, since }
                                })
                                .concat(this.m_devices)

                            const key = (item: DeviceItem) => item._id
                            this.m_devices = orderBy(uniqBy(devices, key), key)
                        })
                    })
                },
            },
        },
        methods: {
            deviceIcon(type: 'ios' | 'android' | string) {
                return (
                    {
                        ios: 'mdi-apple',
                        android: 'mdi-android',
                    }[type] || 'mdi-laptop'
                )
            },
        },
        beforeUnmount() {
            clearInterval(this.tickerInterval)
        },
        created() {
            this.electron.ipcRenderer.removeAllListeners('search-devices')
            this.tickerInterval = setInterval(() => {
                this.now = Date.now()
            }, deviceTimeout)
        },
    })
</script>

<style lang="scss">
    .device-picker {
        min-width: 250px;
        width: fit-content;

        align-items: center;

        .v-field__field > * {
            min-height: 30px;
            padding-block: 3px;
        }
    }
</style>
