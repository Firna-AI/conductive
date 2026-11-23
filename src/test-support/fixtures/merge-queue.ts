import type { Workspace } from '../../shared/generated/Workspace'

/*
 * The merge queue of the fake list of Acme, for the tests and the dev
 * fake. The units name the queued workspaces, place 1 first, and each
 * queue holds the units of one repository.
 */

/** The queue of acme/storefront that the mockup page `app/merge-queue` draws. */
export const storefrontQueue: readonly (readonly string[])[] = [
  ['next-16'],
  ['fix-cart-flake'],
  ['apple-pay'],
  ['checkout-autocomplete'],
]

/** A member stack of acme/billing-service, as one unit. */
export const billingQueue: readonly (readonly string[])[] = [
  ['webhook-retries', 'retry-queue'],
]

/** The base on GitHub of a pull request that cannot join: a release branch. */
export const releaseBase = 'release/2026.11'

/**
 * The workspaces with the fields that the list read carries for the queue:
 * write access and a pull request into main for each open pull request,
 * except `invoice-fonts`, which targets a release branch, and the entry of
 * each workspace of `units`, from place 1 in each repository.
 */
export function withMergeQueue(
  workspaces: readonly Workspace[],
  units: readonly (readonly string[])[],
): Workspace[] {
  const repositoryOf = (id: string | undefined) =>
    workspaces.find((item) => item.id === id)?.repositoryId
  return workspaces.map((workspace): Workspace => {
    const open = workspace.github !== null && workspace.github !== 'merged'
    if (!open || workspace.state === 'archived') return workspace
    const unit = units.find((item) => item.includes(workspace.id))
    const peers = units
      .filter((item) => repositoryOf(item[0]) === workspace.repositoryId)
      .flat()
    return {
      ...workspace,
      githubCanWrite: true,
      githubPullBase: workspace.id === 'invoice-fonts' ? releaseBase : 'main',
      ...(unit && {
        mergeQueue: {
          queueId: `queue-${workspace.repositoryId}`,
          place: peers.indexOf(workspace.id) + 1,
          unitId: `unit-${unit[0]}`,
          state: 'queued' as const,
        },
      }),
    }
  })
}
