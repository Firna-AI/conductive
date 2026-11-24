import type { BucketList } from './bucket-layout'
import { natural } from './parsers'

/** An older writer can advance the tree revision while copying both count fields. */
export function validTreeOmissionCount({
  revision,
  omittedEntryCount,
  omittedEntryCountRevision,
}: BucketList['fields']): number | undefined {
  return natural(revision) &&
    revision === omittedEntryCountRevision &&
    natural(omittedEntryCount)
    ? omittedEntryCount
    : undefined
}

export function treeFieldsForRevision(
  fields: BucketList['fields'],
  revision: number,
  count: number | undefined,
): BucketList['fields'] {
  const updated: BucketList['fields'] = { ...fields, revision }
  if (count === undefined) {
    delete updated.omittedEntryCount
    delete updated.omittedEntryCountRevision
  } else {
    updated.omittedEntryCount = count
    updated.omittedEntryCountRevision = revision
  }
  return updated
}
