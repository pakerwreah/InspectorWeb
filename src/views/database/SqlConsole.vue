<template>
    <div class="console-wrapper">
        <div class="d-flex align-center">
            <v-btn icon small class="ml-2" color="success" @click="executeQuery">
                <v-icon>mdi-play</v-icon>
            </v-btn>
            <v-spacer />
            <v-checkbox class="my-0 py-0 mr-2"
                        v-model="script"
                        label="Script"
                        dense hide-details />
        </div>
        <editor ref="console"
                v-model="sql"
                lang="mysql"
                :theme="theme"
                :options="editorOptions" />
    </div>
</template>

<script>
    import editor from 'vue2-ace-editor'

    import 'brace/mode/mysql' // não tem sqlite =(
    import 'brace/theme/chrome'
    import 'brace/theme/twilight'
    import 'brace/ext/language_tools'
    import 'brace/ext/searchbox'
    import 'brace/ext/keybinding_menu'

    export default {
        name: 'SqlConsole',
        components: { editor },
        props: {
            value: String,
            schema: Object
        },
        data: () => ({
            sql: '',
            script: false
        }),
        computed: {
            theme () {
                return this.dark_mode ? 'twilight' : 'chrome'
            },
            editor () {
                return this.$refs.console.editor
            },
            editorOptions: () => ({
                enableBasicAutocompletion: [completer],
                enableLiveAutocompletion: [completer]
            })
        },
        watch: {
            schema (value) {
                Object.assign(schema, value)
            },
            sql (value) {
                localStorage.setItem('sql', value)
            },
            script (value) {
                localStorage.setItem('script', value)
            }
        },
        mounted () {
            this.sql = localStorage.getItem('sql') || ''
            this.script = JSON.parse(localStorage.getItem('script')) || false

            Object.assign(schema, this.schema)

            this.$on('resize', () => {
                this.editor.resize()
            })

            const exec = () => {
                this.executeQuery()
            }

            const commands = ['Ctrl-Enter', 'Command-Enter'].map((bindKey, i) => ({ name: 'query' + i, bindKey, exec }))

            commands.forEach(cmd => this.editor.commands.addCommand(cmd))
        },
        methods: {
            executeQuery () {
                // noinspection JSUnresolvedFunction
                this.$emit('query', this.editor.getSelectedText() || this.sql, this.script)
            }
        }
    }

    const schema = {}

    // noinspection JSUnusedGlobalSymbols
    const completer = {
        getCompletions: function (editor, session, _pos, prefix, callback) {
            let values = []

            if (schema.tables) {
                // noinspection JSUnresolvedFunction
                const pos = session.doc.positionToIndex(_pos)
                const text = editor.getValue()

                // ace/lib/ace/autocomplete/text_completer.js
                const splitRegex = /[^a-zA-Z_0-9$\-\u00C0-\u1FFF\u2C00-\uD7FF\w]+/

                const suggestions = values =>
                    (Array.isArray(values) ? values : Object.keys(values))
                        .filter(name => name.includes(prefix))
                        .map(name => ({ name: name, value: name }))

                const before = text.substring(0, pos - prefix.length)

                // search for table after directive
                if (/\b(from|join|update|table)\b\W+$/i.test(before)) {
                    values = suggestions(schema.tables)
                    // - spacer - //
                } else if (before.endsWith('.')) {
                    // search for columns of table before .
                    const token = before.substr(0, before.length - 1).split(splitRegex).pop()
                    const table = schema.tables[token]
                    if (table) {
                        values = suggestions(table.columns)
                    }
                }

                // fallbacks
                if (!values.length && prefix.length >= 2) {
                    // search for columns of all tables in sql
                    for (const [name, table] of Object.entries(schema.tables)) {
                        if (new RegExp('\\b' + name + '\\b').test(text)) {
                            values = values.concat(suggestions(table.columns))
                        }
                    }
                    // if there is no tables in sql, get all columns and all tables
                    if (!values.length) {
                        values = Object.values(schema.tables)
                            .reduce(
                                (columns, table) => columns.concat(suggestions(table.columns)),
                                []
                            ).concat(suggestions(schema.tables))
                    }
                }
            }

            callback(null, values)
        }
    }
</script>

<style lang="scss">
    .console-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;

        .v-input--selection-controls__input {
            margin-right: 0;

            .v-icon {
                color: var(--v-neutral-base);
            }
        }
    }
</style>
