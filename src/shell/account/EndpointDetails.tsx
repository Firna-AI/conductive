import { useEffect, useRef, type RefObject } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  EndpointAddressNote,
  EndpointReadFailed,
} from '../../../docs/mockups/src/components/settings/EndpointRead'
import { endpointReadCopy as copy } from '../../../docs/mockups/src/components/settings/endpointReadCopy'
import { LoginEndpoint } from '../../../docs/mockups/src/components/settings/LoginEndpoint'
import { unlistedModels } from '../../app/endpoint-models'
import { endpointReadOf } from '../../app/endpoint-reads'
import { useStore } from '../../app/store'
import type { AgentLoginStatus } from '../../shared/account'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { EndpointModels } from './EndpointModels'
import { agentNames, loginLabels } from './labels'

/** A connected own endpoint login of the account. */
type EndpointLogin = Extract<AgentLoginStatus, { kind: 'endpoint' }>

/** Where the one Refresh of a row shows: beside the warning, or the models. */
type RefreshPlace = 'warning' | 'models' | null

/**
 * Gives the focus to Refresh when it moves to the other line of its row,
 * after a read that failed or a read that worked, so that the keyboard
 * keeps its place. The focus moves only from nowhere, as when the button
 * that the user pressed leaves, so a control elsewhere keeps the focus.
 */
function useRefreshFocus(
  place: RefreshPlace,
  button: RefObject<HTMLElement | null>,
): void {
  const last = useRef(place)
  useEffect(() => {
    const moved =
      last.current !== null && place !== null && place !== last.current
    last.current = place
    const active = document.activeElement
    if (moved && (active === null || active === document.body))
      button.current?.focus({ preventScroll: true })
  }, [place, button])
}

/**
 * The lines under the row of an own endpoint login, as the mockup part
 * `EndpointDetails` draws them: its kind with the host of its endpoint, the
 * note after a save that added `/v1` to the address, the warning after a
 * save or a Refresh that read no model list, and the models of the app that
 * the last list leaves out. The note and the warning come from the answers
 * that the account model keeps. The row has one Refresh, which reads the
 * list again: beside the warning, or else beside the models.
 */
export function EndpointDetails(props: { login: EndpointLogin }) {
  const { login } = props
  const app = useApp()
  const models = useStore(app.models)
  const reads = useStore(app.account.endpointReads)
  const read = endpointReadOf(reads, login)
  const name = agentNames[login.agent]
  const refresh = useAction(
    () => app.account.refreshModels(login.agent),
    `The model list of ${name} wasn't refreshed.`,
  )
  const button = useRef<HTMLElement | null>(null)
  const unlisted = unlistedModels(models, login)
  useRefreshFocus(
    read.readFailed ? 'warning' : unlisted ? 'models' : null,
    button,
  )
  const refreshButton = (
    <ActionButton
      accessibilityLabel={copy.refreshLabel(name)}
      busy={refresh.pending}
      buttonRef={(element: unknown) => {
        button.current = element instanceof HTMLElement ? element : null
      }}
      icon={RefreshCw}
      onPress={refresh.run}
    >
      {copy.refresh}
    </ActionButton>
  )
  return (
    <>
      <LoginEndpoint
        host={login.host}
        kind={loginLabels[login.agent].endpoint}
      />
      {read.addedV1 ? <EndpointAddressNote /> : null}
      {read.readFailed ? <EndpointReadFailed refresh={refreshButton} /> : null}
      {unlisted ? (
        <EndpointModels
          refresh={read.readFailed ? null : refreshButton}
          unlisted={unlisted}
        />
      ) : null}
    </>
  )
}
