<template>
    <v-dialog v-model="open" content-class="sql-history-popup" attach>
        <v-card class="sql-history-container">
            <DialogHeader title="SQL History" @close="open = false" />

            <v-card-text class="pa-0 flex relative">
                <splitpanes class="default-theme absolute-expand">
                    <pane style="min-width: 250px" size="40">
                        <v-col>
                            <v-btn-toggle
                                density="compact"
                                class="w-100"
                                v-model="favorites"
                                mandatory
                                color="accent"
                                variant="outlined"
                                rounded="xl"
                            >
                                <v-btn :value="false" class="flex-fill">All</v-btn>
                                <v-btn :value="true" class="flex-fill">Favorites</v-btn>
                            </v-btn-toggle>

                            <v-list
                                v-model:selected="list_selected_model"
                                mandatory
                                class="sql-history-list mt-3"
                                color="primary"
                                bg-color="transparent"
                                items-registration="props"
                            >
                                <v-list-item
                                    v-for="(item, i) in items"
                                    :key="i"
                                    :value="i"
                                    class="sql-history-item px-2 noselect pointer"
                                    @dblclick="selectItem(item)"
                                >
                                    <v-list-item-subtitle class="d-flex justify-space-between align-center">
                                        <small>{{ formatTimestamp(item.timestamp) }}</small>

                                        <v-btn
                                            class="favorite-btn"
                                            :class="{ favorited: item.favorite }"
                                            @mousedown.stop
                                            @click.stop="toggleFavorite(item)"
                                            size="x-small"
                                            density="compact"
                                            icon
                                        >
                                            <v-icon v-if="!item.favorite"> mdi-star-outline </v-icon>
                                            <v-icon v-else color="accent"> mdi-star </v-icon>
                                        </v-btn>
                                    </v-list-item-subtitle>

                                    <v-list-item-title>{{ item.sql }}</v-list-item-title>
                                </v-list-item>
                            </v-list>
                        </v-col>
                    </pane>
                    <pane>
                        <div class="fill-height overflow-y-auto px-3 pb-5">
                            <highlightjs
                                v-if="selected >= 0"
                                :class="codestyle"
                                :code="items[selected]!.sql"
                                language="sql"
                            />
                        </div>
                    </pane>
                </splitpanes>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import { Splitpanes, Pane } from 'splitpanes'
    import { formatTimestamp } from '@/utils'
    import { highlightjs } from '@/plugins/highlight'
    import theme from '@/mixins/theme'
    import { defineComponent } from 'vue'
    import { useGoTo } from 'vuetify/framework'
    import DialogHeader from '@/components/DialogHeader.vue'

    type SQLHistoryItem = {
        sql: string
        favorite: boolean
        timestamp: number
    }

    type SQLHistory = SQLHistoryItem[]

    export default defineComponent({
        name: 'SqlHistory',
        components: { DialogHeader, Splitpanes, Pane, highlightjs },
        mixins: [theme],
        props: {
            modelValue: Boolean,
        },
        setup() {
            const goTo = useGoTo()
            return { goTo }
        },
        data: () => ({
            favorites: false,
            list_selected_model: [] as number[],
            prev_item: undefined as SQLHistoryItem | undefined,
            history: [] as SQLHistory,
        }),
        computed: {
            open: {
                get() {
                    return this.modelValue
                },
                set(value: boolean) {
                    this.$emit('update:modelValue', value)
                },
            },
            selected: {
                get() {
                    return this.list_selected_model[0] ?? -1
                },
                set(index: number) {
                    this.list_selected_model = [index]
                },
            },
            codestyle() {
                return this.dark_mode ? 'dark' : 'light'
            },
            items() {
                return this.history.filter((it) => !this.favorites || it.favorite)
            },
            list_items() {
                return this.items.map((v, i) => ({ title: v, value: i }))
            },
        },
        watch: {
            open: {
                handler: 'initialize',
                immediate: true,
            },
            selected(pos) {
                this.prev_item = pos >= 0 ? this.items[pos] : undefined
            },
            items() {
                const total = this.items.length

                const new_index = this.prev_item ? this.items.map((it) => it.sql).indexOf(this.prev_item.sql) : -1

                if (new_index >= 0) {
                    this.selected = new_index
                } else if ((this.favorites || this.selected < 0) && total) {
                    this.selected = 0
                } else if (this.selected >= total) {
                    this.selected = total - 1
                }

                this.prev_item = this.selected >= 0 ? this.items[this.selected] : undefined
            },
        },
        methods: {
            initialize() {
                if (!this.open) return
                this.history = JSON.parse(localStorage.getItem('sql_history') || '[]')

                if (this.selected >= 0) {
                    requestAnimationFrame(() => {
                        this.goTo('.sql-history-item.selected', { container: '.sql-history-list', duration: 0 })
                    })
                }
            },
            toggleFavorite(item: SQLHistoryItem) {
                item.favorite = !item.favorite
                localStorage.setItem('sql_history', JSON.stringify(this.history))
            },
            selectItem({ sql }: SQLHistoryItem) {
                this.$emit('selected', sql)
                this.open = false
            },
            formatTimestamp,
        },
    })
</script>

<style lang="scss">
    @use 'sass:meta';

    .sql-history-container {
        pre {
            &.dark {
                @include meta.load-css('highlight.js/scss/agate');
            }

            &.light {
                @include meta.load-css('highlight.js/scss/xcode');
            }
        }
    }
</style>

<style lang="scss">
    .sql-history-popup {
        height: 95%;
    }
</style>

<style scoped lang="scss">
    .sql-history-container {
        display: flex;
        flex-direction: column;
    }

    .sql-history-item {
        .favorite-btn:not(.favorited) {
            visibility: hidden;
        }

        &:hover .favorite-btn {
            visibility: unset;
        }
    }

    .sql {
        font-size: 14px;
    }
</style>
