// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { orgSuspensionPath } from '../../shared/operator'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, press, settle } from '../test-mount'
import { mountShell } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** A press of the pointer outside the question, as on its dim area. */
function pressOutside(): void {
  act(() => {
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    )
  })
}

/** Whether a person can press the button: it is not disabled. */
function enabled(button: HTMLElement): boolean {
  return (
    !button.hasAttribute('disabled') &&
    button.getAttribute('aria-disabled') !== 'true'
  )
}

const questions = [
  {
    action: 'Suspend org',
    method: 'POST',
    orgId: SAMPLE_IDS.activeOrg,
    title: 'Suspend Northwind?',
    failure: "Northwind wasn't suspended",
  },
  {
    action: 'Lift suspension',
    method: 'DELETE',
    orgId: SAMPLE_IDS.suspendedOrg,
    title: 'Lift the suspension of Hexwave?',
    failure: "The suspension of Hexwave wasn't lifted",
  },
] as const

const cases = questions.flatMap((question) =>
  (['desktop', 'phone'] as const).map((viewport) => ({
    ...question,
    viewport,
  })),
)

describe('the questions of Suspend and Lift', () => {
  test.each(cases)(
    '$action keeps its question open on a $viewport while its write runs, and then shows its failure there',
    async (row) => {
      const server = new FakeApiServer()
      serveOperator(server)
      const path = orgSuspensionPath(row.orgId)
      const failed = {
        error: { code: 'internal_error', message: 'The request failed.' },
      }
      server.json(row.method, path, failed, 500)
      const held = new HeldRequests(server)
      held.hold(row.method, path)
      await mountShell(server, routes.operatorOrg(row.orgId), {
        viewport: row.viewport,
        services: { fetch: held.fetch },
      })
      click(byRole('button', row.action))
      const question = byRole('dialog', row.title)
      click(byRole('button', row.action, question))
      await settle()
      const cancel = byRole('button', 'Cancel', question)
      const running = { cancel: enabled(cancel) }
      click(cancel)
      press(question, 'Escape')
      pressOutside()
      await settle()
      const open = queryByRole('dialog', row.title) === question
      held.release(row.method, path)
      await settle()
      const shown = queryByText(row.failure, question) !== null
      click(queryByRole('button', 'Cancel', question) ?? question)
      await settle()
      expect({
        running,
        open,
        shown,
        closed: queryByRole('dialog', row.title),
      }).toEqual({
        running: { cancel: false },
        open: true,
        shown: true,
        closed: null,
      })
    },
  )
})
