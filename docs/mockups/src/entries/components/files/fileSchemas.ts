import type { FileTabView } from '../../../components/files/FilesPanel'
import type { ChangeKind, TreeEntry } from '../../../fixtures/files'

/** The kinds of a change of a file, as `ChangeKind` lists them. */
export const changeKinds = [
  'added',
  'modified',
  'deleted',
] as const satisfies readonly ChangeKind[]

/** A changed file of the branch as JSON, with the fields of `ChangedFile`. */
export const changedFileSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'change', 'added', 'removed'],
  properties: {
    path: { type: 'string', minLength: 1 },
    change: { enum: changeKinds },
    /** The lines that the change adds. */
    added: { type: 'integer', minimum: 0 },
    /** The lines that the change removes. */
    removed: { type: 'integer', minimum: 0 },
    /** The file has a drawn diff, which opening it from Changes shows. */
    diff: { type: 'boolean' },
  },
} as const

/** The totals of a list of changes as JSON, with the fields of `ChangeTotals`. */
const changeTotalsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['files', 'added', 'removed'],
  properties: {
    files: { type: 'integer', minimum: 0 },
    added: { type: 'integer', minimum: 0 },
    removed: { type: 'integer', minimum: 0 },
  },
} as const

/**
 * The totals of a list of changes that leaves out files, as JSON, with the
 * fields of `LimitedTotals`: the listed files and the omitted files.
 */
export const limitedTotalsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['listed', 'omitted'],
  properties: { listed: changeTotalsSchema, omitted: changeTotalsSchema },
} as const

/** The tabs that a file of All files opens, as `TreeEntry` lists them. */
export const treePreviews = [
  'code',
  'markdown',
  'image',
  'image-not-drawn',
  'html',
] as const satisfies readonly NonNullable<TreeEntry['preview']>[]

/** An entry of All files as JSON, with the fields of `TreeEntry`. */
export const treeEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'depth', 'folder'],
  properties: {
    name: { type: 'string', minLength: 1 },
    /** The nesting depth from the root of the repository. */
    depth: { type: 'integer', minimum: 0 },
    folder: { type: 'boolean' },
    /** A folder whose entries show below it. */
    open: { type: 'boolean' },
    change: { enum: changeKinds },
    /** The tab that opening the file shows, when the mockups draw one. */
    preview: { enum: treePreviews },
  },
} as const

/** The kinds of file that open as a tab, as `FileTabView` lists them. */
export const fileTabViews = [
  'code',
  'code-lines',
  'markdown',
  'diff',
  'masked-diff',
  'unnamed',
  'image',
  'image-not-drawn',
  'attachment',
  'screenshot',
  'html',
  'html-source',
  'html-opening',
  'html-older-software',
  'html-failed',
] as const satisfies readonly FileTabView[]
