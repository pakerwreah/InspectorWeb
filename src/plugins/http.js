import Vue from 'vue'
import axios from 'axios'
import VueAxios from 'vue-axios'

const http = axios.create({
  timeout: 5000
})

Vue.use(VueAxios, http)

let source = axios.CancelToken.source()

function errorHandler (error) {
  if (axios.isCancel(error)) {
    return new Promise(() => false)
  } else {
    return Promise.reject(error)
  }
}

http.interceptors.request.use((config) => {
  if (!http.defaults.baseURL) {
    throw new axios.Cancel()
  }
  config.cancelToken = source.token
  return config
}, errorHandler)

http.interceptors.response.use((response) => {
  return response
}, errorHandler)

export const cancelRequests = () => {
  source.cancel()
  source = axios.CancelToken.source()
}
