import hljs from 'highlight.js/lib/core'

import http from 'highlight.js/lib/languages/http'
hljs.registerLanguage('http', http)

import xml from 'highlight.js/lib/languages/xml'
hljs.registerLanguage('html', xml)

import yaml from 'highlight.js/lib/languages/yaml'
hljs.registerLanguage('yaml', yaml)

import json from 'highlight.js/lib/languages/json'
hljs.registerLanguage('json', json)

import sql from 'highlight.js/lib/languages/sql'
hljs.registerLanguage('sql', sql)

import plugin from '@highlightjs/vue-plugin'
export default plugin
export const highlightjs = plugin.component
