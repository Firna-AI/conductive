import { defineComponent } from '@mokly/mokly'
import { EndpointModels } from '../../../../../../src/ui/components/settings/EndpointModels'
import { endpointReadCopy as copy } from '../../../../../../src/ui/components/settings/endpointReadCopy'
import { agents } from '../../../fixtures/agents'
import { proxyModelCheck } from '../../../fixtures/endpointModels'
import { actionButton } from '../common/actions.mockup'
import { loginOwnerSchema, modelListCheckSchema } from './loginSchemas'

/**
 * The models of the app that an own endpoint does not list, registered
 * with Mokly. The row supplies its Refresh in the `refresh` slot.
 */
export const endpointModels = defineComponent({
  slug: 'endpoint-models',
  title: 'Endpoint models',
  description:
    'The models of the app that the model list of an own endpoint does not name, under the host of the login: the pickers of the owner hide them, or every picker on an org login, their IDs show as code to copy into the setup of the endpoint, and the time of the last read that worked. The Refresh of the login reads the list again, unless the warning of a failed read holds it. Its own page shows one model that the proxy of Cal leaves out.',
  relatedDocs: ['docs/mockups/own-endpoint-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['check'],
    properties: {
      check: modelListCheckSchema,
      /** Who owns the login: a member, or the org, whose pickers all hide. */
      owner: loginOwnerSchema,
    },
  } as const,
  slots: ['refresh'],
  props: { check: proxyModelCheck },
  render: (props) => (
    <EndpointModels
      check={props.check}
      owner={props.owner}
      refresh={props.refresh}
    />
  ),
  variants: [
    {
      slug: 'refresh',
      title: 'With Refresh',
      description:
        'Two models that the list leaves out, with the Refresh of the login of Claude.',
      props: {
        check: {
          unlisted: [
            ...proxyModelCheck.unlisted,
            { label: 'Sonnet 5.5', id: 'claude-sonnet-5-5' },
          ],
          checked: proxyModelCheck.checked,
        },
      },
      slots: {
        refresh: (
          <actionButton.Component
            accessibilityLabel={copy.refreshLabel(agents.claude.name)}
            icon="refresh-cw"
          >
            {copy.refresh}
          </actionButton.Component>
        ),
      },
    },
    {
      slug: 'org-login',
      title: 'Org login',
      description:
        'An own endpoint of the org: every model picker on the login hides the model, and only an admin sees the line.',
      props: { owner: 'org' },
    },
  ],
})
