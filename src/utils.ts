export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function formatTimestamp(timestamp: number, full = false) {
    const today = new Date()
    const date = new Date(timestamp)
    return !full && today.toDateString() === date.toDateString() ? date.toLocaleTimeString() : date.toLocaleString()
}

export function formatDuration(duration: { sec: number; usec: number }) {
    const { sec, usec } = duration

    const msg = []

    if (sec) {
        msg.push(`${sec} second` + (sec > 1 ? 's' : ''))
    }

    if (usec) {
        msg.push(`${(usec / 1000).toFixed(2)} milliseconds`)
    }

    return msg.join(' and ')
}
