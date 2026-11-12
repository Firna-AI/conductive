import { expect, it } from 'vitest'

import { barrier } from '../previews/stream-test-support'
import { QueueGenerations } from './queue-generation'
import { ChatQueue } from './queue-turn'

it('keeps nested generations on their own turn while another turn runs', async () => {
  const entered = barrier<void>()
  const reply = barrier<void>()
  const queue = new ChatQueue()
  let generation = 7
  const generations = new QueueGenerations(
    () => queue.currentTurn,
    async () => generation,
  )
  const seen: [string, number | undefined][] = []
  const nestedFailure = new Error('Nested operation failed')
  const caller = queue.run((turn) =>
    generations.withGeneration(turn, async () => {
      seen.push(['caller', generations.current()])
      generation = 8
      await expect(
        generations.withGeneration(turn, async () => {
          seen.push(['nested', generations.current()])
          throw nestedFailure
        }),
      ).rejects.toBe(nestedFailure)
      seen.push(['restored', generations.current()])
      await turn.outside(() => {
        seen.push(['outside', generations.current()])
        entered.resolve()
        return reply.promise
      })
      seen.push(['continued', generations.current()])
    }),
  )
  await entered.promise
  const other = queue.run(async (turn) => {
    seen.push(['other', generations.current()])
    generation = 9
    await generations.withGeneration(turn, async () => {
      seen.push(['other scoped', generations.current()])
    })
    seen.push(['other restored', generations.current()])
  })
  reply.resolve()
  await Promise.all([caller, other])
  seen.push(['idle', generations.current()])
  expect(seen).toEqual([
    ['caller', 7],
    ['nested', 8],
    ['restored', 7],
    ['outside', undefined],
    ['other', undefined],
    ['other scoped', 9],
    ['other restored', undefined],
    ['continued', 7],
    ['idle', undefined],
  ])
})
