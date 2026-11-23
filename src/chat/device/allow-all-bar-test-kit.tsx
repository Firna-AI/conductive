import { useState } from 'react'
import { createApiClient } from '../../app/api/client'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import type { Clock } from '../ui/clock'
import { AllowAllBar } from './AllowAllBar'
import { useMacSettings, type MacSettingsController } from './mac-settings'

/** The accessible name of the bar. */
export const BAR = 'Commands that run without asking'

/**
 * The bar with the settings controller of the window, as the app gives it.
 * `found` gets the controller, which reads the settings again as the app
 * does after an answer. A new `barKey` mounts a new bar on the same
 * controller, as a return to the workspace does.
 */
export function Bar(props: {
  fetch: FakeApiServer['fetch']
  clock: Clock
  found?: (controller: MacSettingsController) => void
  barKey?: string
}) {
  const [client] = useState(() => createApiClient(props.fetch))
  const { controller, state } = useMacSettings(client, props.clock)
  props.found?.(controller)
  return (
    <AllowAllBar
      key={props.barKey}
      clock={props.clock}
      controller={controller}
      state={state}
      workspaceId={FAKE_IDS.workspace}
    />
  )
}
