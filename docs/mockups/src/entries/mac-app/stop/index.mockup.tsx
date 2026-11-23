import { defineScreen } from '@mokly/mokly'
import { MacAppScreen } from '../../../screens/MacAppScreen'
import { macAppSchema } from '../../../screens/macAppState'

export const macStop = defineScreen({
  title: 'Stop the 15 minutes',
  description:
    'The user pressed Stop in the bar of the 15 minutes. The Mac stopped them and saved the change, so the bar says Stopped, and each command from this workspace asks first again. The bar shows Stopped for 5 seconds, then goes, because no grant runs. A Stop that the Mac did not save or did not make stays until the next Stop of the workspace. Stop of a grant until Stop shows the same results.',
  rationale:
    'The user asked for an explicit result of each change: done, done but not saved, or failed (7 November 2026). The result shows in the bar after the 15 minutes end, because their bar would otherwise go with the result. The user asked on 23 November 2026 that the Stopped notice go away after some time, so a Stop that the Mac made and saved goes after 5 seconds. A failure stays, because it needs the user.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'allow-all',
    change: 'stopped',
    palette: 'closed',
    keyChange: 'none',
    shortcutSearch: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'not-saved',
      title: 'Stopped, not saved',
      description:
        'The Mac stopped the 15 minutes, so each command asks first again, but the Mac could not save the change. The bar names the cause that the Mac gave and stays, also after a read or a reconnect of the Mac. Try again repeats the Stop through the Mac that is connected now.',
      rationale:
        'The Mac ends the 15 minutes and their timer before it saves, so a failed save never keeps them running (7 November 2026).',
      props: { change: 'stop-not-saved' },
    },
    {
      slug: 'failed',
      title: 'Not stopped',
      description:
        'The Mac could not stop the 15 minutes. The bar names the cause, and keeps the time left, Extend, and Stop, so the user can stop them again. A Stop that waited while the Mac reconnected shows the same way: it never goes to the new connection by itself.',
      rationale:
        'A change that failed stays in view until the next Stop of the workspace, and the app does not try again by itself (7 November 2026).',
      props: { change: 'stop-failed' },
    },
  ],
})
