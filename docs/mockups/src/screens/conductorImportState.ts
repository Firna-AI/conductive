import type { SchemaProps } from '@mokly/mokly'

/**
 * The state of the import from Conductor in the Mac app. Each catalogue
 * entry of the import is a set of these props, and Mokly's serve controls
 * can change each one.
 */
export const conductorImportSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['step', 'selection', 'rows', 'viewer'],
  properties: {
    /**
     * The step of the import: the one-time offer over a workspace, the
     * entry in the settings, the question of the Mac app before its first
     * read, the read, the answer Don't Allow, and the list. Then the start
     * of the upload, before any workspace is complete, the upload after
     * the first workspace appeared, and its end. `retry` is Try again of an
     * unfinished upload, which sends only its missing parts.
     */
    step: {
      enum: [
        'offer',
        'settings',
        'consent',
        'reading',
        'denied',
        'list',
        'uploading',
        'progress',
        'done',
        'retry',
      ],
    },
    /** The rows that the list selects: two, all, one, or none. */
    selection: { enum: ['two', 'all', 'one', 'none'] },
    /**
     * What the list finds: the workspaces of Conductor, the same after the
     * first import, whose two rows link to their workspaces, the same after
     * an upload that stopped, with one unfinished row, the same after that
     * row expired, or none.
     */
    rows: { enum: ['first', 'after-import', 'unfinished', 'expired', 'none'] },
    /** The person signed in: an admin of the org, or a member who is not. */
    viewer: { enum: ['admin', 'member'] },
  },
} as const

export type ConductorImportState = SchemaProps<typeof conductorImportSchema>

/** The list of the first import, with the first two rows selected. */
export const firstImport: ConductorImportState = {
  step: 'list',
  selection: 'two',
  rows: 'first',
  viewer: 'admin',
}

/**
 * The list on a later visit, after the upload of the first import stopped
 * during its second workspace. Nothing is selected.
 */
export const unfinishedList: ConductorImportState = {
  ...firstImport,
  selection: 'none',
  rows: 'unfinished',
}

/**
 * Whether a state equals an example in every field of its schema apart
 * from the step. Every saved step of a flow does, so only such a state has
 * a drawn step to open.
 */
export function matchesExample(
  state: ConductorImportState,
  example: ConductorImportState,
): boolean {
  return conductorImportSchema.required.every(
    (field) => field === 'step' || state[field] === example[field],
  )
}
