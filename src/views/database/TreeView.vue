<template>
    <div class="tree-container">
        <v-treeview
                class="database-tree"
                :open.sync="open"
                :items="items"
                activatable>
            <template v-slot:label="{ item, leaf }">
                <v-flex @dblclick="query(item.name)" class="noselect">
                    {{ item.name }}
                </v-flex>
            </template>
            <template v-slot:prepend="{ item }">
                <div @click="toggle(item.name)" style="cursor: pointer">
                    <v-icon v-if="item.pk" color="amber">
                        mdi-key-variant
                    </v-icon>
                    <v-icon v-else color="primary">
                        {{ item.icon }}
                    </v-icon>
                </div>
            </template>
        </v-treeview>
    </div>
</template>

<script>
    export default {
        name: 'TreeView',
        props: {
            schema: Object
        },
        data: () => ({
            items: [],
            open: []
        }),
        watch: {
            schema () {
                this.loadSchema()
            }
        },
        mounted () {
            this.loadSchema()
        },
        methods: {
            toggle (table) {
                if (this.open.includes(table)) {
                    this.open = this.open.filter(item => item !== table)
                } else {
                    this.open.push(table)
                }
            },
            async query (table) {
                this.$emit('query', table)
            },
            loadSchema () {
                if (this.schema.tables) {
                    const tables = []

                    for (const [tab_name, table] of Object.entries(this.schema.tables)) {
                        const columns = []
                        for (const [col_name, meta] of Object.entries(table.columns)) {
                            columns.push({ icon: 'mdi-table-column', id: `${tab_name}.${col_name}`, name: col_name, ...meta })
                        }
                        tables.push({ icon: 'mdi-table-large', id: tab_name, name: tab_name, children: columns })
                    }

                    this.items = tables
                }
            }
        }
    }
</script>

<style lang="scss">
    .tree-container {
        position: relative;
        height: 100%;
        overflow: auto;

        .database-tree {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            padding: 4px 4px 20px;

            .v-icon.v-icon {
                font-size: 18px;
            }

            .v-treeview-node__root {
                min-height: 25px;
            }

            > .v-treeview-node[aria-expanded=true] {
                margin-bottom: 5px;
            }

            .v-treeview-node--active .v-treeview-node__label {
                color: var(--v-text-base);
            }

            .v-treeview-node__root::before {
                background-color: var(--v-selection_bg-base);
            }
        }
    }
</style>
