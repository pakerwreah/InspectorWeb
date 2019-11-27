<template>
    <div class="result-container">
        <v-data-table
                ref="dt"
                :loading="loading"
                loading-text="Executing query..."
                :headers="headers"
                :items="items"
                :items-per-page="10"
                :sort-by="sort"
                height="100%"
                dense
                fixed-header
                :footer-props="{
                    'items-per-page-options': [10, 20, 30, -1]
                }"
                class="result-table fill-height">
            <template v-slot:no-data>
                <div class="no-data">
                    <div>No data available</div>
                </div>
            </template>
            <template v-if="!loading" v-slot:body.prepend>
                <tr>
                    <td v-for="i in headers.length" :key="i" v-show="visible[i-1]">
                        <v-text-field v-model="search[i-1]"
                                      class="result-search"
                                      append-icon="mdi-magnify"
                                      background-color="controls"
                                      autocomplete="disabled"
                                      spellcheck="false"
                                      @input="updateSearch(i-1)"
                                      dense hide-details />
                    </td>
                </tr>
            </template>
        </v-data-table>
        <div class="result-toolbar pt-1">
            <template v-for="(item, i) in toolbar_buttons">
                <v-tooltip :key="i" right transition="slide-x-transition" open-delay="1200" content-class="px-2 py-0">
                    <template v-slot:activator="{ on }">
                        <v-btn v-on="on" class="mb-3" icon x-small :disabled="!headers.length" @click="item.action">
                            <v-icon :color="item.color">{{ item.icon }}</v-icon>
                        </v-btn>
                    </template>
                    <span>{{ item.tooltip }}</span>
                </v-tooltip>
            </template>
        </div>
        <v-dialog v-model="columns_filter_popup"
                  width="300"
                  overlay-opacity="0.1"
                  attach=".result-container"
                  content-class="column-filter-popup"
                  scrollable
                  @keydown="keyboard">
            <v-card>
                <v-card-title class="panel pa-1 px-2">
                    <v-layout>
                        <v-flex xs1 align-self-center>
                            <v-checkbox v-model="visible_all"
                                        class="my-1 py-0"
                                        dense hide-details />
                        </v-flex>
                        <v-flex align-self-center>
                            <v-text-field ref="column_search"
                                          v-model="column_search"
                                          class="result-search ml-2"
                                          append-icon="mdi-magnify"
                                          background-color="controls"
                                          autocomplete="disabled"
                                          spellcheck="false"
                                          dense
                                          hide-details
                                          autofocus
                                          clearable />
                        </v-flex>
                    </v-layout>
                </v-card-title>

                <v-card-text class="columns_filter_body px-2 py-2" style="max-height: 300px">
                    <template v-for="(h,i) in headers">
                        <v-hover v-slot:default="{ hover }" :key="i">
                            <v-layout v-show="columns_filter_listed[i]" class="columns_filter_item" :class="{selected: columns_filter_selected === i}">
                                <v-flex xs1 align-self-center>
                                    <v-checkbox v-model="visible[i]"
                                                class="my-0 py-1 mr-2"
                                                dense hide-details />
                                </v-flex>
                                <v-flex class="ml-2 align-stretch">
                                    <v-layout class="pointer fill-height" @click="toggleVisible(i)">
                                        <v-flex align-self-center>{{ h.text }}</v-flex>
                                    </v-layout>
                                </v-flex>
                                <v-flex xs1 align-self-center class="ml-2">
                                    <v-btn icon x-small v-if="visible[i]" :color="hover ? 'primary' : 'transparent'" @click="gotoColumn(i)">
                                        <v-icon class="pointer">mdi-target</v-icon>
                                    </v-btn>
                                </v-flex>
                            </v-layout>
                        </v-hover>
                    </template>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<script>
    import { zipObject, get, debounce, throttle, isEqual } from 'lodash'

    export default {
        name: 'TableView',
        props: {
            sql: String,
            result: Object,
            loading: Boolean
        },
        data: () => ({
            search: [],
            search_debounced: [],
            columns_filter_popup: false,
            column_search: '',
            visible: [],
            columns_filter_selected: -1,
            sort: [],
            last_headers: [],
            scroll: 0
        }),
        computed: {
            visible_all: {
                get () {
                    return this.visible.every(v => v)
                },
                set (value) {
                    this.fillVisible(value)
                }
            },
            columns_filter_listed () {
                return this.headers.map(h => !this.column_search || h.text.includes(this.column_search))
            },
            toolbar_buttons () {
                return [
                    { icon: 'mdi-table-row-remove', color: 'selection_bg', tooltip: 'Filter columns', action: () => this.showColumnFilter() },
                    { icon: 'mdi-sync', color: 'primary', tooltip: 'Reload', action: () => this.$emit('reload', this.sql) }
                ]
            },
            headers () {
                const filter = i => value => !(this.search_debounced[i] || '').length || String(value).toLowerCase().includes(this.search_debounced[i].toLowerCase())
                return this.loading ? [] : get(this.result, 'headers', []).map((r, i) => ({ text: r, value: i.toString(), align: this.visible[i] ? '' : ' d-none', filter: filter(i) }))
            },
            items () {
                const keys = Object.keys(get(this.result, 'headers', []))
                return this.loading ? [] : get(this.result, 'data', []).map(r => zipObject(keys, r))
            },
            updateSearch () {
                return debounce(i => {
                    this.$set(this.search_debounced, i, this.search[i])
                }, Math.min(70 * this.items.length / 10000, 1000))
            }
        },
        watch: {
            result (result) {
                if (result) {
                    if (!isEqual(result.headers, this.last_headers)) {
                        this.last_headers = result.headers
                        this.fillVisible(true)
                        this.search.fill('')
                        this.search_debounced.fill('')
                        this.sort = []
                        this.scroll = 0
                    }
                    requestAnimationFrame(() => {
                        const dt = this.$refs.dt.$el.querySelector('.v-data-table__wrapper')
                        dt.addEventListener('scroll', this.onScroll)
                        dt.scrollTo({ left: this.scroll })
                    })
                }
            },
            columns_filter_popup (on) {
                if (on) {
                    this.column_search = ''
                    this.columns_filter_selected = -1
                    requestAnimationFrame(() => {
                        this.$refs.column_search.focus()
                    })
                }
            },
            column_search () {
                const i = this.columns_filter_selected
                if (i >= 0 && !this.columns_filter_listed[i]) {
                    this.columns_filter_selected = -1
                }
            }
        },
        created () {
            this.onScroll = this.onScroll.bind(this)
        },
        mounted () {
            // hot reload aware
            this.fillVisible(true)
        },
        methods: {
            onScroll (e) {
                if (!this.loading) {
                    this.scroll = e.target.scrollLeft
                }
            },
            fillVisible (value) {
                if (this.headers) {
                    this.visible = Array(this.headers.length).fill(value)
                }
            },
            toggleVisible (i) {
                this.$set(this.visible, i, !this.visible[i])
                this.columns_filter_selected = i
            },
            showColumnFilter () {
                this.columns_filter_popup = true
            },
            gotoColumn (i) {
                i -= this.visible.filter((v, j) => j < i && !v).length
                const ref = this.$refs.dt.$el
                const active = ref.querySelector('th.primary--text')
                if (active) {
                    active.classList.remove('primary--text')
                }
                const cols = ref.querySelectorAll('th:not(.d-none)')
                const dt = ref.querySelector('.v-data-table__wrapper')
                const dt_bounds = dt.getBoundingClientRect()
                const col_bounds = cols[i].getBoundingClientRect()
                const start = cols[0].getBoundingClientRect().left - dt_bounds.left - 12
                const left = col_bounds.left - dt_bounds.left - (dt_bounds.width - col_bounds.width) / 2 - start
                dt.scrollTo({ left, behavior: 'smooth' })
                cols[i].classList.add('primary--text')
            },
            keyboard: throttle(function (e) {
                const key = e.keyCode

                const listed = this.columns_filter_listed

                let i = this.columns_filter_selected

                const ENTER = 13
                const SPACE = 32
                const ARROW_UP = 38
                const ARROW_DOWN = 40

                switch (key) {
                    case ENTER: {
                        if (i >= 0 && this.visible[i]) {
                            this.gotoColumn(i)
                        }
                        break
                    }
                    case SPACE: {
                        e.preventDefault()
                        if (i >= 0) {
                            this.toggleVisible(i)
                        }
                        break
                    }
                    case ARROW_UP:
                    case ARROW_DOWN: {
                        e.preventDefault()

                        const start = listed.indexOf(true)
                        const end = listed.lastIndexOf(true)

                        if (key === ARROW_UP) {
                            if (i < 0 || !listed[i]) {
                                i = end
                            } else {
                                do { i-- } while (i > 0 && !listed[i])
                            }
                        } else if (key === ARROW_DOWN) {
                            if (i < 0 || !listed[i]) {
                                i = start
                            } else {
                                do { i++ } while (i < end && !listed[i])
                            }
                        }

                        if (this.columns_filter_selected !== i && i >= start && i <= end) {
                            this.columns_filter_selected = i

                            requestAnimationFrame(() => {
                                this.$vuetify.goTo('.columns_filter_item.selected', { container: '.columns_filter_body', offset: 150, duration: 200 })
                            })
                        }
                        break
                    }
                }
            }, 100)
        }
    }
</script>

<style lang="scss">
    $toolbar-width: 25px;

    .column-filter-popup {
        position: absolute;
        top: 0;

        .columns_filter_item.selected {
            background-color: #cccccc33;
        }
    }

    .result-toolbar {
        position: absolute;
        left: 0;
        bottom: 35px;
        top: 0;
        width: $toolbar-width;
        display: flex;
        flex-direction: column;
        align-items: center;
        border-right: solid 1px var(--v-controls_border-base);
    }

    .result-search {
        margin-bottom: 5px;

        .v-input__slot {
            font-size: 12px;
            height: 22px;
            border-radius: 5px;

            input {
                padding: 8px 0 8px 8px !important;
            }

            &::before, &::after {
                border: none !important;
            }
        }

        .v-input__append-inner {
            margin-top: 0 !important;

            .v-input__icon {
                height: 22px;

                .v-icon {
                    font-size: 18px;
                    color: var(--v-controls-darken2);
                }
            }
        }
    }

    .result-table {
        background-color: unset !important;
        display: flex;
        flex-direction: column;
        position: absolute;
        left: $toolbar-width;
        right: 0;
        bottom: 0;
        top: 0;

        .v-data-table__wrapper {
            position: relative;

            .no-data {
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                right: 0;
                display: flex;

                div {
                    margin: auto;
                }
            }
        }

        .v-data-footer {
            .v-data-footer__select .v-select {
                margin: 0 0 0 12px !important;

                .v-input__slot {
                    &::before, &::after {
                        border: none !important;
                    }
                }
            }

            .v-data-footer__pagination {
                margin: 0 18px 0 12px !important;
            }
        }

        th {
            background-color: var(--v-panel-base) !important;
            white-space: nowrap;

            span {
                display: inline-block;
                width: calc(100% - 18px);
                padding-left: 18px;
                margin-right: 2px;
                text-align: center !important;
            }
        }

        tbody {
            height: 100%;

            tr:hover {
                background: none !important;
            }
        }
    }
</style>
