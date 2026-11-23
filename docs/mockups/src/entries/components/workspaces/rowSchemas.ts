import { sectionKeys } from '../../../fixtures/sections'
import type { Submenu } from '../../../../../../src/ui/components/workspaces/workspaceMenu'
import { menuSchema } from '../common/menuEntries'

/** The entries of a menu as JSON, as the registered menu takes them. */
const entriesSchema = menuSchema.properties.entries

/** The actions of a row menu that open their choices beside it. */
const submenus = ['move', 'reassign'] as const satisfies readonly Submenu[]

/**
 * The one row that a view draws, and what it draws on it, as `RowFocus`:
 * its menu, its field of Rename, or a hover.
 */
export const rowFocusSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workspace', 'drawing'],
  properties: {
    /** The key of the workspace of the row. */
    workspace: { type: 'string' },
    drawing: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['kind'],
          properties: { kind: { const: 'menu' }, submenu: { enum: submenus } },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'value', 'selected'],
          properties: {
            kind: { const: 'rename' },
            value: { type: 'string' },
            selected: { type: 'boolean' },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['kind'],
          properties: { kind: { const: 'hover' } },
        },
      ],
    },
  },
} as const

/** The section whose menu the list shows open, as `ListMenu`. */
export const listMenuSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['section'],
  properties: { section: { enum: sectionKeys } },
} as const

/** A place in a list, counted from 0. */
const indexSchema = { type: 'integer', minimum: 0 } as const

/** A workspace or a section in the middle of a drag, as `ListDrag`. */
export const listDragSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'workspace', 'section', 'index'],
      properties: {
        kind: { const: 'workspace' },
        workspace: { type: 'string' },
        section: { enum: sectionKeys },
        index: indexSchema,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'section', 'index'],
      properties: {
        kind: { const: 'section' },
        section: { enum: sectionKeys },
        index: indexSchema,
      },
    },
  ],
} as const

/** The open menu of a row, at the pointer or in a sheet, as `RowMenuOpen`. */
export const rowMenuOpenSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['at', 'label', 'entries'],
  properties: {
    at: { enum: ['pointer', 'sheet'] },
    /** The name of the workspace. */
    label: { type: 'string' },
    entries: entriesSchema,
    /** The choices of an open submenu, level with its item. */
    submenu: {
      type: 'object',
      additionalProperties: false,
      required: ['label', 'entries', 'item'],
      properties: {
        label: { type: 'string' },
        entries: entriesSchema,
        /** The place of its item: the first or the second. */
        item: { enum: [0, 1] },
        wide: { type: 'boolean' },
      },
    },
  },
} as const

/** What a view draws on a row, as `RowControls`. */
export const rowControlsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    open: rowMenuOpenSchema,
    /** A field in place of the name and the time, after Rename. */
    rename: {
      type: 'object',
      additionalProperties: false,
      required: ['value', 'selected'],
      properties: {
        value: { type: 'string' },
        selected: { type: 'boolean' },
      },
    },
    /** A view runs no script, so it draws the fill of a hover. */
    hovered: { type: 'boolean' },
  },
} as const
