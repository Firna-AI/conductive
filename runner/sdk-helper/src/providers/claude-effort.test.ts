import { expect, it } from 'vitest'

import { claudeEffortSettings, claudeStartOptions } from './claude-effort'

it('starts Ultra at the max level with Ultracode on', () => {
  expect(claudeStartOptions('ultra')).toEqual({
    effort: 'max',
    settings: { ultracode: true },
  })
  expect(claudeStartOptions('max')).toEqual({ effort: 'max' })
  expect(claudeStartOptions('none')).toEqual({
    thinking: { type: 'disabled' },
  })
})

it('names Ultracode in each effort change', () => {
  expect(claudeEffortSettings('ultra')).toEqual({
    effortLevel: 'max',
    ultracode: true,
  })
  expect(claudeEffortSettings('max')).toEqual({
    effortLevel: 'max',
    ultracode: false,
  })
  expect(claudeEffortSettings('none')).toEqual({
    effortLevel: null,
    ultracode: false,
  })
})
