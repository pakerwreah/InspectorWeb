<template>
    <splitpanes class="default-theme" style="height: 100%">
        <pane style="min-width: 250px" size="15" max-size="40">
            <TreeView :schema="schema" :progress="progress" @query="queryTable" />
        </pane>
        <pane size="85">
            <splitpanes horizontal @resize="resize">
                <pane>
                    <SqlConsole ref="console" v-model="sql" :schema="schema" />
                </pane>
                <pane v-if="result">
                    <TableView :result="result" />
                </pane>
            </splitpanes>
        </pane>
    </splitpanes>
</template>

<script>
    import SqlConsole from './SqlConsole'
    import TableView from './TableView'
    import TreeView from './TreeView'
    import { Splitpanes, Pane } from 'splitpanes'
    import 'splitpanes/dist/splitpanes.css'

    export default {
        name: 'Database',
        components: { Splitpanes, Pane, SqlConsole, TableView, TreeView },
        data: () => ({
            progress: 0,
            schema: {},
            sql: '',
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
            queryTable (table) {
                this.query(`SELECT * FROM ${table}`)
            },
            async query (sql) {
                this.sql = sql
                this.result = (await this.$http.post('/database/query', sql)).data
                setTimeout(() => {
                    this.resize()
                }, 300)
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

                const getColumns = async table => {
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
                    return columns
                }

                const getForeignKeys = async table => {
                    const sql_columns = `pragma foreign_key_list(${table})`
                    const r = await this.$http.post('/database/query', sql_columns)
                    const cols = r.data.data
                    const idx = name => r.data.headers.indexOf(name)
                    const foreign_keys = []
                    for (const c of cols) {
                        foreign_keys.push({
                            from: c[idx('from')],
                            table: c[idx('table')],
                            to: c[idx('to')]
                        })
                    }
                    return foreign_keys
                }

                for (const [i, table] of Object.entries(tables)) {
                    const columns = await getColumns(table)
                    const foreign_keys = await getForeignKeys(table)
                    for (const fk of foreign_keys) {
                        columns[fk.from].fk = `${fk.table} (${fk.to})`
                    }
                    schema.tables[table] = { columns }

                    if (i % 3 === 0) {
                        this.progress = 100 * (parseInt(i) + 1) / tables.length
                    }
                }

                this.progress = 100

                setTimeout(() => {
                    this.schema = schema
                }, 150)
            }
        }
    }
</script>
