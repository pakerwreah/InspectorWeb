<template>
    <splitpanes class="default-theme" style="height: 100%">
        <pane size="15" max-size="40">
            <!-- TODO -->
        </pane>
        <pane size="85">
            <splitpanes horizontal @resize="resize">
                <pane>
                    <SqlConsole ref="console" v-model="query" :schema="schema" />
                </pane>
                <pane v-if="result">
                    <TableView v-model="result" />
                </pane>
            </splitpanes>
        </pane>
    </splitpanes>
</template>

<script>
    import SqlConsole from './SqlConsole'
    import TableView from './TableView'
    import { Splitpanes, Pane } from 'splitpanes'
    import 'splitpanes/dist/splitpanes.css'

    export default {
        name: 'Database',
        components: { Splitpanes, Pane, SqlConsole, TableView },
        data: () => ({
            schema: {},
            query: '',
            result: null
        }),
        mounted () {
            this.loadSchema().catch(() => {
                const interval = setInterval(() => {
                    this.loadSchema()
                        .then(() => clearInterval(interval))
                        .catch(() => false)
                }, 5000)
            })
        },
        methods: {
            resize () {
                this.$refs.console.$emit('resize')
            },
            async loadSchema () {
                const schema = { tables: {} }

                const sql_tables = `
                    SELECT name
                    FROM sqlite_master
                    WHERE type='table'
                    AND name != 'sqlite_sequence'
                    ORDER BY name
                `
                const r = await this.$http.post('/database/query', sql_tables)

                const tables = r.data.data.map(d => d[0])

                for (const table of tables) {
                    const sql_columns = `pragma table_info(${table})`
                    const r = await this.$http.post('/database/query', sql_columns)
                    const cols = r.data.data
                    const idx = name => r.data.headers.indexOf(name)
                    const columns = { }
                    for (const c of cols) {
                        columns[c[idx('name')]] = {
                            type: c[idx('type')],
                            notnull: !!c[idx('notnull')],
                            dflt_value: c[idx('dflt_value')],
                            pk: !!c[idx('pk')]
                        }
                    }
                    schema.tables[table] = { columns }
                }

                this.schema = schema
            }
        }
    }
</script>
