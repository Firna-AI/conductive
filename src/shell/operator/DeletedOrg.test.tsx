// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { operatorOrgPath } from '../../shared/operator'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click } from '../test-mount'
import { textOf } from '../test-render'
import { mountShell } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** Pinecrest, which an admin deleted 3 days ago, with its first read. */
async function openPinecrest(suspended: boolean) {
  const server = new FakeApiServer()
  const fixtures = serveOperator(server)
  const id = SAMPLE_IDS.deletedOrg
  const org = fixtures.orgs.find((item) => item.id === id)
  if (!org) throw new Error('The samples have no Pinecrest.')
  if (suspended) {
    server.json('GET', operatorOrgPath(id), {
      ...org,
      suspension: {
        suspendedAt: FAKE_TIME - 25 * 60_000,
        operator: sampleOperator,
      },
    })
  }
  return mountShell(server, routes.operatorOrg(id))
}

/** The tabs of the section, which come before the notices of a page. */
const tabs = 'Overview Orgs Users Waitlist Invite codes'

/** The text of the notices at the top of the page, before its details. */
function notices(text: string): string {
  const start = text.indexOf(tabs) + tabs.length
  return text.slice(start, text.indexOf('Details')).trim()
}

describe('the questions and the notices of a deleted org', () => {
  test('Suspend says that no admin can restore the org while it is suspended, and claims nothing that its members can open', async () => {
    const { text } = await openPinecrest(false)
    click(byRole('button', 'Suspend org'))
    const question = byRole('dialog', 'Suspend Pinecrest?')
    expect({
      notices: notices(text()),
      question: textOf(question.innerHTML),
    }).toEqual({
      notices:
        'Deleted on 12 Jan Everything of Pinecrest is deleted on 19 Jan, unless an admin restores it.',
      question:
        'Suspend Pinecrest? Every cloud computer and build of Pinecrest stops now. Each unfinished build of Pinecrest fails, and a lift does not bring it back. No admin can restore Pinecrest while it is suspended, and everything of it is deleted on 19 Jan. Cancel Suspend org',
    })
  })

  test('a suspended deleted org claims nothing that its members can open, needs a lift before a restore, and its Lift says that it stays deleted', async () => {
    const { text } = await openPinecrest(true)
    const shown = notices(text())
    click(byRole('button', 'Lift suspension'))
    const question = byRole('dialog', 'Lift the suspension of Pinecrest?')
    expect({
      notices: shown,
      question: textOf(question.innerHTML),
    }).toEqual({
      notices:
        'Suspended on 15 Jan at 07:35 by @calummoore Deleted on 12 Jan Everything of Pinecrest is deleted on 19 Jan. No admin can restore it before a lift.',
      question:
        'Lift the suspension of Pinecrest? Pinecrest stays deleted. An admin can restore it until everything of it is deleted on 19 Jan. A workspace that stopped 14 days ago or more may have lost its files. Cancel Lift suspension',
    })
  })
})
