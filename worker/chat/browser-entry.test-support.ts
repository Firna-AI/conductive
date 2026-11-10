import type { WorkspaceCompositionEnv } from './workspace-integration'
import { Workspace as ProductionWorkspace } from '../workspace'
import { readConnectionAccess } from '../security/connection-access'
import { record, string, number } from './inputs'
import { readJsonObject } from '../http/json-body'

import { BROWSER_TEST_NOW } from './browser-clock.test-support'

const CLOCK = '__test:browser-clock'

function signal() {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export class Workspace extends ProductionWorkspace {
  private readonly clock: { now: number }
  private readonly controls: {
    fail: boolean
    hold: boolean
    entered: ReturnType<typeof signal>
    release: ReturnType<typeof signal>
    closed: ReturnType<typeof signal>
    deviceHeld: boolean
    deviceEntered: ReturnType<typeof signal>
    deviceRelease: ReturnType<typeof signal>
    lifecycleHeld: boolean
    lifecycleEntered: ReturnType<typeof signal>
    lifecycleRelease: ReturnType<typeof signal>
    failure: string
  }
  private readonly instance = crypto.randomUUID()
  private alarmsCompleted = 0
  private alarmObserved = signal()

  constructor(context: DurableObjectState, env: WorkspaceCompositionEnv) {
    const clock = {
      now: context.storage.kv.get<number>(CLOCK) ?? BROWSER_TEST_NOW,
    }
    const controls = {
      fail: false,
      hold: false,
      entered: signal(),
      release: signal(),
      closed: signal(),
      deviceHeld: false,
      deviceEntered: signal(),
      deviceRelease: signal(),
      lifecycleHeld: false,
      lifecycleEntered: signal(),
      lifecycleRelease: signal(),
      failure: '',
    }
    const count = async (key: string) => {
      await context.storage.put(
        key,
        (context.storage.kv.get<number>(key) ?? 0) + 1,
      )
    }
    super(context, env, () => clock.now, {
      browserOpened: () => count('__test:browser-opened'),
      browserClosed: async () => {
        await count('__test:browser-closed')
        controls.closed.resolve()
        controls.closed = signal()
      },
      readConnectionAccess: async (identities, now) => {
        await count('__test:browser-access-reads')
        if (controls.fail) throw new Error('Fixture access read failure.')
        const result = await readConnectionAccess(env.DB, identities, now)
        if (controls.hold) {
          controls.hold = false
          controls.entered.resolve()
          await controls.release.promise
        }
        return result
      },
    })
    this.clock = clock
    this.controls = controls
    const deviceAlarm = this.devices.alarm.bind(this.devices)
    this.devices.alarm = async () => {
      if (controls.deviceHeld) {
        controls.deviceEntered.resolve()
        await controls.deviceRelease.promise
        controls.deviceHeld = false
      }
      await deviceAlarm()
    }
    this.integration.storage.get = new Proxy(this.integration.storage.get, {
      apply: (target, owner, args) => {
        if (controls.failure === 'read')
          throw new Error('Fixture lifecycle read failure.')
        return Reflect.apply(target, owner, args)
      },
    })
    this.integration.storage.transaction = new Proxy(
      this.integration.storage.transaction,
      {
        apply: (target, owner, args) => {
          if (controls.failure === 'write')
            throw new Error('Fixture lifecycle write failure.')
          return Reflect.apply(target, owner, args)
        },
      },
    )
  }

  protected override async alarmLifecycle(): Promise<void> {
    if (this.controls.lifecycleHeld) {
      this.controls.lifecycleEntered.resolve()
      await this.controls.lifecycleRelease.promise
      this.controls.lifecycleHeld = false
    }
    await super.alarmLifecycle()
  }

  override async alarm(): Promise<void> {
    await super.alarm()
    this.alarmsCompleted++
    this.alarmObserved.resolve()
    this.alarmObserved = signal()
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/__test/browser') return super.fetch(request)
    const input = record(await readJsonObject(request))
    const action = string(input.action)
    if (action === 'clock') {
      this.clock.now = number(input.now)
      await this.ctx.storage.put(CLOCK, this.clock.now)
    } else if (action === 'publish') {
      await this.publishWorkspaceMetadata('org', string(input.workspaceId))
    } else if (action === 'alarm') {
      await this.alarm()
    } else if (action === 'arm') {
      await this.ctx.storage.setAlarm(1)
    } else if (action === 'observed') {
      const count = number(input.count)
      while (this.alarmsCompleted < count) await this.alarmObserved.promise
    } else if (action === 'closed') {
      while (
        (this.ctx.storage.kv.get<number>('__test:browser-closed') ?? 0) <
        number(input.count)
      )
        await this.controls.closed.promise
    } else if (action === 'settled') {
      await this.settledAlarms()
    } else if (action === 'hold') {
      this.controls.hold = true
      this.controls.entered = signal()
      this.controls.release = signal()
    } else if (action === 'entered') {
      await this.controls.entered.promise
    } else if (action === 'release') {
      this.controls.release.resolve()
    } else if (action === 'device-hold') {
      this.controls.deviceHeld = true
      this.controls.deviceEntered = signal()
      this.controls.deviceRelease = signal()
    } else if (action === 'device-entered') {
      await this.controls.deviceEntered.promise
    } else if (action === 'device-release') {
      this.controls.deviceRelease.resolve()
    } else if (action === 'lifecycle-hold') {
      this.controls.lifecycleHeld = true
      this.controls.lifecycleEntered = signal()
      this.controls.lifecycleRelease = signal()
    } else if (action === 'lifecycle-entered') {
      await this.controls.lifecycleEntered.promise
    } else if (action === 'lifecycle-release') {
      this.controls.lifecycleRelease.resolve()
    } else if (action === 'failure') {
      this.controls.failure = string(input.mode)
    } else if (action === 'fail') {
      this.controls.fail = input.fail === true
    } else if (action === 'seed') {
      for (const [key, value] of Object.entries(record(input.values)))
        await this.ctx.storage.put(key, value)
    }
    return Response.json({
      instance: this.instance,
      lifecycleHeld: this.controls.lifecycleHeld,
      deviceHeld: this.controls.deviceHeld,

      now: this.clock.now,
      alarm: await this.ctx.storage.getAlarm(),
      alarmsCompleted: this.alarmsCompleted,
      reads: this.ctx.storage.kv.get('__test:browser-access-reads') ?? 0,
      opened: this.ctx.storage.kv.get('__test:browser-opened') ?? 0,
      closed: this.ctx.storage.kv.get('__test:browser-closed') ?? 0,
      sockets: this.ctx.getWebSockets().map((socket) => ({
        readyState: socket.readyState,
        attachment: socket.deserializeAttachment(),
      })),
      registrations: [
        ...(
          await this.ctx.storage.list({ prefix: 'native:browser:' })
        ).values(),
      ],
      state: [...(await this.ctx.storage.list())],
    })
  }
}
