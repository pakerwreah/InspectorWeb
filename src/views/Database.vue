<template>
    <splitpanes class="default-theme" style="height: 100%">
        <pane size="15" max-size="40">
            <!-- TODO -->
        </pane>
        <pane size="85">
            <splitpanes horizontal @resize="resize">
                <pane>
                    <SqlConsole ref="console" v-model="query" />
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
            query: '',
            result: null
        }),
        methods: {
            resize () {
                this.$refs.console.$emit('resize')
            }
        }
    }
</script>
