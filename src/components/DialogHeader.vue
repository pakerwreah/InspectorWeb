<template>
    <v-card-title class="px-1">
        <div class="d-flex position-relative">
            <div class="text-center flex-fill">{{ title }}</div>
            <div class="position-absolute right-0 d-flex align-center fill-height">
                <v-btn @click="$emit('close')" icon>
                    <v-icon color="neutral">mdi-close</v-icon>
                </v-btn>
            </div>
        </div>
    </v-card-title>
</template>

<script setup lang="ts">
    defineEmits<{ close: [] }>()
    defineProps<{ title: string }>()
</script>
