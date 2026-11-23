import { defineComponent } from '@mokly/mokly'
import {
  StatusText,
  type StatusTone,
} from '../../../../../../src/ui/components/common/StatusText'
import { iconKeys, icons } from './icons'

/** The tones of a state, as `StatusTone` lists them. */
const statusTones = [
  'neutral',
  'active',
  'success',
  'warning',
  'danger',
  'muted',
] as const satisfies readonly StatusTone[]

/**
 * A state as a small glyph and a word, registered with Mokly. Its pages
 * show the tones that the screens show: a success dot, a busy spinner, a
 * warning and a danger icon, and a muted dot.
 */
export const statusText = defineComponent({
  slug: 'status-text',
  title: 'Status text',
  description:
    'A state as a small glyph and a word, so that the state never depends on colour alone: a spinner while busy, an icon, or a dot. Its own page shows a success dot.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'tone'],
    properties: {
      label: { type: 'string' },
      tone: { enum: statusTones },
      /** A spinner takes the place of the glyph. */
      busy: { type: 'boolean' },
      icon: { enum: iconKeys },
    },
  } as const,
  props: { label: 'Connected', tone: 'success' },
  render: (props) => (
    <StatusText
      busy={props.busy}
      icon={props.icon === undefined ? undefined : icons[props.icon]}
      label={props.label}
      tone={props.tone}
    />
  ),
  variants: [
    {
      slug: 'busy',
      title: 'Busy',
      description: 'Work that runs, such as a build: a spinner in the accent.',
      props: { label: 'Building · 2 min', tone: 'active', busy: true },
    },
    {
      slug: 'warning',
      title: 'Warning',
      description: 'A state that waits, with its icon in amber.',
      props: { label: 'Waiting', tone: 'warning', icon: 'hourglass' },
    },
    {
      slug: 'danger',
      title: 'Danger',
      description: 'A state that failed: rose text and icon.',
      props: {
        label: 'Failed after 3 min',
        tone: 'danger',
        icon: 'circle-alert',
      },
    },
    {
      slug: 'muted',
      title: 'Muted',
      description: 'A state that is over, such as a used code: a faint dot.',
      props: { label: 'Used up', tone: 'muted' },
    },
  ],
})
