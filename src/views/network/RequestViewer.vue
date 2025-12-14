<template>
    <div class="network-detail-container">
        <v-expansion-panels v-if="request" :value="open" color="panel" multiple variant="accordion">
            <v-expansion-panel>
                <v-expansion-panel-title>
                    <v-row>
                        <v-col align-self-center>Headers</v-col>
                        <v-col>
                            <v-label>
                                <small class="pointer">{{ formatTimestamp(request.timestamp, true) }}</small>
                            </v-label>
                        </v-col>
                    </v-row>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                    <highlightjs :class="codestyle" :code="details.headers" language="http" :autodetect="false" />
                    <template v-if="params">
                        <v-divider class="mt-2 mb-1" />
                        <v-label>
                            <small>Parameters:</small>
                        </v-label>
                        <highlightjs class="ml-2" :class="codestyle" :code="params" language="yaml" />
                    </template>
                </v-expansion-panel-text>
            </v-expansion-panel>
            <v-expansion-panel v-if="hasBody">
                <v-expansion-panel-title>
                    <v-row>
                        <v-col align-self="center">Body</v-col>
                        <v-col cols="2">
                            <v-btn v-if="details.large" icon size="small" @click.stop="download">
                                <v-icon>mdi-download</v-icon>
                                <v-tooltip location="bottom" activator="parent">Download</v-tooltip>
                            </v-btn>
                            <v-btn v-else icon size="small" @click.stop="copy">
                                <v-icon>mdi-content-copy</v-icon>
                                <v-tooltip location="bottom" activator="parent">Copy</v-tooltip>
                            </v-btn>
                        </v-col>
                    </v-row>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                    <highlightjs
                        v-if="json || html"
                        :class="codestyle"
                        :code="details.body"
                        :language="(json && 'json') || (html && 'html')"
                    />
                    <v-label v-else>
                        {{ details.body }}
                    </v-label>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>
        <v-snackbar v-model="snackbar.visible" top color="success" :timeout="2000">
            <v-col class="text-center">
                <h3>{{ snackbar.text }}</h3>
            </v-col>
        </v-snackbar>
    </div>
</template>

<script>
    import copy from 'copy-text-to-clipboard'
    import saveAs from 'tiny-save-as'
    import { filesize } from 'filesize'
    import { formatTimestamp } from '@/utils'
    import { highlightjs } from '@/plugins/highlight'
    import theme from '@/mixins/theme'

    export default {
        name: 'RequestViewer',
        components: { highlightjs },
        mixins: [theme],
        props: {
            request: Object,
            sortParams: Boolean,
        },
        data: () => ({
            details: { headers: '', body: '', large: false },
            snackbar: { visible: false, text: '' },
        }),
        computed: {
            open() {
                return this.hasBody && !this.urlencoded ? 1 : 0
            },
            codestyle() {
                return this.dark_mode ? 'dark' : 'light'
            },
            headers() {
                return (this.request && this.request.headers) || {}
            },
            raw_headers() {
                return (this.request && this.request.raw_headers) || ''
            },
            params() {
                let params = this.get ? this.headers.url.search : this.urlencoded && this.details.body
                if (params) {
                    params = params
                        .split(/[?&]/)
                        .map((it) => it.replace('=', ': '))
                        .map((it) => decodeURIComponent(it))

                    if (this.sortParams) {
                        params = params.sort((a, b) =>
                            a.localeCompare(b, undefined, {
                                numeric: true,
                                sensitivity: 'base',
                            }),
                        )
                    }

                    return params.join('\n').trim()
                }

                return null
            },
            contentType() {
                return this.headers['content-type'] || ''
            },
            get() {
                return this.headers.method === 'GET'
            },
            json() {
                return (
                    this.contentType.includes('application/json') ||
                    (this.hasBody && ['{', '['].includes(this.details.body[0]))
                )
            },
            html() {
                return this.contentType.includes('text/html')
            },
            urlencoded() {
                const body = this.details.body
                return (
                    this.contentType.includes('application/x-www-form-urlencoded') ||
                    (!this.json &&
                        !body.includes('\n') &&
                        (body.startsWith('?') || body.includes('=') || body.includes('&')))
                )
            },
            hasBody() {
                return !!(this.request && this.request.body.size)
            },
        },
        watch: {
            request() {
                this.updateDetails()
            },
        },
        mounted() {
            this.updateDetails()
        },
        methods: {
            async updateDetails() {
                this.details = { headers: '', body: '', large: false }
                const r = this.request
                if (!r) {
                    return
                }
                this.details.headers = r.raw_headers

                if (!r.body) {
                    return
                }
                if (r.body.size > 100000) {
                    this.details.large = true
                    this.details.body = '[ Size: ' + filesize(r.body.size) + ' ]'
                    return
                }
                let body = await readBody(r.raw_headers, r.body)
                // make sure we're still processing the same request
                if (this.request !== r) {
                    return
                }
                if (this.json || ['{', '['].includes(body[0])) {
                    const parsed = JSON.parse(body)
                    if (parsed) {
                        body = JSON.stringify(parsed, null, 2)
                    }
                }
                this.details.body = body
            },
            download() {
                saveAs(this.request.body, `${this.request.timestamp}.txt`)
            },
            async copy() {
                const body = await readBody(this.request.raw_headers, this.request.body)
                copy(body)
                this.snackbar = { visible: true, text: 'Content copied successfully!' }
            },
            formatTimestamp,
        },
    }

    function readBody(headers, body) {
        if (!(body instanceof Blob)) {
            return body
        }
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = function () {
                resolve(this.result)
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
    @use 'sass:meta';

    .network-detail-container {
        pre {
            &.dark {
                @include meta.load-css('highlight.js/scss/night-owl');
            }

            &.light {
                @include meta.load-css('highlight.js/scss/xcode');
            }
        }

        .v-expansion-panel {
            .v-expansion-panel-title {
                min-height: 40px !important;
                padding: 0 12px;
            }

            .v-expansion-panel-text__wrapper {
                padding: 12px 14px;
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
