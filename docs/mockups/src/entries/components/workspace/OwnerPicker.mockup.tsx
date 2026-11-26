import { defineComponent } from '@mokly/mokly'
import { OwnerPicker } from '../../../components/workspace/OwnerPicker'
import { people } from '../../../fixtures/members'
import { personSchema } from '../layout/railSchemas'

/**
 * The owner of the open workspace as a picker in its header, registered
 * with Mokly. Its pages show the picker of an admin, its open menu, the
 * avatar alone of a phone, and the owner that a member sees.
 */
export const ownerPicker = defineComponent({
  slug: 'owner-picker',
  title: 'Owner picker',
  description:
    'The owner of the open workspace in its header: the avatar and the name, or the avatar alone on a phone. An admin of the org picks another member from its menu, which a phone shows as a sheet instead. A member who is not an admin sees the owner without the menu. Its own page shows the picker of an admin.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['owner'],
    properties: {
      owner: personSchema,
      /** The menu of the picker is open. */
      open: { type: 'boolean' },
      /** The avatar alone, as on a phone. */
      compact: { type: 'boolean' },
      /** A member who is not an admin sees the owner without a menu. */
      readOnly: { type: 'boolean' },
    },
  } as const,
  props: { owner: people.cal },
  render: (props) => (
    <OwnerPicker
      compact={props.compact}
      open={props.open}
      owner={props.owner}
      readOnly={props.readOnly}
    />
  ),
  variants: [
    {
      slug: 'open',
      title: 'Menu open',
      description:
        'The members of the org below the picker, the owner checked.',
      props: { open: true },
    },
    {
      slug: 'compact',
      title: 'On a phone',
      description: 'The avatar alone, as a square button.',
      props: { compact: true },
    },
    {
      slug: 'read-only',
      title: 'For a member',
      description:
        'The owner without a menu, for a member who is not an admin.',
      props: { owner: people.priya, readOnly: true },
    },
  ],
})
