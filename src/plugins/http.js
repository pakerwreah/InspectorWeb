import Vue from 'vue'
import axios from 'axios'
import VueAxios from 'vue-axios'

const http = axios.create({
  baseURL: location.protocol + '//localhost:30000',
  timeout: 30000
})

Vue.use(VueAxios, http)
