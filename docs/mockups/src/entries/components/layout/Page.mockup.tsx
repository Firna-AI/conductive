import { defineComponent } from '@mokly/mokly'
import { Page } from '../../../components/layout/Page'
import { paths } from '../../../paths'
import { actionButton } from '../common/actions.mockup'
import { viewports } from '../common/viewports'

/**
 * A page with a header and a scrolling body, registered with Mokly. A
 * screen supplies its actions, its tabs, and its body in slots. A screen
 * that draws a screen of another viewport, such as the Mac app in a phone
 * view, passes `viewport`. Without it, a page of the part draws the layout
 * of its own view.
 */
export const page = defineComponent({
  slug: 'page',
  title: 'Page',
  description:
    'A page of the app with a header and a scrolling body. Desktop shows the title, the subtitle, a back link, and the actions in the header. A phone shows a back button in the header and the actions in a footer. Its own page shows a page with its title and subtitle and an empty body.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: {
      title: { type: 'string' },
      subtitle: { type: 'string' },
      back: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'to'],
        properties: {
          label: { type: 'string' },
          to: { type: 'string', minLength: 1 },
        },
      },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
      /** The body fills the page edge to edge, as a terminal does. */
      fill: { type: 'boolean' },
    },
  } as const,
  slots: ['actions', 'tabs', 'children'],
  props: { title: 'Automations', subtitle: 'Acme' },
  render: (props, context) => (
    <Page
      actions={props.actions}
      back={props.back}
      fill={props.fill}
      subtitle={props.subtitle}
      tabs={props.tabs}
      title={props.title}
      viewport={props.viewport ?? context.viewport}
    >
      {props.children}
    </Page>
  ),
  variants: [
    {
      slug: 'back',
      title: 'With a way back',
      description:
        'A page with a way back: a back link in the header on desktop, and a back button on a phone.',
      props: { back: { label: 'Workspaces', to: paths.shell } },
    },
    {
      slug: 'actions-and-tabs',
      title: 'Actions and tabs',
      description:
        'A page with an action, in the header on desktop and in the footer on a phone, and the bar of its tabs under the header, here without tabs.',
      props: { title: 'Acme', subtitle: 'Org settings' },
      slots: {
        actions: (
          <actionButton.Component icon="plus" tone="primary">
            New automation
          </actionButton.Component>
        ),
        tabs: <span />,
      },
    },
    {
      slug: 'fill',
      title: 'Filled body',
      description:
        'A body that fills the page edge to edge, as a terminal does.',
      props: { fill: true },
    },
  ],
})
