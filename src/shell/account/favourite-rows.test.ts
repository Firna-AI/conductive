import { describe, expect, test } from 'vitest'
import type { AgentModel } from '../../shared/generated/AgentModel'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { Effort } from '../../shared/generated/Effort'
import { addedFavourite } from './favourite-rows'

const opus: AgentModel = {
  agent: 'claude',
  model: 'opus',
  label: 'Opus 5.5',
  efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
  fast: true,
}
const sonnet: AgentModel = {
  agent: 'claude',
  model: 'sonnet',
  label: 'Sonnet 5.5',
  efforts: ['low', 'medium', 'high', 'max'],
}
const fable: AgentModel = {
  agent: 'claude',
  model: 'fable',
  label: 'Fable 5.1',
  efforts: ['low', 'medium', 'high'],
}

/** The choice of `model` at `effort`, with fast mode as `fast`. */
function at(model: AgentModel, effort: Effort, fast = false): AgentChoice {
  return { agent: model.agent, model: model.model, effort, fast }
}

describe('the favourite that a pick in Add a favourite adds', () => {
  test('takes the effort of the default of new workspaces or the nearest lower one, then the free efforts below it, nearest first, then those above it, with fast mode off, and is null when no effort is free', () => {
    expect({
      free: addedFavourite(opus, [at(sonnet, 'high')], 'high'),
      lowerOfModel: addedFavourite(fable, [], 'max'),
      lowestOfModel: addedFavourite(sonnet, [], 'none'),
      nearestLower: addedFavourite(opus, [at(opus, 'high')], 'high'),
      lowerBeforeHigher: addedFavourite(
        opus,
        [at(opus, 'high'), at(opus, 'medium')],
        'high',
      ),
      nearestHigher: addedFavourite(
        opus,
        [at(opus, 'low'), at(opus, 'medium'), at(opus, 'high')],
        'high',
      ),
      fastLeavesFree: addedFavourite(opus, [at(opus, 'high', true)], 'high'),
      fastOfModelWithout: addedFavourite(
        sonnet,
        [at(sonnet, 'high', true)],
        'high',
      ),
      noneFree: addedFavourite(
        fable,
        [at(fable, 'low'), at(fable, 'medium'), at(fable, 'high')],
        'high',
      ),
    }).toEqual({
      free: at(opus, 'high'),
      lowerOfModel: at(fable, 'high'),
      lowestOfModel: at(sonnet, 'low'),
      nearestLower: at(opus, 'medium'),
      lowerBeforeHigher: at(opus, 'low'),
      nearestHigher: at(opus, 'xhigh'),
      fastLeavesFree: at(opus, 'high'),
      fastOfModelWithout: at(sonnet, 'medium'),
      noneFree: null,
    })
  })
})
