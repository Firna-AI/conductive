import {
  couponTotals,
  importedWorkspaces,
} from '../fixtures/importedWorkspaces'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import {
  firstImport,
  matchesExample,
  unfinishedList,
  type ConductorImportState,
} from './conductorImportState'
import { importedWorkspace } from './workspaceState'

/**
 * Where the own controls of the import flow lead, in one state of the
 * flow. Null keeps a control static.
 */
export type ImportLinks = Readonly<{
  /**
   * The question before the read, which Import of the offer, Choose
   * workspaces, and Ask again open.
   */
  consent: string | null
  /** The read, after Allow. */
  reading: string | null
  /** The answer Don't Allow. */
  denied: string | null
  /** The start of the upload, after Import of the list. */
  upload: string | null
  /** Try again of an unfinished row, which sends only its missing parts. */
  retry: string | null
  /** The imported workspace that the mockups draw, which its chip opens. */
  workspace: string | null
}>

/**
 * The imported workspaces that exist in the org in a state. Each workspace
 * appears only when its own upload ends, so the start of the upload shows
 * none, and an upload that stopped or runs again shows only the workspace
 * that finished first.
 */
export function visibleImports(
  state: ConductorImportState,
): readonly Workspace[] {
  switch (state.step) {
    case 'uploading':
      return []
    case 'progress':
    case 'retry':
      return [couponTotals]
    case 'done':
      return importedWorkspaces
    default:
      switch (state.rows) {
        case 'after-import':
          return importedWorkspaces
        case 'unfinished':
        case 'expired':
          return [couponTotals]
        case 'first':
        case 'none':
          return []
      }
  }
}

/**
 * Whether the org list of a state matches the drawn list after the import,
 * which shows both workspaces, for the viewer of the imported entries. Only
 * then do the chip, the sidebar row, and the tile of Acme open a drawn
 * screen. The list of a state that shows one workspace has no drawn match.
 */
export function drawnImportList(state: ConductorImportState): boolean {
  return (
    visibleImports(state).length === importedWorkspaces.length &&
    state.viewer === importedWorkspace.viewer
  )
}

/**
 * The links of the import flow, from its full state. A step opens only
 * from a state that matches the example of its flow apart from the step,
 * so no link changes the selection, the rows, or the person signed in.
 * The chip opens its workspace only where the org list matches the drawn
 * one. Every other state keeps the control static.
 */
export function importLinks(state: ConductorImportState): ImportLinks {
  const steps = matchesExample(state, firstImport)
  return {
    consent: steps ? paths.macImportConsent : null,
    reading: steps ? paths.macImportReading : null,
    denied: steps ? paths.macImportDenied : null,
    upload: steps ? paths.macImportUploading : null,
    retry: matchesExample(state, unfinishedList) ? paths.macImportRetry : null,
    workspace: drawnImportList(state) ? paths.imported : null,
  }
}
