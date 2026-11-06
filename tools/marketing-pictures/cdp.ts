import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startProcess, stopProcess } from './processes.ts'

type Message = Record<string, unknown>
type Pending = {
  resolve: (message: Message) => void
  reject: (error: Error) => void
}

function isObject(value: unknown): value is Message {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function object(value: unknown): Message {
  if (!isObject(value)) {
    throw new Error('Expected a DevTools response object')
  }
  return value
}

export function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Expected a DevTools string')
  return value
}

async function connect(url: string, signal: AbortSignal) {
  const socket = new WebSocket(url)
  const abort = () => socket.close()
  signal.addEventListener('abort', abort, { once: true })
  try {
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true })
      socket.addEventListener(
        'error',
        () => reject(new Error('DevTools connection failed')),
        { once: true },
      )
      socket.addEventListener(
        'close',
        () => reject(new Error('DevTools connection closed')),
        { once: true },
      )
    })
    signal.throwIfAborted()
  } catch (error) {
    socket.close()
    signal.removeEventListener('abort', abort)
    throw error
  }

  let nextId = 0
  const pending = new Map<number, Pending>()
  const listeners = new Set<(message: Message) => void>()
  const fail = (error: Error) => {
    for (const request of pending.values()) request.reject(error)
    pending.clear()
  }
  socket.addEventListener('message', (event) => {
    try {
      const decoded: unknown = JSON.parse(string(event.data))
      const message = object(decoded)
      const request = typeof message.id === 'number' && pending.get(message.id)
      if (request) {
        if (message.error)
          request.reject(new Error(JSON.stringify(message.error)))
        else request.resolve(object(message.result))
        pending.delete(Number(message.id))
      } else {
        for (const listener of listeners) listener(message)
      }
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)))
    }
  })
  socket.addEventListener('close', () => {
    signal.removeEventListener('abort', abort)
    fail(new Error('DevTools connection closed'))
  })
  socket.addEventListener('error', () =>
    fail(new Error('DevTools connection failed')),
  )

  async function send(
    method: string,
    params: Message = {},
    sessionId?: string,
  ): Promise<Message> {
    signal.throwIfAborted()
    if (socket.readyState !== WebSocket.OPEN)
      throw new Error('DevTools is closed')
    const id = ++nextId
    const timer = setTimeout(() => {
      pending.get(id)?.reject(new Error(`DevTools timed out: ${method}`))
      pending.delete(id)
    }, 30000)
    try {
      return await new Promise<Message>((resolve, reject) => {
        pending.set(id, { resolve, reject })
        socket.send(JSON.stringify({ id, method, params, sessionId }))
      })
    } finally {
      clearTimeout(timer)
    }
  }

  function waitFor(method: string, sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer)
        listeners.delete(listener)
        socket.removeEventListener('close', closed)
        if (error) reject(error)
        else resolve()
      }
      const closed = () =>
        finish(new Error('DevTools closed while waiting for a page'))
      const listener = (message: Message) => {
        if (message.method === method && message.sessionId === sessionId)
          finish()
      }
      const timer = setTimeout(
        () => finish(new Error(`Page timed out: ${method}`)),
        30000,
      )
      listeners.add(listener)
      socket.addEventListener('close', closed, { once: true })
    })
  }

  return { send, waitFor, close: () => socket.close() }
}

/** Launch headless Chrome with a private profile and Node's native WebSocket. */
export async function launchChrome(signal: AbortSignal) {
  const profile = await mkdtemp(join(tmpdir(), 'conducting-pictures-chrome-'))
  let child: ReturnType<typeof startProcess> | undefined
  try {
    const chrome = startProcess(
      'google-chrome',
      [
        '--headless=new',
        '--remote-debugging-port=0',
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--hide-scrollbars',
        '--font-render-hinting=none',
        '--force-color-profile=srgb',
        'about:blank',
      ],
      signal,
      true,
    )
    child = chrome
    const url = await new Promise<string>((resolve, reject) => {
      let stderr = ''
      const timer = setTimeout(
        () => reject(new Error('Chrome startup timed out')),
        30000,
      )
      chrome.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
        const match = /DevTools listening on (ws:\S+)/.exec(stderr)
        if (match) {
          clearTimeout(timer)
          resolve(match[1])
        }
      })
      chrome.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
      chrome.once('exit', (code) => {
        clearTimeout(timer)
        reject(new Error(`Chrome exited with code ${code}: ${stderr}`))
      })
    })
    const connection = await connect(url, signal)
    return {
      ...connection,
      async close() {
        connection.close()
        try {
          await stopProcess(chrome)
        } finally {
          await rm(profile, { recursive: true, force: true })
        }
      },
    }
  } catch (error) {
    try {
      if (child) await stopProcess(child)
    } finally {
      await rm(profile, { recursive: true, force: true })
    }
    throw error
  }
}

export type Browser = Awaited<ReturnType<typeof launchChrome>>
