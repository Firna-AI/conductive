import { defineComponent } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../../../components/layout/AppFrame'
import type { SidebarView } from '../../../components/layout/sidebarPlace'
import { railSchema } from './railSchemas'

/** How the frame shows the sidebar, as `SidebarView` lists them. */
const sidebarViews = [
  'shown',
  'hidden',
  'popover',
] as const satisfies readonly SidebarView[]

/**
 * The desktop app, registered with Mokly: the org rail, the sidebar, and
 * the main area. A screen supplies the sidebar, the main area, and a layer
 * over the frame in slots. These pages show the frame without the content
 * of a screen, so that the frame does not claim the CSS of the screen.
 */
export const appFrame = defineComponent({
  slug: 'app-frame',
  title: 'App frame',
  description:
    'The desktop app: the org rail, the sidebar of the org, and the main area. In a narrow window the sidebar hides. A page can leave out the sidebar. Its toggle hides the sidebar, and a click on the tile of the current org then opens the workspace list as a popover. In the Mac app the window controls move to the top left corner while the sidebar is hidden. A layer, such as an open dialog, lies over the whole frame. Its own page shows the rail of the canonical views beside an empty main area.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The state of the rail. Without it, every org shows, with Acme open. */
      rail: railSchema,
      /** The sidebar in its column, hidden, or open as a popover. */
      sidebarView: { enum: sidebarViews },
    },
  } as const,
  slots: ['sidebar', 'overlay', 'children'],
  render: (props) => (
    <AppFrame
      overlay={props.overlay}
      rail={props.rail}
      sidebar={props.sidebar}
      sidebarView={props.sidebarView}
    >
      {props.children}
    </AppFrame>
  ),
  variants: [
    {
      slug: 'sidebar',
      title: 'With a sidebar',
      description:
        'The frame with a sidebar beside the rail, which narrows below 1280 px and hides below 900 px, with the handle that resizes it.',
      props: {},
      slots: { sidebar: <span /> },
    },
    {
      slug: 'sidebar-hidden',
      title: 'Sidebar hidden',
      description:
        'The toggle hid the sidebar, so the main area takes its width beside the rail.',
      props: { sidebarView: 'hidden' },
      slots: { sidebar: <span /> },
    },
    {
      slug: 'sidebar-popover',
      title: 'Workspace list as a popover',
      description:
        'The sidebar is hidden, and a click on the tile of the current org opened the workspace list as a popover beside the rail.',
      props: { sidebarView: 'popover' },
      slots: { sidebar: <span /> },
    },
  ],
})

/**
 * The mobile app, registered with Mokly: one full-height column, where
 * every control takes the touch sizes. A screen supplies its content in
 * the `children` slot.
 */
export const mobileFrame = defineComponent({
  slug: 'mobile-frame',
  title: 'Mobile frame',
  description:
    'The mobile app: one full-height column. Every control in it takes the touch sizes, at least 40 px high. Its own page shows the empty column.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  slots: ['children'],
  render: (props) => <MobileFrame>{props.children}</MobileFrame>,
})
