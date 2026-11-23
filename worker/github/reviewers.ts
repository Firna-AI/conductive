import { nextPage, nodes, object, text } from './parsers'

export async function readChangesRequestedBy(
  firstPage: unknown,
  next: (after: string) => Promise<unknown>,
): Promise<string[]> {
  const reviewers: string[] = []
  let after: string | null = null
  let connection = object(firstPage)
  do {
    for (const value of nodes(connection.nodes)) {
      const review = object(value)
      if (review.state === 'CHANGES_REQUESTED' && review.author !== null) {
        reviewers.push(text(object(review.author).login))
      }
    }
    after = nextPage(connection.pageInfo, after)
    if (after !== null) connection = object(await next(after))
  } while (after !== null)
  return reviewers
}
