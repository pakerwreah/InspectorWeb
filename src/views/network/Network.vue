<template>
    <splitpanes class="network-panel default-theme fill-height">
        <pane style="min-width: 250px" :size="100 - detail_size">
            <!--suppress HtmlUnknownAttribute -->
            <div ref="scroll" class="network-container absolute-expand overflow-y-auto">
                <v-list v-if="session_list.length" dense>
                    <v-list-item-group v-model="selected" color="primary">
                        <div v-for="(s,i) in session_list" :key="i">
                            <div v-if="search_filter === null || search_filter.trim().length <= 0" class="text-center text--text font-weight-bold pt-4">{{ formatTimestamp(s.timestamp, true) }}</div>
                            <div v-for="uid in s.requests" :key="uid">
                                <v-list-item v-if="search_requests(requests[uid])" class="request-item" two-line>
                                    <v-list-item-content class="py-0">
                                        <v-list-item-title class="pt-2">
                                            <span class="method" :class="requests[uid].headers.method.toLowerCase()">{{ requests[uid].headers.method }}</span>
                                            {{ requests[uid].headers.url.pathname }}
                                        </v-list-item-title>
                                        <v-list-item-subtitle class="origin pb-2">{{ requests[uid].headers.url.origin }}</v-list-item-subtitle>
                                    </v-list-item-content>
                                    <div class="mr-3">
                                        <table>
                                            <tr class="request-info">
                                                <td class="request-status" :class="statusColor(requests[uid].status)">
                                                    <span v-if="requests[uid].status" class="font-weight-bold">{{ requests[uid].status }}</span>
                                                    <v-icon v-else class="request-loading">mdi-timelapse</v-icon>
                                                </td>
                                                <td class="request-timestamp font-weight-bold text-right">{{ formatTimestamp(requests[uid].timestamp) }}</td>
                                            </tr>
                                            <tr v-if="requests[uid].response" class="v-list-item__subtitle request-info">
                                                <td>{{ formatDuration(requests[uid].response.timestamp - requests[uid].timestamp) }}</td>
                                                <td class="text-right">{{ filesize(requests[uid].response.body.size) }}</td>
                                            </tr>
                                        </table>
                                    </div>
                                </v-list-item>
                            </div>
                        </div>
                    </v-list-item-group>
                </v-list>
            </div>
            <v-speed-dial open-on-hover bottom right fixed class="close_menu">
                <template v-slot:activator>
                    <v-tooltip left>
                        <template v-slot:activator="{ on }">
                            <v-fab-transition hide-on-leave>
                                <v-btn v-show="clear_visible"
                                       @click.stop="clearEndedRequests"
                                       v-on="on"
                                       small fab
                                       v-blur>
                                    <v-icon>mdi-trash-can-outline</v-icon>
                                </v-btn>
                            </v-fab-transition>
                        </template>
                        <span>Clear finished</span>
                    </v-tooltip>
                </template>
                <v-tooltip left>
                    <template v-slot:activator="{ on }">
                        <v-btn @click.stop="clearPreviousRequests"
                               v-on="on"
                               small fab
                               v-blur>
                            <v-icon>mdi-upload-off</v-icon>
                        </v-btn>
                    </template>
                    <span>Clear previous requests</span>
                </v-tooltip>
                <v-tooltip left>
                    <template v-slot:activator="{ on }">
                        <v-btn @click.stop="clearAllRequests"
                               v-on="on"
                               small fab
                               v-blur>
                            <v-icon>mdi-skull-outline</v-icon>
                        </v-btn>
                    </template>
                    <span>Clear all requests</span>
                </v-tooltip>
            </v-speed-dial>
            <v-layout class="network_search" v-show="search_enabled">
                <v-flex>
                    <v-text-field ref="search"
                                  class="network_search_field" v-model="search_filter"
                                  hide-details
                                  prepend-inner-icon="mdi-magnify"
                                  single-line
                                  clearable
                                  @click:clear="clearSearch"
                                  placeholder="Search..."></v-text-field>
                    <v-spacer></v-spacer>
                </v-flex>
            </v-layout>
        </pane>
        <pane :size="detail_size">
            <splitpanes class="default-theme fill-height" horizontal>
                <pane>
                    <RequestViewer v-model="selected_request" :sort-params="settings.sort_params" />
                </pane>
                <pane>
                    <RequestViewer v-model="selected_response" />
                </pane>
            </splitpanes>
        </pane>
    </splitpanes>
</template>

<script>
    // noinspection ES6CheckImport
    import { Splitpanes, Pane } from 'splitpanes'
    import { pickBy, sortBy, debounce } from 'lodash'
    import filesize from 'filesize'
    import db from './database'
    import { decode } from './utils'
    import { formatTimestamp } from '@/utils'
    import RequestViewer from './RequestViewer'

    export default {
        name: 'Network',
        components: { Splitpanes, Pane, RequestViewer },
        props: {
            active: Boolean,
            settings: Object,
            ip: String,
            port: String
        },
        data: () => ({
            session_list: [],
            requests: {},
            selected: undefined,
            clear_visible: false,
            /** @type WebSocket */
            ws_request: null,
            /** @type WebSocket */
            ws_response: null,
            ws_request_reconnect_timeout: null,
            ws_response_reconnect_timeout: null,
            search_filter: '',
            search_enabled: false
        }),
        computed: {
            host () {
                return this.ip && this.port && `${this.ip}:${this.port}`
            },
            reconnect () {
                return debounce(() => {
                    this.disconnect()
                    this.connect()
                }, 1500)
            },
            detail_size () {
                return this.selected !== undefined ? 40 : 0
            },
            session () {
                const len = this.session_list.length
                return len ? this.session_list[len - 1] : {}
            },
            selected_request () {
                if (this.selected !== undefined) {
                    const requests = sortBy(Object.values(this.requests), 'timestamp')
                    return requests[this.selected]
                }
                return undefined
            },
            selected_response () {
                const req = this.selected_request
                if (req) {
                    return req.response
                }
                return undefined
            },
            total_requests () {
                return Object.keys(this.requests).length
            },
            search_requests () {
                const term = this.search_filter && this.search_filter.trim().toLowerCase()
                return item => !term || item.headers.url.pathname.toLowerCase().includes(term)
            }
        },
        watch: {
            host (host) {
                if (host) {
                    this.reconnect()
                }
            },
            active: {
                handler (active) {
                    if (active) {
                        setTimeout(() => {
                            this.clear_visible = true
                            const div = this.$refs.scroll
                            div.scrollTop = div.scrollHeight
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
                immediate: true
            },
            'settings.sleep' (sleep) {
                if (!this.active) {
                    if (sleep) {
                        this.disconnect()
                    } else {
                        this.connect()
                    }
                }
            },
            total_requests (count) {
                this.$emit('requests', count)
                this.stickyBottom()
            }
        },
        mounted () {
            this.nextItem = this.nextItem.bind(this)
            document.addEventListener('keydown', this.nextItem)
            document.addEventListener('keydown', this.toggleSearch)

            this.getHistory().then(() => {
                this.autoClearRequests()
                this.$nextTick(() => {
                    const div = this.$refs.scroll
                    div.scrollTop = div.scrollHeight
                })
            })
        },
        beforeDestroy () {
            document.removeEventListener('keydown', this.nextItem)
            this.disconnect()
        },
        methods: {
            connect () {
                if (!this.ws_request) {
                    this.openRequest()
                }
                if (!this.ws_response) {
                    this.openResponse()
                }
            },
            disconnect () {
                this.closeSocket(this.ws_request)
                this.ws_request = null

                this.closeSocket(this.ws_response)
                this.ws_response = null
            },
            closeSocket (ws) {
                if (ws) {
                    ws.onmessage = null
                    ws.onclose = null
                    ws.close()
                }
            },
            nextItem (e) {
                if (this.active && this.selected !== undefined) {
                    if (e.keyCode === 38 && this.selected > 0) {
                        this.selected--
                    } else if (e.keyCode === 40 && this.selected < Object.keys(this.requests).length - 1) {
                        this.selected++
                    }
                }
            },
            newSession: () => ({
                timestamp: new Date().getTime(),
                requests: []
            }),
            openRequest () {
                this.closeSocket(this.ws_request)
                this.ws_request = null

                if (!this.active && this.settings.sleep) {
                    return
                }

                if (!this.host) {
                    return
                }

                let initSession = true

                const ws = this.ws_request = new WebSocket(`ws://${this.host}/network/request`)
                ws.binaryType = 'arraybuffer'

                ws.onopen = () => {
                    console.info('Request channel opened!')
                }

                ws.onmessage = (msg) => {
                    const data = decode(msg)
                    if (data) {
                        if (initSession || !this.session_list.length) {
                            this.session_list.push(this.newSession())
                            initSession = false
                        }
                        data.session = this.session.timestamp
                        data.timestamp = new Date().getTime()

                        /** @type Array */
                        const r = this.session.requests
                        if (!r.includes(data.uid)) {
                            r.push(data.uid)
                        }

                        this.$set(this.requests, data.uid, data)
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
            openResponse () {
                this.closeSocket(this.ws_response)
                this.ws_response = null

                if (!this.active && this.settings.sleep) {
                    return
                }

                if (!this.host) {
                    return
                }

                const ws = this.ws_response = new WebSocket(`ws://${this.host}/network/response`)
                ws.binaryType = 'arraybuffer'

                ws.onopen = () => {
                    console.info('Response channel opened!')
                }

                ws.onmessage = (msg) => {
                    const data = decode(msg)
                    if (data) {
                        const request = this.requests[data.uid]
                        if (request) {
                            data.timestamp = new Date().getTime()
                            request.status = data.headers.status
                            request.response = data

                            this.$set(this.requests, data.uid, { ...request })
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
            async getHistory () {
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
            autoClearRequests () {
                const limit = this.settings.limit

                if (this.total_requests > limit) {
                    this.clearPreviousRequests()

                    if (this.total_requests > limit) {
                        this.clearEndedRequests()
                    }
                }
            },
            clearAllRequests () {
                this.session_list = []
                this.requests = {}
                this.selected = undefined
                db.clearRequests()
            },
            clearPreviousRequests () {
                if (this.session_list.length) {
                    const last_session = this.session
                    const requests = pickBy(this.requests, r => r.session === last_session.timestamp)
                    const req_list = Object.values(requests)

                    this.session_list = [last_session]
                    this.requests = requests
                    this.selected = undefined

                    db.clearRequests()
                    req_list.forEach(db.putRequest)
                }
            },
            clearEndedRequests () {
                if (this.session_list.length) {
                    const last_session = this.session
                    const requests = pickBy(this.requests, r => !r.status && r.session === last_session.timestamp)
                    const req_list = Object.values(requests)

                    last_session.requests = req_list.map(r => r.uid)
                    this.session_list = req_list.length ? [last_session] : []
                    this.requests = requests
                    this.selected = undefined

                    db.clearRequests()
                    req_list.forEach(db.putRequest)
                }
            },
            statusColor (status) {
                status = parseInt(status)
                if (status === 200) {
                    return 'success--text'
                } else if (status < 400) {
                    return 'warning--text'
                } else {
                    return 'error--text'
                }
            },
            formatDuration (value) {
                if (value >= 1000) {
                    return (value / 1000).toFixed(2) + ' s'
                } else {
                    return value + ' ms'
                }
            },
            stickyBottom () {
                const el = this.$refs.scroll
                if (el.scrollTop + el.clientHeight >= 0.98 * el.scrollHeight - 10) {
                    this.$nextTick(() => {
                        el.scroll({
                            top: el.scrollHeight,
                            behavior: 'smooth'
                        })
                    })
                }
            },
            toggleSearch (key) {
                if (this.active) {
                    if ((key.ctrlKey || key.metaKey) && key.keyCode === 70) {
                        key.preventDefault()
                        this.search_enabled = true
                        this.$nextTick(() => this.$refs.search.focus())
                    } else if (key.keyCode === 27) {
                        this.search_enabled = false
                        this.clearSearch()
                    }
                }
            },
            clearSearch () {
                this.search_filter = ''
            },
            filesize,
            formatTimestamp
        }
    }
</script>

<style lang="scss">
    .network-panel {
        .close_menu .v-speed-dial__list {
            padding-bottom: 8px;
        }
    }

</style>

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
                color: #26B47E;
            }

            &.post {
                color: #FFB401;
            }

            &.put {
                color: #0F7BED;
            }

            &.delete {
                color: #EE4B48;
            }

            color: #969696;
        }
    }
    .theme--light .network_search {
        background-color: var(--v-controls-base);
    }

    .theme--dark .network_search {
        background-color: var(--v-controls-darken1);
    }
    .network_search {
        padding: 0 6px 8px 6px;
        position: absolute;
        top: 0;
        right: 0;

        .network_search_field {
            padding: 0;
            width: 17em;
        }
    }
</style>
