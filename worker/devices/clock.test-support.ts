import { deviceNumber, deviceObject } from '../../src/shared/device-read'
import { readJsonObject } from '../http/json-body'

// Future fixture time prevents workerd from firing these alarms on real time.
export const DEVICE_TEST_NOW = 3_000_000_000_000
const CLOCK_KEY = '__test:device-clock'
const CLOCK_PATH = '/__test/device-clock'
const ALARM_PATH = '/__test/device-alarm'
const RESTART_PATH = '/__test/device-restart'

export function deviceTestPath(
  action: 'clock' | 'alarm' | 'restart',
  object: string,
) {
  const path =
    action === 'clock'
      ? CLOCK_PATH
      : action === 'alarm'
        ? ALARM_PATH
        : RESTART_PATH
  return `${path}?object=${encodeURIComponent(object)}`
}
export function deviceTestTarget(url: URL): string | null {
  return [CLOCK_PATH, ALARM_PATH, RESTART_PATH].includes(url.pathname)
    ? url.searchParams.get('object')
    : null
}

export class ManualDeviceClock {
  private value = DEVICE_TEST_NOW
  readonly now = () => this.value

  async restore(storage: DurableObjectStorage) {
    this.value = (await storage.get<number>(CLOCK_KEY)) ?? DEVICE_TEST_NOW
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
      this.value = deviceNumber(deviceObject(await readJsonObject(request)).now)
      await storage.put(CLOCK_KEY, this.value)
    } else if (path === ALARM_PATH && request.method === 'POST') {
      await alarm()
    } else if (path !== CLOCK_PATH || request.method !== 'GET') return null
    return Response.json({ now: this.value, alarm: await storage.getAlarm() })
  }
}
