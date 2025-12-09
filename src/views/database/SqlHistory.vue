<template>
    <v-dialog v-model="open" content-class="sql-history-popup" attach>
        <v-card class="sql-history-container">
            <v-card-title class="pa-1">
                <v-layout class="text-center">
                    <v-col>SQL History</v-col>
                    <div class="position-absolute right-0 mr-2 d-flex align-center fill-height">
                        <v-btn @click="open = false" density="comfortable" icon>
                            <v-icon color="neutral">mdi-close</v-icon>
                        </v-btn>
                    </div>
                </v-layout>
            </v-card-title>
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
                            <v-list class="sql-history-list pt-0 overflow-y-auto fill-height" dense>
                                <v-list-group v-model="selected" mandatory color="primary">
                                    <template v-for="(item, i) in items" :key="i">
                                        <v-hover v-slot:default="{ isHovering }">
                                            <v-list-item
                                                class="sql-history-item px-2"
                                                :class="{ selected: selected === i }"
                                                @dblclick="selectItem(item)"
                                            >
                                                <v-list-item>
                                                    <v-list-item-subtitle>
                                                        <small>{{ formatTimestamp(item.timestamp) }}</small>

                                                        <v-btn
                                                            v-if="isHovering || item.favorite"
                                                            class="favorite-btn"
                                                            @mousedown.stop
                                                            @click.stop="toggleFavorite(item)"
                                                            x-small
                                                            icon
                                                        >
                                                            <v-icon v-if="!item.favorite" x-small>
                                                                mdi-star-outline
                                                            </v-icon>
                                                            <v-icon v-else color="accent" x-small> mdi-star </v-icon>
                                                        </v-btn>
                                                    </v-list-item-subtitle>

                                                    <v-list-item-title>{{ item.sql }}</v-list-item-title>
                                                </v-list-item>
                                            </v-list-item>
                                        </v-hover>

                                        <v-divider />
                                    </template>
                                </v-list-group>
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

    type SQLHistoryItem = {
        sql: string
        favorite: boolean
        timestamp: number
    }

    type SQLHistory = SQLHistoryItem[]

    export default defineComponent({
        name: 'SqlHistory',
        components: { Splitpanes, Pane, highlightjs },
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
            selected: -1,
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
            codestyle() {
                return this.dark_mode ? 'dark' : 'light'
            },
            items() {
                return this.history.filter((it) => !this.favorites || it.favorite)
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
        mounted() {
            this.keyboard = this.keyboard.bind(this)
            document.addEventListener('keydown', this.keyboard)
        },
        beforeUnmount() {
            document.removeEventListener('keydown', this.keyboard)
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
            keyboard(e: KeyboardEvent) {
                if (!this.open) {
                    return
                }

                const TAB = 'Tab'
                const ENTER = 'Enter'
                const ESC = 'Escape'
                const SPACE = 'Space'
                const ARROW_UP = 'ArrowUp'
                const ARROW_DOWN = 'ArrowDown'

                const key = e.code

                switch (key) {
                    case ESC: {
                        this.open = false
                        break
                    }
                    case TAB: {
                        e.preventDefault()
                        this.favorites = !this.favorites
                        break
                    }
                    case SPACE: {
                        if (this.selected >= 0) {
                            e.preventDefault()
                            const item = this.items[this.selected]
                            if (item) {
                                this.toggleFavorite(item)
                            }
                        }
                        break
                    }
                    case ENTER: {
                        e.preventDefault()
                        if (this.selected >= 0) {
                            const item = this.items[this.selected]
                            if (item) {
                                this.selectItem(item)
                            }
                        }
                        break
                    }
                    case ARROW_UP:
                    case ARROW_DOWN: {
                        e.preventDefault()

                        const total = this.items.length

                        if (total > 0 && this.selected >= 0) {
                            if (key === ARROW_UP) {
                                if (this.selected > 0) {
                                    this.selected--
                                }
                            } else if (this.selected < total - 1) {
                                this.selected++
                            }

                            requestAnimationFrame(() => {
                                const list_height = document.querySelector('.sql-history-list')?.clientHeight
                                const item_height = document.querySelector('.sql-history-item.selected')?.clientHeight
                                if (!list_height || !item_height) return
                                const offset = (list_height - item_height) / 2
                                this.goTo('.sql-history-item.selected', {
                                    container: '.sql-history-list',
                                    duration: 200,
                                    offset,
                                })
                            })
                        }
                        break
                    }
                }
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

    .favorite-btn {
        position: absolute;
        top: 5px;
        right: 4px;
    }

    .sql {
        font-size: 14px;
    }
</style>
