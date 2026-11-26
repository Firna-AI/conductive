/**
 * The search of the secrets part of the Capabilities control. A long list
 * of secrets gets a search field above it, which narrows the list by name
 * and by description. The app and the mockups take the rule from here.
 */

/** The most secrets that the secrets part lists without a search field. */
const SECRETS_WITHOUT_SEARCH = 10

/** The secrets part shows a search field above more than ten secrets. */
export function needsSecretSearch(count: number): boolean {
  return count > SECRETS_WITHOUT_SEARCH
}

/**
 * The secrets whose name or description holds the search, with case
 * ignored, in their order. An empty search keeps each secret.
 */
export function matchingSecrets<
  T extends { name: string; description: string },
>(secrets: readonly T[], search: string): readonly T[] {
  const query = search.trim().toLowerCase()
  if (query === '') return secrets
  return secrets.filter(
    (secret) =>
      secret.name.toLowerCase().includes(query) ||
      secret.description.toLowerCase().includes(query),
  )
}
