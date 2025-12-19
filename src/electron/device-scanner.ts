import { type Socket, createSocket } from 'dgram'

let server: Socket

export default function searchDevices(port: number) {
    if (server) {
        server.close()
    }
    server = createSocket('udp4')

    return server
        .on('listening', () => {
            const address = server.address()
            console.log('UDP Server started and listening on ' + address.address + ':' + address.port + '\n')
        })
        .on('close', () => {
            console.log('UDP Server closed')
        })
        .on('error', (e) => {
            console.error('UDP Server failed', e)
        })
        .bind(port)
}
