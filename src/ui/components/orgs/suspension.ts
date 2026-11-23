import type { LucideIcon } from 'lucide-react'
import { Ban } from 'lucide-react'
import { abuseAddress } from '../../../../../src/marketing/legal-text'

/**
 * The mark of a refusal: a refused start, and the notice of a suspended
 * org, so that each refusal has one design with its own words. This module
 * imports no fixture, so the app can use it.
 */
export const refusedIcon: LucideIcon = Ban

/**
 * The words of the notice of a suspended org. They promise no files,
 * because a stopped disk can expire while the org is suspended. They do not
 * say that the cloud computers are stopped, because a stop can still run.
 */
export function suspendedOrgCopy(orgName: string): {
  title: string
  body: string
} {
  return {
    title: `${orgName} is suspended`,
    body: `Its workspaces and settings are read-only. For questions, write to ${abuseAddress}.`,
  }
}

/**
 * The words of the app when it refuses a start in a suspended org. They
 * give the address for abuse reports, because no member can end the
 * suspension.
 */
export const orgSuspendedReason = `This org is suspended. For questions, write to ${abuseAddress}.`
