import { RefreshCw } from 'lucide-react'
import { agents, type AgentKey } from '../../fixtures/agents'
import { loginLabels, type EndpointLogin } from '../../fixtures/logins'
import { ActionButton } from '../common/actions'
import { EndpointModels } from './EndpointModels'
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
 */
export function EndpointDetails(props: {
  agent: AgentKey
  login: EndpointLogin
}) {
  const { login } = props
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
      <LoginEndpoint
        host={login.host}
        kind={loginLabels[props.agent].endpoint}
      />
      {login.addedV1 ? <EndpointAddressNote /> : null}
      {login.readFailed ? <EndpointReadFailed refresh={refresh} /> : null}
      {login.models ? (
        <EndpointModels
          check={login.models}
          refresh={login.readFailed ? null : refresh}
        />
      ) : null}
    </>
  )
}
