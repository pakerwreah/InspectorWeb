<template>
    <v-text-field
        v-model="ip"
        prefix="IP Address: "
        class="ip-field"
        placeholder="___.___.___.___"
        :error="ip.includes(':')"
        hide-details
        variant="solo"
        color="accent"
    />
</template>

<script setup lang="ts">
    import { ref, watch } from 'vue'

    const model = defineModel<{ ip?: string }>()

    const ip = ref(model.value?.ip ?? '')

    watch(ip, (value) => {
        model.value = { ip: value }
    })
</script>

<style lang="scss">
    .ip-field {
        min-width: 250px;
        width: fit-content;

        .v-field__field > * {
            min-height: 0;
            padding-block: 4px;
        }

        .v-text-field__prefix {
            opacity: 1;
            transition: color 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
        }

        &.v-input--error .v-text-field__prefix {
            color: rgb(var(--v-theme-error));
        }

        &.v-input--focused:not(.v-input--error) .v-text-field__prefix {
            color: rgb(var(--v-theme-primary));
        }
    }
</style>
