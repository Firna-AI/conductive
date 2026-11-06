import { useId } from 'react'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import { terminalPaths } from '../../shared/terminal'
import {
  devStates,
  devTools,
  emitDevEvent,
  sandboxReadyEvent,
} from './devServer'
import { devHref, go, type DevParams } from './devParams'
import styles from './ToolsDevPage.module.css'

const otherWorkspace = 'saved-carts'

function Choice(props: {
  label: string
  value: string
  values: readonly string[]
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <span className={styles.choice}>
      <label htmlFor={id}>{props.label}</label>
      <select
        id={id}
        onChange={(event) => props.onChange(event.target.value)}
        value={props.value}
      >
        {props.values.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </span>
  )
}

/**
 * The controls of the development page: the tool, its state, the layout, and
 * the scheme, and the events that the fake backend can send.
 */
export function DevControls(props: {
  params: DevParams
  server: FakeApiServer
  onDisconnect: () => void
}) {
  const { params, server } = props
  const change = (key: keyof DevParams, value: string | null) =>
    go(devHref(params, { [key]: value }))
  const revoke = (workspaceId: string) =>
    emitDevEvent(server, workspaceId, {
      type: 'preview.revoked',
      previewId: params.preview ?? FAKE_IDS.preview,
    })
  const startSandbox = () => {
    const terminal = terminalPaths.connection(FAKE_IDS.org, FAKE_IDS.workspace)
    server.json('GET', terminal, toolFixtures().terminal)
    emitDevEvent(server, params.workspace, sandboxReadyEvent())
  }
  return (
    <div className={styles.controls}>
      <Choice
        label="Tool"
        onChange={(tool) => go(devHref(params, { tool, state: null }))}
        value={params.tool}
        values={devTools}
      />
      <Choice
        label="State"
        onChange={(state) => change('state', state)}
        value={params.state}
        values={devStates[params.tool]}
      />
      <Choice
        label="Layout"
        onChange={(layout) => change('layout', layout)}
        value={params.layout}
        values={['panel', 'phone']}
      />
      <Choice
        label="Scheme"
        onChange={(scheme) => change('scheme', scheme)}
        value={params.scheme}
        values={['dark', 'light']}
      />
      <button onClick={() => revoke(params.workspace)} type="button">
        Revoke preview
      </button>
      <button onClick={() => revoke(otherWorkspace)} type="button">
        Revoke in another workspace
      </button>
      <button onClick={startSandbox} type="button">
        Start the sandbox
      </button>
      <button onClick={props.onDisconnect} type="button">
        Disconnect terminal
      </button>
      <button
        onClick={() =>
          change(
            'workspace',
            params.workspace === otherWorkspace
              ? FAKE_IDS.workspace
              : otherWorkspace,
          )
        }
        type="button"
      >
        Switch workspace
      </button>
    </div>
  )
}
