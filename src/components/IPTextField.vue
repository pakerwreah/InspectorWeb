<template>
    <v-text-field v-model="ip"
                  prefix="IP Address: "
                  class="ip-field"
                  placeholder="___.___.___.___"
                  height="28"
                  :error="ip.includes(':')"
                  outlined
                  hide-details />
</template>

<script>
    export default {
        name: 'IPTextField',
        props: {
            value: Object
        },
        computed: {
            ip: {
                get () {
                    return this.value.ip || ''
                },
                set (ip) {
                    this.$emit('input', { ip })
                }
            }
        }
    }
</script>

<style lang="scss">
    .ip-field {
        &.error--text input {
            color: var(--v-error-base);
        }

        &.v-text-field--outlined {
            fieldset {
                border-width: 0 !important;
            }

            .v-input__slot {
                min-height: 0 !important;
                background-color: var(--v-controls-darken1);

                input:not(:disabled):not(:empty)::placeholder {
                    color: var(--v-text-base);
                }
            }
        }
    }
</style>
