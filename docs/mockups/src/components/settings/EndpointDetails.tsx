import { RefreshCw } from 'lucide-react'
import { agents, type AgentKey } from '../../fixtures/agents'
import { loginLabels, type EndpointLogin } from '../../fixtures/logins'
import { ActionButton } from '../common/actions'
import { EndpointModels, type LoginOwner } from './EndpointModels'
import { EndpointAddressNote, EndpointReadFailed } from './EndpointRead'
import { endpointReadCopy as copy } from './endpointReadCopy'
import { LoginEndpoint } from './LoginEndpoint'

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
    <LoginEndpoint host={login.host} kind={loginLabels[props.agent].endpoint} />
  )
  if (props.readOnly) return endpoint
  const refresh = (
    <ActionButton
      accessibilityLabel={copy.refreshLabel(agents[props.agent].name)}
      icon={RefreshCw}
    >
      {copy.refresh}
    </ActionButton>
  )
  return (
    <>
      {endpoint}
      {login.addedV1 ? <EndpointAddressNote /> : null}
      {login.readFailed ? <EndpointReadFailed refresh={refresh} /> : null}
      {login.models ? (
        <EndpointModels
          check={login.models}
          owner={props.owner}
          refresh={login.readFailed ? null : refresh}
        />
      ) : null}
    </>
  )
}
