import WebSocket from 'ws'

import type { WorkspaceToRunnerV2 as WorkspaceToRunner } from '../../src/shared/runner'
import type {
  RunnerConnection,
  RunnerConnectionRequest,
} from '../../src/shared/runner-transport'
import { parseWorkspaceMessage } from './commands'

export const connectWebSocket = (
  request: RunnerConnectionRequest,
  warn: (message: string) => void,
): Promise<RunnerConnection<WorkspaceToRunner>> =>
  new Promise((resolve, reject) => {
    const url = new URL(request.url)
    if (url.protocol !== 'https:' && url.protocol !== 'wss:') {
      reject(new Error('The runner endpoint needs TLS.'))
      return
    }
    url.protocol = 'wss:'
    const socket = new WebSocket(url, {
      headers: { Authorization: `Bearer ${request.workspaceToken}` },
    })
    const messages = new Set<(message: WorkspaceToRunner) => void>()
    const closes = new Set<() => void>()
    socket.on('error', () =>
      reject(new Error('The runner socket could not connect.')),
    )
    socket.on('close', () => {
      for (const listener of closes) listener()
    })
    socket.on('message', (bytes) => {
      try {
        const input: unknown = JSON.parse(bytes.toString())
        const message = parseWorkspaceMessage(input, warn)
        for (const listener of messages) listener(message)
      } catch {
        socket.close(1002, 'Invalid runner message')
      }
    })
    socket.on('open', () =>
      resolve({
        send: (message) => socket.send(JSON.stringify(message)),
        onMessage: (listener) => {
          messages.add(listener)
          return () => {
            messages.delete(listener)
          }
        },
        onClose: (listener) => {
          closes.add(listener)
          return () => {
            closes.delete(listener)
          }
        },
        close: () => socket.close(),
      }),
    )
  })
