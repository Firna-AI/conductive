import { defineComponent } from '@mokly/mokly'
import { LoginShare } from '../../../../../../src/ui/components/settings/LoginShare'
import { shareNotSavedCause } from '../../../fixtures/logins'
import { noop } from '../../../../../../src/ui/noop'

/**
 * The share setting of a connected login, registered with Mokly. Its
 * switch takes its spoken name from the element with the id `nameId`,
 * which the row of the login holds. A change saves at once, so the switch
 * gets `noop`.
 */
export const loginShare = defineComponent({
  slug: 'login-share',
  title: 'Login share',
  description:
    'The share setting under the row of a connected login: whether the messages of other members in the sessions of its owner run on it. The hint under the label says what the current value does. While a change saves, the switch is off. After a change that the app did not save, the cause shows, and the switch shows the saved value again. Its own page shows a shared login.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['nameId', 'shared'],
    properties: {
      /** The id of the element with the name of the agent. */
      nameId: { type: 'string', minLength: 1 },
      shared: { type: 'boolean' },
      /** A change saves, so the switch waits. */
      saving: { type: 'boolean' },
      /** The cause of a change that the app did not save. */
      error: { type: 'string' },
    },
  } as const,
  props: { nameId: 'agent-claude', shared: true },
  render: (props) => (
    <LoginShare
      error={props.error}
      nameId={props.nameId}
      onChange={noop}
      saving={props.saving}
      shared={props.shared}
    />
  ),
  variants: [
    {
      slug: 'kept',
      title: 'Not shared',
      description:
        'A login that other members do not use: their messages start a new session on their own login.',
      props: { shared: false },
    },
    {
      slug: 'saving',
      title: 'Saving',
      description: 'A change that saves: the switch waits.',
      props: { saving: true },
    },
    {
      slug: 'not-saved',
      title: 'Not saved',
      description:
        'A change that the app did not save: the cause shows, and the switch shows the saved value again.',
      props: { error: shareNotSavedCause },
    },
  ],
})
