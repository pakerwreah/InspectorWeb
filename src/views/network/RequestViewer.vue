<template>
    <div class="network-detail-container">
        <v-expansion-panels accordion v-model="open" :class="{'fill-height': !hasBody}">
            <v-expansion-panel>
                <v-expansion-panel-header v-if="hasBody">
                    Headers
                </v-expansion-panel-header>
                <v-expansion-panel-content :class="{'pt-2': !hasBody}">
                    <!--suppress HtmlUnknownAttribute -->
                    <pre :class="codestyle" v-highlightjs="details.headers"><code class="http"></code></pre>
                </v-expansion-panel-content>
            </v-expansion-panel>
            <v-expansion-panel v-if="hasBody">
                <v-expansion-panel-header>
                    <v-layout>
                        <v-flex xs11 align-self-center>Body</v-flex>
                        <v-flex class="ml-2">
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
                    <!--suppress HtmlUnknownAttribute -->
                    <!-- don't break line inside <pre>, thanks! -->
                    <pre v-if="json || html" :class="codestyle" v-highlightjs="details.body"><code :class="{json, html}"></code></pre>

                    <template v-else>
                        {{ details.body }}
                    </template>
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

    export default {
        name: 'RequestViewer',
        props: {
            value: Object
        },
        data: () => ({
            open: null,
            details: { headers: '', body: '', large: false },
            snackbar: { visible: false, text: '' }
        }),
        computed: {
            codestyle () {
                return this.dark_mode ? 'dark' : 'light'
            },
            request () {
                return this.value
            },
            json () {
                return this.details.headers.toLowerCase().includes('content-type: application/json') || (this.hasBody && ['{', '['].some(c => this.details.body.startsWith(c)))
            },
            html () {
                return this.details.headers.toLowerCase().includes('content-type: text/html')
            },
            hasBody () {
                return this.request && this.request.body.size
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
                const r = this.request
                if (r) {
                    this.open = this.hasBody ? 1 : 0

                    const raw_headers = r.raw_headers || ''

                    this.$set(this.details, 'headers', raw_headers)
                    this.$set(this.details, 'body', '')
                    this.$set(this.details, 'large', false)

                    if (r.body) {
                        if (r.body.size > 100000) {
                            this.$set(this.details, 'large', true)
                            this.$set(this.details, 'body', '[ Size: ' + filesize(r.body.size) + ' ]')
                        } else {
                            readBody(raw_headers, r.body).then(body => {
                                if (this.request === r) {
                                    if (this.json) {
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
                    this.snackbar = { visible: true, text: `Content copied successfully!` }
                })
            }
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
            code:before, code:after {
                content: unset;
            }

            code.hljs {
                padding: 0 !important;
                background-color: inherit !important;
                box-shadow: none;
            }

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
