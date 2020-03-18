import zlib from 'zlib'

export function parseUrl (url) {
  const a = document.createElement('a')
  a.href = url
  return { pathname: a.pathname, origin: a.origin, search: a.search }
}

export function parseHeaders (headers) {
  const parsed = {}
  for (const line of headers.split('\n')) {
    const [key, value] = line.split(': ')
    if (key) {
      parsed[key.toLowerCase()] = value
    }
  }
  parsed.url = parseUrl(parsed.url)
  return parsed
}

export function decode (msg) {
  const data = new Uint8Array(msg.data)
  let p = -1
  for (let i = 0; i < data.length && p < 0; i++) {
    if (String.fromCharCode(data[i]) === '\n' && String.fromCharCode(data[i + 1]) === '\n') {
      p = i + 1
    }
  }

  if (p >= 0) {
    const enc = new TextDecoder('utf-8')
    let headers = enc.decode(data.slice(0, p)).toString().split('\n')
    const uid = headers.splice(0, 1).pop()
    const raw_headers = headers.join('\n')

    headers = parseHeaders(raw_headers)

    const body = new Blob([zlib.gunzipSync(Buffer.from(msg.data, p + 1))], { type: headers['content-type'] })

    return { uid, headers, raw_headers, body }
  }
  return false
}
