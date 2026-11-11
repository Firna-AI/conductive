import {
  operatorSignupPausePath,
  operatorWaitlistSwitchPath,
  type OperatorWaitlistSwitch,
} from '../../shared/operator-waitlist'
import { sampleWaitlist } from '../../test-support/fixtures/operator-access'
import type { OperatorRouteKit } from './operator-waitlist-routes'
import { json, type Route } from './router'

/**
 * The two controls of sign-ups in the dev fake: the pause, and the
 * waitlist switch. Each change keeps the time and the operator of the
 * request, and a repeat changes nothing, as the Worker does. The switch
 * counts the people who wait as the Waitlist tab lists them. The waitlist
 * routes of the person signed in read the same records.
 */
export function signupRoutes(kit: OperatorRouteKit): Route[] {
  const { backend, base, guard, operator } = kit
  const records = () => backend.state.operator
  const changePause = (paused: boolean) => {
    guard()
    if (records().pause.paused !== paused) {
      records().pause = {
        paused,
        updatedAt: backend.now(),
        operator: operator(),
      }
    }
    return json(records().pause)
  }
  const waitlistSwitch = (): OperatorWaitlistSwitch => {
    const { userSuspensions } = records()
    const waiting = sampleWaitlist(records(), userSuspensions, base).length
    return { ...records().waitlistSwitch, waiting }
  }
  const changeSwitch = (waitlistOn: boolean) => {
    guard()
    if (records().waitlistSwitch.waitlistOn !== waitlistOn) {
      records().waitlistSwitch = {
        waitlistOn,
        updatedAt: backend.now(),
        operator: operator(),
      }
    }
    return json(waitlistSwitch())
  }
  return [
    {
      method: 'GET',
      path: operatorSignupPausePath(),
      answer: () => {
        guard()
        return json(records().pause)
      },
    },
    {
      method: 'POST',
      path: operatorSignupPausePath(),
      answer: () => changePause(true),
    },
    {
      method: 'DELETE',
      path: operatorSignupPausePath(),
      answer: () => changePause(false),
    },
    {
      method: 'GET',
      path: operatorWaitlistSwitchPath(),
      answer: () => {
        guard()
        return json(waitlistSwitch())
      },
    },
    {
      method: 'POST',
      path: operatorWaitlistSwitchPath(),
      answer: () => changeSwitch(true),
    },
    {
      method: 'DELETE',
      path: operatorWaitlistSwitchPath(),
      answer: () => changeSwitch(false),
    },
  ]
}
