<template>
    <v-dialog
        v-model="open"
        width="300"
        overlay-opacity="0.1"
        attach=".result-container"
        content-class="columns-filter-popup"
    >
        <v-card>
            <v-card-title class="px-2 py-0 align-center flex-row d-flex ga-2">
                <v-checkbox v-model="visible_all" density="compact" color="accent" hide-details />
                <v-text-field
                    ref="search"
                    v-model="search"
                    class="result-search"
                    autocomplete="disabled"
                    spellcheck="false"
                    variant="solo"
                    hide-details
                    autofocus
                >
                    <template #append-inner>
                        <v-btn v-if="search.length" icon density="compact" size="small" @click="search = ''">
                            <v-icon>mdi-close</v-icon>
                        </v-btn>
                    </template>
                </v-text-field>
                <v-icon size="small">mdi-magnify</v-icon>
            </v-card-title>

            <v-card-text class="columns-filter-body pa-0" style="max-height: 300px">
                <v-list v-model:selected="visible" :items="list_items" select-strategy="leaf">
                    <template #item="{ props: { value: i } }">
                        <v-hover #default="{ isHovering, props: hoverProps }">
                            <v-list-item v-bind="hoverProps" :value="i" v-show="listed[i]" class="px-3">
                                <template #prepend="{ isSelected, select }">
                                    <v-list-item-action start>
                                        <v-checkbox-btn
                                            color="accent"
                                            :model-value="isSelected"
                                            @update:model-value="select"
                                        />
                                    </v-list-item-action>
                                </template>

                                <v-list-item-title class="pointer noselect">
                                    <span v-html="listed[i]" />
                                </v-list-item-title>

                                <template #append>
                                    <v-list-item-action end>
                                        <v-btn
                                            icon
                                            size="small"
                                            v-if="columnsVisible[i] && isHovering"
                                            color="primary"
                                            @click.stop="gotoColumn(i)"
                                        >
                                            <v-icon class="pointer">mdi-target</v-icon>
                                        </v-btn>
                                    </v-list-item-action>
                                </template>
                            </v-list-item>
                        </v-hover>
                    </template>
                </v-list>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import fuzzysort from 'fuzzysort'
    import { defineComponent } from 'vue'
    import { useGoTo } from 'vuetify/framework'
    import type { VTextField } from 'vuetify/components'

    export default defineComponent({
        name: 'ColumnsFilter',
        emits: {
            goto: (_: number) => true,
            'update:modelValue': (_: boolean) => true,
            'update:columns-visible': (_: boolean[]) => true,
        },
        props: {
            modelValue: { type: Boolean, required: true },
            headers: { type: Array<string>, required: true },
            columnsVisible: { type: Array<boolean>, required: true },
        },
        setup() {
            const goTo = useGoTo()
            return { goTo }
        },
        data: () => ({
            search: '',
            selected: -1,
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
            visible_all: {
                get() {
                    return this.columnsVisible.every((v) => v)
                },
                set(value: boolean) {
                    this.fillVisible(value)
                },
            },
            listed(): (string | false)[] {
                if (this.search) {
                    return this.prepared_search_headers
                        .map((prepared) => fuzzysort.single(this.search, prepared))
                        .map((r) => {
                            if (r && r.score > -100) {
                                return r.highlight("<b class='text-primary'>", '</b>')
                            }
                            return false
                        })
                } else {
                    return this.headers
                }
            },
            prepared_search_headers() {
                return this.headers.map((h) => fuzzysort.prepare(h))
            },
            search_field() {
                return this.$refs.search as VTextField
            },
            list_items() {
                return this.headers.map((v, i) => ({ title: v, value: i }))
            },
            visible: {
                get(): number[] {
                    // [true, false, true] -> [0, 2]
                    return this.columnsVisible
                        .map((v, i): [boolean, number] => [v, i])
                        .filter(([v]) => v)
                        .map(([_, i]) => i)
                },
                set(indices: number[]) {
                    // [0, 2] -> [true, false, true]
                    const values = Array(this.columnsVisible.length).fill(false)
                    for (const index of indices) {
                        values[index] = true
                    }
                    this.updateVisible(values)
                },
            },
        },
        watch: {
            modelValue(opened) {
                if (opened) {
                    this.search = ''
                    this.selected = -1
                    requestAnimationFrame(() => {
                        this.search_field.focus()
                    })
                }
            },
            search() {
                const i = this.selected
                if (i >= 0 && !this.listed[i]) {
                    this.selected = -1
                }
            },
        },
        methods: {
            updateVisible(value: boolean[]) {
                this.$emit('update:columns-visible', value)
            },
            fillVisible(value: boolean) {
                this.updateVisible(Array(this.headers.length).fill(value))
            },
            gotoColumn(i: number) {
                this.$emit('goto', i)
            },
        },
    })
</script>

<style lang="scss">
    .columns-filter-popup {
        top: 10%;

        .result-search {
            .v-field--appended {
                padding-right: 4px;
            }
        }

        .v-list-item__overlay {
            background-color: transparent;
        }
    }
</style>
