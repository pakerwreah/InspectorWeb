<template>
    <div class="console-wrapper">
        <div class="d-flex align-center">
            <v-btn icon density="comfortable" class="ml-3" @click="history_popup = true">
                <v-icon color="neutral">mdi-history</v-icon>
            </v-btn>
            <v-btn icon density="comfortable" class="ml-2" @click="executeQuery">
                <v-icon color="success">mdi-play</v-icon>
            </v-btn>
            <v-spacer />
            <v-checkbox class="my-0 py-0 mr-2" v-model="script" label="Script" dense hide-details />
        </div>

        <v-ace-editor
            ref="console"
            class="fill-height"
            v-model:value="sql"
            lang="mysql"
            :theme="theme"
            :options="editorOptions"
        />

        <SqlHistory v-model="history_popup" @selected="historySelected" />
    </div>
</template>

<script>
    import { VAceEditor } from 'vue3-ace-editor'
    import 'ace-builds/src-noconflict/mode-mysql'
    import 'ace-builds/src-noconflict/theme-twilight'
    import 'ace-builds/src-noconflict/theme-chrome'
    import 'ace-builds/src-noconflict/ext-language_tools'
    import 'ace-builds/src-noconflict/ext-searchbox'
    import 'ace-builds/src-noconflict/ext-keybinding_menu'

    import SqlHistory from './SqlHistory.vue'

    import theme from '@/mixins/theme'

    export default {
        name: 'SqlConsole',
        components: { VAceEditor, SqlHistory },
        mixins: [theme],
        props: {
            value: String,
            schema: Object,
        },
        data: () => ({
            sql: '',
            script: false,
            history_popup: false,
        }),
        computed: {
            theme() {
                return this.dark_mode ? 'twilight' : 'chrome'
            },
            editor() {
                return this.$refs.console.getAceInstance()
            },
            editorOptions: () => ({
                enableBasicAutocompletion: [completer],
                enableLiveAutocompletion: [completer],
            }),
        },
        watch: {
            schema(value) {
                Object.assign(schema, value)
            },
            sql(value) {
                localStorage.setItem('sql', value)
            },
            script(value) {
                localStorage.setItem('script', value)
            },
        },
        mounted() {
            this.sql = localStorage.getItem('sql') || ''
            this.script = JSON.parse(localStorage.getItem('script')) || false

            Object.assign(schema, this.schema)

            const exec = () => {
                this.executeQuery()
            }

            const commands = ['Ctrl-Enter', 'Command-Enter'].map((bindKey, i) => ({ name: 'query' + i, bindKey, exec }))

            commands.forEach((cmd) => this.editor.commands.addCommand(cmd))
        },
        methods: {
            executeQuery() {
                this.$emit('query', this.editor.getSelectedText() || this.sql, this.script)
            },
            historySelected(sql) {
                this.sql = sql
                this.editor.focus()
            },
        },
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

                const suggestions = (values) =>
                    (Array.isArray(values) ? values : Object.keys(values))
                        .filter((name) => name.includes(prefix))
                        .map((name) => ({ name: name, value: name }))

                const before = text.substring(0, pos - prefix.length)

                // search for table after directive
                if (/\b(from|join|update|table)\b\W+$/i.test(before)) {
                    values = suggestions(schema.tables)
                    // - spacer - //
                } else if (before.endsWith('.')) {
                    // search for columns of table before .
                    const token = before.slice(0, -1).split(splitRegex).pop()
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
                            .reduce((columns, table) => columns.concat(suggestions(table.columns)), [])
                            .concat(suggestions(schema.tables))
                    }
                }
            }

            callback(null, values)
        },
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

        .ace_editor {
            font: 14px / normal monospace;
        }
    }
</style>
