<template>
    <div class="database-tree-container d-flex flex-column fill-height">
        <div class="d-flex align-center position-sticky top-0 bg-panel" style="z-index: 1">
            <v-select
                class="database-picker"
                bg-color="transparent"
                variant="solo"
                placeholder="No databases available"
                prepend-inner-icon="mdi-database"
                v-model="selected"
                :items="databases"
                :disabled="!items"
                :readonly="databases.length === 1"
                hide-details
                hide-selected
            />

            <v-btn icon color="neutral" @click="selectDB(selected)">
                <v-icon>mdi-sync</v-icon>
            </v-btn>
        </div>

        <div class="d-flex flex-fill">
            <v-treeview
                v-if="items"
                class="database-tree flex-fill"
                density="compact"
                bg-color="panel"
                v-model:opened="open"
                :items="items"
                :indent="0.1"
                items-registration="props"
            >
                <template #title="{ item }">
                    <div @dblclick="query(item.name)" class="noselect text-truncate">{{ item.name }}</div>
                </template>

                <template #prepend="{ item }">
                    <div @click="toggle(item.name)" class="d-flex">
                        <v-icon color="primary" size="small"> mdi-table-large </v-icon>
                    </div>
                </template>

                <template #item="{ item }">
                    <v-treeview-item density="compact" class="noselect text-truncate">
                        <template #title>
                            {{ item.name }}
                        </template>

                        <template #append>
                            <span class="noselect text-accent text-lowercase ml-2" style="font-size: 11px">
                                {{ item.type }}
                            </span>
                        </template>

                        <template #prepend>
                            <v-tooltip location="bottom">
                                <template v-slot:activator="{ props }">
                                    <div
                                        v-if="item.pk && item.fk"
                                        size="small"
                                        v-bind="props"
                                        class="position-relative"
                                    >
                                        <v-icon color="amber" size="small"> mdi-key-variant </v-icon>
                                        <v-icon color="green" size="small" class="position-absolute" style="left: 3px">
                                            mdi-key-variant
                                        </v-icon>
                                    </div>
                                    <v-icon v-else-if="item.pk" size="small" color="amber"> mdi-key-variant </v-icon>
                                    <v-icon v-else-if="item.fk" size="small" color="green" v-bind="props">
                                        mdi-key-variant
                                    </v-icon>
                                    <v-icon v-else size="small" color="primary"> mdi-table-column </v-icon>
                                </template>
                                <span>{{ item.fk }}</span>
                            </v-tooltip>
                        </template>
                    </v-treeview-item>
                </template>
            </v-treeview>

            <v-progress-circular
                v-else
                :model-value="progress"
                :indeterminate="progress < 0"
                size="80"
                width="2"
                color="primary"
                class="ma-auto align-self-center"
            >
                <span v-if="progress >= 0">{{ progress }}%</span>
            </v-progress-circular>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'TreeView',
        props: {
            schema: Object,
            progress: Number,
            databases: Array,
            currentdb: Number,
        },
        data: () => ({
            items: null,
            open: [],
        }),
        computed: {
            selected: {
                get() {
                    return this.databases[this.currentdb]
                },
                set(name) {
                    this.selectDB(name)
                },
            },
        },
        watch: {
            schema() {
                this.loadSchema()
            },
        },
        mounted() {
            this.loadSchema()
        },
        methods: {
            selectDB(name) {
                this.$emit('selectDB', this.databases.indexOf(name))
            },
            toggle(table) {
                if (this.open.includes(table)) {
                    this.open = this.open.filter((item) => item !== table)
                } else {
                    this.open.push(table)
                }
            },
            async query(table) {
                this.$emit('query', table)
            },
            loadSchema() {
                if (this.schema.tables) {
                    const tables = []

                    for (const [tab_name, table] of Object.entries(this.schema.tables)) {
                        const columns = []
                        for (const [col_name, meta] of Object.entries(table.columns)) {
                            columns.push({ id: `${tab_name}.${col_name}`, name: col_name, ...meta, leaf: true })
                        }
                        tables.push({ id: tab_name, name: tab_name, children: columns, leaf: false })
                    }

                    this.items = tables
                } else {
                    this.items = null
                }
            },
        },
    }
</script>

<style lang="scss">
    .progress .v-progress-circular__overlay {
        transition: all 120ms linear;
    }

    .database-tree-container {
        max-height: 100%;

        .v-list-item {
            min-height: 0;
        }

        .v-field--variant-solo {
            box-shadow: none;
        }
    }
</style>
