import { deviceNumber, deviceObject } from '../../src/shared/device-read'
import { readJsonObject } from '../http/json-body'
import { advanceScheduledAlarms } from '../lifecycle/scheduled-alarms.test-support'

// Future fixture time prevents workerd from firing these alarms on real time.
export const DEVICE_TEST_NOW = 3_000_000_000_000
const CLOCK_KEY = '__test:device-clock'
const AUTO_KEY = '__test:device-auto-response-times'
const CLOCK_PATH = '/__test/device-clock'
const ALARM_PATH = '/__test/device-alarm'
const RESTART_PATH = '/__test/device-restart'
const READY_PATH = '/__test/device-ready'
const CLOSED_PATH = '/__test/device-closed'

export function deviceTestPath(
  action: 'clock' | 'alarm' | 'restart' | 'ready' | 'closed',
  object: string,
) {
  const path =
    action === 'clock'
      ? CLOCK_PATH
      : action === 'alarm'
        ? ALARM_PATH
        : action === 'restart'
          ? RESTART_PATH
          : action === 'ready'
            ? READY_PATH
            : CLOSED_PATH
  return `${path}?object=${encodeURIComponent(object)}`
}
export function deviceTestTarget(url: URL): string | null {
  return [
    CLOCK_PATH,
    ALARM_PATH,
    RESTART_PATH,
    READY_PATH,
    CLOSED_PATH,
  ].includes(url.pathname)
    ? url.searchParams.get('object')
    : null
}

export class ManualDeviceClock {
  private value = DEVICE_TEST_NOW
  private readonly automatic = new Map<number, number>()
  readonly now = () => this.value

  async restore(storage: DurableObjectStorage) {
    this.value = (await storage.get<number>(CLOCK_KEY)) ?? DEVICE_TEST_NOW
    const times: unknown = await storage.get(AUTO_KEY)
    if (Array.isArray(times))
      for (const entry of times) {
        if (Array.isArray(entry) && entry.length === 2)
          this.automatic.set(deviceNumber(entry[0]), deviceNumber(entry[1]))
      }
  }
  autoResponseAt(date: Date | null): number | null {
    if (!date) return null
    const actual = date.getTime()
    const mapped = this.automatic.get(actual) ?? this.value
    this.automatic.set(actual, mapped)
    return mapped
  }
  async capture(context: DurableObjectState) {
    for (const socket of context.getWebSockets())
      this.autoResponseAt(context.getWebSocketAutoResponseTimestamp(socket))
    await context.storage.put(AUTO_KEY, [...this.automatic])
  }
  async route(
    request: Request,
    context: DurableObjectState,
    alarm: () => Promise<void>,
  ): Promise<Response | null> {
    const storage = context.storage
    const path = new URL(request.url).pathname
    if (path === RESTART_PATH && request.method === 'POST')
      context.abort(
        'Restart the device fixture with durable work still pending.',
      )
    if (path === CLOCK_PATH && request.method === 'POST') {
      await this.capture(context)
      this.value = deviceNumber(deviceObject(await readJsonObject(request)).now)
      await storage.put(CLOCK_KEY, this.value)
    } else if (path === ALARM_PATH && request.method === 'POST') {
      await advanceScheduledAlarms(
        {
          now: this.now,
          setTime: async (at) => {
            this.value = at
            await storage.put(CLOCK_KEY, at)
          },
        },
        this.value,
        () => [{ storage, fire: alarm }],
      )
    } else if (path !== CLOCK_PATH || request.method !== 'GET') return null
    return Response.json({ now: this.value, alarm: await storage.getAlarm() })
  }
}
