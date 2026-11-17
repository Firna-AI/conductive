import { agents, type AgentKey } from '../../fixtures/agents'
import { loginLabels, type EndpointLogin } from '../../fixtures/logins'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { endpointModels } from '../../entries/components/settings/EndpointModels.mockup'
import {
  endpointAddressNote,
  endpointReadFailed,
} from '../../entries/components/settings/EndpointRead.mockup'
import { endpointReadCopy as copy } from './endpointReadCopy'
import { loginEndpoint } from '../../entries/components/settings/LoginEndpoint.mockup'
import { defined } from '../../defined'

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
      <loginEndpoint.Component
        host={login.host}
        kind={loginLabels[props.agent].endpoint}
        moklyInstance="endpoint"
      />
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
          {...defined({ refresh: login.readFailed ? undefined : refresh })}
        />
      ) : null}
    </>
  )
}
