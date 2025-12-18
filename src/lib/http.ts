import axios from 'axios'

const http = axios.create({
    timeout: 5000,
})

http.interceptors.request.use((config) => {
    if (!http.defaults.baseURL) {
        throw new axios.Cancel()
    }
    return config
})

export default http
