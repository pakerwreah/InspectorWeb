<template>
    <v-dialog v-model="open" content-class="sql-history-popup">
        <v-card height="100%" class="sql-history-container">
            <v-card-title class="panel pa-1">
                <v-layout class="text-center">
                    <v-flex>SQL History</v-flex>
                </v-layout>
                <v-btn color="neutral"
                       @click="open = false"
                       small icon absolute right>
                    <v-icon small>mdi-close</v-icon>
                </v-btn>
            </v-card-title>
            <v-card-text class="pa-0 flex relative">
                <splitpanes class="default-theme absolute-expand">
                    <pane style="min-width: 250px" size="40">
                        <v-layout column class="fill-height">
                            <v-btn-toggle v-model="favorites" mandatory borderless color="accent">
                                <v-btn :value="false" small class="flex flex-basis-0">All</v-btn>
                                <v-btn :value="true" small class="flex flex-basis-0">Favorites</v-btn>
                            </v-btn-toggle>
                            <v-list class="sql-history-list pt-0 overflow-y-auto" dense>
                                <v-list-item-group v-model="selected" mandatory color="primary">
                                    <template v-for="(item, i) in items">
                                        <v-hover v-slot:default="{ hover }" :key="i">
                                            <v-list-item class="sql-history-item px-2"
                                                         :class="{selected: selected === i}"
                                                         @dblclick="selectItem(item)">
                                                <v-list-item-content>
                                                    <v-list-item-subtitle>
                                                        <small>{{ formatTimestamp(item.timestamp) }}</small>

                                                        <v-btn v-if="hover || item.favorite"
                                                               class="favorite-btn"
                                                               @mousedown.stop
                                                               @click.stop="toggleFavorite(item)"
                                                               x-small icon>
                                                            <v-icon v-if="!item.favorite" x-small>
                                                                mdi-star-outline
                                                            </v-icon>
                                                            <v-icon v-else color="accent" x-small>
                                                                mdi-star
                                                            </v-icon>
                                                        </v-btn>
                                                    </v-list-item-subtitle>

                                                    <v-list-item-title>{{ item.sql }}</v-list-item-title>
                                                </v-list-item-content>
                                            </v-list-item>
                                        </v-hover>

                                        <v-divider :key="'divider' + i" />
                                    </template>
                                </v-list-item-group>
                            </v-list>
                        </v-layout>
                    </pane>
                    <pane>
                        <div class="fill-height overflow-y-auto px-3 pb-5">
                            <!--suppress HtmlUnknownAttribute -->
                            <pre v-if="selected >= 0" :class="codestyle" v-highlightjs="items[selected].sql"><code class="sql"></code></pre>
                        </div>
                    </pane>
                </splitpanes>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script>
    import { Splitpanes, Pane } from 'splitpanes'
    import { formatTimestamp } from '../../utils'

    export default {
        name: 'SqlHistory',
        components: { Splitpanes, Pane },
        props: {
            value: Boolean
        },
        data: () => ({
            favorites: false,
            selected: -1,
            prev_item: undefined,
            history: []
        }),
        computed: {
            open: {
                get () {
                    return this.value
                },
                set (value) {
                    this.$emit('input', value)
                }
            },
            codestyle () {
                return this.dark_mode ? 'dark' : 'light'
            },
            items () {
                return this.history.filter(it => !this.favorites || it.favorite)
            }
        },
        watch: {
            open: {
                handler: 'initialize',
                immediate: true
            },
            selected (pos) {
                this.prev_item = pos >= 0 ? this.items[pos] : undefined
            },
            items () {
                const total = this.items.length

                const new_index = this.prev_item ? this.items.map(it => it.sql).indexOf(this.prev_item.sql) : -1

                if (new_index >= 0) {
                    this.selected = new_index
                } else if ((this.favorites || this.selected < 0) && total) {
                    this.selected = 0
                } else if (this.selected >= total) {
                    this.selected = total - 1
                }

                this.prev_item = this.selected >= 0 ? this.items[this.selected] : undefined
            }
        },
        mounted () {
            this.keyboard = this.keyboard.bind(this)
            document.addEventListener('keydown', this.keyboard)
        },
        beforeDestroy () {
            document.removeEventListener('keydown', this.keyboard)
        },
        methods: {
            initialize () {
                this.history = JSON.parse(localStorage.getItem('sql_history') || '[]')

                if (this.open && this.selected >= 0) {
                    requestAnimationFrame(() => {
                        this.$vuetify.goTo('.sql-history-item.selected', { container: '.sql-history-list', duration: 0 })
                    })
                }
            },
            toggleFavorite (item) {
                this.$set(item, 'favorite', !item.favorite)
                localStorage.setItem('sql_history', JSON.stringify(this.history))
            },
            selectItem ({ sql }) {
                this.$emit('selected', sql)
                this.open = false
            },
            keyboard (e) {
                if (!this.open) {
                    return
                }

                const TAB = 9
                const ENTER = 13
                const ESC = 27
                const SPACE = 32
                const ARROW_UP = 38
                const ARROW_DOWN = 40

                const key = e.keyCode

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
                            this.toggleFavorite(item)
                        }
                        break
                    }
                    case ENTER: {
                        e.preventDefault()
                        if (this.selected >= 0) {
                            const item = this.items[this.selected]
                            this.selectItem(item)
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
                                const list_height = document.querySelector('.sql-history-list').clientHeight
                                const item_height = document.querySelector('.sql-history-item.selected').clientHeight
                                const offset = (list_height - item_height) / 2
                                this.$vuetify.goTo('.sql-history-item.selected', { container: '.sql-history-list', duration: 200, offset })
                            })
                        }
                        break
                    }
                }
            },
            formatTimestamp
        }
    }
</script>

<style lang="scss">
    .sql-history-popup {
        max-height: 95% !important;
        height: 95%;
    }

    .sql-history-container {
        pre {
            &.dark {
                @import '~highlight.js/scss/agate';
            }

            &.light {
                @import '~highlight.js/scss/xcode';
            }
        }
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
</style>
