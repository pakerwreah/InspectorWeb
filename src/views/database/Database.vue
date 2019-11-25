<template>
    <splitpanes class="default-theme fill-height">
        <pane style="min-width: 250px" size="15" max-size="40">
            <TreeView :databases="databases"
                      :currentdb="currentdb"
                      :schema="schema"
                      :progress="progress"
                      @selectDB="selectDB"
                      @query="queryTable" />
        </pane>
        <pane size="85">
            <splitpanes horizontal @resize="resize">
                <pane>
                    <SqlConsole ref="console"
                                :schema="schema"
                                @query="query" />
                    <v-overlay absolute :value="!schema.tables" />
                </pane>
                <pane v-if="error">
                    <div class="error--text ma-2">{{ error }}</div>
                </pane>
                <pane v-else-if="result">
                    <TableView :result="result"
                               :loading="loading"
                               @reload="reloadQuery" />
                    <div class="result-info">{{ info }}</div>
                </pane>
            </splitpanes>
        </pane>
    </splitpanes>
</template>

<script>
    import { get } from 'lodash'
    import { Splitpanes, Pane } from 'splitpanes'
    import SqlConsole from './SqlConsole'
    import TableView from './TableView'
    import TreeView from './TreeView'
    import { sleep } from '../../utils'

    function formatDuration (duration) {
        const { sec, usec } = duration

        let msg = []

        if (sec) {
            msg.push(`${sec} second` + (sec > 1 ? 's' : ''))
        }

        if (usec) {
            msg.push(`${usec / 1000} milliseconds`)
        }

        return msg.join(' and ')
    }

    export default {
        name: 'Database',
        components: { Splitpanes, Pane, SqlConsole, TableView, TreeView },
        data: () => ({
            m_id: 0, // to stop loops on hot reload
            progress: 0,
            currentdb: 0,
            databases: [],
            schema: {},
            result: null,
            error: null,
            loading: false,
            info: '',
            last_query: null
        }),
        mounted () {
            this.getDatabases()
        },
        beforeDestroy () {
            this.m_id++
        },
        methods: {
            resize () {
                this.$refs.console.$emit('resize')
            },
            reloadQuery () {
                this.query(this.last_query)
            },
            queryTable (table) {
                this.query(`SELECT * FROM ${table}`)
            },
            async query (sql, script) {
                if (this.loading) return

                this.last_query = null
                this.error = null
                this.loading = true
                this.info = ''
                try {
                    this.result = (await this.$http.post('/database/' + (script ? 'execute' : 'query'), sql)).data

                    this.last_query = sql

                    setTimeout(() => this.resize(), 300)

                    this.info = 'Runtime: ' + formatDuration(this.result.duration)

                    if (/(^|\s)(create|alter|drop)\s/ig.test(sql)) {
                        await this.loadSchema(this.m_id)
                    }
                } catch (error) {
                    this.error = get(error, 'response.data.msg', error.message)
                }
                this.loading = false
            },
            async getDatabases () {
                const m_id = this.m_id
                while (m_id === this.m_id) {
                    try {
                        this.progress = -1
                        const r = await this.$http.get('/database/list')
                        this.databases = r.data.databases
                        this.currentdb = r.data.current
                        await this.loadSchema(m_id)
                        return
                    } catch (error) {
                        await sleep(3000)
                    }
                }
            },
            async selectDB (index) {
                const m_id = this.m_id
                const max_tries = 3
                for (let tries = 0; tries < max_tries && m_id === this.m_id; tries++) {
                    try {
                        this.progress = -1
                        this.schema = {}
                        await this.$http.put('/database/current/' + index)
                        this.currentdb = index
                        await this.loadSchema(m_id)
                        return
                    } catch (error) {
                        if (tries < max_tries - 1) {
                            await sleep(500)
                        } else {
                            // start over
                            this.getDatabases()
                        }
                    }
                }
            },
            async loadSchema (m_id) {
                this.progress = 0
                const max_tries = 3
                for (let tries = 0; tries < max_tries && m_id === this.m_id; tries++) {
                    try {
                        const schema = { tables: {} }

                        const getTables = async () => {
                            const sql_tables = `
                                SELECT name
                                FROM sqlite_master
                                WHERE type = 'table' AND name != 'sqlite_sequence'
                                ORDER BY name
                            `
                            const r = await this.$http.post('/database/query', sql_tables)

                            return r.data.data.map(d => d[0])
                        }

                        const getColumns = async table => {
                            const sql_columns = `pragma table_info(${table})`
                            const r = await this.$http.post('/database/query', sql_columns)
                            const cols = r.data.data
                            const idx = name => r.data.headers.indexOf(name)
                            const columns = {}
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

                        const tables = await getTables()

                        for (const [i, table] of Object.entries(tables)) {
                            const columns = await getColumns(table)
                            const foreign_keys = await getForeignKeys(table)
                            for (const fk of foreign_keys) {
                                columns[fk.from].fk = `${fk.table} (${fk.to})`
                            }
                            schema.tables[table] = { columns }

                            if (i % 3 === 0) {
                                const progress = 100 * (parseInt(i) + 1) / tables.length
                                this.progress = Math.round(progress)
                            }
                        }

                        this.progress = 100

                        setTimeout(() => {
                            this.schema = schema
                        }, 150)

                        return
                    } catch (error) {
                        if (tries < max_tries - 1) {
                            await sleep(500)
                        } else {
                            throw error
                        }
                    }
                }
            }
        }
    }
</script>

<style scoped lang="scss">
    .result-info {
        position: absolute;
        bottom: 9px;
        left: 12px;
        font-size: 12px;
    }
</style>
