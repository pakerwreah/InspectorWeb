<template>
    <v-data-table
            :loading="loading"
            loading-text="Executing query..."
            :headers="headers"
            :items="items"
            :items-per-page="10"
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
                <td v-for="i in headers.length" :key="i">
                    <v-text-field v-model="search[i-1]"
                                  class="result-search"
                                  append-icon="mdi-magnify"
                                  background-color="controls"
                                  autocomplete="off"
                                  spellcheck="false"
                                  @input="updateSearch(i-1)"
                                  dense hide-details />
                </td>
            </tr>
        </template>
    </v-data-table>
</template>

<script>
    import { zipObject, get, debounce } from 'lodash'

    export default {
        name: 'TableView',
        props: {
            result: Object,
            loading: Boolean
        },
        data: () => ({
            search: [],
            search_debounced: []
        }),
        computed: {
            headers () {
                const filter = i => value => !(this.search_debounced[i] || '').length || String(value).toLowerCase().includes(this.search_debounced[i].toLowerCase())
                return this.loading ? [] : get(this.result, 'headers', []).map((r, i) => ({ text: r, value: r, filter: filter(i) }))
            },
            items () {
                return this.loading ? [] : get(this.result, 'data', []).map(r => zipObject(this.result.headers, r))
            },
            updateSearch () {
                return debounce(i => {
                    this.$set(this.search_debounced, i, this.search[i])
                }, Math.min(70 * this.items.length / 10000, 1000))
            }
        }
    }
</script>

<style lang="scss">
    .result-table {
        background-color: unset !important;
        display: flex;
        flex-direction: column;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;

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
                margin-top: 0;

                .v-input__icon {
                    height: 22px;

                    .v-icon {
                        font-size: 18px;
                        color: var(--v-controls-darken2);
                    }
                }
            }
        }

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
