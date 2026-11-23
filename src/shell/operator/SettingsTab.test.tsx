// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  operatorIdleStopPath,
  type IdleStopMinutes,
  type OperatorIdleStopResponse,
} from '../../shared/operator-idle-stop'
import { accessibleName, byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { serveOperator } from '../../test-support/operator'
import { click, settle } from '../test-mount'
import { isOff } from '../workspace/kept-test-kit'
import { boxText, mountShell, operatorRequests } from './operator-test-kit'
import { CHANGED_AT, changed, failure } from './providers-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const path = operatorIdleStopPath()
const intro =
  'Stop time A cloud computer stops after this time without activity, unless an agent is at work. A running computer takes a new time at its next activity, or when its current time ends.'

function reply(
  minutes: IdleStopMinutes,
  at: number | null = null,
): OperatorIdleStopResponse {
  return {
    minutes,
    updatedAt: at,
    operator: at === null ? null : sampleOperator,
  }
}

/** The options of the stop time, with the chosen one marked. */
function choiceOf(view: HTMLElement): string[] {
  const group = byRole('radiogroup', 'Stop time of idle cloud computers', view)
  return Array.from(group.querySelectorAll('[role="radio"]'), (radio) =>
    radio.getAttribute('aria-checked') === 'true'
      ? `${accessibleName(radio)} (chosen)`
      : accessibleName(radio),
  )
}

function save(view: HTMLElement): HTMLElement {
  return byRole('button', 'Save stop time', view)
}

/** Whether Save stop time is off, also when it keeps its focus. */
function saveOff(view: HTMLElement): boolean {
  return (
    isOff(save(view)) || save(view).closest('[aria-disabled="true"]') !== null
  )
}

async function openSettings(first: OperatorIdleStopResponse) {
  const server = new FakeApiServer()
  serveOperator(server)
  server.json('GET', path, first)
  const shell = await mountShell(server, routes.operatorSettings())
  return { server, ...shell }
}

describe('the Settings tab of the operator section', () => {
  test('shows the saved stop time, saves another choice, and shows the saved change', async () => {
    const { server, view } = await openSettings(reply(30))
    const shown = { choice: choiceOf(view), saveOff: saveOff(view) }
    click(byRole('radio', '1.5 hours', view))
    const picked = { choice: choiceOf(view), saveOff: saveOff(view) }
    server.json('PUT', path, reply(90, CHANGED_AT))
    click(save(view))
    await settle()
    expect({
      shown,
      picked,
      saved: { box: boxText(view, 'Stop time'), saveOff: saveOff(view) },
      requests: await operatorRequests(server),
    }).toEqual({
      shown: {
        choice: ['15 min', '30 min (chosen)', '1 hour', '1.5 hours', '2 hours'],
        saveOff: true,
      },
      picked: {
        choice: ['15 min', '30 min', '1 hour', '1.5 hours (chosen)', '2 hours'],
        saveOff: false,
      },
      saved: {
        box: `${intro} Stop time of idle cloud computers 15 min 30 min 1 hour 1.5 hours 2 hours ${changed} Save stop time`,
        saveOff: true,
      },
      requests: [`GET ${path}`, `PUT ${path} {"minutes":90}`],
    })
  })

  test('a failed save keeps the chosen time, with its error, and Save stop time tries again', async () => {
    const { server, view } = await openSettings(reply(30))
    server.json('PUT', path, failure, 500)
    click(byRole('radio', '2 hours', view))
    click(save(view))
    await settle()
    const failed = {
      choice: choiceOf(view),
      box: boxText(view, 'Stop time'),
      saveOff: saveOff(view),
    }
    server.json('PUT', path, reply(120, CHANGED_AT))
    click(save(view))
    await settle()
    expect({
      failed,
      saved: choiceOf(view),
      requests: await operatorRequests(server),
    }).toEqual({
      failed: {
        choice: ['15 min', '30 min', '1 hour', '1.5 hours', '2 hours (chosen)'],
        box: `${intro} Stop time of idle cloud computers 15 min 30 min 1 hour 1.5 hours 2 hours The stop time wasn't saved. Try again. Save stop time`,
        saveOff: false,
      },
      saved: ['15 min', '30 min', '1 hour', '1.5 hours', '2 hours (chosen)'],
      requests: [
        `GET ${path}`,
        `PUT ${path} {"minutes":120}`,
        `PUT ${path} {"minutes":120}`,
      ],
    })
  })
})
