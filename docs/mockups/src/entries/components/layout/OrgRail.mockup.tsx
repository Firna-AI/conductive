import { defineComponent } from '@mokly/mokly'
import { acmeRail, OrgRail } from '../../../components/layout/OrgRail'
import { railSchema } from './railSchemas'

/**
 * The narrow rail beside the sidebar, registered with Mokly. Its pages
 * show the rail of the canonical views, the name and the key of an org
 * with Operator, the tile menu of a right click, a drag, and the rail of a
 * person without an org.
 */
export const orgRail = defineComponent({
  slug: 'org-rail',
  title: 'Org rail',
  description:
    'The narrow rail beside the sidebar: the logo, the orgs of the person in their own order, Create org, and the account at the bottom. An operator also gets Operator above the account. The name of an org shows the key that opens it. While the sidebar hides, a click on the tile of the current org opens its workspace list as a popover, and the tile marks it as expanded. Its own page shows every org, with Acme open.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: railSchema,
  props: acmeRail,
  render: (props) => <OrgRail {...props} />,
  variants: [
    {
      slug: 'hint',
      title: 'Name and key',
      description:
        'The name of an org beside its tile, as on hover, with the key that opens it, and Operator above the account.',
      props: { hint: 'futex', operator: true },
    },
    {
      slug: 'menu',
      title: 'Tile menu',
      description:
        'The menu of a right click on an org tile, at the pointer, with Move up and Move down.',
      props: { menu: 'futex' },
    },
    {
      slug: 'drag',
      title: 'Drag',
      description:
        'An org that the person drags to the top: a faint copy in its place, a line where it lands, and a raised copy.',
      props: { drag: { org: 'firna', index: 0 } },
    },
    {
      slug: 'first-run',
      title: 'No org yet',
      description:
        'The rail of a person who has no org yet: only Create org and the account.',
      props: { orgs: [], firstRun: true, current: 'create' },
    },
  ],
})
