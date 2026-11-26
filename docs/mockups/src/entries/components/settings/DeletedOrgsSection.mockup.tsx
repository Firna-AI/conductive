import { defineComponent } from '@mokly/mokly'
import {
  DeletedOrgsSection,
  deletedOrgStates,
} from '../../../components/settings/DeletedOrgsSection'
import { paths } from '../../../paths'

/** The Deleted orgs section of the mockups, registered with Mokly. */
export const deletedOrgsSection = defineComponent({
  slug: 'deleted-orgs-section',
  title: 'Deleted orgs section',
  description:
    'The Deleted orgs section of the mockups with Acme Labs, on the Account page and in Get started: Restore, an org that the operator suspended, or a restore that failed. With no deleted org, the section hides. Restore leads to the page without the section, because the org is back in the rail. Its own page shows Acme Labs with Restore.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state'],
    properties: {
      state: { enum: deletedOrgStates },
      /** The screen that Restore leads to, by default the account. */
      restoredTo: { type: 'string', minLength: 1 },
    },
  } as const,
  props: { state: 'restorable' },
  render: (props) => (
    <DeletedOrgsSection restoredTo={props.restoredTo} state={props.state} />
  ),
  variants: [
    {
      slug: 'suspended',
      title: 'Suspended',
      description: 'Acme Labs after the operator suspended it: no Restore.',
      props: { state: 'suspended' },
    },
    {
      slug: 'failed',
      title: 'Restore failed',
      description: 'A restore that failed: its notice under the row.',
      props: { state: 'failed' },
    },
    {
      slug: 'get-started',
      title: 'In Get started',
      description:
        'The section in Get started, whose Restore leads to the workspaces of the org.',
      props: { restoredTo: paths.shell },
    },
  ],
})
