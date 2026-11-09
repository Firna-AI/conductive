import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../screens/MacAppScreen'

export const macPalette = defineScreen({
  title: 'Command palette',
  description:
    'The command palette over a workspace in the Mac app. Each action and each setting with a shortcut ends with it, as small key chips: ⌘T for New session, ⌥⌘U for Go to Changes, and ⌘J for Go to Terminal. A command with more than one shortcut shows its first. A command without a shortcut, and a workspace, show none.',
  rationale:
    'The palette rows show the shortcut of each command, so the palette teaches them. They show the shortcuts of the account, with the changes of the person, from option A of decision 190, where shortcut changes live. A workspace row shows no shortcut, because Open workspace 1 to 9 follow the places in the list, and the palette orders the workspaces by their latest activity. A browser tab gets the keys after decisions 192 and 194.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'workspace',
    command: 'none',
    change: 'none',
    palette: 'all',
    keyChange: 'none',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'actions',
      title: 'Actions tab',
      description:
        'The Actions tab over the workspace. The actions of the workspace show ⌘T, ⌥⌘U, ⌘J, and ⇧⌘A for Archive workspace, and New workspace shows ⌘N. Further down, the switches to Futex and Firna show ⌃2 and ⌃3.',
      rationale:
        'A switch to an org shows the shortcut of its place in the rail, ⌃1 to ⌃9. Futex and Firna are the second and third orgs of the rail.',
      props: { palette: 'actions' },
    },
    {
      slug: 'settings',
      title: 'Settings tab',
      description:
        'The Settings tab in the Mac app. The Account group adds This Mac after Sign-in, and Keyboard shortcuts at the end, with ⌥⌘/, which opens the tab. Repositories shows ⌥⌘A.',
      rationale:
        'Only the Mac app has This Mac, as the Settings tab of the browser says. The Keyboard shortcuts row comes with the shortcuts, so a browser gets it after decisions 192 and 194.',
      props: { palette: 'settings' },
    },
    {
      slug: 'changed-key',
      title: 'Changed palette key',
      description:
        'The person changed the shortcut of the palette to ⇧⌘P on the Keyboard shortcuts tab. The Search row under New workspace shows ⇧⌘P in place of ⌘K, and ⇧⌘P opens the palette.',
      rationale:
        'The Search row teaches the shortcut of the palette, so it shows the shortcut of the person. The palette key is one of the shortcuts, so the person can change it, as decision 190 says.',
      props: { palette: 'closed', shortcuts: 'edited' },
    },
  ],
})
