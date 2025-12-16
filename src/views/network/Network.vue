<template>
    <splitpanes class="network-panel default-theme fill-height" v-on="$attrs">
        <pane style="min-width: 250px" :size="100 - detail_size" ref="scroll">
            <div class="network-container" :class="{ 'pt-10': is_searching }">
                <v-list
                    v-if="session_list.length"
                    v-model:selected="selected"
                    v-model:opened="expanded_session"
                    bg-color="panel"
                    color="primary"
                    class="fill-height"
                    density="compact"
                >
                    <v-list-group
                        v-for="session in session_list"
                        :key="session.timestamp"
                        :value="session.timestamp"
                        expand-icon="mdi-chevron-right"
                        collapse-icon="mdi-chevron-down"
                    >
                        <template v-slot:activator="{ props }">
                            <v-list-item
                                v-bind="props"
                                v-if="!is_searching"
                                class="text-center text--text font-weight-bold pt-4 pl-8"
                            >
                                {{ formatTimestamp(session.timestamp, true) }}
                            </v-list-item>
                        </template>
                        <template v-for="request in session.requests.map((uid) => requests[uid])" :key="request.uid">
                            <v-list-item
                                v-show="requests_visibility[request.uid]"
                                class="request-item"
                                lines="two"
                                :value="request.uid"
                            >
                                <v-list-item-title class="pt-2">
                                    <span class="method" :class="request.headers.method.toLowerCase()">
                                        {{ request.headers.method }}
                                    </span>
                                    {{ request.headers.url.pathname }}
                                </v-list-item-title>
                                <v-list-item-subtitle class="origin pb-2">
                                    {{ request.headers.url.origin }}
                                </v-list-item-subtitle>
                                <template #append>
                                    <div class="mr-3">
                                        <table>
                                            <tbody>
                                                <tr class="request-info">
                                                    <td class="request-status" :class="statusColor(request.status)">
                                                        <span v-if="request.status" class="font-weight-bold">
                                                            {{ request.status }}
                                                        </span>
                                                        <v-icon v-else class="request-loading">mdi-timelapse</v-icon>
                                                    </td>
                                                    <td class="request-timestamp font-weight-bold text-right">
                                                        {{ formatTimestamp(request.timestamp) }}
                                                    </td>
                                                </tr>
                                                <tr v-if="request.response" class="v-list-item__subtitle request-info">
                                                    <td>
                                                        {{
                                                            formatDuration(
                                                                request.response.timestamp - request.timestamp,
                                                            )
                                                        }}
                                                    </td>
                                                    <td class="text-right">
                                                        {{ filesize(request.response.body.size ?? 0) }}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </template>
                            </v-list-item>
                        </template>
                    </v-list-group>
                </v-list>
            </div>
            <v-text-field
                v-model="search_filter"
                v-show="search_enabled"
                @click:clear="clearSearch"
                ref="search"
                class="network_search"
                variant="solo"
                prepend-inner-icon="mdi-magnify"
                placeholder="Search..."
                autocomplete="disabled"
                spellcheck="false"
                hide-details
                clearable
            />
        </pane>
        <pane :size="detail_size">
            <splitpanes class="default-theme fill-height" horizontal>
                <pane>
                    <RequestViewer :request="selected_request" :sort-params="settings.sort_params" />
                </pane>
                <pane>
                    <RequestViewer :request="selected_response" />
                </pane>
            </splitpanes>
        </pane>
    </splitpanes>

    <div class="floating-buttons">
        <v-speed-dial open-on-hover location="top center">
            <template v-slot:activator="{ props }">
                <v-fab-transition hide-on-leave>
                    <v-fab v-show="clear_visible" @click.stop="clearEndedRequests" v-bind="props" icon>
                        <v-icon>mdi-trash-can-outline</v-icon>
                        <v-tooltip location="start" activator="parent">Clear finished</v-tooltip>
                    </v-fab>
                </v-fab-transition>
            </template>
            <v-fab key="1" @click.stop="clearPreviousRequests" icon>
                <v-icon>mdi-upload-off</v-icon>
                <v-tooltip location="start" activator="parent">Clear previous requests</v-tooltip>
            </v-fab>
            <v-fab key="2" @click.stop="clearAllRequests" icon>
                <v-icon>mdi-skull-outline</v-icon>
                <v-tooltip location="start" activator="parent">Clear all requests</v-tooltip>
            </v-fab>
        </v-speed-dial>
    </div>
</template>

<script>
    // noinspection ES6CheckImport
    import { Splitpanes, Pane } from 'splitpanes'
    import { pickBy, sortBy, debounce } from 'lodash'
    import { filesize } from 'filesize'
    import db from '@/lib/database'
    import { decode } from '@/lib/network'
    import { formatTimestamp } from '@/utils'
    import RequestViewer from './RequestViewer.vue'

    export default {
        name: 'Network',
        components: { Splitpanes, Pane, RequestViewer },
        props: {
            active: Boolean,
            settings: Object,
            ip: String,
            port: String,
        },
        data: () => ({
            session_list: [],
            requests: {},
            selected: [],
            expanded_session: [],
            clear_visible: false,
            /** @type WebSocket */
            ws_request: null,
            /** @type WebSocket */
            ws_response: null,
            ws_request_reconnect_timeout: null,
            ws_response_reconnect_timeout: null,
            search_filter: '',
            search_enabled: false,
        }),
        computed: {
            host() {
                return this.ip && this.port && `${this.ip}:${this.port}`
            },
            reconnect() {
                return debounce(() => {
                    this.disconnect()
                    this.connect()
                }, 1500)
            },
            detail_size() {
                return this.selected.length ? 40 : 0
            },
            session() {
                const len = this.session_list.length
                return len ? this.session_list[len - 1] : {}
            },
            selected_request() {
                return this.requests[this.selected[0]]
            },
            selected_response() {
                return this.selected_request?.response
            },
            total_requests() {
                return Object.keys(this.requests).length
            },
            is_searching() {
                return this.search_filter?.trim().length > 0
            },
            requests_visibility() {
                const term = this.search_filter?.trim().toLowerCase()
                const props = ({ pathname, origin }) => [pathname, origin].map((p) => p.toLowerCase())
                const search = (item) => !term || props(item).findIndex((p) => p.includes(term)) >= 0

                const requests = this.session_list.flatMap(({ requests }) => requests.map((uid) => this.requests[uid]))

                const items = {}

                for (const request of requests) {
                    items[request.uid] = search(request.headers.url)
                }

                return items
            },
        },
        watch: {
            host(host) {
                if (host) {
                    this.reconnect()
                }
            },
            active: {
                handler(active) {
                    if (active) {
                        setTimeout(() => {
                            this.clear_visible = true
                            this.scrollBottom()
                        }, 500)
                        this.connect()
                    } else {
                        this.clear_visible = false
                        if (this.settings.sleep) {
                            this.disconnect()
                        } else {
                            this.connect()
                        }
                    }
                },
                immediate: true,
            },
            'settings.sleep'(sleep) {
                if (!this.active) {
                    if (sleep) {
                        this.disconnect()
                    } else {
                        this.connect()
                    }
                }
            },
            total_requests(count) {
                this.$emit('requests', count)
                this.stickyBottom()
            },
        },
        mounted() {
            document.addEventListener('keydown', this.toggleSearch)

            this.getHistory().then(() => {
                this.autoClearRequests()
                this.$nextTick(() => {
                    this.scrollBottom()
                })
            })
        },
        beforeDestroy() {
            document.removeEventListener('keydown', this.toggleSearch)

            this.disconnect()
        },
        methods: {
            connect() {
                if (!this.ws_request) {
                    this.openRequest()
                }
                if (!this.ws_response) {
                    this.openResponse()
                }
            },
            disconnect() {
                this.closeSocket(this.ws_request)
                this.ws_request = null

                this.closeSocket(this.ws_response)
                this.ws_response = null
            },
            closeSocket(ws) {
                if (ws) {
                    ws.onmessage = null
                    ws.onclose = null
                    ws.close()
                }
            },
            newSession: () => ({
                timestamp: new Date().getTime(),
                requests: [],
            }),
            openRequest() {
                this.closeSocket(this.ws_request)
                this.ws_request = null

                if (!this.active && this.settings.sleep) {
                    return
                }

                if (!this.host) {
                    return
                }

                let initSession = true

                const ws = (this.ws_request = new WebSocket(`ws://${this.host}/network/request`))
                ws.binaryType = 'arraybuffer'

                ws.onopen = () => {
                    console.info('Request channel expanded_session!')
                }

                ws.onmessage = (msg) => {
                    const data = decode(msg)
                    if (data) {
                        if (initSession || !this.session_list.length) {
                            const session = this.newSession()
                            this.session_list.push(session)
                            this.expanded_session.push(session.timestamp)
                            initSession = false
                        }
                        data.session = this.session.timestamp
                        data.timestamp = new Date().getTime()

                        /** @type Array */
                        const r = this.session.requests
                        if (!r.includes(data.uid)) {
                            r.push(data.uid)
                        }

                        this.requests[data.uid] = data
                        db.putRequest(data)

                        this.autoClearRequests()
                    }
                }

                ws.onclose = () => {
                    if (this.ws_request === ws) {
                        console.info('Request channel closed!')
                        this.ws_request = null
                        if (this.ws_request_reconnect_timeout) {
                            clearTimeout(this.ws_request_reconnect_timeout)
                        }
                        this.ws_request_reconnect_timeout = setTimeout(() => this.openRequest(), 3000)
                    }
                }
            },
            openResponse() {
                this.closeSocket(this.ws_response)
                this.ws_response = null

                if (!this.active && this.settings.sleep) {
                    return
                }

                if (!this.host) {
                    return
                }

                const ws = (this.ws_response = new WebSocket(`ws://${this.host}/network/response`))
                ws.binaryType = 'arraybuffer'

                ws.onopen = () => {
                    console.info('Response channel expanded_session!')
                }

                ws.onmessage = (msg) => {
                    const data = decode(msg)
                    if (data) {
                        const request = this.requests[data.uid]
                        if (request) {
                            data.timestamp = new Date().getTime()
                            request.status = data.headers.status
                            request.response = data

                            this.requests[data.uid] = { ...request }
                            db.putRequest(request)
                        }
                    }
                }

                ws.onclose = () => {
                    if (this.ws_response === ws) {
                        console.info('Response channel closed!')
                        this.ws_response = null
                        if (this.ws_response_reconnect_timeout) {
                            clearTimeout(this.ws_response_reconnect_timeout)
                        }
                        this.ws_response_reconnect_timeout = setTimeout(() => this.openResponse(), 3000)
                    }
                }
            },
            async getHistory() {
                const history = sortBy(await db.getRequests(), 'timestamp')
                const session_list = {}
                const requests = {}
                for (const req of history) {
                    const session = session_list[req.session] || this.newSession()
                    session.timestamp = req.session
                    session.requests.push(req.uid)
                    session_list[req.session] = session
                    requests[req.uid] = req
                }
                this.session_list = sortBy(Object.values(session_list), 'timestamp')
                this.requests = requests
            },
            autoClearRequests() {
                const limit = this.settings.limit

                if (this.total_requests > limit) {
                    this.clearPreviousRequests()

                    if (this.total_requests > limit) {
                        this.clearEndedRequests()
                    }
                }
            },
            clearAllRequests() {
                this.session_list = []
                this.expanded_session = []
                this.requests = {}
                this.selected = []
                db.clearRequests()
            },
            clearPreviousRequests() {
                if (this.session_list.length) {
                    const last_session = this.session
                    const requests = pickBy(this.requests, (r) => r.session === last_session.timestamp)
                    const req_list = Object.values(requests)

                    this.session_list = [last_session]
                    this.requests = requests
                    this.selected = []

                    db.clearRequests()
                    req_list.forEach(db.putRequest)
                }
            },
            clearEndedRequests() {
                if (this.session_list.length) {
                    const last_session = this.session
                    const requests = pickBy(this.requests, (r) => !r.status && r.session === last_session.timestamp)
                    const req_list = Object.values(requests)

                    last_session.requests = req_list.map((r) => r.uid)
                    this.session_list = req_list.length ? [last_session] : []
                    this.requests = requests
                    this.selected = []

                    db.clearRequests()
                    req_list.forEach(db.putRequest)
                }
            },
            statusColor(status) {
                status = parseInt(status)
                if (!status) {
                    return
                }
                if (status === 200) {
                    return 'text-success'
                } else if (status < 400) {
                    return 'text-warning'
                } else {
                    return 'text-error'
                }
            },
            formatDuration(value) {
                if (value >= 1000) {
                    return (value / 1000).toFixed(2) + ' s'
                } else {
                    return value + ' ms'
                }
            },
            stickyBottom() {
                const el = this.$refs.scroll.$el
                if (el.scrollTop + el.clientHeight >= 0.98 * el.scrollHeight - 10) {
                    this.$nextTick(() => {
                        el.scroll({
                            top: el.scrollHeight,
                            behavior: 'smooth',
                        })
                    })
                }
            },
            scrollBottom() {
                const div = this.$refs.scroll
                div.scrollTop = div.scrollHeight
            },
            toggleSearch(key) {
                if (this.active) {
                    if ((key.ctrlKey || key.metaKey) && key.keyCode === 70) {
                        key.preventDefault()
                        this.search_enabled = true
                        this.$nextTick(() => {
                            this.$refs.search.focus()
                            this.$refs.search.$el.querySelector('input').select()
                        })
                    } else if (key.keyCode === 27) {
                        this.search_enabled = false
                        this.clearSearch()
                        this.$nextTick(() => {
                            this.scrollBottom()
                        })
                    }
                }
            },
            clearSearch() {
                this.search_filter = ''
            },
            filesize,
            formatTimestamp,
        },
    }
</script>

<style scoped lang="scss">
    .network-container {
        .request-item {
            min-height: 0;
            border-bottom: solid 1px #cccccc55;
        }

        .request-status {
            font-size: 13px;
            min-width: 40px;
        }

        .request-loading {
            font-size: 16px;
            opacity: 0.7;
        }

        .request-timestamp {
            padding-top: 2px;
            min-width: 60px;
        }

        .request-info {
            font-size: 11px;
        }

        .origin {
            font-size: 9px;
        }

        .method {
            min-width: 40px;
            display: inline-block;
            font-size: 12px;
            font-weight: bold;

            &.get {
                color: #26b47e;
            }

            &.post {
                color: #ffb401;
            }

            &.put {
                color: #0f7bed;
            }

            &.delete {
                color: #ee4b48;
            }

            color: #969696;
        }
    }

    .network_search {
        position: absolute;
        top: 0;
        right: 0;
        margin: 0;
        padding: 0;
        width: 17em;
    }
</style>
