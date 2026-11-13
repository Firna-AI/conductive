import { configuration } from './config'
import { createClaudeFactory } from './providers/claude'
import { createCodexFactory } from './providers/codex'
import { writeCodexCredentials } from './providers/codex-credentials'
import { warmClaude } from './providers/binaries'
import { Runner } from './runner'
import { connectWebSocket } from './socket'
import { DiskStorage, EventStore } from './state'
import { ProcPortScanner } from './proc-ports'
import { startProcess } from './providers/process'
import { SkillLists } from './skills'

const warn = (message: string) => process.stderr.write(`${message}\n`)

async function main(): Promise<void> {
  const config = configuration(process.env)
  const store = await EventStore.open(new DiskStorage(config.statePath))
  const ports = new ProcPortScanner({
    ...config,
    uid: process.getuid?.() ?? -1,
  })
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  const reconnect = () => {
    if (stopped || timer !== undefined) return
    timer = setTimeout(() => {
      timer = undefined
      void runner.connect().catch(() => {
        warn('The runner will retry its connection.')
        reconnect()
      })
    }, 1000)
  }
  const skills = new SkillLists()
  const runner = new Runner({
    ...config,
    store,
    connect: (request) => connectWebSocket(request, warn),
    providers: {
      claude: createClaudeFactory(),
      codex: createCodexFactory(startProcess, writeCodexCredentials, skills),
    },
    warm: warmClaude,
    now: Date.now,
    warn,
    disconnected: reconnect,
    skills: { lists: skills },
    ports: {
      scan: () => ports.scan(),
      schedule: (scan, interval) => {
        const timer = setInterval(() => {
          void scan()
        }, interval)
        return () => clearInterval(timer)
      },
    },
  })
  for (const signal of ['SIGTERM', 'SIGINT'] as const)
    process.once(signal, () => {
      stopped = true
      clearTimeout(timer)
      void runner.close().finally(() => process.exit(0))
    })
  await runner.start().catch(() => {
    warn('The runner will retry its connection.')
    reconnect()
  })
}

void main().catch(() => {
  warn('The runner could not start. Check its configuration and saved state.')
  process.exitCode = 1
})
