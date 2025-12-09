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
                'items-per-page-options': [10, 20, 30, -1],
            }"
            class="result-table fill-height"
        >
            <template v-slot:no-data>
                <div class="no-data">
                    <div>No data available</div>
                </div>
            </template>
            <template v-if="!loading" v-slot:body.prepend>
                <tr>
                    <td v-for="i in headers.length" :key="i" v-show="visible[i - 1]">
                        <v-text-field
                            v-model="search[i - 1]"
                            class="result-search"
                            append-icon="mdi-magnify"
                            background-color="controls"
                            autocomplete="disabled"
                            spellcheck="false"
                            @input="updateSearch(i - 1)"
                            dense
                            hide-details
                        />
                    </td>
                </tr>
            </template>
        </v-data-table>
        <div class="result-toolbar pt-1">
            <template v-for="(item, i) in toolbar_buttons" :key="i">
                <v-tooltip right transition="slide-x-transition" open-delay="1200" content-class="px-2 py-0">
                    <template v-slot:activator="{ on }">
                        <v-btn v-on="on" class="mb-3" icon x-small :disabled="!headers.length" @click="item.action">
                            <v-icon :color="item.color">{{ item.icon }}</v-icon>
                        </v-btn>
                    </template>
                    <span>{{ item.tooltip }}</span>
                </v-tooltip>
            </template>
        </div>
        <ColumnsFilter
            v-model="columns_filter_popup"
            :headers="headers"
            :columns-visible.sync="visible"
            @goto="gotoColumn"
        />
    </div>
</template>

<script>
    import { zipObject, get, debounce, isEqual } from 'lodash'
    import ColumnsFilter from './ColumnsFilter.vue'

    export default {
        name: 'TableView',
        components: { ColumnsFilter },
        props: {
            sql: String,
            result: Object,
            loading: Boolean,
        },
        data: () => ({
            search: [],
            search_debounced: [],
            columns_filter_popup: false,
            visible: [],
            sort: [],
            last_headers: [],
            scroll: 0,
        }),
        computed: {
            toolbar_buttons() {
                return [
                    {
                        icon: 'mdi-table-row-remove',
                        color: 'neutral',
                        tooltip: 'Filter columns',
                        action: () => this.showColumnFilter(),
                    },
                    {
                        icon: 'mdi-sync',
                        color: 'primary',
                        tooltip: 'Reload',
                        action: () => this.$emit('reload', this.sql),
                    },
                ]
            },
            headers() {
                const filter = (i) => (value) =>
                    !(this.search_debounced[i] || '').length ||
                    String(value).toLowerCase().includes(this.search_debounced[i].toLowerCase())
                return this.loading
                    ? []
                    : get(this.result, 'headers', []).map((r, i) => ({
                          text: r,
                          value: i.toString(),
                          align: this.visible[i] ? '' : ' d-none',
                          filter: filter(i),
                      }))
            },
            items() {
                const keys = Object.keys(get(this.result, 'headers', []))
                return this.loading ? [] : get(this.result, 'data', []).map((r) => zipObject(keys, r))
            },
            updateSearch() {
                return debounce(
                    (i) => {
                        this.$set(this.search_debounced, i, this.search[i])
                    },
                    Math.min((70 * this.items.length) / 10000, 1000),
                )
            },
        },
        watch: {
            result(result) {
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
            visible(visible) {
                visible.forEach((v, i) => {
                    if (!v) {
                        this.search[i] = ''
                        this.search_debounced[i] = ''
                    }
                })
            },
        },
        created() {
            this.onScroll = this.onScroll.bind(this)
        },
        mounted() {
            // hot reload aware
            this.fillVisible(true)
        },
        methods: {
            onScroll(e) {
                if (!this.loading) {
                    this.scroll = e.target.scrollLeft
                }
            },
            fillVisible(value) {
                if (this.headers) {
                    this.visible = Array(this.headers.length).fill(value)
                }
            },
            showColumnFilter() {
                this.columns_filter_popup = true
            },
            gotoColumn(i) {
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
        },
    }
</script>

<style lang="scss">
    $toolbar-width: 25px;

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

            &::before,
            &::after {
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
                    &::before,
                    &::after {
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
