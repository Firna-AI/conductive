import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

export const macWindow = defineScreen({
  title: 'Window',
  description:
    'The Mac app in a normal window, on a workspace. The window has no title bar: the red, yellow, and green window buttons sit inset at the top left of the left panel, with the sidebar toggle beside them and back and forward at its right. The top bars of the app reach the top edge of the window. A phone view shows the same screen, smaller, because the app is for a Mac only.',
  rationale:
    'The user asked for the native window buttons in the top bar of the app, as in Conductor, because the app must look like a serious desktop app (decision 62). The top bars move the window, and their buttons do not. The page keeps the space of the window buttons, and gives it back in full screen, where macOS hides them.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'none',
    change: 'none',
    palette: 'closed',
    keyChange: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'full-screen',
      title: 'Full screen',
      description:
        'The same workspace in full screen. macOS hides the window buttons, so the sidebar toggle moves to the left edge, and the app fills the screen.',
      props: { window: 'full-screen' },
    },
    {
      slug: 'new-workspace',
      title: 'New workspace',
      description:
        'The empty New workspace in a normal window, with the same window buttons and controls.',
      props: { page: 'new-workspace' },
    },
    {
      slug: 'new-workspace-full-screen',
      title: 'New workspace, full screen',
      description:
        'The empty New workspace in full screen, without the window buttons.',
      props: { page: 'new-workspace', window: 'full-screen' },
    },
  ],
})
