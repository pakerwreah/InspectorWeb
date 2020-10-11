import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'

import './plugins/http'
import './plugins/mixins'
import './plugins/mask'
import './plugins/highlight'
import './plugins/directives'

import 'splitpanes/dist/splitpanes.css'
import './styles/application.scss'

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
