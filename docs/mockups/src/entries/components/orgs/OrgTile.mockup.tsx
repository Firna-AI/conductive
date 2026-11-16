import { defineComponent } from '@mokly/mokly'
import {
  AccountAvatar,
  InitialsTile,
  OrgTile,
  PersonAvatar,
} from '../../../components/orgs/OrgTile'
import { orgs } from '../../../fixtures/orgs'
import { people } from '../../../fixtures/members'
import { orgSchema } from '../layout/railSchemas'

/** The size of a tile or an avatar, in CSS px. */
const sizeSchema = { type: 'integer', minimum: 1 } as const

/** Up to two letters, which a tile or an avatar shows. */
const initialsSchema = { type: 'string', minLength: 1, maxLength: 2 } as const

/** The square of an org, registered with Mokly. */
export const orgTile = defineComponent({
  slug: 'org-tile',
  title: 'Org tile',
  description:
    'The initials of an org on a rounded square with a hairline outline, so that the square shows on the rail in both schemes. The current org shows its initials and its outline in the accent colour. The square is decorative: its link names the org. Its own page shows Acme, the current org, at the size of the rail.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org', 'size'],
    properties: {
      org: orgSchema,
      size: sizeSchema,
      current: { type: 'boolean' },
    },
  } as const,
  props: { org: orgs.acme, size: 26, current: true },
  render: (props) => (
    <OrgTile current={props.current} org={props.org} size={props.size} />
  ),
  variants: [
    {
      slug: 'other',
      title: 'Another org',
      description: 'The square of an org that is not open.',
      props: { org: orgs.futex, current: false },
    },
  ],
})

/** The square of an org from its initials alone, registered with Mokly. */
export const initialsTile = defineComponent({
  slug: 'initials-tile',
  title: 'Initials tile',
  description:
    "The square of an org from its initials alone, for an org that is not one of the user's own, such as an org on the operator page. Its own page shows an org that is not current.",
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['initials', 'size'],
    properties: {
      initials: initialsSchema,
      size: sizeSchema,
      current: { type: 'boolean' },
    },
  } as const,
  props: { initials: orgs.labs.initials, size: 26 },
  render: (props) => (
    <InitialsTile
      current={props.current}
      initials={props.initials}
      size={props.size}
    />
  ),
  variants: [
    {
      slug: 'current',
      title: 'Current',
      description: 'The initials and the outline in the accent colour.',
      props: { current: true },
    },
  ],
})

/** The initials of a person on a disc, registered with Mokly. */
export const personAvatar = defineComponent({
  slug: 'person-avatar',
  title: 'Person avatar',
  description:
    'The initials of a person on a disc with a hairline outline. The disc is decorative: the text beside it, or its control, names the person. Its own page shows Priya Raman at the size of a member row.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['initials', 'size'],
    properties: { initials: initialsSchema, size: sizeSchema },
  } as const,
  props: { initials: people.priya.initials, size: 28 },
  render: (props) => (
    <PersonAvatar initials={props.initials} size={props.size} />
  ),
})

/** The initials of the signed-in person, registered with Mokly. */
export const accountAvatar = defineComponent({
  slug: 'account-avatar',
  title: 'Account avatar',
  description:
    'The avatar of the signed-in person, from the initials of the account. Its own page shows the size of the sign-in row of the account page.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['size'],
    properties: { size: sizeSchema },
  } as const,
  props: { size: 32 },
  render: (props) => <AccountAvatar size={props.size} />,
})
