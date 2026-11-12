// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle, typeText } from '../test-mount'
import { isOff } from '../workspace/kept-test-kit'
import { boxText, mountShell, operatorRequests } from './operator-test-kit'
import {
  CHANGED_AT,
  changed,
  controls,
  failure,
  intro,
  openProviders,
  providersPath,
  reply,
} from './providers-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the Providers tab of the operator section', () => {
  test('shows the weights and the counts of the reply, saves a slider move for both accounts, ignores Save weights while unchanged or saving, and shows the saved change', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json(
      'GET',
      providersPath,
      reply([
        ['boat', 100, 13],
        ['e2b', 0, 1],
      ]),
    )
    server.json(
      'PUT',
      providersPath,
      reply(
        [
          ['boat', 90, 13],
          ['e2b', 10, 1],
        ],
        CHANGED_AT,
      ),
    )
    const held = new HeldRequests(server)
    held.hold('PUT', providersPath)
    const { view } = await mountShell(server, routes.operatorProviders(), {
      services: { fetch: held.fetch },
    })
    const shown = {
      box: boxText(view, 'New orgs'),
      counts: boxText(view, 'Orgs by account'),
      saveOff: isOff(controls(view).save),
    }
    typeText(controls(view).weights, '90')
    const moved = {
      box: boxText(view, 'New orgs'),
      saveOff: isOff(controls(view).save),
    }
    click(controls(view).save)
    await settle()
    click(controls(view).save)
    await settle()
    const saving = {
      busy: controls(view).save.getAttribute('aria-busy'),
      sliderOff: isOff(controls(view).weights),
    }
    held.release('PUT', providersPath)
    await settle()
    expect({
      shown,
      moved,
      saving,
      saved: {
        box: boxText(view, 'New orgs'),
        saveOff: isOff(controls(view).save),
      },
      requests: await operatorRequests(server),
    }).toEqual({
      shown: {
        box: `${intro} boat 100% e2b 0% Save weights`,
        counts: 'Orgs by account boat 13 e2b 1',
        saveOff: true,
      },
      moved: { box: `${intro} boat 90% e2b 10% Save weights`, saveOff: false },
      saving: { busy: 'true', sliderOff: true },
      saved: {
        box: `${intro} boat 90% e2b 10% ${changed} Save weights`,
        saveOff: true,
      },
      requests: [
        `GET ${providersPath}`,
        `PUT ${providersPath} {"weights":{"boat":90,"e2b":10}}`,
      ],
    })
  })

  test('a failed save keeps the weights that the operator chose, with its error, and Save weights tries again', async () => {
    const { server, view } = await openProviders(
      reply([
        ['boat', 100, 13],
        ['e2b', 0, 1],
      ]),
    )
    server.json('PUT', providersPath, failure, 500)
    typeText(controls(view).weights, '90')
    click(controls(view).save)
    await settle()
    const failed = {
      box: boxText(view, 'New orgs'),
      saveOff: isOff(controls(view).save),
    }
    server.json(
      'PUT',
      providersPath,
      reply(
        [
          ['boat', 90, 13],
          ['e2b', 10, 1],
        ],
        CHANGED_AT,
      ),
    )
    click(controls(view).save)
    await settle()
    const body = '{"weights":{"boat":90,"e2b":10}}'
    expect({
      failed,
      saved: boxText(view, 'New orgs'),
      requests: await operatorRequests(server),
    }).toEqual({
      failed: {
        box: `${intro} boat 90% e2b 10% The weights weren't saved. Try again. Save weights`,
        saveOff: false,
      },
      saved: `${intro} boat 90% e2b 10% ${changed} Save weights`,
      requests: [
        `GET ${providersPath}`,
        `PUT ${providersPath} ${body}`,
        `PUT ${providersPath} ${body}`,
      ],
    })
  })
})
