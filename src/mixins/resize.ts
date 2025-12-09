import { defineComponent } from 'vue'

export default defineComponent({
    data: () => ({
        observer: null as ResizeObserver | null,
    }),

    methods: {
        onResize() {
            // override
        },
    },

    mounted() {
        this.observer = new ResizeObserver(this.onResize.bind(this))
        this.observer.observe(this.$el)
    },

    beforeUnmount() {
        this.observer?.disconnect()
    },
})
