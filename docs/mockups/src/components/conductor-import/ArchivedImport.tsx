import { Archive } from 'lucide-react'
import { archivedOn } from '../../fixtures/archive'
import { EmptyState } from '../common/EmptyState'
import { Notice } from '../common/Notice'

/**
 * The bar of a workspace from Conductor that was archived before a
 * successful activation, in place of the composer. No activation
 * succeeded, so the bar names no deleted cloud computer. Its old sessions
 * stay readable.
 */
export function ArchivedImportBar() {
  return (
    <Notice
      body="Its sessions from Conductor stay readable."
      icon={Archive}
      title={`Archived on ${archivedOn}`}
    />
  )
}

/**
 * What the files panel of that workspace shows. No activation brought its
 * files in, so it has no files and no tools.
 */
export function ArchivedImportPanel() {
  return (
    <EmptyState
      body="It was never activated, so it has no files or tools."
      icon={Archive}
      title="Archived"
    />
  )
}
