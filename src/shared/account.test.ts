import { expect, test } from 'vitest'

import { defaultAgentLoginNoReuse } from './account'

test.each([
  { agent: 'claude', kind: 'token', noReuse: true },
  { agent: 'claude', kind: 'api-key', noReuse: false },
  { agent: 'codex', kind: 'token', noReuse: true },
  { agent: 'codex', kind: 'api-key', noReuse: false },
] as const)(
  '$agent $kind starts with noReuse $noReuse',
  ({ agent, kind, noReuse }) => {
    expect(defaultAgentLoginNoReuse(agent, kind)).toBe(noReuse)
  },
)
