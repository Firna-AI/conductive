import { defineComponent } from '@mokly/mokly'
import {
  ChooseRepositoriesButton,
  ChooseRepositoriesNotice,
  CreateFailedNotice,
} from '../../../components/new-workspace/notices'
import { orgs } from '../../../fixtures/orgs'

/** A create that failed, registered with Mokly. */
export const createFailedNotice = defineComponent({
  slug: 'create-failed-notice',
  title: 'Create failed notice',
  description:
    'A create that failed, over the composer of the New workspace page or in the New workspace dialog. The message stays, and Try again sends it again. Its own page shows the notice of a message that can go.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The message can go, so Try again is on. */
      ready: { type: 'boolean' },
    },
  } as const,
  props: { ready: true },
  render: (props) => <CreateFailedNotice ready={props.ready} />,
  variants: [
    {
      slug: 'not-ready',
      title: 'Message not ready',
      description: 'Try again stays off while the message cannot go.',
      props: { ready: false },
    },
  ],
})

/** Choose repositories, registered with Mokly. */
export const chooseRepositoriesButton = defineComponent({
  slug: 'choose-repositories-button',
  title: 'Choose repositories button',
  description:
    'Choose repositories, which opens the Repositories tab of the org settings, for an admin of an org that has chosen none.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <ChooseRepositoriesButton />,
})

/** The notice of an org without chosen repositories, registered with Mokly. */
export const chooseRepositoriesNotice = defineComponent({
  slug: 'choose-repositories-notice',
  title: 'Choose repositories notice',
  description:
    'The notice of the New workspace dialog in an org that has chosen no repositories yet, so no workspace can start. An admin gets Choose repositories. A member who is not an admin reads that an admin chooses them. Its own page shows the notice of an admin.',
  relatedDocs: ['docs/mockups/catalogue.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org', 'admin'],
    properties: {
      /** The name of the org. */
      org: { type: 'string' },
      admin: { type: 'boolean' },
    },
  } as const,
  props: { org: orgs.acme.name, admin: true },
  render: (props) => (
    <ChooseRepositoriesNotice admin={props.admin} org={props.org} />
  ),
  variants: [
    {
      slug: 'member',
      title: 'For a member',
      description:
        'The words for a member who is not an admin, without a button.',
      props: { admin: false },
    },
  ],
})
