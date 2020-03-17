<template>
    <v-dialog v-model="open" content-class="sql-history-popup">
        <v-card height="100%" class="sql-history-container">
            <v-card-title class="panel pa-1">
                <v-layout class="text-center">
                    <v-flex>SQL History</v-flex>
                </v-layout>
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
                                                         :class="{selected: selected === i}">
                                                <v-list-item-content>
                                                    <v-list-item-subtitle>
                                                        <small>{{ formatTimestamp(item.timestamp) }}</small>

                                                        <v-btn x-small icon v-if="hover || item.favorite"
                                                               @mousedown.stop
                                                               @click.stop="$set(item, 'favorite', !item.favorite)"
                                                               class="favorite-btn">
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
    import { formatTimestamp } from '../network/utils'

    // noinspection SqlResolve,SqlCheckUsingColumns
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
            history: [
                {
                    favorite: true,
                    timestamp: new Date().getTime(),
                    sql: `SELECT DISTINCT r.id_reserva,
                                          r.id_comissionado,
                                          id_pedido,
                                          r.id_produto,
                                          r.id_bem,
                                          nm_bem,
                                          vl_bem,
                                          vl_fisica,
                                          r.id_grupo,
                                          g.cd_grupo,
                                          r.cd_cota,
                                          r.id_plano_venda,
                                          pl.nome AS nm_plano_venda,
                                          r.id_tipo_venda,
                                          tv.nome AS nm_tipo_venda,
                                          r.pz_comercializacao,
                                          cg.pe_ta AS taxa_adm,
                                          dt_reserva,
                                          dt_validade,
                                          r.tipo_negociacao
                          FROM tb_reserva r
                                   LEFT JOIN tb_grupo g USING (id_bem, id_plano_venda, id_regiao_fiscal, id_grupo, pz_comercializacao)
                                   LEFT JOIN tb_caracteristica_grupo cg ON cg.id_grupo = r.id_grupo
                                   LEFT JOIN tb_plano_venda pl ON pl.id_plano_venda = r.id_plano_venda
                                   LEFT JOIN tb_bem c USING (id_bem)
                                   LEFT JOIN tb_tipo_venda tv USING (id_tipo_venda)
                                   LEFT JOIN tb_pedido p USING (id_reserva)
                          WHERE 1 AND (no_pc_inicial IS NULL OR no_pc_inicial = 1) AND r.id_filial = ? AND r.id_regiao_fiscal = ?
                          ORDER BY dt_reserva DESC, r.id_reserva DESC`
                },
                {
                    timestamp: new Date().getTime() - 1000,
                    sql: 'SELECT * FROM tb_lorem LIMIT 100'
                },
                {
                    timestamp: new Date().getTime() - 2000,
                    sql: 'SELECT * FROM tb_ipsum GROUP BY year ORDER BY date'
                }, {
                    timestamp: new Date().getTime(),
                    sql: 'SELECT * FROM tb_test ORDER BY name'
                },
                {
                    timestamp: new Date().getTime() - 3000,
                    sql: 'SELECT * FROM tb_lorem LIMIT 100'
                },
                {
                    timestamp: new Date().getTime() - 5000,
                    sql: 'SELECT * FROM tb_ipsum GROUP BY year ORDER BY date'
                }, {
                    timestamp: new Date().getTime(),
                    sql: 'SELECT * FROM tb_test ORDER BY name'
                },
                {
                    timestamp: new Date().getTime() - 10000,
                    sql: 'SELECT * FROM tb_lorem LIMIT 100'
                },
                {
                    timestamp: new Date().getTime() - 30000,
                    sql: 'SELECT * FROM tb_ipsum GROUP BY year ORDER BY date'
                }, {
                    timestamp: new Date().getTime(),
                    sql: 'SELECT * FROM tb_test ORDER BY name'
                },
                {
                    timestamp: new Date().getTime() - 100000,
                    sql: 'SELECT * FROM tb_lorem LIMIT 100'
                },
                {
                    timestamp: new Date().getTime() - 300000,
                    sql: 'SELECT * FROM tb_ipsum GROUP BY year ORDER BY date'
                }, {
                    timestamp: new Date().getTime(),
                    sql: 'SELECT * FROM tb_test ORDER BY name'
                },
                {
                    timestamp: new Date().getTime() - 10000000,
                    sql: 'SELECT * FROM tb_lorem LIMIT 100'
                },
                {
                    timestamp: new Date().getTime() - 20000000,
                    sql: 'SELECT * FROM tb_ipsum GROUP BY year ORDER BY date'
                }, {
                    timestamp: new Date().getTime() - 25000000,
                    sql: 'SELECT * FROM tb_test ORDER BY name'
                },
                {
                    timestamp: new Date().getTime() - 30000000,
                    sql: 'SELECT * FROM tb_lorem LIMIT 100'
                },
                {
                    timestamp: new Date().getTime() - 50000000,
                    sql: 'SELECT * FROM tb_ipsum GROUP BY year ORDER BY date'
                }
            ]
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

                const new_index = this.items.indexOf(this.prev_item)

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
                if (this.open && this.items.length > 0) {
                    this.selected = 0
                    requestAnimationFrame(() => {
                        this.$vuetify.goTo('.sql-history-item.selected', { container: '.sql-history-list', duration: 0 })
                    })
                }
            },
            useSql () {

            },
            keyboard (e) {
                if (!this.open || this.selected < 0) {
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
                        e.preventDefault()
                        const item = this.items[this.selected]
                        this.$set(item, 'favorite', !item.favorite)
                        break
                    }
                    case ENTER: {
                        this.useSql()
                        this.open = false
                        break
                    }
                    case ARROW_UP:
                    case ARROW_DOWN: {
                        e.preventDefault()

                        const total = this.items.length

                        if (total > 0) {
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
            formatTimestamp: v => formatTimestamp(v)
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
