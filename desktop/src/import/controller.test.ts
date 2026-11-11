import { expect, it } from 'vitest'
import type { ImportScanRow } from '../../../src/shared/conductor-import-operation.ts'
import { importEncodedBytes } from '../../../src/shared/conductor-import-pages.ts'
import { createImportPreferences } from './preferences.ts'
import { controllerFixture } from './controller.test-support.ts'

it('reads only existence before native consent and keeps Mac choices across connections', async () => {
  const test = controllerFixture()
  test.queue('exists', true)
  let next = test.next()
  test.start('status')
  const status = await next
  expect(status.event).toEqual({
    kind: 'status',
    available: true,
    dismissed: false,
    consent: 'unknown',
  })
  expect(test.calls).toEqual([{ action: 'exists' }])
  expect(test.prompt).toHaveBeenCalledTimes(0)
  next = test.next()
  test.ack(status)
  test.ack(await next)
  test.prompt.mockResolvedValueOnce(false)
  next = test.next()
  test.start('scan', 'denied')
  const denied = await next
  expect(denied.event).toEqual({ kind: 'failed', code: 'consent_required' })
  test.ack(denied)
  expect(test.calls).toHaveLength(1)
  test.preferences.dismiss()
  test.prompt.mockResolvedValueOnce(true)
  test.queue('exists', true)
  test.queue('scan', [])
  next = test.next()
  test.start('scan', 'ask-again')
  const scan = await next
  expect(scan.event).toEqual({ kind: 'scan', rows: [] })
  next = test.next()
  test.ack(scan)
  test.ack(await next)
  expect(test.prompt).toHaveBeenCalledTimes(2)
  const reloaded = createImportPreferences({
    files: test.files.files,
    prompt: test.prompt,
    warn: () => undefined,
  })
  expect(reloaded.read()).toEqual({ consent: 'allowed', dismissed: true })
  expect(await reloaded.allow()).toBe(true)
  expect(test.prompt).toHaveBeenCalledTimes(2)
  test.controller.dispose()
})

it('bounds escaped scan frames and sends each next page only after its matching acknowledgment', async () => {
  const test = controllerFixture()
  test.prompt.mockResolvedValue(true)
  const rows: ImportScanRow[] = Array.from({ length: 5 }, (_, index) => ({
    localWorkspaceId: `local-${index}`,
    name: '"\\\n雪'.repeat(35_000),
    repository: 'firna/repository',
    branch: 'feature',
    sessionCount: 1,
    uploadBytes: 0,
  }))
  test.queue('exists', true)
  test.queue('scan', rows)
  let next = test.next()
  test.start('scan')
  const first = await next
  expect(first.event.kind).toBe('scan')
  expect(importEncodedBytes(first)).toBeLessThan(1_000_000)
  expect(test.frames).toHaveLength(1)
  test.controller.receive({
    type: 'import.ack',
    operationId: first.operationId,
    sequence: 1,
    result: { kind: 'accepted' },
  })
  await Promise.resolve()
  expect(test.frames).toHaveLength(1)
  next = test.next()
  test.ack(first)
  const second = await next
  expect(second.sequence).toBe(1)
  expect(importEncodedBytes(second)).toBeLessThan(1_000_000)
  test.controller.dispose()
  test.ack(second)
  await Promise.resolve()
  expect(test.frames).toHaveLength(2)
  expect(test.calls).toHaveLength(2)
})
