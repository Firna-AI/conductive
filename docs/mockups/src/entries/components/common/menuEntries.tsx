import type { SchemaProps } from '@mokly/mokly'
import type { MenuEntry, MenuPlacement } from '../../../components/common/Menu'
import { AgentMark } from '../../../components/chat/AgentMark'
import { PersonAvatar } from '../../../components/orgs/OrgTile'
import { agentKeys } from '../../../fixtures/agents'
import { iconKeys, icons } from './icons'

/** Where a menu opens, as `MenuPlacement` lists them, and at a point. */
const placements = [
  'below-start',
  'below-end',
  'above-start',
  'above-end',
  'sheet',
  'point',
] as const satisfies readonly (MenuPlacement | 'point')[]

/** A mark in place of the icon of an item: a person or an agent. */
const markSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'initials'],
      properties: {
        kind: { const: 'person' },
        initials: { type: 'string' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'agent'],
      properties: { kind: { const: 'agent' }, agent: { enum: agentKeys } },
    },
  ],
} as const

/** An item of a menu, with the fields of the item of `MenuEntry`. */
const itemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'label'],
  properties: {
    kind: { const: 'item' },
    label: { type: 'string' },
    icon: { enum: iconKeys },
    mark: markSchema,
    /** Muted text after the label, such as the time of a session. */
    detail: { type: 'string' },
    trailingIcon: { enum: iconKeys },
    /** The spoken name of the trailing icon. */
    trailingLabel: { type: 'string' },
    /** A choice in a group: the menu marks the current one. */
    checked: { type: 'boolean' },
    tone: { const: 'danger' },
    highlighted: { type: 'boolean' },
    disabled: { type: 'boolean' },
    submenu: { enum: ['closed', 'open'] },
  },
} as const

/** The entries of a menu as JSON, as `MenuEntry` lists them. */
const entrySchema = {
  anyOf: [
    itemSchema,
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'label'],
      properties: { kind: { const: 'label' }, label: { type: 'string' } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'text'],
      properties: { kind: { const: 'note' }, text: { type: 'string' } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'label', 'on'],
      properties: {
        kind: { const: 'switch' },
        label: { type: 'string' },
        on: { type: 'boolean' },
        /** The key of the command that changes the setting. */
        shortcut: { type: 'string' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind'],
      properties: { kind: { const: 'divider' } },
    },
  ],
} as const

/** The props of a registered menu. */
export const menuSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'entries', 'placement'],
  properties: {
    label: { type: 'string' },
    entries: { type: 'array', items: entrySchema },
    placement: { enum: placements },
    /** A wide menu fits long rows, such as the titles of sessions. */
    wide: { type: 'boolean' },
  },
} as const

/**
 * An entry of a registered menu: an entry of `MenuEntry` with the key of
 * its icons and the data of its mark, because the props of a Mokly part
 * are JSON. A builder leaves out an optional field that has no value.
 */
export type MenuEntryData = SchemaProps<typeof menuSchema>['entries'][number]

type ItemData = Extract<MenuEntryData, { kind: 'item' }>

/** The mark of an item: the avatar of a person, or the mark of an agent. */
function markOf(mark: NonNullable<ItemData['mark']>) {
  return mark.kind === 'person' ? (
    <PersonAvatar initials={mark.initials} size={18} />
  ) : (
    <AgentMark agent={mark.agent} />
  )
}

/** An entry as the plain menu draws it, with its icons and its mark. */
export function plainEntry(entry: MenuEntryData): MenuEntry {
  if (entry.kind !== 'item') return entry
  const { icon, trailingIcon, mark, ...item } = entry
  return {
    ...item,
    icon: icon === undefined ? undefined : icons[icon],
    trailingIcon: trailingIcon === undefined ? undefined : icons[trailingIcon],
    mark: mark === undefined ? undefined : markOf(mark),
  }
}
