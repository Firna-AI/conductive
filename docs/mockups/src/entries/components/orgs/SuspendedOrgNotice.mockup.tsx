import { defineComponent } from '@mokly/mokly'
import {
  SuspendedOrgAbove,
  SuspendedOrgNotice,
  SuspendedOrgPanel,
} from '../../../../../../src/ui/components/orgs/SuspendedOrgNotice'
import { orgs, suspendedOrg } from '../../../fixtures/orgs'

/** The org of a notice. The notice needs only its name. */
const namedOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: { name: { type: 'string' } },
} as const

/** The suspended org of the mockups. */
const org = { name: orgs[suspendedOrg].name }

/** The notice at the top of a page of a suspended org, registered with Mokly. */
export const suspendedOrgNotice = defineComponent({
  slug: 'suspended-org-notice',
  title: 'Suspended org notice',
  description:
    'The notice at the top of a page of a suspended org, such as its list and its settings. It has the design of a refused start, and no action, because nothing that a member does ends the suspension. It gives the address for questions. Its own page shows the notice of Acme.',
  relatedDocs: ['docs/mockups/catalogue-operator.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org'],
    properties: { org: namedOrgSchema },
  } as const,
  props: { org },
  render: (props) => <SuspendedOrgNotice org={props.org} />,
})

/** The same notice in an empty main area, registered with Mokly. */
export const suspendedOrgPanel = defineComponent({
  slug: 'suspended-org-panel',
  title: 'Suspended org panel',
  description:
    'The notice of a suspended org in the empty main area of a wide desktop list, in place of New workspace. Its own page shows the panel of Acme.',
  relatedDocs: ['docs/mockups/catalogue-operator.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org'],
    properties: { org: namedOrgSchema },
  } as const,
  props: { org },
  render: (props) => <SuspendedOrgPanel org={props.org} />,
})

/**
 * The same notice above a page that has its own message, registered with
 * Mokly. The page supplies its message in the `children` slot.
 */
export const suspendedOrgAbove = defineComponent({
  slug: 'suspended-org-above',
  title: 'Suspended org above',
  description:
    'The notice of a suspended org above a page that has its own message, such as the page of a deleted org. The page keeps its words, and the notice adds the suspension and the address. The page supplies its message, so its own page shows the notice alone.',
  relatedDocs: ['docs/mockups/catalogue-operator.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['org'],
    properties: { org: namedOrgSchema },
  } as const,
  slots: ['children'],
  props: { org },
  render: (props) => (
    <SuspendedOrgAbove org={props.org}>{props.children}</SuspendedOrgAbove>
  ),
})
