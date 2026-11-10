import { expect, it } from 'vitest'

import { reporterFixture } from '../test-support/ports'
import { deferred } from '../test-support/runtime'

const server = { port: 3000, name: 'vite dev', folder: null }

it('debounces additions and removals over two scheduled scans and reports only changes', async () => {
  const h = reporterFixture()
  await h.reporter.refresh(true)
  h.reporter.watch()
  expect(h.intervals).toEqual([2000])
  h.set([server])
  await h.tick()
  expect(h.reports).toEqual([{ event: { type: 'ports.updated', ports: [] } }])
  await h.tick()
  expect(h.reports.at(-1)).toEqual({
    event: { type: 'ports.updated', ports: [server] },
  })
  await h.tick()
  h.set([])
  await h.tick()
  h.set([server])
  await h.tick()
  expect(h.reports).toHaveLength(2)
  h.set([])
  await h.tick()
  await h.tick()
  expect(h.reports).toEqual([
    { event: { type: 'ports.updated', ports: [] } },
    { event: { type: 'ports.updated', ports: [server] } },
    { event: { type: 'ports.updated', ports: [] } },
  ])
  await h.reporter.close()
  h.set([server])
  await h.tick()
  expect(h.stopped).toBe(1)
  expect(h.reports).toHaveLength(3)
})

it('sends full current reports on connect and refresh without admitting transient listeners', async () => {
  const h = reporterFixture()
  h.set([server])
  await h.reporter.refresh(true)
  h.set([])
  await h.reporter.refresh(true, 'repair-empty')
  expect(h.reports).toEqual([
    { event: { type: 'ports.updated', ports: [] } },
    { event: { type: 'ports.updated', ports: [] }, commandId: 'repair-empty' },
  ])
  h.set([server])
  await h.reporter.refresh()
  await h.reporter.refresh()
  await h.reporter.refresh(true, 'repair-current')
  expect(h.reports.slice(-2)).toEqual([
    { event: { type: 'ports.updated', ports: [server] } },
    {
      event: { type: 'ports.updated', ports: [server] },
      commandId: 'repair-current',
    },
  ])
  expect(h.warnings).toEqual([])
})

it('keeps the first 64 sorted unique stable ports', async () => {
  const h = reporterFixture()
  h.set(
    Array.from({ length: 70 }, (_, index) => ({
      ...server,
      port: 3070 - index,
    })),
  )
  await h.reporter.refresh()
  await h.reporter.refresh()
  const ports = h.reports.at(-1)?.event.ports.map((port) => port.port)
  expect(ports).toEqual([
    3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012,
    3013, 3014, 3015, 3016, 3017, 3018, 3019, 3020, 3021, 3022, 3023, 3024,
    3025, 3026, 3027, 3028, 3029, 3030, 3031, 3032, 3033, 3034, 3035, 3036,
    3037, 3038, 3039, 3040, 3041, 3042, 3043, 3044, 3045, 3046, 3047, 3048,
    3049, 3050, 3051, 3052, 3053, 3054, 3055, 3056, 3057, 3058, 3059, 3060,
    3061, 3062, 3063, 3064,
  ])
})

it('preserves stable ports through a failed scan and serializes overlapping scan requests', async () => {
  const h = reporterFixture()
  h.set([server])
  await h.reporter.refresh()
  await h.reporter.refresh()
  h.hold(async () => {
    throw new Error('The socket table is unavailable.')
  })
  await h.reporter.refresh()
  expect(h.warnings).toEqual(['The listening ports could not be read.'])
  const scan = deferred<readonly (typeof server)[]>()
  h.hold(() => scan.promise)
  const first = h.reporter.refresh(true)
  const second = h.reporter.refresh(true, 'repair')
  scan.resolve([])
  await first
  h.hold(null)
  await second
  expect(h.reports.slice(-2)).toEqual([
    { event: { type: 'ports.updated', ports: [server] } },
    { event: { type: 'ports.updated', ports: [server] }, commandId: 'repair' },
  ])
  const begun = deferred<void>()
  const ending = deferred<readonly (typeof server)[]>()
  h.hold(() => {
    begun.resolve()
    return ending.promise
  })
  const scanning = h.reporter.refresh(true)
  await begun.promise
  const closing = h.reporter.close()
  ending.reject(new Error('The process stopped during a read.'))
  await Promise.all([scanning, closing])
  expect(h.reports).toHaveLength(3)
  expect(h.warnings).toEqual(['The listening ports could not be read.'])
})
