// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle, typeText } from '../test-mount'
import { fieldNamed, isOff } from '../workspace/kept-test-kit'
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

describe('the reads and the accounts of the Providers tab', () => {
  test('shows only a spinner while the accounts load, Try again and no weight when the read fails, and the weights after Try again', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const held = new HeldRequests(server)
    held.hold('GET', providersPath)
    const { view, text } = await mountShell(
      server,
      routes.operatorProviders(),
      { services: { fetch: held.fetch } },
    )
    const loading = text()
    server.json('GET', providersPath, failure, 500)
    held.release('GET', providersPath)
    await settle()
    const failed = text()
    server.json(
      'GET',
      providersPath,
      reply([
        ['boat', 100, 13],
        ['e2b', 0, 1],
      ]),
    )
    click(byRole('button', 'Try again', view))
    await settle()
    const page =
      'AC Acme Alt 1 Alt 1 FX Futex Alt 2 Alt 2 FI Firna Alt 3 Alt 3 Operator C Operator Overview Orgs Users Waitlist Invite codes Providers'
    expect({
      loading,
      failed,
      retried: boxText(view, 'New orgs'),
    }).toEqual({
      loading: page,
      failed: `${page} The provider accounts didn't load The request failed. Try again`,
      retried: `${intro} boat 100% e2b 0% Save weights`,
    })
  })

  test('one account gets every new org with no control, and three accounts get a field each, with a total that Save weights needs at 100%', async () => {
    const single = await openProviders(reply([['boat', 100, 14]]))
    const one = {
      box: boxText(single.view, 'New orgs'),
      save: queryByRole('button', 'Save weights', single.view),
    }
    const { server, view } = await openProviders(
      reply(
        [
          ['boat', 80, 12],
          ['e2b', 10, 1],
          ['e2b-us', 10, 1],
        ],
        CHANGED_AT,
      ),
    )
    server.json(
      'PUT',
      providersPath,
      reply(
        [
          ['boat', 70, 12],
          ['e2b', 10, 1],
          ['e2b-us', 20, 1],
        ],
        FAKE_TIME,
      ),
    )
    const field = (id: string) =>
      fieldNamed(view, `Weight of ${id}, in percent`)
    const fields = `${intro} boat % e2b % e2b-us %`
    typeText(field('e2b-us'), '20')
    const uneven = {
      box: boxText(view, 'New orgs'),
      saveOff: isOff(controls(view).save),
    }
    typeText(field('boat'), '70')
    const even = {
      box: boxText(view, 'New orgs'),
      saveOff: isOff(controls(view).save),
    }
    click(controls(view).save)
    await settle()
    expect({
      one,
      counts: boxText(view, 'Orgs by account'),
      uneven,
      even,
      saved: boxText(view, 'New orgs'),
      requests: await operatorRequests(server),
    }).toEqual({
      one: {
        box: 'New orgs Every new org gets boat , the only account.',
        save: null,
      },
      counts: 'Orgs by account boat 12 e2b 1 e2b-us 1',
      uneven: {
        box: `${fields} Total: 110%. Save weights needs a total of 100%. ${changed} Save weights`,
        saveOff: true,
      },
      even: {
        box: `${fields} Total: 100% ${changed} Save weights`,
        saveOff: false,
      },
      saved: `${fields} Total: 100% Changed on 15 Jan at 08:00 by @calummoore Save weights`,
      requests: [
        `GET ${providersPath}`,
        `PUT ${providersPath} {"weights":{"boat":70,"e2b":10,"e2b-us":20}}`,
      ],
    })
  })
})
