import { defineComponent } from '@mokly/mokly'
import { ChevronDown } from 'lucide-react'
import {
  ActionButton,
  IconButton,
  type ActionTone,
} from '../../../../../../src/ui/components/common/actions'
import { iconKeys, icons } from './icons'

/** The tones of an action button, as `ActionTone` lists them. */
const actionTones = [
  'primary',
  'secondary',
  'outline',
  'plain',
  'danger',
] as const satisfies readonly ActionTone[]

/** The state of a button that opens a menu. */
const menuTrigger = {
  /** The button opens a menu, and `expanded` says whether it is open. */
  menu: { type: 'boolean' },
  expanded: { type: 'boolean' },
} as const

/**
 * The compact labelled button of the app, registered with Mokly. Its label
 * is the text of `children`. Its pages show the tones and the states that
 * the screens show: secondary with an icon, primary, danger, busy, and a
 * menu trigger with its chevron.
 */
export const actionButton = defineComponent({
  slug: 'action-button',
  title: 'Action button',
  description:
    'The compact labelled button of the app: a Firna button in the dense control size, 40 px high on a phone. Its own page shows the secondary tone with an icon.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['children'],
    properties: {
      /** The label. */
      children: { type: 'string' },
      /** The spoken name, when it differs from the visible label. */
      accessibilityLabel: { type: 'string' },
      icon: { enum: iconKeys },
      tone: { enum: actionTones },
      disabled: { type: 'boolean' },
      /** The action runs: a spinner replaces the icon before the label. */
      busy: { type: 'boolean' },
      ...menuTrigger,
    },
  } as const,
  slots: ['trailing'],
  props: { children: 'Try again', icon: 'rotate-cw' },
  render: (props) => (
    <ActionButton
      accessibilityLabel={props.accessibilityLabel}
      busy={props.busy}
      disabled={props.disabled}
      expanded={props.expanded}
      icon={props.icon === undefined ? undefined : icons[props.icon]}
      menu={props.menu}
      tone={props.tone}
      trailing={props.trailing}
    >
      {props.children}
    </ActionButton>
  ),
  variants: [
    {
      slug: 'primary',
      title: 'Primary',
      description: 'The primary action of a page or a notice.',
      props: { children: 'Build computer', icon: 'hammer', tone: 'primary' },
    },
    {
      slug: 'danger',
      title: 'Danger',
      description: 'An action that deletes or stops, such as in a dialog.',
      props: { children: 'Delete org', icon: 'trash-2', tone: 'danger' },
    },
    {
      slug: 'busy',
      title: 'Busy',
      description:
        'An action that runs: a spinner before the label, and a press does nothing.',
      props: { children: 'Sending', busy: true, tone: 'primary' },
    },
    {
      slug: 'menu',
      title: 'Menu trigger',
      description:
        'A plain button that opens a menu of choices, such as the repository of a new workspace, with a chevron after its label.',
      props: {
        children: 'acme/web',
        icon: 'folder-git-2',
        menu: true,
        expanded: false,
        tone: 'plain',
      },
      slots: { trailing: <ChevronDown aria-hidden size={13} /> },
    },
  ],
})

/**
 * The compact icon-only button of the bars and the rows, registered with
 * Mokly. A quiet button, for the actions of every row, has a fainter and
 * smaller icon.
 */
export const iconButton = defineComponent({
  slug: 'icon-button',
  title: 'Icon button',
  description:
    'A compact icon-only button with a muted icon, for bars and toolbars, 40 px square on a phone. Its spoken name is its label.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label', 'icon'],
    properties: {
      label: { type: 'string' },
      icon: { enum: iconKeys },
      disabled: { type: 'boolean' },
      /** A fainter, smaller icon, for actions on every row. */
      quiet: { type: 'boolean' },
      /** The state of a toggle button, such as "+" while its form shows. */
      pressed: { type: 'boolean' },
      ...menuTrigger,
    },
  } as const,
  props: { label: 'Close', icon: 'x' },
  render: (props) => (
    <IconButton
      disabled={props.disabled}
      expanded={props.expanded}
      icon={icons[props.icon]}
      label={props.label}
      menu={props.menu}
      pressed={props.pressed}
      quiet={props.quiet}
    />
  ),
  variants: [
    {
      slug: 'quiet',
      title: 'Quiet',
      description: 'The fainter, smaller icon of an action on every row.',
      props: { label: 'Remove', icon: 'x', quiet: true },
    },
    {
      slug: 'pressed',
      title: 'Pressed',
      description: 'A toggle button while its form shows.',
      props: { label: 'Preview another port', icon: 'plus', pressed: true },
    },
    {
      slug: 'disabled',
      title: 'Off',
      description: 'A button that does nothing now, such as at a limit.',
      props: { label: 'New terminal', icon: 'plus', disabled: true },
    },
    {
      slug: 'menu',
      title: 'Menu trigger',
      description: 'A button whose menu is open.',
      props: {
        label: 'Session history',
        icon: 'history',
        menu: true,
        expanded: true,
      },
    },
  ],
})
