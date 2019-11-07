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
                <td v-for="(h,i) in result.headers" :key="i">
                    <v-text-field spellcheck="false" append-icon="mdi-magnify" class="result-search" background-color="controls" dense hide-details v-model="search[i]" />
                </td>
            </tr>
        </template>
    </v-data-table>
</template>

<script>
    import { zipObject } from 'lodash'

    export default {
        name: 'TableView',
        props: {
            result: Object,
            loading: Boolean
        },
        data: () => ({
            search: []
        }),
        computed: {
            headers () {
                const filter = i => value => !(this.search[i] || '').length || String(value).toLowerCase().includes(this.search[i].toLowerCase())
                return this.loading ? [] : this.result.headers.map((r, i) => ({ text: r, value: r, filter: filter(i) }))
            },
            items () {
                return this.loading ? [] : this.result.data.map(r => zipObject(this.result.headers, r))
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

        .v-data-footer__select .v-select {
            margin-top: 0 !important;
            margin-bottom: 0 !important;

            .v-input__slot {
                &::before, &::after {
                    border: none !important;
                }
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
