// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { click, settle, typeText } from '../test-mount'
import {
  controlsOf,
  listPath,
  mountSecrets,
  rowsOf,
  secretNamed,
  secretsServer,
  sentBodies,
} from './secrets-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the Secrets tab of a member who is not an admin', () => {
  test('gives Replace and Delete only on the secrets that the member added, no Reveal, the mark for all agents as words, the record of each reveal, and an Add form without the mark', async () => {
    const server = secretsServer('member')
    const view = await mountSecrets(server)
    const added = {
      ...secretNamed('FIGMA_TOKEN'),
      id: 'linear-api-key',
      name: 'LINEAR_API_KEY',
      description: '',
    }
    server.json('POST', listPath, { secret: added }, 201)
    const controls = controlsOf(view)
    const record = rowsOf(view)[1]?.[2]
    click(byRole('button', 'Add secret', view))
    const markSwitch = queryByRole('switch', 'All agents', view)
    typeText(byRole('textbox', 'Name', view), 'LINEAR_API_KEY')
    click(byRole('button', 'Save secret', view))
    await settle()
    expect({
      controls,
      record,
      words: view
        .querySelector('ul[aria-label="Secrets"]')
        ?.textContent?.includes('All agents'),
      markSwitch,
      sent: await sentBodies(server, 'POST', listPath),
    }).toEqual({
      controls: [
        'Replace the description or the value of FIGMA_TOKEN',
        'Delete FIGMA_TOKEN',
        'Replace the description or the value of VERCEL_TOKEN',
        'Delete VERCEL_TOKEN',
      ],
      record: 'Added by Cal · Revealed by Cal, 13 Jan',
      words: true,
      markSwitch: null,
      sent: [{ name: 'LINEAR_API_KEY', description: '', value: '' }],
    })
  })
})

describe('the Secrets tab of a suspended org', () => {
  test('shows the secrets with no action, also for an admin', async () => {
    const server = secretsServer('admin')
    serveSuspendedAcme(server)
    const view = await mountSecrets(server)
    expect({
      names: rowsOf(view).map(([name]) => name),
      controls: controlsOf(view),
      add: queryByRole('button', 'Add secret', view),
    }).toEqual({
      names: [
        'FIGMA_TOKEN',
        'PROD_DATABASE_URL',
        'SENTRY_AUTH_TOKEN',
        'VERCEL_TOKEN',
      ],
      controls: [],
      add: null,
    })
  })
})
