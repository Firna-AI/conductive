import { agents, type AgentKey } from '../../fixtures/agents'
import type { EndpointLogin } from '../../fixtures/logins'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { loginLabels } from '../../../../../src/ui/components/settings/agentConnectCopy'
import type { LoginOwner } from '../../../../../src/ui/components/settings/EndpointModels'
import { endpointModels } from '../../entries/components/settings/EndpointModels.mockup'
import {
  endpointAddressNote,
  endpointReadFailed,
} from '../../entries/components/settings/EndpointRead.mockup'
import { endpointReadCopy as copy } from '../../../../../src/ui/components/settings/endpointReadCopy'
import { loginEndpoint } from '../../entries/components/settings/LoginEndpoint.mockup'
import { defined } from '../../defined'

/**
 * The lines under the row of an own endpoint login: its kind with the host
 * of its endpoint, the note after a save that added `/v1` to the address,
 * the warning after a model list read that failed, and the models of the
 * app that the last list leaves out. The row has one Refresh, which reads
 * the list again: beside the warning after a read that failed, or else
 * beside the models.
 *
 * The Agents tab of the org settings draws an org endpoint with the same
 * lines, from a design call of 17 November 2026 in the org logins plan.
 * There `owner` is `org`, so the model line names the pickers on the
 * login. `readOnly` shows only the kind and the host, to a person who
 * cannot change the login, such as a member who is not an admin. The note
 * and the warning answer a save or a Refresh, which only an admin makes,
 * and only an admin sees the model list and Refresh.
 */
export function EndpointDetails(props: {
  agent: AgentKey
  login: EndpointLogin
  owner?: LoginOwner
  readOnly?: boolean
}) {
  const { login } = props
  const endpoint = (
    <loginEndpoint.Component
      host={login.host}
      kind={loginLabels[props.agent].endpoint}
      moklyInstance="endpoint"
    />
  )
  if (props.readOnly) return endpoint
  const refresh = (
    <actionButton.Component
      accessibilityLabel={copy.refreshLabel(agents[props.agent].name)}
      icon="refresh-cw"
      moklyInstance={`refresh-${props.agent}`}
    >
      {copy.refresh}
    </actionButton.Component>
  )
  return (
    <>
      {endpoint}
      {login.addedV1 ? (
        <endpointAddressNote.Component moklyInstance="address-note" />
      ) : null}
      {login.readFailed ? (
        <endpointReadFailed.Component
          moklyInstance="read-failed"
          refresh={refresh}
        />
      ) : null}
      {login.models ? (
        <endpointModels.Component
          check={login.models}
          moklyInstance="models"
          {...defined({
            owner: props.owner,
            refresh: login.readFailed ? undefined : refresh,
          })}
        />
      ) : null}
    </>
  )
}
