<template>
    <div class="tree-container">
        <v-select class="database-picker"
                  background-color="panel"
                  placeholder="No databases available"
                  prepend-inner-icon="mdi-database"
                  :append-icon="null"
                  v-model="selected"
                  :items="databases"
                  :disabled="!items"
                  :readonly="databases.length === 1"
                  :menu-props="{ offsetY: true, disabled: databases.length < 1 }"
                  hide-details
                  hide-selected
                  filled solo dense flat />

        <v-btn icon x-small color="neutral" @click="selectDB(selected)" class="database-sync">
            <v-icon>mdi-sync</v-icon>
        </v-btn>

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
            <template v-slot:append="{ item }">
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
                :indeterminate="progress < 0"
                size="80"
                width="2"
                color="primary"
                class="ma-auto align-self-center progress">
            <span v-if="progress >= 0">{{ progress }}%</span>
        </v-progress-circular>
    </div>
</template>

<script>
    export default {
        name: 'TreeView',
        props: {
            schema: Object,
            progress: Number,
            databases: Array,
            currentdb: Number
        },
        data: () => ({
            items: null,
            open: []
        }),
        computed: {
            selected: {
                get () {
                    return this.databases[this.currentdb]
                },
                set (name) {
                    this.selectDB(name)
                }
            }
        },
        watch: {
            schema () {
                this.loadSchema()
            }
        },
        mounted () {
            this.loadSchema()
        },
        methods: {
            selectDB (name) {
                this.$emit('selectDB', this.databases.indexOf(name))
            },
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
                } else {
                    this.items = null
                }
            }
        }
    }
</script>

<style lang="scss">
    .progress .v-progress-circular__overlay {
        transition: all 120ms linear;
    }

    .tree-container {
        position: relative;
        height: 100%;
        overflow: auto;
        display: flex;
        flex-direction: column;

        .database-picker {
            flex: 0;

            .v-icon {
                color: var(--v-neutral-base) !important;
            }

            .v-input__slot {
                padding-left: 5px !important;
            }

            &.v-input--is-disabled+.database-sync {
                display: none;
            }

            &:hover+.database-sync {
                display: block;
            }
        }

        .database-sync {
            &:not(:hover) {
                display: none;
            }
            position: absolute;
            top: 8px;
            right: 0;
        }

        .database-tree {
            position: absolute;
            top: 35px;
            left: 0;
            right: 0;
            padding: 0 4px 20px;

            .v-icon.v-icon {
                font-size: 18px;
            }

            .v-treeview-node__root {
                min-height: 25px;
            }

            .v-treeview-node__label, .v-icon.v-icon {
                line-height: 1.4;
            }

            > .v-treeview-node[aria-expanded=true] {
                margin-bottom: 5px;
            }

            .v-treeview-node--active .v-treeview-node__label {
                color: var(--v-text-base);
            }

            .v-treeview-node__root::before {
                background-color: var(--v-neutral-base);
            }

            .v-treeview-node--leaf > .v-treeview-node__root {
                padding-left: 12px;
            }
        }
    }
</style>
