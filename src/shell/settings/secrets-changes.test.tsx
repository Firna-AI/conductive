// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { secretAllAgentsPath, secretPath } from '../../shared/secrets'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle, typeText } from '../test-mount'
import {
  listPath,
  mountSecrets,
  rowsOf,
  secretNamed,
  secretsServer,
  sentBodies,
} from './secrets-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const org = FAKE_IDS.org
const vercel = secretNamed('VERCEL_TOKEN')
const figma = secretNamed('FIGMA_TOKEN')

function field(view: HTMLElement, name: string): HTMLInputElement {
  const found = byRole('textbox', name, view)
  if (!(found instanceof HTMLInputElement)) {
    throw new Error(`${name} is no field.`)
  }
  return found
}

describe('the changes of an admin in the Secrets tab', () => {
  test('Replace sends a new description and keeps the value while the new value stays empty, then sends a typed value alone', async () => {
    const server = secretsServer()
    const view = await mountSecrets(server)
    const path = secretPath(org, vercel.id)
    server.json('PATCH', path, {
      secret: { ...vercel, description: 'Deploys previews.' },
    })
    const replace = 'Replace the description or the value of VERCEL_TOKEN'
    click(byRole('button', replace, view))
    const shown = field(view, 'Description of VERCEL_TOKEN').value
    typeText(field(view, 'Description of VERCEL_TOKEN'), 'Deploys previews.')
    click(byRole('button', 'Save', view))
    await settle()
    const described = rowsOf(view)[3]?.[1]
    click(byRole('button', replace, view))
    typeText(field(view, 'New value of VERCEL_TOKEN'), 'vercel-new-value')
    click(byRole('button', 'Save', view))
    await settle()
    expect({
      shown,
      described,
      open: queryByRole('textbox', 'New value of VERCEL_TOKEN', view),
      sent: await sentBodies(server, 'PATCH', path),
    }).toEqual({
      shown: 'Deploys preview builds to Vercel.',
      described: 'Deploys previews.',
      open: null,
      sent: [
        { description: 'Deploys previews.' },
        { value: 'vercel-new-value' },
      ],
    })
  })

  test('Delete asks first: Cancel keeps the secret, and Delete secret deletes it', async () => {
    const server = secretsServer()
    const view = await mountSecrets(server)
    const path = secretPath(org, vercel.id)
    server.empty('DELETE', path)
    click(byRole('button', 'Delete VERCEL_TOKEN', view))
    await settle()
    // The press asks, and deletes nothing yet.
    expect({
      question: queryByRole('dialog', 'Delete VERCEL_TOKEN?') !== null,
      deleted: (await sentBodies(server, 'DELETE', path)).length,
    }).toEqual({ question: true, deleted: 0 })
    const question = byRole('dialog', 'Delete VERCEL_TOKEN?')
    const asked = queryByText(
      'Agents can no longer use it, and its approvals end in every workspace.',
      question,
    )
    click(byRole('button', 'Cancel', question))
    const kept = (await sentBodies(server, 'DELETE', path)).length
    click(byRole('button', 'Delete VERCEL_TOKEN', view))
    click(
      byRole(
        'button',
        'Delete secret',
        byRole('dialog', 'Delete VERCEL_TOKEN?'),
      ),
    )
    await settle()
    expect({
      asked: asked !== null,
      kept,
      deleted: (await sentBodies(server, 'DELETE', path)).length,
      names: rowsOf(view).map(([name]) => name),
      dialog: queryByRole('dialog', 'Delete VERCEL_TOKEN?'),
    }).toEqual({
      asked: true,
      kept: 0,
      deleted: 1,
      names: ['FIGMA_TOKEN', 'PROD_DATABASE_URL', 'SENTRY_AUTH_TOKEN'],
      dialog: null,
    })
  })

  test('the All agents switch saves the mark of its secret at once', async () => {
    const server = secretsServer()
    const view = await mountSecrets(server)
    const path = secretAllAgentsPath(org, figma.id)
    server.json('PUT', path, { secret: { ...figma, allAgents: true } })
    const mark = () => byRole('switch', 'FIGMA_TOKEN for all agents', view)
    const before = mark().getAttribute('aria-checked')
    click(mark())
    await settle()
    expect({
      before,
      after: mark().getAttribute('aria-checked'),
      sent: await sentBodies(server, 'PUT', path),
    }).toEqual({ before: 'false', after: 'true', sent: [{ allAgents: true }] })
  })

  test('Add secret sends the name, the description, the value, and the mark, and shows the refusal of a name that the org has under the name', async () => {
    const server = secretsServer()
    const view = await mountSecrets(server)
    server.json(
      'POST',
      listPath,
      {
        error: {
          code: 'secret_name_exists',
          message: 'A secret with this name already exists in this org.',
        },
      },
      409,
    )
    click(byRole('button', 'Add secret', view))
    const startsOff = byRole('switch', 'All agents', view).getAttribute(
      'aria-checked',
    )
    typeText(field(view, 'Name'), 'FIGMA_TOKEN')
    typeText(field(view, 'Description'), 'Reads the issues in Linear.')
    typeText(field(view, 'Value'), 'lin_api_4f8Kq2nWx7')
    click(byRole('switch', 'All agents', view))
    click(byRole('button', 'Save secret', view))
    await settle()
    const refused = queryByText(
      'A secret with this name already exists in this org.',
      view,
    )
    const added = {
      ...figma,
      id: 'linear-api-key',
      name: 'LINEAR_API_KEY',
      description: 'Reads the issues in Linear.',
      allAgents: true,
    }
    server.json('POST', listPath, { secret: added }, 201)
    typeText(field(view, 'Name'), ' LINEAR_API_KEY ')
    click(byRole('button', 'Save secret', view))
    await settle()
    expect({
      startsOff,
      refused: refused !== null,
      sent: await sentBodies(server, 'POST', listPath),
      names: rowsOf(view).map(([name]) => name),
      closed: queryByRole('button', 'Save secret', view),
    }).toEqual({
      startsOff: 'false',
      refused: true,
      sent: [
        {
          name: 'FIGMA_TOKEN',
          description: 'Reads the issues in Linear.',
          value: 'lin_api_4f8Kq2nWx7',
          allAgents: true,
        },
        {
          name: 'LINEAR_API_KEY',
          description: 'Reads the issues in Linear.',
          value: 'lin_api_4f8Kq2nWx7',
          allAgents: true,
        },
      ],
      names: [
        'FIGMA_TOKEN',
        'LINEAR_API_KEY',
        'PROD_DATABASE_URL',
        'SENTRY_AUTH_TOKEN',
        'VERCEL_TOKEN',
      ],
      closed: null,
    })
  })
})
