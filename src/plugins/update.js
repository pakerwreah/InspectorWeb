import http from '@/lib/http'

export default function (version) {
  return http.get('https://api.github.com/repos/pakerwreah/InspectorWeb/releases/latest')
    .then(({ data }) => {
      const { html_url, name } = data
      if (name) {
        const new_version = name.replace(/[^\d.]/, '')
        if (version !== new_version) {
          const p_old = version.split('.')
          const p_new = new_version.split('.')

          if (p_old.length === p_new.length) {
            for (let i = 0; i < p_new.length; i++) {
              if (parseInt(p_new[i]) < parseInt(p_old[i])) {
                return
              }
            }
            return {
              name: new_version,
              url: html_url
            }
          }
        }
      }
    })
}
