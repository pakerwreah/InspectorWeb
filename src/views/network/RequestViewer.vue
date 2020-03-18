<template>
    <div class="network-detail-container">
        <v-expansion-panels v-if="request" :value="open" accordion>
            <v-expansion-panel>
                <v-expansion-panel-header>
                    <v-layout>
                        <v-flex align-self-center>
                            Headers
                        </v-flex>
                        <v-flex>
                            <v-label>
                                <small class="pointer">{{ formatTimestamp(request.timestamp, true) }}</small>
                            </v-label>
                        </v-flex>
                    </v-layout>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                    <!--suppress HtmlUnknownAttribute - don't break line inside <pre>, thanks! -->
                    <pre :class="codestyle" v-highlightjs="details.headers"><code class="http"></code></pre>
                    <template v-if="params">
                        <v-divider class="mt-2 mb-1" />
                        <v-label>
                            <small>Parameters:</small>
                        </v-label>
                        <!--suppress HtmlUnknownAttribute - don't break line inside <pre>, thanks! -->
                        <pre class="ml-2" :class="codestyle" v-highlightjs="params"><code class="yaml"></code></pre>
                    </template>
                </v-expansion-panel-content>
            </v-expansion-panel>
            <v-expansion-panel v-if="hasBody">
                <v-expansion-panel-header>
                    <v-layout>
                        <v-flex xs11 align-self-center>
                            Body
                        </v-flex>
                        <v-flex class="ml-4">
                            <v-tooltip v-if="details.large" bottom>
                                <template v-slot:activator="{ on }">
                                    <v-btn icon @click.stop="download" v-on="on" x-small>
                                        <v-icon>mdi-download</v-icon>
                                    </v-btn>
                                </template>
                                <span>Download</span>
                            </v-tooltip>
                            <v-tooltip v-else bottom>
                                <template v-slot:activator="{ on }">
                                    <v-btn icon @click.stop="copy" v-on="on" x-small>
                                        <v-icon>mdi-content-copy</v-icon>
                                    </v-btn>
                                </template>
                                <span>Copy</span>
                            </v-tooltip>
                        </v-flex>
                    </v-layout>
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                    <!--suppress HtmlUnknownAttribute - don't break line inside <pre>, thanks! -->
                    <pre v-if="json || html" :class="codestyle" v-highlightjs="details.body"><code :class="{json, html}"></code></pre>

                    <v-label v-else>
                        {{ details.body }}
                    </v-label>
                </v-expansion-panel-content>
            </v-expansion-panel>
        </v-expansion-panels>
        <v-snackbar v-model="snackbar.visible" top color="success" :timeout="2000">
            <v-flex class="text-center"><h3>{{ snackbar.text }}</h3></v-flex>
        </v-snackbar>
    </div>
</template>

<script>
    import copy from 'copy-text-to-clipboard'
    import saveAs from 'tiny-save-as'
    import filesize from 'filesize'
    import { formatTimestamp } from '../../utils'

    export default {
        name: 'RequestViewer',
        props: {
            value: Object
        },
        data: () => ({
            details: { headers: '', body: '', large: false },
            snackbar: { visible: false, text: '' }
        }),
        computed: {
            open () {
                return (this.hasBody && !this.urlencoded) ? 1 : 0
            },
            codestyle () {
                return this.dark_mode ? 'dark' : 'light'
            },
            request () {
                return this.value
            },
            headers () {
                return (this.request && this.request.headers) || {}
            },
            raw_headers () {
                return (this.request && this.request.raw_headers) || ''
            },
            params () {
                const params = this.get ? this.headers.url.search : (this.urlencoded && this.details.body)
                if (params) {
                    return params
                        .split(/[?&]/)
                        .map(it => it.replace('=', ': '))
                        .join('\n')
                        .trim()
                }

                return null
            },
            contentType () {
                return this.headers['content-type'] || ''
            },
            get () {
                return this.headers.method === 'GET'
            },
            json () {
                return this.contentType.includes('application/json') || (this.hasBody && ['{', '['].includes(this.details.body[0]))
            },
            html () {
                return this.contentType.includes('text/html')
            },
            urlencoded () {
                const body = this.details.body
                return this.contentType.includes('application/x-www-form-urlencoded') || (
                    !this.json && !body.includes('\n') && (
                        body.startsWith('?') || body.includes('=') || body.includes('&')
                    )
                )
            },
            hasBody () {
                return !!(this.request && this.request.body.size)
            }
        },
        watch: {
            request () {
                this.updateDetails()
            }
        },
        mounted () {
            this.updateDetails()
        },
        methods: {
            updateDetails () {
                this.details = { headers: '', body: '', large: false }
                const r = this.request
                if (r) {
                    const raw_headers = r.raw_headers

                    this.$set(this.details, 'headers', raw_headers)

                    if (r.body) {
                        if (r.body.size > 100000) {
                            this.$set(this.details, 'large', true)
                            this.$set(this.details, 'body', '[ Size: ' + filesize(r.body.size) + ' ]')
                        } else {
                            readBody(raw_headers, r.body).then(body => {
                                if (this.request === r) {
                                    if (this.json || ['{', '['].includes(body[0])) {
                                        const parsed = JSON.parse(body)
                                        if (parsed) {
                                            body = JSON.stringify(parsed, null, 2)
                                        }
                                    }
                                    this.$set(this.details, 'body', body)
                                }
                            })
                        }
                    }
                }
            },
            download () {
                saveAs(this.request.body, `${this.request.timestamp}.txt`)
            },
            copy () {
                readBody(this.request.raw_headers, this.request.body).then(body => {
                    copy(body)
                    this.snackbar = { visible: true, text: 'Content copied successfully!' }
                })
            },
            formatTimestamp
        }
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
    .network-detail-container {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        overflow-y: auto;
        white-space: pre-line;
        word-break: break-all;
    }
</style>
<style lang="scss">
    .network-detail-container {
        pre {
            &.dark {
                @import '~highlight.js/scss/night-owl';
            }

            &.light {
                @import '~highlight.js/scss/xcode';
            }
        }

        .v-expansion-panel {
            .v-expansion-panel-header {
                min-height: 40px !important;
                padding: 0 12px;
            }

            .v-expansion-panel-content__wrap {
                padding: 0 12px 12px;
            }
        }
    }

    .theme--dark {
        .network-detail-container {
            .v-expansion-panel {
                background-color: var(--v-panel-base) !important;
            }
        }
    }
</style>
