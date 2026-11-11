import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import {
  DocsScreen,
  docsGuide,
  docsSchema,
} from '../../../../screens/DocsScreen'

export const getStartedGuide = defineScreen({
  title: 'Get started guide',
  description:
    'A guide of the docs, Get started, at /docs/get-started. The menu marks it as the current page, and its contents link each heading. Get access, after Sign in, names the ways in from the waitlist: an invite code, an org invitation, and an approval. The body has ordered and unordered lists, two guide actions, a table, and two code blocks, one with lines that are wider than a phone. The foot links back to Overview and on to Agent logins.',
  rationale:
    'A guide shows every part of the layout of the docs, so the site can build each guide from Markdown with one layout. Code shows the colours of the design for the token classes of Prism. A long line of code scrolls inside its block, and a table wraps its words, so the page never scrolls sideways on a phone. A link stands alone as a guide action, a list item that holds only the link, so on a phone it is a touch target of 44px that covers no other text. Agent logins is not drawn, so its link at the foot keeps its look without a link. A new account starts on the waitlist, as the user chose in decisions 160 and 161, except during open sign-up. Get access therefore comes before the three steps, in the words of the waitlist screen. It leaves out the pause of sign-ups, because the waitlist screen names the pause, with what to do, where the pause stops a code or an Accept.',
  relatedDocs: [],
  address: `${productDomain}/docs/get-started`,
  propSchema: docsSchema,
  props: docsGuide,
  render: (props, context) => (
    <DocsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'menu',
      title: 'Get started guide, docs menu open',
      description:
        'A phone with the Docs menu open under the header of the site: the guides in their groups, with Get started marked, push the page down. A desktop keeps the guides in its sidebar, so its view is the guide.',
      props: { open: 'menu' },
    },
    {
      slug: 'contents',
      title: 'Get started guide, contents open',
      description:
        'A phone with On this page open under the lead: a link to each heading of the guide. A desktop keeps the contents beside the page, so its view is the guide.',
      props: { open: 'contents' },
    },
  ],
})
