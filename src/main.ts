import '@mdi/font/css/materialdesignicons.min.css'
import 'splitpanes/dist/splitpanes.css'
import './styles/application.scss'

import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import highlight from './plugins/highlight'

const app = createApp(App)

// plugins
app.use(vuetify)
app.use(highlight)

// mount app
app.mount('#app')
