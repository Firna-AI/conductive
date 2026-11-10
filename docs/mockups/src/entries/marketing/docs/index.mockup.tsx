import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import {
  DocsScreen,
  docsOverview,
  docsSchema,
} from '../../../screens/DocsScreen'

export const docs = defineScreen({
  title: 'Docs',
  description:
    'The overview of the public docs, at /docs, with the header and the footer of the site. A desktop shows the guides in three groups in a sidebar, with Overview marked, the page with its contents beside it, and a link on to Get started. A phone shows the Docs menu bar under the header, and the contents as On this page under the lead. The Docs links of the header and the footer lead here.',
  rationale:
    'The docs are pages of the site, so they keep its header, its footer, its tokens, and its pages that run no script and set no cookie. The phone menu and On this page are native disclosures, which open and close without a script, and the docs have no search at launch. The menu lists the twelve launch guides in the groups Start, Work, and Manage, in the order of the guides, and the previous and next links follow the same order. A heading has no link of its own: the contents link each heading, so a reader copies the address of a section there. The mockups draw the overview and Get started. Each other guide keeps its place and its look in the menu without a link, as a row of the catalogue does when the mockups do not draw its screen. The words of the pages are an example, not the final guides. The child page is the Get started guide, so this page shows only its canonical screen.',
  relatedDocs: [],
  address: `${productDomain}/docs`,
  propSchema: docsSchema,
  props: docsOverview,
  render: (props, context) => (
    <DocsScreen state={props} viewport={context.viewport} />
  ),
})
