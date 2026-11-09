import { defineScreen } from '@mokly/mokly'
import { MacAppScreen, macAppSchema } from '../../../../screens/MacAppScreen'

export const macShortcutsRecording = defineScreen({
  title: 'Recording',
  description:
    'A press on ⌥⌘/ of Keyboard shortcuts starts the recorder in its place. The recorder asks for the keys, and the next keys that the person presses become the new shortcut. Cancel or Esc stops it without a change.',
  rationale:
    'Each change saves at once, as Preferences does, so the recorder has no Save. Esc stops the recorder, so Esc stays a fixed shortcut.',
  relatedDocs: [],
  propSchema: macAppSchema,
  props: {
    window: 'window',
    page: 'shortcuts',
    command: 'none',
    change: 'none',
    palette: 'closed',
    keyChange: 'recording',
    shortcuts: 'default',
  },
  render: (props) => <MacAppScreen state={props} />,
  variants: [
    {
      slug: 'fixed-key',
      title: 'Fixed shortcut pressed',
      description:
        'The person pressed ⌘H while the recorder waited. ⌘H is a fixed shortcut, so the recorder did not take it. The row says that Hide Conductive always uses ⌘H, and the recorder still waits for other keys.',
      rationale:
        'The recorder never takes a fixed shortcut. It names the command of that shortcut, so the person knows why, and presses other keys.',
      props: { keyChange: 'refused' },
    },
    {
      slug: 'conflict',
      title: 'Shortcut in use',
      description:
        'The person pressed ⌘/, which Model picker uses, and both commands run in a workspace. The recorder shows ⌘/, and the row says that Model picker uses it. Replace moves ⌘/ from Model picker to Keyboard shortcuts. Cancel keeps both commands as they were, and another press records other keys.',
      rationale:
        'Two commands that can run in the same place never share a shortcut. Replace saves both rows in one change, so a failed save never leaves the shortcut on both commands, or on neither.',
      props: { keyChange: 'conflict' },
    },
  ],
})
