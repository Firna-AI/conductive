import { runnerTokenAllowed } from '../data/workspace-token-access'
import { readJsonObject } from '../http/json-body'
import { Workspace as ProductionWorkspace } from '../workspace'
import type { WorkspaceCompositionEnv } from './workspace-integration'
import { record, string, number } from './inputs'
import { BROWSER_TEST_NOW } from './browser-clock.test-support'

const CLOCK = '__test:runner-clock'

function signal() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export class Workspace extends ProductionWorkspace {
  private readonly instance = crypto.randomUUID()
  private readonly clock: { now: number }
  private readonly access: {
    fail: boolean
    hold: boolean
    entered: ReturnType<typeof signal>
    release: ReturnType<typeof signal>
  }
  private failure = ''
  private alarmsCompleted = 0
  private alarmObserved = signal()

  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    const clock = {
      now: context.storage.kv.get<number>(CLOCK) ?? BROWSER_TEST_NOW,
    }
    const access = {
      fail: false,
      hold: false,
      entered: signal(),
      release: signal(),
    }
    const count = async (key: string) => {
      await context.storage.put(
        key,
        (context.storage.kv.get<number>(key) ?? 0) + 1,
      )
    }
    super(context, env, () => clock.now, {
      readRunnerAccess: async (workspaceId, tokenHash) => {
        await count('__test:runner-access-reads')
        if (access.fail) throw new Error('Fixture runner access read failure.')
        if (access.hold) {
          access.hold = false
          access.entered.resolve()
          await access.release.promise
        }
        return runnerTokenAllowed(env.DB, workspaceId, tokenHash)
      },
    })
    this.clock = clock
    this.access = access
    const hello = this.controller.recoverLifecycle.bind(this.controller)
    this.controller.recoverLifecycle = async (...args) => {
      await count('__test:runner-hello')
      return hello(...args)
    }
    const ready = this.controller.reportRunnerLifecycle.bind(this.controller)
    this.controller.reportRunnerLifecycle = async (...args) => {
      if (args[0].type === 'runner.ready') await count('__test:runner-ready')
      return ready(...args)
    }
    const disconnect = this.controller.runnerLifecycleDisconnected.bind(
      this.controller,
    )
    this.controller.runnerLifecycleDisconnected = async (...args) => {
      await count('__test:runner-detached')
      return disconnect(...args)
    }
    this.integration.storage.get = new Proxy(this.integration.storage.get, {
      apply: (target, owner, args) => {
        if (this.failure === 'read')
          throw new Error('Fixture lifecycle read failure.')
        return Reflect.apply(target, owner, args)
      },
    })
    this.integration.storage.transaction = new Proxy(
      this.integration.storage.transaction,
      {
        apply: (target, owner, args) => {
          if (this.failure === 'write')
            throw new Error('Fixture lifecycle write failure.')
          return Reflect.apply(target, owner, args)
        },
      },
    )
  }

  override async alarm(): Promise<void> {
    await super.alarm()
    this.alarmsCompleted++
    this.alarmObserved.resolve()
    this.alarmObserved = signal()
  }

  override async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname
    if (path === '/inspect')
      return Response.json([...(await this.ctx.storage.list())])
    if (path !== '/__test/runner') return super.fetch(request)
    const input = record(await readJsonObject(request))
    const action = string(input.action)
    if (action === 'clock') {
      this.clock.now = number(input.now)
      await this.ctx.storage.put(CLOCK, this.clock.now)
    } else if (action === 'settled') {
      await this.chat.store.settled()
      await this.settledAlarms()
    } else if (action === 'drain') {
      await this.chat.store.settled()
    } else if (action === 'alarm') {
      await this.alarm()
      await this.settledAlarms()
    } else if (action === 'arm') {
      await this.ctx.storage.setAlarm(1)
    } else if (action === 'observed') {
      while (this.alarmsCompleted < number(input.count))
        await this.alarmObserved.promise
    } else if (action === 'seed') {
      for (const [key, value] of Object.entries(record(input.values)))
        await this.ctx.storage.put(key, value)
    } else if (action === 'fail') {
      this.access.fail = input.fail === true
    } else if (action === 'hold') {
      this.access.hold = true
      this.access.entered = signal()
      this.access.release = signal()
    } else if (action === 'entered') {
      await this.access.entered.promise
    } else if (action === 'release') {
      this.access.release.resolve()
    } else if (action === 'close') {
      this.chat.closeRunner()
      await this.chat.store.settled()
    } else if (action === 'failure') {
      this.failure = string(input.mode)
    }
    return Response.json({
      instance: this.instance,
      now: this.clock.now,
      alarm: await this.ctx.storage.getAlarm(),
      alarmsCompleted: this.alarmsCompleted,
      hello: this.ctx.storage.kv.get('__test:runner-hello') ?? 0,
      ready: this.ctx.storage.kv.get('__test:runner-ready') ?? 0,
      detached: this.ctx.storage.kv.get('__test:runner-detached') ?? 0,
      reads: this.ctx.storage.kv.get('__test:runner-access-reads') ?? 0,
      autoResponse: this.ctx.getWebSocketAutoResponse()?.request ?? null,
      sockets: this.ctx.getWebSockets().map((socket) => ({
        readyState: socket.readyState,
        attachment: socket.deserializeAttachment(),
      })),
      state: [...(await this.ctx.storage.list())],
    })
  }
}
