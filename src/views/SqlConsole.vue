<template>
    <editor ref="console" @init="editorInit" lang="sql" :theme="theme" v-model="query" />
</template>

<!--suppress NpmUsedModulesInstalled -->
<script>
    import editor from 'vue2-ace-editor'

    export default {
        name: 'SqlConsole',
        components: { editor },
        props: {
            value: String
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
            }
        },
        mounted () {
            this.$on('resize', () => {
                this.$refs.console.editor.resize()
            })
        },
        methods: {
            editorInit () {
                require('brace/ext/language_tools') // language extension prerequsite...
                require('brace/mode/sql')
                require('brace/theme/chrome')
                require('brace/theme/twilight')
            }
        }
    }
</script>

<style scoped>
</style>
