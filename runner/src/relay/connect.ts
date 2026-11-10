import { createConnection, type Socket } from 'node:net'
import { networkInterfaces } from 'node:os'

export function sandboxAddresses(): readonly string[] {
  return [
    '127.0.0.1',
    '::1',
    ...Object.values(networkInterfaces()).flatMap((interfaces) =>
      (interfaces ?? [])
        .filter((address) => !address.internal)
        .map((address) => address.address),
    ),
  ]
}

export async function connectTarget(
  port: number,
  addresses: readonly string[],
  signal: AbortSignal,
): Promise<Socket | undefined> {
  for (const host of addresses) {
    if (signal.aborted) return
    const connected = await new Promise<Socket | undefined>((resolve) => {
      const socket = createConnection({ host, port, signal })
      const failed = () => {
        socket.destroy()
        resolve(undefined)
      }
      socket.once('error', failed)
      socket.once('connect', () => {
        socket.off('error', failed)
        resolve(socket)
      })
    })
    if (connected) return connected
  }
}
