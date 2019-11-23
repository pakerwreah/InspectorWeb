import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'

import './plugins/http'
import './plugins/mixins'
import './plugins/scroll'
import './plugins/highlight'

import 'splitpanes/dist/splitpanes.css'
import './styles/application.scss'

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app')
