/** Tag ref names are raw Git bytes. Git forbids whitespace and NUL in them. */
export function tagRecord(
  oid: string,
  name: Uint8Array,
): Uint8Array<ArrayBuffer> {
  const prefix = new TextEncoder().encode(`${oid} `)
  const record = new Uint8Array(prefix.length + name.length + 1)
  record.set(prefix)
  record.set(name, prefix.length)
  record[record.length - 1] = 10
  return record
}

/** Native Git checks all advertised targets in one batch without fetching objects. */
export function sourceTagCommands(git: string): string[] {
  const path = '.git/conducting-image-source.tags'
  return [
    'export LC_ALL=C GIT_NO_LAZY_FETCH=1',
    `${git} cat-file --batch-check='%(objectname) %(objecttype) %(rest)' < ${path} > ${path}.checked`,
    `awk '$2 ~ /^(blob|tree|commit|tag)$/ && $3 ~ /^refs\\/tags\\// { print "update " $3 " " $1 }' ${path}.checked > ${path}.updates`,
    `${git} for-each-ref --format='delete %(refname)' refs/tags/ > ${path}.deletes`,
    `${git} update-ref --stdin < ${path}.deletes`,
    `${git} update-ref --stdin < ${path}.updates`,
    `rm -f -- ${path} ${path}.checked ${path}.updates ${path}.deletes`,
  ]
}
