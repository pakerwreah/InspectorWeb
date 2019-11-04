<template>
    <div class="tree-container">
        <v-treeview v-if="items"
                    class="database-tree"
                    :open.sync="open"
                    :items="items"
                    activatable>
            <template v-slot:label="{ item, leaf }">
                <v-flex @dblclick="!leaf && query(item.name)" class="noselect text-truncate">
                    {{ item.name }}
                </v-flex>
            </template>
            <template v-slot:append="{ item, leaf }">
                <span class="noselect accent--text text-lowercase pt-1 pl-2" style="font-size: 10px">
                    {{ item.type }}
                </span>
            </template>
            <template v-slot:prepend="{ item, leaf }">
                <template v-if="leaf">
                    <v-tooltip bottom offset-overflow color="black">
                        <template v-slot:activator="{ on }">
                            <div v-if="item.pk && item.fk" v-on="on" style="position: relative">
                                <v-icon color="amber">
                                    mdi-key-variant
                                </v-icon>
                                <v-icon color="green" style="position: absolute; left: 3px">
                                    mdi-key-variant
                                </v-icon>
                            </div>
                            <v-icon v-else-if="item.pk" color="amber">
                                mdi-key-variant
                            </v-icon>
                            <v-icon v-else-if="item.fk" v-on="on" color="green">
                                mdi-key-variant
                            </v-icon>
                            <v-icon v-else color="primary">
                                mdi-table-column
                            </v-icon>
                        </template>
                        <span>{{ item.fk }}</span>
                    </v-tooltip>
                </template>
                <div v-else @click="toggle(item.name)" style="cursor: pointer">
                    <v-icon color="primary">
                        mdi-table-large
                    </v-icon>
                </div>
            </template>
        </v-treeview>
        <v-progress-circular
                v-else
                :value="progress"
                size="80"
                color="primary"
                class="ma-auto align-self-center">
            {{ progress }}%
        </v-progress-circular>
    </div>
</template>

<script>
    export default {
        name: 'TreeView',
        props: {
            schema: Object,
            progress: Number
        },
        data: () => ({
            items: null,
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
                            columns.push({ id: `${tab_name}.${col_name}`, name: col_name, ...meta })
                        }
                        tables.push({ id: tab_name, name: tab_name, children: columns })
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
        display: flex;

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

            .v-treeview-node--leaf > .v-treeview-node__root {
                padding-left: 12px;
            }
        }
    }
</style>
