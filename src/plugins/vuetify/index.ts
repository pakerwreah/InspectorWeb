import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

import 'vuetify/styles'
import './fonts-css'

export default createVuetify({
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: { mdi },
    },
    theme: {
        defaultTheme: 'system',
        themes: {
            light: {
                dark: false,
                colors: {
                    primary: '#2196F3',
                    accent: '#9C27B0',
                    secondary: '#30B1DC',
                    success: '#4CAF50',
                    info: '#2196F3',
                    warning: '#FB8C00',
                    error: '#FF5252',
                    controls: '#FFFFFF',
                    neutral: '#666666',
                    text: '#616161',
                    panel: '#f2f2f2',
                    controls_border: '#D5D5D5',
                },
            },
            dark: {
                dark: true,
                colors: {
                    primary: '#21CFF3',
                    accent: '#FFE18D',
                    secondary: '#21CFF3',
                    success: '#4CAF50',
                    info: '#2196F3',
                    warning: '#FB8C00',
                    error: '#FF5252',
                    controls: '#424242',
                    neutral: '#CCCCCC',
                    text: '#FFFFFF',
                    panel: '#303030',
                    controls_border: '#494949',
                },
            },
        },
    },
})
