const dgram = require('dgram')

let server

export default function searchDevices (port) {
  if (server) {
    server.close()
  }
  server = dgram.createSocket('udp4')

  server.on('listening', () => {
    const address = server.address()
    process.stdout.write('UDP Server started and listening on ' + address.address + ':' + address.port + '\n')
  })

  server.bind(port)

  return server
}
