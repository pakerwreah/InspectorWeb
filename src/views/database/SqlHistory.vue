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
                    <pane style="min-width: 80px" size="40">
                        <v-list class="sql-history-list pt-0 fill-height overflow-y-auto">
                            <v-list-item-group v-model="selected" mandatory color="primary">
                                <v-list-item v-for="(item, i) in items"
                                             :key="i"
                                             class="sql-history-item px-1 pb-1"
                                             :class="{selected: selected === i}">
                                    <v-layout column>
                                        <v-flex class="text--secondary"><small>{{ formatTimestamp(item.timestamp) }}</small></v-flex>
                                        <v-flex class="text-ellipsis">{{ item.sql }}</v-flex>
                                    </v-layout>
                                </v-list-item>
                            </v-list-item-group>
                        </v-list>
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

    export default {
        name: 'SqlHistory',
        components: { Splitpanes, Pane },
        props: {
            value: Boolean
        },
        data: () => ({
            selected: -1,
            items: [
                {
                    timestamp: new Date().getTime(),
                    sql: 'SELECT DISTINCT\n' +
                        '                r.id_reserva,\n' +
                        '                r.id_comissionado,\n' +
                        '                id_pedido,\n' +
                        '                r.id_produto,\n' +
                        '                r.id_bem,\n' +
                        '                nm_bem,\n' +
                        '                vl_bem,\n' +
                        '                vl_fisica,\n' +
                        '                r.id_grupo,\n' +
                        '                g.cd_grupo,\n' +
                        '                r.cd_cota,\n' +
                        '                r.id_plano_venda,\n' +
                        '                pl.nome as nm_plano_venda,\n' +
                        '                r.id_tipo_venda,\n' +
                        '                tv.nome as nm_tipo_venda,\n' +
                        '                r.pz_comercializacao,\n' +
                        '                cg.pe_ta as taxa_adm,\n' +
                        '                dt_reserva,\n' +
                        '                dt_validade,\n' +
                        '                r.tipo_negociacao\n' +
                        '            FROM tb_reserva r\n' +
                        '            LEFT JOIN tb_grupo g USING (id_bem, id_plano_venda, id_regiao_fiscal, id_grupo, pz_comercializacao)\n' +
                        '            LEFT JOIN tb_caracteristica_grupo cg ON cg.id_grupo = r.id_grupo\n' +
                        '            LEFT JOIN tb_plano_venda pl ON pl.id_plano_venda = r.id_plano_venda\n' +
                        '            LEFT JOIN tb_bem c USING (id_bem)\n' +
                        '            LEFT JOIN tb_tipo_venda tv USING (id_tipo_venda)\n' +
                        '            LEFT JOIN tb_pedido p USING (id_reserva)\n' +
                        '            WHERE \\(selection)\n' +
                        '            AND (no_pc_inicial IS NULL OR no_pc_inicial = 1)\n' +
                        '            AND r.id_filial = ?\n' +
                        '            AND r.id_regiao_fiscal = ?\n' +
                        '            ORDER BY dt_reserva DESC, r.id_reserva DESC'
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
            }
        },
        watch: {
            open: {
                handler: 'initialize',
                immediate: true
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

                const ENTER = 13
                const ESC = 27
                const ARROW_UP = 38
                const ARROW_DOWN = 40

                const key = e.keyCode

                switch (key) {
                    case ESC: {
                        this.open = false
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
                                this.$vuetify.goTo('.sql-history-item.selected', { container: '.sql-history-list', duration: 200 })
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

        .sql-history-item {
            border-bottom: solid 1px #cccccc55;
        }
    }
</style>
