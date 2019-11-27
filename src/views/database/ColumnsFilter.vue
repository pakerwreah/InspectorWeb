<template>
    <v-dialog v-model="open"
              width="300"
              overlay-opacity="0.1"
              attach=".result-container"
              content-class="column-filter-popup"
              scrollable
              @keydown="keyboard">
        <v-card>
            <v-card-title class="panel pa-1 px-2">
                <v-layout>
                    <v-flex xs1 align-self-center>
                        <v-checkbox v-model="visible_all"
                                    class="my-1 py-0"
                                    dense hide-details />
                    </v-flex>
                    <v-flex align-self-center>
                        <v-text-field ref="search"
                                      v-model="search"
                                      class="result-search ml-2"
                                      append-icon="mdi-magnify"
                                      background-color="controls"
                                      autocomplete="disabled"
                                      spellcheck="false"
                                      dense
                                      hide-details
                                      autofocus
                                      clearable />
                    </v-flex>
                </v-layout>
            </v-card-title>

            <v-card-text class="columns_filter_body px-2 py-2" style="max-height: 300px">
                <template v-for="i in headers.keys()">
                    <v-hover v-slot:default="{ hover }" :key="i">
                        <v-layout v-show="listed[i]" class="columns_filter_item" :class="{selected: selected === i}">
                            <v-flex xs1 align-self-center>
                                <v-checkbox v-model="visible[i]"
                                            class="my-0 py-1 mr-2"
                                            dense hide-details />
                            </v-flex>
                            <v-flex class="ml-2 align-stretch">
                                <v-layout class="pointer noselect fill-height" @click="toggleVisible(i)">
                                    <v-flex align-self-center v-html="listed[i]" />
                                </v-layout>
                            </v-flex>
                            <v-flex xs1 align-self-center class="ml-2">
                                <v-btn icon x-small v-if="visible[i]" :color="hover ? 'primary' : 'transparent'" @click="gotoColumn(i)">
                                    <v-icon class="pointer">mdi-target</v-icon>
                                </v-btn>
                            </v-flex>
                        </v-layout>
                    </v-hover>
                </template>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script>
    import fuzzysort from 'fuzzysort'
    import { throttle, findIndex, findLastIndex } from 'lodash'

    export default {
        name: 'ColumnsFilter',
        props: {
            value: Boolean,
            headers: Array,
            columnsVisible: Array
        },
        data: () => ({
            search: '',
            selected: -1
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
            visible_all: {
                get () {
                    return this.visible.every(v => v)
                },
                set (value) {
                    this.fillVisible(value)
                }
            },
            visible () {
                // noinspection JSCheckFunctionSignatures
                return new Proxy(this.columnsVisible, {
                    set: (target, index, value) => {
                        // noinspection JSCheckFunctionSignatures
                        if (!isNaN(index)) {
                            this.updateVisible(Object.assign([...target], { [index]: value }))
                        }
                        return true
                    }
                })
            },
            listed () {
                if (this.search) {
                    return this.prepared_search_headers
                        .map(text => fuzzysort.single(this.search, text))
                        .map(r => r && r.score > -100 && fuzzysort.highlight(r, "<b class='primary--text'>", '</b>'))
                } else {
                    return this.headers.map(r => r.text)
                }
            },
            prepared_search_headers () {
                return this.headers.map(h => fuzzysort.prepare(h.text))
            }
        },
        watch: {
            value (on) {
                if (on) {
                    this.search = ''
                    this.selected = -1
                    requestAnimationFrame(() => {
                        this.$refs.search.focus()
                    })
                }
            },
            search () {
                const i = this.selected
                if (i >= 0 && !this.listed[i]) {
                    this.selected = -1
                }
            }
        },
        created () {
            this.keyboard = throttle(this.keyboard, 100)
        },
        methods: {
            updateVisible (value) {
                this.$emit('update:columns-visible', value)
            },
            fillVisible (value) {
                this.updateVisible(Array(this.headers.length).fill(value))
            },
            toggleVisible (i) {
                this.visible[i] = !this.visible[i]
                this.selected = i
            },
            gotoColumn (i) {
                this.$emit('goto', i - this.visible.filter((v, j) => j < i && !v).length)
            },
            keyboard (e) {
                const ENTER = 13
                const SPACE = 32
                const ARROW_UP = 38
                const ARROW_DOWN = 40

                const key = e.keyCode

                let i = this.selected

                const start = findIndex(this.listed) // first !false
                const end = findLastIndex(this.listed) // last !false

                switch (key) {
                    case ENTER: {
                        while (i <= end && !(this.listed[i] && this.visible[i])) { i++ }

                        if (i >= 0 && i <= end) {
                            this.gotoColumn(i)
                            this.open = false
                        }
                        break
                    }
                    case SPACE: {
                        e.preventDefault()
                        if (i >= 0) {
                            this.toggleVisible(i)
                        }
                        break
                    }
                    case ARROW_UP:
                    case ARROW_DOWN: {
                        e.preventDefault()

                        if (key === ARROW_UP) {
                            if (i < 0 || !this.listed[i]) {
                                i = end
                            } else {
                                do {
                                    i--
                                } while (i >= 0 && !this.listed[i])
                            }
                        } else {
                            if (i < 0 || !this.listed[i]) {
                                i = start
                            } else {
                                do {
                                    i++
                                } while (i <= end && !this.listed[i])
                            }
                        }

                        if (this.selected !== i && i >= start && i <= end) {
                            this.selected = i

                            requestAnimationFrame(() => {
                                this.$vuetify.goTo('.columns_filter_item.selected', { container: '.columns_filter_body', offset: 150, duration: 200 })
                            })
                        }
                        break
                    }
                }
            }
        }
    }
</script>

<style lang="scss">
    .column-filter-popup {
        position: absolute;
        top: 0;

        .columns_filter_item.selected {
            background-color: #cccccc33;
        }
    }
</style>
