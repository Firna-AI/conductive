import { expect, it, vi } from 'vitest'
import { deferred } from '../app/clipboard.test-support'
import { flushMicrotasks, ManualDelay } from '../app/test-kit'
import type { SessionTranscriptResponse } from '../shared/sessions'
import type { ChatApi } from './api/client'
import { copyTranscript } from './transcript-copy'

const target = { orgId: 'org', workspaceId: 'workspace' }

it('retains resolved text after an early clipboard failure and copies it immediately on the next press once', async () => {
  const pending = deferred<SessionTranscriptResponse>()
  const refused = new Error('Clipboard refused.')
  const inputs: (string | Promise<string>)[] = []
  const copy = vi.fn(async (text: string | Promise<string>) => {
    inputs.push(text)
    if (inputs.length === 1) throw refused
    await text
  })
  const services = { copy, now: () => 0, delay: new ManualDelay().delay }
  const transcript = vi
    .fn<ChatApi['transcript']>()
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue({ markdown: 'Fresh text' })
  const options = {
    services,
    api: { transcript },
    target,
    sessionId: 'session',
    detail: 'full' as const,
  }
  const first = copyTranscript(options)
  expect(inputs).toHaveLength(1)
  expect(inputs[0]).toBeInstanceOf(Promise)
  await expect(first).rejects.toBe(refused)
  pending.resolve({ markdown: 'Kept text' })
  await flushMicrotasks()
  const retry = copyTranscript(options)
  expect(inputs[1]).toBe('Kept text')
  expect(transcript).toHaveBeenCalledTimes(1)
  await retry
  await copyTranscript(options)
  expect(transcript).toHaveBeenCalledTimes(2)
})

it('isolates retained text by workspace, session, and detail and expires it after one minute', async () => {
  let now = 0
  let refused = true
  const transcript = vi.fn(async () => ({ markdown: 'Text' }))
  const copy = vi.fn(async (text: string | Promise<string>) => {
    await text
    if (refused) throw new Error('Refused')
  })
  const timers = new ManualDelay()
  const services = { copy, now: () => now, delay: timers.delay }
  const options = {
    services,
    api: { transcript },
    target,
    sessionId: 'first',
    detail: 'full' as const,
  }
  await expect(copyTranscript(options)).rejects.toThrow('Refused')
  refused = false
  await copyTranscript({ ...options, sessionId: 'second' })
  await copyTranscript({ ...options, detail: 'concise' })
  await copyTranscript({
    ...options,
    target: { ...target, workspaceId: 'another' },
  })
  await copyTranscript(options)
  expect(transcript).toHaveBeenCalledTimes(4)
  refused = true
  await expect(copyTranscript(options)).rejects.toThrow('Refused')
  refused = false
  now = 60000
  await timers.runAll()
  await copyTranscript(options)
  expect(transcript).toHaveBeenCalledTimes(6)
})

it('propagates transcript request failures without retaining them for the next press', async () => {
  const failed = new Error('The transcript request failed.')
  const transcript = vi
    .fn<ChatApi['transcript']>()
    .mockRejectedValueOnce(failed)
    .mockResolvedValue({ markdown: 'Next request' })
  const values: string[] = []
  const services = {
    now: () => 0,
    delay: new ManualDelay().delay,
    copy: async (text: string | Promise<string>) => {
      values.push(await text)
    },
  }
  const options = {
    services,
    api: { transcript },
    target,
    sessionId: 'session',
    detail: 'concise' as const,
  }
  await expect(copyTranscript(options)).rejects.toBe(failed)
  await copyTranscript(options)
  expect(transcript).toHaveBeenCalledTimes(2)
  expect(values).toEqual(['Next request'])
})
