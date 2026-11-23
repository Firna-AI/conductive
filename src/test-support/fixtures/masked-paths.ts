import type { ChangedFile } from '../../shared/generated/ChangedFile'
import type { DiffResponse } from '../../shared/generated/DiffResponse'
import type { FileResponse } from '../../shared/generated/FileResponse'
import {
  filesFor,
  seedScriptDiff,
} from '../../../docs/mockups/src/fixtures/maskedFiles'
import type { WorkspaceEventEnvelope } from '../../shared/events'

/**
 * The fake value of a secret org env var that two paths of the masked
 * mockups hold. The mockups draw the value as "[redacted]", as the Worker
 * shows it in a label.
 */
const MASKED_VALUE = 'acme-7f3k'

const marker = '[redacted]'

/**
 * A target branch that holds the fake secret value, with the label that
 * the Worker sends beside it in a GitHub state.
 */
export const MASKED_BASE = {
  baseBranch: `release/${MASKED_VALUE}`,
  displayBaseBranch: `release/${marker}`,
} as const

/**
 * A workspace branch that holds the fake secret value, with its label. A
 * screen of a workspace compares the real branch with the branch of the
 * workspace record, so only a GitHub state without a record takes it.
 */
export const MASKED_HEAD = {
  branch: `calummoore/checkout-${MASKED_VALUE}`,
  displayBranch: `calummoore/checkout-${marker}`,
} as const

/**
 * A default branch of the repository that holds the fake secret value, with
 * the label that the Worker sends beside it in the question and the note of
 * Continue. It differs from `MASKED_BASE`, the target of the pull request.
 */
export const MASKED_DEFAULT = {
  baseBranch: `develop/${MASKED_VALUE}`,
  displayBaseBranch: `develop/${marker}`,
} as const

/** The new branch of a Continue that holds the fake secret value, with its label. */
export const MASKED_CONTINUED = {
  branch: `calummoore/checkout-${MASKED_VALUE}-v2-3f8d`,
  displayBranch: `calummoore/checkout-${marker}-v2-3f8d`,
} as const

/**
 * The new branch of a repository change that holds the fake secret value,
 * with its label. It starts from `MASKED_DEFAULT`, the default branch of
 * the new repository.
 */
export const MASKED_MOVED = {
  branch: `calummoore/checkout-${MASKED_VALUE}-v2-9c1e`,
  displayBranch: `calummoore/checkout-${marker}-v2-9c1e`,
} as const

/**
 * A record of the mockups, whose path is a label, as the Worker sends it:
 * the real path, with the label as its display path when the two differ.
 */
export function withRealPath<T extends { path: string }>(
  record: T,
): T & { displayPath?: string } {
  const path = record.path.replaceAll(marker, MASKED_VALUE)
  return path === record.path
    ? record
    : { ...record, path, displayPath: record.path }
}

/** The two changed files of the masked mockups, by their real paths. */
export function maskedChangedFiles(): ChangedFile[] {
  return filesFor('masked')
    .changes.filter((file) => file.path.includes(marker))
    .map(({ path, change, added, removed }) =>
      withRealPath({ path, change, added, removed }),
    )
}

/**
 * A file that moved after its tab opened. No list names it, so its tab and
 * its page show "File", and its read answers that the file is not there.
 */
export const MASKED_GONE_PATH = `src/lib/legacy-${MASKED_VALUE}.ts`

/** The seed script of the masked mockups, by its real path. */
export const MASKED_SEED_PATH = `scripts/seed-${MASKED_VALUE}.sql`

/**
 * The fake value of a second secret org env var. A path that holds it and
 * a path that holds `MASKED_VALUE` in its place have the same label.
 */
const SECOND_VALUE = 'beta-2m9q'

/**
 * The changed files that the question of a repository change adds to the
 * work of the mockups, by their real paths, with the labels that the Worker
 * sends beside them in the same order: two seed scripts of the old folder,
 * which stay, and two refund scripts of the new folder, which move to the
 * new branch. The two paths of each folder differ only in the values of two
 * secrets, so they have the same label.
 */
export const MASKED_REPOSITORY_WORK = {
  left: {
    files: [MASKED_SEED_PATH, `scripts/seed-${SECOND_VALUE}.sql`],
    displayFiles: [`scripts/seed-${marker}.sql`, `scripts/seed-${marker}.sql`],
  },
  carried: {
    files: [
      `src/invoices/refunds-${MASKED_VALUE}.ts`,
      `src/invoices/refunds-${SECOND_VALUE}.ts`,
    ],
    displayFiles: [
      `src/invoices/refunds-${marker}.ts`,
      `src/invoices/refunds-${marker}.ts`,
    ],
  },
} as const

const seedLines = seedScriptDiff
  .flatMap((hunk) => hunk.lines)
  .filter((line) => line.kind === 'added')
  .map((line) => line.text)

/** The read of the masked seed script, with the label of its path. */
export function maskedSeedFile(): FileResponse {
  const content = `${seedLines.join('\n')}\n`
  return withRealPath({
    path: `scripts/seed-${marker}.sql`,
    mediaType: 'application/sql',
    encoding: 'utf-8',
    content,
    sizeBytes: new TextEncoder().encode(content).byteLength,
  })
}

/** The diff of the masked seed script, a new file. */
export function maskedSeedDiff(): DiffResponse {
  return withRealPath({
    path: `scripts/seed-${marker}.sql`,
    baseBranch: 'main',
    oldContent: null,
    newContent: maskedSeedFile().content,
    binary: false,
    patch: `@@ -0,0 +1,${seedLines.length} @@\n${seedLines
      .map((line) => `+${line}\n`)
      .join('')}`,
  })
}

/**
 * The stored chat with the masked files at the end of each finished turn,
 * as the Worker stores them: the real path and its label.
 */
export function withMaskedTurnFiles(
  events: readonly WorkspaceEventEnvelope[],
  masked: readonly ChangedFile[],
): WorkspaceEventEnvelope[] {
  return events.map((envelope) =>
    envelope.event.type === 'turn.completed'
      ? {
          ...envelope,
          event: {
            ...envelope.event,
            files: [...envelope.event.files, ...masked],
          },
        }
      : envelope,
  )
}
