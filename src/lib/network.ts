import { gunzipSync } from 'fflate'

type ParsedURL = {
    pathname: string
    origin: string
    search: string
}

export function parseUrl(url: string): ParsedURL {
    const a = document.createElement('a')
    a.href = url
    return { pathname: a.pathname, origin: a.origin, search: a.search }
}

type ParsedHeaders = Record<string, string> & { url?: ParsedURL }

export function parseHeaders(headers: string): ParsedHeaders {
    const parsed: Record<string, string> = {}
    for (const line of headers.split('\n')) {
        const [key, value] = line.split(': ')
        if (key && value !== undefined) {
            parsed[key.toLowerCase()] = value
        }
    }
    const url_str = parsed['url']
    const url = url_str ? parseUrl(url_str) : undefined

    return { ...parsed, url } as ParsedHeaders
}

type DecodedMessage = {
    uid: string
    headers: ParsedHeaders
    raw_headers: string
    body: Blob
}

export function decode(msg: MessageEvent): DecodedMessage | undefined {
    const data = new Uint8Array(msg.data)
    let p = -1
    for (let i = 0; i < data.length - 1 && p < 0; i++) {
        if (String.fromCharCode(data[i]!) === '\n' && String.fromCharCode(data[i + 1]!) === '\n') {
            p = i + 1
        }
    }
    if (p < 0) {
        return
    }
    const textDecoder = new TextDecoder('utf-8')
    const [uid, ...header_parts] = textDecoder.decode(data.slice(0, p)).toString().split('\n')
    if (!uid) {
        return
    }

    const raw_headers = header_parts.join('\n')

    const headers = parseHeaders(raw_headers)

    const unzip = gunzipSync(data.slice(p + 1))

    const body = new Blob([unzip as BlobPart], { type: headers['content-type'] })

    return { uid, headers, raw_headers, body }
}
