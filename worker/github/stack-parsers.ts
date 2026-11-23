import { choice, date, flag, integer, nodes, object, text } from './parsers'

export interface GitHubStackLayer {
  number: number
  state: 'open' | 'closed'
  draft: boolean
  mergedAt: number | null
  headBranch: string
  headSha: string
}

export interface GitHubStackPullRequest extends GitHubStackLayer {
  nodeId: string
  baseBranch: string
  baseSha: string
  headRepositoryId: number
  baseRepositoryId: number
}

export interface GitHubStack<
  Layer extends GitHubStackLayer = GitHubStackPullRequest,
> {
  id: number
  number: number
  nodeId: string
  baseBranch: string
  open: boolean
  layers: Layer[]
}

export interface GitHubStackMembership {
  baseBranch: string
  baseSha: string
  id?: number
  number?: number
  size?: number
  position?: number
}

function parseLayer(input: Record<string, unknown>): GitHubStackLayer {
  const head = object(input.head)
  return {
    number: integer(input.number),
    state: choice(input.state, ['open', 'closed']),
    draft: flag(input.draft),
    mergedAt: date(input.merged_at),
    headBranch: text(head.ref),
    headSha: text(head.sha),
  }
}

function parsePullRequest(
  input: Record<string, unknown>,
): GitHubStackPullRequest {
  const base = object(input.base)
  return {
    ...parseLayer(input),
    nodeId: text(input.node_id),
    baseBranch: text(base.ref),
    baseSha: text(base.sha),
    headRepositoryId: integer(object(object(input.head).repo).id),
    baseRepositoryId: integer(object(base.repo).id),
  }
}

function parseStack<Layer extends GitHubStackLayer>(
  value: unknown,
  layer: (input: Record<string, unknown>) => Layer,
): GitHubStack<Layer> {
  const input = object(value)
  return {
    id: integer(input.id),
    number: integer(input.number),
    nodeId: text(input.node_id),
    baseBranch: text(object(input.base).ref),
    open: flag(input.open),
    layers: nodes(input.pull_requests).map((pull) => layer(object(pull))),
  }
}

export function parseGitHubStack(value: unknown): GitHubStack {
  return parseStack(value, parsePullRequest)
}

export function parseGitHubStackList(
  value: unknown,
): GitHubStack<GitHubStackLayer>[] {
  return nodes(value).map((stack) => parseStack(stack, parseLayer))
}

export function parseGitHubStackMembership(
  value: unknown,
): GitHubStackMembership {
  const input = object(value)
  const base = object(input.base)
  return {
    baseBranch: text(base.ref),
    baseSha: text(base.sha),
    ...(input.id === undefined ? {} : { id: integer(input.id) }),
    ...(input.number === undefined ? {} : { number: integer(input.number) }),
    ...(input.size === undefined ? {} : { size: integer(input.size) }),
    ...(input.position === undefined
      ? {}
      : { position: integer(input.position) }),
  }
}
