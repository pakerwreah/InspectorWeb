<template>
    <div class="result-container">
        <div class="result-toolbar pt-1">
            <template v-for="(item, i) in toolbar_buttons" :key="i">
                <v-btn icon :disabled="!headers.length" @click="item.action">
                    <v-icon :color="item.color">{{ item.icon }}</v-icon>
                    <v-tooltip
                        activator="parent"
                        transition="slide-x-transition"
                        open-delay="1000"
                        content-class="px-2 py-0"
                    >
                        {{ item.tooltip }}
                    </v-tooltip>
                </v-btn>
            </template>
        </div>

        <ColumnsFilter
            :headers="result?.headers ?? []"
            v-model="columns_filter_popup"
            v-model:columns-visible="columns_visible"
            @goto="gotoColumn"
        />

        <v-data-table
            ref="dt"
            class="result-table"
            :loading="loading"
            loading-text="Executing query..."
            :headers="headers"
            :items="items"
            :items-per-page="10"
            :sort-by="sort"
            density="compact"
            :footer-props="{
                'items-per-page-options': [10, 20, 30, -1],
            }"
        >
            <template #no-data>
                <div class="no-data">No data available</div>
            </template>

            <template v-if="!loading" #footer.prepend>
                <span class="flex-grow-1 px-4">{{ info }}</span>
            </template>

            <template v-if="!loading" #body.prepend>
                <tr>
                    <td v-for="i in headers.length" :key="i" v-show="columns_visible[i - 1]">
                        <v-text-field
                            v-model="search[i - 1]"
                            variant="solo"
                            class="result-search"
                            background-color="controls"
                            autocomplete="disabled"
                            spellcheck="false"
                            @input="updateSearch(i - 1)"
                            hide-details
                        />
                    </td>
                </tr>
            </template>
        </v-data-table>
    </div>
</template>

<script lang="ts">
    import { debounce, isEqual, zipObject } from 'lodash'
    import ColumnsFilter from './ColumnsFilter.vue'
    import { defineComponent, type PropType } from 'vue'
    import type { DataTableHeader, DataTableSortItem } from 'vuetify'
    import type { VDataTable } from 'vuetify/components'

    type Result = {
        headers: string[]
        data: any[][]
    }

    export default defineComponent({
        name: 'TableView',
        components: { ColumnsFilter },
        props: {
            sql: String,
            result: Object as PropType<Result>,
            info: String,
            loading: Boolean,
        },
        data: () => ({
            search: [] as string[],
            search_debounced: [] as string[],
            columns_filter_popup: false,
            columns_visible: [] as boolean[],
            sort: [] as DataTableSortItem[],
            last_headers: [] as string[],
            scrollLeft: 0,
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
            headers(): DataTableHeader[] {
                if (this.loading || !this.result?.headers) {
                    return []
                }
                return this.result.headers.map(
                    (r, i): DataTableHeader => ({
                        title: r,
                        value: i.toString(),
                        cellProps: {
                            class: this.columns_visible[i] ? '' : 'd-none',
                        },
                        headerProps: {
                            align: 'center',
                            class: this.columns_visible[i] ? '' : 'd-none',
                        },
                        filter: (value: string) => {
                            if (!this.search_debounced[i]?.length) {
                                return true
                            }
                            return String(value).toLowerCase().includes(this.search_debounced[i].toLowerCase())
                        },
                    }),
                )
            },
            items() {
                if (this.loading || !this.result?.headers) {
                    return []
                }
                const keys = Object.keys(this.result.headers)
                return this.result.data.map((r) => zipObject(keys, r))
            },
            updateSearch() {
                return debounce(
                    (i) => {
                        this.search_debounced[i] = this.search[i] ?? ''
                    },
                    Math.min((70 * this.items.length) / 10000, 1000),
                )
            },
            dataTable() {
                return this.$refs.dt as VDataTable
            },
            tableWrapper() {
                return this.dataTable.$el.querySelector('.v-table__wrapper')
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
                        this.scrollLeft = 0
                    }
                    requestAnimationFrame(() => {
                        this.tableWrapper.scrollTo({ left: this.scrollLeft })
                    })
                }
            },
            visible(visible: boolean[]) {
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

            this.tableWrapper.addEventListener('scroll', this.onScroll)
        },
        beforeUnmount() {
            this.tableWrapper.removeEventListener('scroll', this.onScroll)
        },
        methods: {
            onScroll(e: Event) {
                if (!this.loading) {
                    this.scrollLeft = (e.target as HTMLElement).scrollLeft
                }
            },
            fillVisible(value: boolean) {
                if (this.headers) {
                    this.columns_visible = Array(this.headers.length).fill(value)
                }
            },
            showColumnFilter() {
                this.columns_filter_popup = true
            },
            gotoColumn(i: number) {
                const ref = this.dataTable.$el
                const active = ref.querySelector('th.text-primary')
                if (active) {
                    active.classList.remove('text-primary')
                }
                const cols = ref.querySelectorAll('th')
                const dt = ref.querySelector('.v-table__wrapper')
                const dt_bounds = dt.getBoundingClientRect()
                const col_bounds = cols[i].getBoundingClientRect()
                const start = cols[0].getBoundingClientRect().left - dt_bounds.left - 12
                const left = col_bounds.left - dt_bounds.left - (dt_bounds.width - col_bounds.width) / 2 - start
                dt.scrollTo({ left, behavior: 'smooth' })
                cols[i].classList.add('text-primary')
            },
        },
    })
</script>

<style lang="scss">
    .result-container {
        height: 100%;
        display: flex;

        .result-toolbar {
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: center;
            border-right: solid 1px rgb(var(--v-theme-controls_border));
        }

        .result-search {
            .v-field__field > * {
                min-height: 0;
                padding: 0 8px;
            }
        }

        .result-table {
            height: 100%;
            position: relative;
            background: none;
            min-width: 0;

            th {
                background-color: rgb(var(--v-theme-panel));
                position: sticky;
                top: 0;
                z-index: 999;
            }

            .v-data-table-footer .v-field__outline {
                display: none;
            }

            .no-data {
                position: absolute;
                inset-inline: 0;
                padding: 12px;
            }
        }
    }
</style>
