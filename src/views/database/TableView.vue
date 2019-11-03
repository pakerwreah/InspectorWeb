<template>
    <div></div>
</template>

<script>
    export default {
        name: 'TableView',
        props: {
            result: Object
        },
        watch: {
            result () {
                this.reload()
            }
        },
        mounted () {
            this.reload()
        },
        methods: {
            reload () {
                if (this.result) {
                    // console.log(this.result)
                }
            }
        }
    }
</script>

<style scoped>

</style>
