import Vue from 'vue'

Vue.mixin({
  computed: {
    dark_mode: {
      get () {
        return this.$vuetify.theme.dark
      },
      set (val) {
        this.$vuetify.theme.dark = val
        localStorage.setItem('dark', JSON.stringify(val))
      }
    }
  }
})
