import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { realpathSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

import type { HelperOutput } from '../sdk-helper/src/generated/HelperOutput'
import type { HelperRequest } from '../sdk-helper/src/generated/HelperRequest'
import { JsonLines } from '../sdk-helper/src/json-lines'
import { readOutput } from '../sdk-helper/src/read-output'

export interface HelperPort {
  write(request: HelperRequest): void
  onOutput(listener: (output: HelperOutput) => void): void
  onExit(listener: () => void): void
  terminate(): Promise<void>
  exited: Promise<void>
}

function helperProgram(): string {
  if (process.env.CONDUCTIVE_SDK_HELPER)
    return process.env.CONDUCTIVE_SDK_HELPER
  const main = resolve(process.argv[1] ?? fileURLToPath(import.meta.url))
  if (basename(main) === 'main.mjs' && basename(dirname(main)) === 'runner') {
    const release = realpathSync(dirname(dirname(dirname(main))))
    return join(release, 'sdk-helper', 'sdk-helper.mjs')
  }
  return fileURLToPath(new URL('../sdk-helper/sdk-helper.mjs', import.meta.url))
}

const program = helperProgram()

/** A release resolves its helper beside its own runner, without following current again. */
export function spawnHelper(): HelperPort {
  const child = spawn(process.execPath, [program], {
    stdio: ['pipe', 'pipe', 'ignore'],
    detached: process.platform !== 'win32',
  })
  const outputs = new Set<(output: HelperOutput) => void>()
  const exits = new Set<() => void>()
  let ended = false
  let broken = false
  let resolve = () => {}
  const exited = new Promise<void>((done) => {
    resolve = done
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  const kill = (signal: NodeJS.Signals) => {
    try {
      if (child.pid && process.platform !== 'win32')
        process.kill(-child.pid, signal)
      else child.kill(signal)
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ESRCH'
      ))
        throw error
    }
  }
  const finish = () => {
    if (ended) return
    ended = true
    clearTimeout(timer)
    kill('SIGKILL')
    for (const listener of exits) listener()
    resolve()
  }
  const terminate = () => {
    if (!ended && !timer) {
      kill('SIGTERM')
      timer = setTimeout(() => kill('SIGKILL'), 10_000)
      timer.unref()
    }
    return exited
  }
  const lines = new JsonLines(readOutput, (output) => {
    for (const listener of outputs) listener(output)
  })
  child.stdout.on('data', (chunk: Buffer) => {
    if (broken) return
    try {
      lines.push(chunk)
    } catch {
      broken = true
      void terminate()
    }
  })
  child.stdout.on('end', () => {
    try {
      lines.end()
    } catch {
      void terminate()
    }
  })
  child.once('close', finish)
  child.once('error', () => {
    void terminate()
  })
  child.stdin.on('error', () => {
    void terminate()
  })
  return {
    write: (request) => {
      if (ended) throw new Error('The SDK helper process ended.')
      child.stdin.write(`${JSON.stringify(request)}\n`)
    },
    onOutput: (listener) => {
      outputs.add(listener)
    },
    onExit: (listener) => {
      exits.add(listener)
      if (ended) listener()
    },
    terminate,
    exited,
  }
}
