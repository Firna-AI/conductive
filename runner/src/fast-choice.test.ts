import { expect, it } from 'vitest'

import { parseChoice } from './commands'

it('reads fast in runner choices and gives older commands standard speed', () => {
  const selected = { agent: 'codex', model: 'model', effort: 'high' }
  expect(parseChoice({ ...selected, fast: true })).toEqual({
    ...selected,
    fast: true,
  })
  expect(parseChoice(selected)).toEqual({ ...selected, fast: false })
})
