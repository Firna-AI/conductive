import { expect, it } from 'vitest'
import { controlledPictures, readSignal } from './picture-reads.test-support'

it('does not read for a caller that already aborted', async () => {
  const { reader, readFile } = controlledPictures()
  const caller = new AbortController()
  caller.abort()
  expect(await reader.read('shot.png', caller.signal)).toEqual({
    status: 'failed',
  })
  expect(readFile).toHaveBeenCalledTimes(0)
})

it('removes a queued read when its last caller aborts and allows a later read', async () => {
  const { reader, paths, answer } = controlledPictures()
  const first = reader.read('first.png', readSignal())
  const second = reader.read('second.png', readSignal())
  const caller = new AbortController()
  const cancelled = reader.read('cancelled.png', caller.signal)
  const next = reader.read('next.png', readSignal())
  expect(paths()).toEqual(['first.png', 'second.png'])
  caller.abort()
  expect(await cancelled).toEqual({ status: 'failed' })
  const later = reader.read('cancelled.png', readSignal())
  answer(0)
  await first
  expect(paths()).toEqual(['first.png', 'second.png', 'next.png'])
  answer(1)
  await second
  expect(paths()).toEqual([
    'first.png',
    'second.png',
    'next.png',
    'cancelled.png',
  ])
  answer(2)
  answer(3)
  expect(await next).toEqual({
    status: 'picture',
    address: 'data:image/png;base64,AA==',
  })
  expect(await later).toEqual({
    status: 'picture',
    address: 'data:image/png;base64,AA==',
  })
})

it('keeps a shared active read when one caller aborts', async () => {
  const { reader, readFile, requests, answer } = controlledPictures()
  const caller = new AbortController()
  const first = reader.read('shot.png', caller.signal)
  const shared = reader.read('shot.png', readSignal())
  expect(readFile).toHaveBeenCalledTimes(1)
  caller.abort()
  expect(await first).toEqual({ status: 'failed' })
  expect(requests[0]?.signal?.aborted).toBe(false)
  answer(0)
  expect(await shared).toEqual({
    status: 'picture',
    address: 'data:image/png;base64,AA==',
  })
  expect(await reader.read('shot.png', readSignal())).toEqual({
    status: 'picture',
    address: 'data:image/png;base64,AA==',
  })
  expect(readFile).toHaveBeenCalledTimes(1)
})

it('keeps a shared queued read in its place when one caller aborts', async () => {
  const { reader, paths, answer } = controlledPictures()
  const first = reader.read('first.png', readSignal())
  const second = reader.read('second.png', readSignal())
  const caller = new AbortController()
  const cancelled = reader.read('shared.png', caller.signal)
  const shared = reader.read('shared.png', readSignal())
  const next = reader.read('next.png', readSignal())
  caller.abort()
  expect(await cancelled).toEqual({ status: 'failed' })
  answer(0)
  await first
  expect(paths()).toEqual(['first.png', 'second.png', 'shared.png'])
  answer(2)
  expect(await shared).toEqual({
    status: 'picture',
    address: 'data:image/png;base64,AA==',
  })
  answer(1)
  answer(3)
  await Promise.all([second, next])
})

it('aborts the last active caller, keeps no failure, and holds its slot until it settles', async () => {
  const { reader, paths, requests, answer } = controlledPictures()
  const caller = new AbortController()
  const cancelled = reader.read('cancelled.png', caller.signal)
  const second = reader.read('second.png', readSignal())
  const next = reader.read('next.png', readSignal())
  expect(paths()).toEqual(['cancelled.png', 'second.png'])
  caller.abort()
  expect(await cancelled).toEqual({ status: 'failed' })
  expect(requests[0]?.signal?.aborted).toBe(true)
  const again = reader.read('cancelled.png', readSignal())
  expect(paths()).toEqual(['cancelled.png', 'second.png'])
  answer(0)
  answer(1)
  await second
  expect(paths()).toEqual([
    'cancelled.png',
    'second.png',
    'next.png',
    'cancelled.png',
  ])
  answer(2)
  answer(3)
  const picture = { status: 'picture', address: 'data:image/png;base64,AA==' }
  expect(await next).toEqual(picture)
  expect(await again).toEqual(picture)
  expect(requests[3]?.signal?.aborted).toBe(false)
})
