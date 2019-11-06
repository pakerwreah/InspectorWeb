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
            <div class="no-data"><div>No data available</div></div>
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
        data: () => ({}),
        computed: {
            headers () {
                return this.loading ? [] : this.result.headers.map(r => ({ text: r, value: r }))
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

        th {
            background-color: var(--v-panel-base) !important;
            white-space: nowrap;
        }

        table {
            tbody {
                height: 100%;

                tr:hover {
                    background: none !important;
                }
            }
        }
    }
</style>
