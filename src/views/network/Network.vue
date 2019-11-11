<template>
    <splitpanes class="default-theme fill-height">
        <pane style="min-width: 250px" :size="100 - detail_size">
            <!--suppress HtmlUnknownAttribute -->
            <div ref="scroll" class="network-container" v-chat-scroll="{always: false, smooth: true}">
                <v-list v-if="session_list.length" dense>
                    <v-list-item-group v-model="selected" color="primary">
                        <div v-for="(s,i) in session_list" :key="i">
                            <div class="text-center text--text font-weight-bold pt-4">{{ formatTimestamp(s.timestamp, true) }}</div>
                            <v-list-item class="request-item" two-line v-for="uid in s.requests" :key="uid">
                                <v-list-item-content class="py-0">
                                    <v-list-item-title class="pt-2">
                                        <span class="method" :class="requests[uid].headers.Method.toLowerCase()">{{ requests[uid].headers.Method }}</span>
                                        {{ requests[uid].headers.URL.pathname }}
                                    </v-list-item-title>
                                    <v-list-item-subtitle class="origin pb-2">{{ requests[uid].headers.URL.origin }}</v-list-item-subtitle>
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
                    </v-list-item-group>
                </v-list>
            </div>
            <v-fab-transition>
                <v-btn v-show="clear_visible"
                       @click="clearRequests"
                       class="mr-2"
                       small fab fixed bottom right>
                    <v-icon>mdi-trash-can-outline</v-icon>
                </v-btn>
            </v-fab-transition>
        </pane>
        <pane :size="detail_size">
            <splitpanes class="default-theme fill-height" horizontal>
                <pane>
                    <div class="network-detail-container">
                        {{ details.request.text }}

                        <template v-if="selected !== undefined && selected_request.body.size">
                            <v-tooltip v-if="details.request.large" color="#ffffff00" nudge-right="10px" left>
                                <template v-slot:activator="{ on }">
                                    <v-btn class="body-action" @click="download(selected_request, 'request')" v-on="on" fab x-small>
                                        <v-icon>mdi-download</v-icon>
                                    </v-btn>
                                </template>
                                <span>Download</span>
                            </v-tooltip>
                            <v-tooltip v-else color="#ffffff00" nudge-right="10px" left>
                                <template v-slot:activator="{ on }">
                                    <v-btn class="body-action" @click="copy(selected_request, 'Request')" v-on="on" fab x-small>
                                        <v-icon>mdi-content-copy</v-icon>
                                    </v-btn>
                                </template>
                                <span>Copy</span>
                            </v-tooltip>
                        </template>
                    </div>
                </pane>
                <pane>
                    <div class="network-detail-container">
                        {{ details.response.text }}

                        <v-tooltip v-if="details.response.large" color="#ffffff00" nudge-right="10px" left>
                            <template v-slot:activator="{ on }">
                                <v-btn class="body-action" @click="download(selected_request.response, 'response')" v-on="on" fab x-small>
                                    <v-icon>mdi-download</v-icon>
                                </v-btn>
                            </template>
                            <span>Download</span>
                        </v-tooltip>
                        <v-tooltip v-else color="#ffffff00" nudge-right="10px" left>
                            <template v-slot:activator="{ on }">
                                <v-btn class="body-action" @click="copy(selected_request.response, 'Response')" v-on="on" fab x-small>
                                    <v-icon>mdi-content-copy</v-icon>
                                </v-btn>
                            </template>
                            <span>Copy</span>
                        </v-tooltip>
                    </div>
                </pane>
            </splitpanes>
        </pane>
        <v-snackbar v-model="snackbar.visible" top color="success" :timeout="2000">{{ snackbar.text }}</v-snackbar>
    </splitpanes>
</template>

<script>
    import zlib from 'zlib'
    import { Splitpanes, Pane } from 'splitpanes'
    import db from './database'
    import { sortBy } from 'lodash'
    import filesize from 'filesize'
    import copy from 'copy-text-to-clipboard'
    import saveAs from 'tiny-save-as'

    // issues with hot reload =/
    const RECONNECT = process.env.NODE_ENV !== 'development'

    const newSession = () => ({
        timestamp: new Date().getTime(),
        requests: []
    })

    export default {
        name: 'Network',
        components: { Splitpanes, Pane },
        props: {
            currentPage: Boolean
        },
        data: () => ({
            session_list: [],
            requests: {},
            selected: undefined,
            clear_visible: false,
            details: { request: { text: '', large: false }, response: { text: '', large: false } },
            snackbar: { visible: false, text: '' }
        }),
        computed: {
            detail_size () {
                return this.selected !== undefined ? 40 : 0
            },
            host () {
                return this.$http.defaults.baseURL.substr(7)
            },
            session () {
                const len = this.session_list.length
                return len ? this.session_list[len - 1] : {}
            },
            selected_request () {
                const requests = sortBy(Object.values(this.requests), 'timestamp')
                return requests[this.selected]
            }
        },
        watch: {
            currentPage (current) {
                if (current) {
                    setTimeout(() => {
                        this.clear_visible = true
                    }, 300)
                } else {
                    this.clear_visible = false
                }
            },
            selected (index) {
                if (index !== undefined) {
                    const req = this.selected_request
                    const res = req.response || {}

                    this.updateDetails(req, this.details.request, index)
                    this.updateDetails(res, this.details.response, index)
                }
            }
        },
        mounted () {
            this.clear_visible = this.currentPage
            this.getHistory().then(() => {
                const div = this.$refs.scroll
                div.scrollTop = div.scrollHeight
                this.openRequest()
                this.openResponse()
            })
        },
        methods: {
            openRequest () {
                const ws = new WebSocket(`ws://${this.host}/network/request`)
                ws.binaryType = 'arraybuffer'

                ws.onopen = () => {
                    console.info('Request channel opened!')
                }

                ws.onmessage = (msg) => {
                    const data = decode(msg)
                    if (data) {
                        if (!this.session_list.length) {
                            this.session_list.push(newSession())
                        }
                        data.session = this.session.timestamp
                        data.timestamp = new Date().getTime()
                        data.raw_headers = data.headers
                        data.headers = parseHeaders(data.headers)

                        const r = this.session.requests
                        if (!r.includes(data.uid)) {
                            r.push(data.uid)
                        }

                        this.$set(this.requests, data.uid, data)
                        db.putRequest(data)
                    }
                }

                ws.onclose = () => {
                    if (RECONNECT) {
                        setTimeout(() => this.openRequest(), 3000)
                    }
                }
            },
            openResponse () {
                const ws = new WebSocket(`ws://${this.host}/network/response`)
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
                            data.raw_headers = data.headers
                            data.headers = parseHeaders(data.headers)
                            request.status = data.headers.Status
                            request.response = data

                            this.$set(this.requests, data.uid, { ...request })
                            db.putRequest(request)
                        }
                    }
                }

                ws.onclose = () => {
                    if (RECONNECT) {
                        setTimeout(() => this.openResponse(), 3000)
                    }
                }
            },
            async getHistory () {
                const history = sortBy(await db.getRequests(), 'timestamp')
                const session_list = {}
                const requests = {}
                for (const req of history) {
                    const session = session_list[req.session] || newSession()
                    session.timestamp = req.session
                    session.requests.push(req.uid)
                    session_list[req.session] = session
                    requests[req.uid] = req
                }
                this.session_list = sortBy(Object.values(session_list), 'timestamp')
                this.requests = requests
            },
            clearRequests () {
                this.session_list = []
                this.selected = undefined
                db.clearRequests()
            },
            updateDetails (r, details, index) {
                const raw_headers = r.raw_headers || ''

                this.$set(details, 'text', raw_headers)
                this.$set(details, 'large', false)

                if (r.body) {
                    if (r.body.size > 100000) {
                        this.$set(details, 'large', true)
                        this.$set(details, 'text', raw_headers + '\n[ Size: ' + filesize(r.body.size) + ' ]')
                    } else {
                        readBody(raw_headers, r.body).then(body => {
                            if (this.selected === index) {
                                this.$set(details, 'text', raw_headers + '\n' + body)
                            }
                        })
                    }
                }
            },
            download (r, filename) {
                if (r) {
                    saveAs(r.body, `${filename}_${r.timestamp}.txt`)
                }
            },
            copy (r, label) {
                if (r) {
                    readBody(r.raw_headers, r.body).then(body => {
                        copy(body)
                        this.snackbar = { visible: true, text: `${label} copied successfully!` }
                    })
                }
            },
            formatTimestamp (timestamp, full) {
                const today = new Date()
                const date = new Date(timestamp)
                return (!full && today.toDateString() === date.toDateString()) ? date.toLocaleTimeString() : date.toLocaleString()
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
            filesize: v => filesize(v)
        }
    }

    function parseUrl (url) {
        const a = document.createElement('a')
        a.href = url
        return { pathname: a.pathname, origin: a.origin }
    }

    function parseHeaders (headers) {
        const parsed = {}
        for (const line of headers.split('\n')) {
            const [key, value] = line.split(': ')
            if (key) {
                parsed[key] = value
            }
        }
        parsed.URL = parseUrl(parsed.URL)
        return parsed
    }

    function decode (msg) {
        const data = new Uint8Array(msg.data)
        let p = -1
        for (let i = 0; i < data.length && p < 0; i++) {
            if (String.fromCharCode(data[i]) === '\n' && String.fromCharCode(data[i + 1]) === '\n') {
                p = i + 1
            }
        }

        if (p >= 0) {
            let enc = new TextDecoder('utf-8')
            let headers = enc.decode(data.slice(0, p)).toString().split('\n')
            const uid = headers.splice(0, 1).pop()
            headers = headers.join('\n')

            const h = parseHeaders(headers)

            const body = new Blob([zlib.gunzipSync(Buffer.from(msg.data, p + 1))], { type: h['Content-Type'] })

            return { uid, headers, body }
        }
        return false
    }

    function readBody (headers, body) {
        return new Promise(resolve => {
            const reader = new FileReader()
            reader.onloadend = (e) => {
                resolve(e.target.result)
            }
            let encoding = 'utf-8'
            const match = /charset=([^;\n ]+)/.exec(headers)
            if (match) {
                encoding = match[1]
            }
            reader.readAsText(body, encoding)
        })
    }
</script>

<style scoped lang="scss">
    .network-container, .network-detail-container {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        overflow-y: auto;
    }

    .network-detail-container {
        white-space: pre-line;
        word-break: break-all;

        .body-action {
            position: absolute;
            top: 5px;
            right: 5px;
        }
    }

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
</style>
