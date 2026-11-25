import { afterEach, expect, it, vi } from 'vitest'

import { RunnerSkillReads } from './runner'

afterEach(() => vi.useRealTimers())

it('expires a silent skill read, ignores its late reply, and accepts a later read', async () => {
  vi.useFakeTimers()
  const ids = ['first-read', 'next-read'][Symbol.iterator]()
  const reads = new RunnerSkillReads(() => {
    const id = ids.next()
    if (id.done) throw new Error('Unexpected skill read.')
    return id.value
  })
  const connection = { id: 'runner', skillReads: true }
  const skill = { agent: 'codex', name: 'review' } as const
  const send = async () => true
  const failed = vi.fn()
  void reads.read(connection, skill, send).catch(failed)

  await vi.advanceTimersByTimeAsync(29_999)
  expect(failed).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(failed).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ code: 'skill_unavailable', status: 503 }),
  )

  const next = reads.read(connection, skill, send)
  expect(
    reads.receive(connection.id, {
      type: 'skill.read.result',
      requestId: 'first-read',
      result: { ok: true, text: 'Late text' },
    }),
  ).toBe(false)
  expect(
    reads.receive(connection.id, {
      type: 'skill.read.result',
      requestId: 'next-read',
      result: { ok: true, text: 'Current text' },
    }),
  ).toBe(true)
  await expect(next).resolves.toBe('Current text')
})

it('drops a skill reply after the deadline while the expiry timer is still pending', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  const reads = new RunnerSkillReads(() => 'skill-read')
  const connection = { id: 'runner', skillReads: true }
  const read = reads.read(
    connection,
    { agent: 'codex', name: 'review' },
    async () => true,
  )
  vi.setSystemTime(30_001)
  expect(
    reads.receive(connection.id, {
      type: 'skill.read.result',
      requestId: 'skill-read',
      result: { ok: true, text: 'Late text' },
    }),
  ).toBe(false)
  await expect(read).rejects.toMatchObject({
    code: 'skill_unavailable',
    status: 503,
  })
})
