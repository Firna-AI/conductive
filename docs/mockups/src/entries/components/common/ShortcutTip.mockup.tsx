import { defineComponent } from '@mokly/mokly'
import { ShortcutTip } from '../../../components/common/ShortcutTip'
import type { CommandId } from '../../../fixtures/shortcutCommands'
import { actionButton } from './actions.mockup'

/** The commands whose controls the screens give a key hint. */
const tipCommands = [
  'create-pull-request',
  'commit-and-push',
  'fix-checks',
  'resolve-conflicts',
  'address-review',
  'mark-ready-for-review',
  'merge-pull-request',
  'continue-after-merge',
  'archive-workspace',
  'copy-link',
] as const satisfies readonly CommandId[]

/**
 * The tooltip of a Firna control with the key of its command, registered
 * with Mokly. A screen supplies the control in the `children` slot. The
 * tooltip draws no box, so the control keeps its place.
 */
export const shortcutTip = defineComponent({
  slug: 'shortcut-tip',
  title: 'Shortcut tip',
  description:
    'The tooltip of a control whose command has a key, such as "Archive (⇧⌘A)". It draws no box, so the control keeps its place in the layout. A phone, a control that cannot take a click, and a command without a key give no tooltip. Its own page shows the tooltip without a control.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'command'],
    properties: {
      /** The label of the control, which the tooltip starts with. */
      label: { type: 'string' },
      command: { enum: tipCommands },
      /** The control cannot take a click now, so its key does nothing. */
      off: { type: 'boolean' },
    },
  } as const,
  slots: ['children'],
  props: { label: 'Archive', command: 'archive-workspace' },
  render: (props) => (
    <ShortcutTip command={props.command} label={props.label} off={props.off}>
      {props.children}
    </ShortcutTip>
  ),
  variants: [
    {
      slug: 'control',
      title: 'Around a control',
      description: 'The tooltip around the Archive button of a bar.',
      props: {},
      slots: {
        children: (
          <actionButton.Component icon="archive" tone="outline">
            Archive
          </actionButton.Component>
        ),
      },
    },
  ],
})
