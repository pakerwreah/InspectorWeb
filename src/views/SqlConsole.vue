<template>
    <editor ref="console" @init="editorInit" lang="mysql" :theme="theme" :options="editorOptions" v-model="query" />
</template>

<!--suppress NpmUsedModulesInstalled -->
<script>
    import editor from 'vue2-ace-editor'

    export default {
        name: 'SqlConsole',
        components: { editor },
        props: {
            value: String,
            database: Object
        },
        computed: {
            theme () {
                return this.dark_mode ? 'twilight' : 'chrome'
            },
            query: {
                get () {
                    return this.value
                },
                set (value) {
                    this.$emit('input', value)
                }
            },
            editorOptions: () => ({
                enableBasicAutocompletion: [completer],
                enableLiveAutocompletion: [completer]
            })
        },
        watch: {
            database (value) {
                Object.assign(database, value)
            }
        },
        mounted () {
            this.$on('resize', () => {
                this.$refs.console.editor.resize()
            })

            Object.assign(database, this.database)
        },
        methods: {
            editorInit () {
                require('brace/mode/mysql') // não tem sqlite =(
                require('brace/theme/chrome')
                require('brace/theme/twilight')
                require('brace/ext/language_tools')
            }
        }
    }

    const database = process.env.NODE_ENV === 'development'
        ? {
            tables: {
                'tb_usuario': {
                    columns: {
                        'id_usuario': { type: 'integer' },
                        'nome': { type: 'text' },
                        'email': { type: 'text' },
                        'ativo': { type: 'boolean' }
                    }
                },
                'tb_atividade': {
                    columns: {
                        'id_atividade': { type: 'integer' },
                        'nome': { type: 'text' },
                        'descricao': { type: 'text' },
                        'ativo': { type: 'boolean' }
                    }
                }
            }
        }
        : {}

    // noinspection JSUnusedGlobalSymbols
    const completer = {
        getCompletions: function (editor, session, _pos, prefix, callback) {
            let values = []
            // noinspection JSUnresolvedFunction
            const pos = session.doc.positionToIndex(_pos)
            const text = editor.getValue()

            // ace/lib/ace/autocomplete/text_completer.js
            const splitRegex = /[^a-zA-Z_0-9$\-\u00C0-\u1FFF\u2C00-\uD7FF\w]+/

            const suggestions = values =>
                (Array.isArray(values) ? values : Object.keys(values))
                    .filter(name => name.startsWith(prefix))
                    .map(name => ({ name: name, value: name }))

            const before = text.substring(0, pos - prefix.length)

            // search for table after directive
            if (/\b(from|join|update|table)\b\W+$/i.test(before)) {
                values = suggestions(database.tables)
                // - spacer - //
            } else if (before.endsWith('.')) {
                // search for columns of table before .
                const token = before.substr(0, before.length - 1).split(splitRegex).pop()
                const table = database.tables[token]
                if (table) {
                    values = suggestions(table.columns)
                }
            }

            // fallbacks
            if (!values.length && prefix.length >= 2) {
                // search for columns of all tables in sql
                for (const [name, table] of Object.entries(database.tables)) {
                    if (new RegExp('\\b' + name + '\\b').test(text)) {
                        values = values.concat(suggestions(table.columns))
                    }
                }
                // if there is no tables in sql, get all columns and all tables
                if (!values.length) {
                    values = Object.values(database.tables)
                        .reduce(
                            (columns, table) => columns.concat(suggestions(table.columns)),
                            []
                        ).concat(suggestions(database.tables))
                }
            }

            callback(null, values)
        }
    }
</script>

<style scoped>
</style>
