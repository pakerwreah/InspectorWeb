import http from '@/lib/http'

type Data = {
    name?: string
    html_url?: string
}

export async function checkUpdate(version: string) {
    const { data } = await http.get('https://api.github.com/repos/pakerwreah/InspectorWeb/releases/latest')

    const { html_url, name } = data as Data
    if (!name || !html_url) {
        return
    }
    const new_version = name.replace(/[^\d.]/, '')
    if (version === new_version) {
        return
    }
    const p_old = version.split('.')
    const p_new = new_version.split('.')

    if (p_old.length !== p_new.length) {
        return
    }
    for (let i = 0; i < p_new.length; i++) {
        if (parseInt(p_new[i] ?? '') > parseInt(p_old[i] ?? '')) {
            return {
                name: new_version,
                url: html_url,
            }
        }
    }
}
