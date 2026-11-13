import { expect, it } from 'vitest'

import { HttpError } from '../http'
import { approvalAction } from './broker-routes'

it('accepts each approval choice of a Mac command, including until Stop', () => {
  for (const action of [
    'deny',
    'allow',
    'always-allow',
    'allow-workspace-15-minutes',
    'allow-workspace-until-stop',
  ])
    expect(approvalAction(action)).toBe(action)
  expect(() => approvalAction('allow-workspace-forever')).toThrow(HttpError)
})
