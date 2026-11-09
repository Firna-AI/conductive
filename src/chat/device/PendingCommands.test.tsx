import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEVICE_CURRENT_PATH, deviceCommandsPath } from '../../shared/device'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  FAKE_PAIRING,
  fakeMacRequest,
  fakeMacRequests,
  type FakeMacScenario,
} from '../../test-support/fixtures/devices'
import { renderChat, textOf } from '../components/render-kit'
import { CommandCard } from './CommandCard'
import { RequestDetails } from './CommandParts'

const commands = deviceCommandsPath(FAKE_IDS.org, FAKE_IDS.workspace)
const ask = '$ npm run test:safari -- checkout'
const count = (text: string, part: string) => text.split(part).length - 1

describe('Mac commands in the chat', () => {
  it('labels an untitled workspace in command details', () => {
    const shown = textOf(
      renderToStaticMarkup(
        <RequestDetails
          mac="This Mac"
          readers={{ viewerId: null, orgName: 'Acme' }}
          request={fakeMacRequest({ workspaceName: null })}
        />,
      ),
    )
    expect(shown).toContain('Workspace Untitled, in Acme')
  })
  it('gives each waiting request Deny and Allow only in the Mac app on the Mac that got it', async () => {
    const mac = await renderChat({
      conversation: 'running',
      macCommands: 'several',
      onMac: true,
    })
    expect(count(mac.markup(), 'aria-label="Run a command on this Mac?"')).toBe(
      2,
    )
    expect(mac.text()).toContain(
      `${ask} Deny Allow This Mac · up to 60 seconds Details`,
    )
    expect(mac.text()).toContain(
      '$ sw_vers Deny Allow This Mac · up to 60 seconds',
    )

    const browser = await renderChat({
      conversation: 'running',
      macCommands: 'waiting',
    })
    expect(browser.text()).toContain(
      `${ask} Waiting for approval Cal's MacBook Pro · up to 60 seconds`,
    )
    expect(browser.text()).not.toContain('Deny')

    const otherConnection = { ...FAKE_PAIRING, connectionId: 'connection-2' }
    const replaced = await renderChat({
      conversation: 'running',
      macCommands: 'waiting',
      onMac: true,
      setup: (server) =>
        server.json('GET', DEVICE_CURRENT_PATH, { device: otherConnection }),
    })
    expect(replaced.text()).toContain(`${ask} Waiting for approval`)
    expect(replaced.text()).not.toContain('Deny')
  })

  it('shows the facts under Details, and the reason of a longer time limit without a click', async () => {
    const { text } = await renderChat({
      conversation: 'running',
      macCommands: 'longer',
      onMac: true,
    })
    expect(text()).toContain(
      'This Mac · up to 10 minutes Details Longer than usual. The whole Safari suite takes about 6 minutes.',
    )
    expect(text()).toContain(
      'Folder ~/code/storefront Reason Run every end-to-end test in Safari before the merge. Workspace Checkout address autocomplete, in Acme Sender Cal (you)',
    )
  })

  it('shows the requests of the shown session only, and an answered one at its place in its turn', async () => {
    const other = await renderChat({
      conversation: 'running',
      macCommands: 'other-session',
      onMac: true,
    })
    expect(other.markup()).not.toContain('npm run test:safari')

    const done = await renderChat({
      conversation: 'history',
      macCommands: 'done',
      onMac: true,
    })
    const text = done.text()
    const card = text.indexOf(
      `Cal's MacBook Pro Done in 16s ${ask} in ~/code/storefront · up to 60 seconds`,
    )
    expect(text.indexOf('1 tool call')).toBeLessThan(card)
    expect(card).toBeGreaterThan(0)
    expect(text.indexOf('4m 12s')).toBeGreaterThan(card)
    expect(text).toContain('2 passed (14.2s)')
    expect(done.markup()).not.toContain('Run a command on this Mac?')
  })

  it('keeps the requests when a read fails, and shows the choices again after Try again', async () => {
    const { chat, text } = await renderChat({
      conversation: 'running',
      macCommands: 'waiting',
      onMac: true,
    })
    const busy = {
      error: { code: 'unavailable', message: 'The service is busy.' },
    }
    chat.server.json('GET', commands, busy, 503)
    await chat.controller.loadDevices()
    expect(text()).toContain('Mac commands did not load Try again')
    expect(text()).toContain(`${ask} Waiting for approval`)

    chat.server.json('GET', commands, { requests: [fakeMacRequest()] })
    await chat.controller.loadDevices()
    expect(text()).not.toContain('Mac commands did not load')
    expect(text()).toContain(`${ask} Deny Allow`)
  })

  it('names the result of each command that has its answer', () => {
    const cases: readonly [FakeMacScenario, string][] = [
      [
        'running',
        `Cal's MacBook Pro Running ${ask} in ~/code/storefront · up to 60 seconds`,
      ],
      [
        'denied',
        'Denied $ npm run test:safari -- checkout in ~/code/storefront · up to 60 seconds You denied it in the Mac app.',
      ],
      ['done', 'Done in 16s $ npm run test:safari -- checkout'],
      ['exit-code', 'Ended with exit code 1 after 16s'],
      [
        'cut',
        '2 passed (14.2s) The output stops at its size limit. The agent got the same part.',
      ],
      ['timed-out', 'Stopped at the time limit'],
      [
        'timed-out',
        'storefront@2.4.0 test:safari It ran for its time limit of 60 seconds.',
      ],
      ['failed', 'Did not finish'],
      ['failed', 'The turn ended before the command finished.'],
      ['unavailable', "Cal's Mac Mac not available"],
      ['unavailable', 'The Mac is asleep, or the Mac app is closed.'],
    ]
    for (const [scenario, expected] of cases) {
      const [request] = fakeMacRequests(scenario)
      const shown = textOf(
        renderToStaticMarkup(
          <CommandCard request={request} viewerId={request.sender.id} />,
        ),
      )
      expect(shown, scenario).toContain(expected)
    }
  })
})
