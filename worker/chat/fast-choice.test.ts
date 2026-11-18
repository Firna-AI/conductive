import { expect, it } from 'vitest'

import {
  readChoice as readAppChoice,
  readModel,
} from '../../src/app/api/read-core'
import { readChoice as readChatChoice } from '../../src/chat/api/read-chat'
import { choice } from './inputs'
import { configuredDefaultChoice, configuredModels } from '../app-api/models'

const base = {
  agent: 'claude',
  model: 'fast-model',
  effort: 'high',
  fast: false,
}

it('keeps explicit fast mode and defaults old choices to standard speed', () => {
  for (const read of [choice, readAppChoice, readChatChoice]) {
    expect(read({ ...base, fast: true })).toEqual({ ...base, fast: true })
    expect(read(base)).toEqual({ ...base, fast: false })
  }
})

it('keeps model fast marks while the app default stays at standard speed', () => {
  const model = {
    agent: 'claude',
    model: 'fast-model',
    label: 'Fast model',
    efforts: ['high'],
    fast: true,
  }
  const env = {
    CONDUCTIVE_MODELS: JSON.stringify([model]),
    CONDUCTIVE_DEFAULT_CHOICE: JSON.stringify({ ...base, fast: true }),
  }
  expect(configuredModels(env)).toEqual([model])
  expect(readModel(model)).toEqual(model)
  expect(configuredDefaultChoice(env)).toEqual({ ...base, fast: false })
})
