import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { createApiClient } from '../../app/api/client'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { fakeMacSettings } from '../../test-support/fixtures/devices'
import { textOf } from '../components/render-kit'
import { MacSettingsController } from './mac-settings'
import { SavedChoices } from './SavedChoices'
import { subjectOf } from './settings-results'
import { createDeviceApi } from './device-api'

it('names an untitled workspace in This Mac and its Stop result', () => {
  const settings = {
    ...fakeMacSettings(),
    workspaceWindows: [
      {
        workspaceId: 'untitled',
        workspaceName: null,
        expiresAt: FAKE_TIME + 60_000,
      },
    ],
  }
  const controller = new MacSettingsController(
    createDeviceApi(createApiClient(new FakeApiServer({ onMac: true }).fetch)),
  )
  const markup = renderToStaticMarkup(
    <SavedChoices
      settings={settings}
      busy={[]}
      now={FAKE_TIME}
      controller={controller}
    />,
  )
  expect(textOf(markup)).toContain('Untitled')
  expect(markup).toContain('aria-label="Stop Untitled"')
  expect(
    subjectOf(
      { action: 'stop-workspace', workspaceId: 'untitled' },
      settings,
      undefined,
    ),
  ).toBe('Untitled')
})

it('lists a grant until Stop beside the 15 minutes, with Stop', () => {
  const settings = {
    ...fakeMacSettings(),
    workspaceWindows: [
      {
        workspaceId: 'timed',
        workspaceName: 'Timed',
        expiresAt: FAKE_TIME + 60_000,
      },
      { workspaceId: 'open', workspaceName: 'Open', expiresAt: null },
    ],
  }
  const controller = new MacSettingsController(
    createDeviceApi(createApiClient(new FakeApiServer({ onMac: true }).fetch)),
  )
  const markup = renderToStaticMarkup(
    <SavedChoices
      settings={settings}
      busy={[]}
      now={FAKE_TIME + 120_000}
      controller={controller}
    />,
  )
  expect(textOf(markup)).toContain('All commands allowed')
  expect(textOf(markup)).toContain('Open Until you stop Stop')
  expect(markup).not.toContain('aria-label="Stop Timed"')
})
