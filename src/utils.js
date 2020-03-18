export function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function formatTimestamp (timestamp, full) {
  const today = new Date()
  const date = new Date(timestamp)
  return (!full && today.toDateString() === date.toDateString()) ? date.toLocaleTimeString() : date.toLocaleString()
}

export function formatDuration (duration) {
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
