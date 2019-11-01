<template>
    <splitpanes class="default-theme" style="height: 100%">
        <pane size="15" max-size="40">
            <!-- TODO -->
        </pane>
        <pane size="85">
            <HelloWorld />
        </pane>
    </splitpanes>
</template>

<script>
    import HelloWorld from './HelloWorld'
    import { Splitpanes, Pane } from 'splitpanes'
    import 'splitpanes/dist/splitpanes.css'

    export default {
        name: 'Database',
        components: { Splitpanes, Pane, HelloWorld }
    }
</script>

<style lang="scss">
    .theme--dark {
        .splitpanes.default-theme {

            .splitpanes__pane {
                background-color: unset;
            }

            .splitpanes__splitter {
                border-left: none;
                background-color: var(--v-secondary-base);
            }

        }
    }
</style>
