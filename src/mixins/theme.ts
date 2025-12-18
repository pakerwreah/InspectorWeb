import { defineComponent } from 'vue'

export default defineComponent({
    computed: {
        dark_mode: {
            get(): boolean {
                return this.$vuetify.theme.current.dark
            },
            set(dark: boolean) {
                this.$vuetify.theme.change(dark ? 'dark' : 'light')
            },
        },
    },
})
