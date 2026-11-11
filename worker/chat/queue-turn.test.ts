import { expect, it } from 'vitest'

import { barrier } from '../previews/stream-test-support'
import { ChatQueue } from './queue-turn'

it('runs a queued turn before an outside caller continues', async () => {
  const entered = barrier<void>()
  const reply = barrier<string>()
  const steps: string[] = []
  const queue = new ChatQueue(async () => {
    steps.push('report')
  })
  const caller = queue.run(async (turn) => {
    steps.push('caller')
    const value = await turn.outside(() => {
      steps.push(queue.currentTurn === undefined ? 'outside' : 'still owned')
      entered.resolve()
      return reply.promise
    })
    steps.push(`continued:${value}`)
  })
  await entered.promise
  const queued = queue.run(async () => {
    steps.push('queued')
  })
  reply.resolve('reply')
  await Promise.all([caller, queued])
  expect(steps).toEqual([
    'caller',
    'report',
    'outside',
    'queued',
    'report',
    'continued:reply',
    'report',
  ])
})

it('rejoins behind earlier turns and before turns queued later', async () => {
  const entered = barrier<void>()
  const reply = barrier<void>()
  const releaseEarlier = barrier<void>()
  const steps: string[] = []
  const queue = new ChatQueue()
  const caller = queue.run(async (turn) => {
    await turn.outside(() => {
      entered.resolve()
      return reply.promise
    })
    steps.push('continued')
  })
  await entered.promise
  const earlier = queue.run(async () => {
    steps.push('earlier')
    await releaseEarlier.promise
  })
  const alsoEarlier = queue.run(async () => {
    steps.push('also earlier')
  })
  reply.resolve()
  await reply.promise
  const later = queue.run(async () => {
    steps.push('later')
  })
  releaseEarlier.resolve()
  await Promise.all([caller, earlier, alsoEarlier, later])
  expect(steps).toEqual(['earlier', 'also earlier', 'continued', 'later'])
})

it('delivers an outside error only after the caller holds the queue again', async () => {
  const entered = barrier<void>()
  const reply = barrier<void>()
  const failure = new Error('Outside call failed')
  const steps: string[] = []
  const queue = new ChatQueue()
  const caller = queue.run(async (turn) => {
    try {
      await turn.outside(async () => {
        entered.resolve()
        await reply.promise
        throw failure
      })
    } catch (error) {
      steps.push('caught')
      expect(queue.currentTurn).toBe(turn)
      throw error
    }
  })
  const rejected = expect(caller).rejects.toBe(failure)
  await entered.promise
  const queued = queue.run(async () => {
    steps.push('queued')
  })
  reply.resolve()
  await Promise.all([rejected, queued])
  await queue.settled()
  expect(steps).toEqual(['queued', 'caught'])
  expect(queue.currentTurn).toBeUndefined()
})

it('idle and settled wait for an outside turn and keep settled identity', async () => {
  const entered = barrier<void>()
  const reply = barrier<void>()
  const steps: string[] = []
  const queue = new ChatQueue()
  const caller = queue.run(async (turn) => {
    await turn.outside(() => {
      steps.push('outside')
      entered.resolve()
      return reply.promise
    })
    steps.push('ended')
  })
  await entered.promise
  const work = queue.settled()
  const settled = work.then(() => steps.push('settled'))
  const idle = queue.idle().then(() => steps.push('idle'))
  try {
    await Promise.resolve().then(() => steps.push('checkpoint'))
    expect(steps).toEqual(['outside', 'checkpoint'])
    expect(queue.settled()).toBe(work)
  } finally {
    reply.resolve()
    await Promise.all([caller, settled, idle])
  }
  expect(steps.slice(0, 3)).toEqual(['outside', 'checkpoint', 'ended'])
  expect(steps.slice(3).sort()).toEqual(['idle', 'settled'])
  expect(queue.settled()).toBe(queue.settled())
  expect(queue.currentTurn).toBeUndefined()
})

it('idle keeps its snapshot while settled also waits for later turns', async () => {
  const releaseFirst = barrier<void>()
  const laterEntered = barrier<void>()
  const releaseLater = barrier<void>()
  const steps: string[] = []
  const queue = new ChatQueue()
  const first = queue.run(async () => {
    await releaseFirst.promise
    steps.push('first ended')
  })
  const idle = queue.idle().then(() => steps.push('idle'))
  const work = queue.settled()
  const settled = work.then(() => steps.push('settled'))
  const later = queue.run(async () => {
    laterEntered.resolve()
    await releaseLater.promise
    steps.push('later ended')
  })
  releaseFirst.resolve()
  try {
    await Promise.all([first, laterEntered.promise, idle])
    steps.push('snapshot drained')
    expect(steps).toEqual(['first ended', 'idle', 'snapshot drained'])
  } finally {
    releaseLater.resolve()
    await Promise.all([later, settled])
  }
  expect(steps).toEqual([
    'first ended',
    'idle',
    'snapshot drained',
    'later ended',
    'settled',
  ])
})

it('waits for turn end reports before releasing the queue', async () => {
  const reporting = barrier<void>()
  const releaseReport = barrier<void>()
  const steps: string[] = []
  let reports = 0
  const queue = new ChatQueue(async () => {
    if (++reports !== 1) return
    steps.push('report started')
    reporting.resolve()
    await releaseReport.promise
    steps.push('report ended')
  })
  const caller = queue.run(async (turn) => {
    await turn.outside(async () => {
      steps.push('outside')
    })
    steps.push('continued')
  })
  const queued = queue.run(async () => {
    steps.push('queued')
  })
  await reporting.promise
  try {
    expect(steps).toEqual(['report started'])
  } finally {
    releaseReport.resolve()
    await Promise.all([caller, queued])
  }
  expect(steps).toEqual([
    'report started',
    'report ended',
    'outside',
    'queued',
    'continued',
  ])
})
