import { isRecord } from '../http'
import { restPull } from './fake-pull'
import { canWritePulls } from './fake-pull-writes'
import type { RepositoryGitHub } from './fake-repository'

interface FakeStack {
  number: number
  baseBranch: string
  pullNumbers: number[]
}

function invalidStack() {
  return Response.json(
    { message: 'The pull requests cannot form this stack.' },
    { status: 422 },
  )
}

function missingStack() {
  return Response.json({ message: 'Missing stack.' }, { status: 404 })
}

export class RepositoryStacks {
  readonly lockedPulls = new Set<number>()
  loseNextCreateReply = false
  private nextNumber = 1
  private readonly stacks = new Map<number, FakeStack>()
  private readonly api: RepositoryGitHub

  constructor(api: RepositoryGitHub) {
    this.api = api
  }

  landThrough(pullNumber: number) {
    for (const stack of this.stacks.values()) {
      const end = stack.pullNumbers.indexOf(pullNumber)
      if (end < 0) continue
      for (const number of stack.pullNumbers.slice(0, end + 1)) {
        const pull = this.api.pulls[number]
        if (pull.state === 'OPEN') {
          pull.state = 'MERGED'
          pull.mergedAt = this.api.pulls[pullNumber].mergedAt
        }
      }
    }
  }

  private reply(stack: FakeStack, minimal: boolean) {
    const pulls = stack.pullNumbers.map((number) =>
      restPull(this.api.pulls[number], this.api),
    )
    return {
      id: 10_000 + stack.number,
      number: stack.number,
      node_id: `STACK_${stack.number}`,
      url: `https://api.github.com/repos/${this.api.fullName}/stacks/${stack.number}`,
      base: { ref: stack.baseBranch },
      open: pulls.some((pull) => pull.state === 'open'),
      created_at: '2026-11-23T00:00:00Z',
      pull_requests: minimal
        ? pulls.map(({ number, state, draft, merged_at, head }) => ({
            number,
            state,
            draft,
            merged_at,
            head: { ref: head.ref, sha: head.sha },
          }))
        : pulls,
    }
  }

  private unstack(stack: FakeStack): Response {
    if (stack.pullNumbers.every((number) => this.lockedPulls.has(number)))
      return invalidStack()
    stack.pullNumbers = stack.pullNumbers.filter(
      (number) =>
        this.lockedPulls.has(number) ||
        this.api.pulls[number].state === 'MERGED',
    )
    if (stack.pullNumbers.length > 0)
      return Response.json(this.reply(stack, false))
    this.stacks.delete(stack.number)
    return new Response(null, { status: 204 })
  }

  private canAppend(numbers: number[], previous: number | undefined): boolean {
    const stacked = new Set(
      [...this.stacks.values()].flatMap((stack) => stack.pullNumbers),
    )
    for (const number of numbers) {
      const pull = this.api.pulls[number]
      if (
        !pull ||
        stacked.has(number) ||
        pull.state !== 'OPEN' ||
        pull.headRepository.databaseId !== this.api.repositoryId ||
        (previous !== undefined &&
          this.api.pulls[previous].headRefName !== pull.baseRefName)
      )
        return false
      stacked.add(number)
      previous = number
    }
    return true
  }

  async fetch(
    request: Request,
    number: number | undefined,
    action: string | undefined,
  ): Promise<Response> {
    const stack = number === undefined ? undefined : this.stacks.get(number)
    if (number !== undefined && !stack) return missingStack()
    if (request.method === 'GET' && action === undefined) {
      if (stack) return Response.json(this.reply(stack, false))
      const filter = new URL(request.url).searchParams.get('pull_request')
      const pullNumber = Number(filter)
      if (
        filter !== null &&
        (!Number.isSafeInteger(pullNumber) || pullNumber <= 0)
      )
        return invalidStack()
      return Response.json(
        [...this.stacks.values()]
          .filter(
            (stack) =>
              filter === null || stack.pullNumbers.includes(pullNumber),
          )
          .map((stack) => this.reply(stack, true)),
      )
    }
    if (request.method !== 'POST' || (stack && action === undefined))
      return missingStack()
    if (!canWritePulls(this.api, request))
      return Response.json(
        { message: 'The token cannot edit stacks.' },
        { status: 403 },
      )
    if (stack && action === 'unstack') return this.unstack(stack)
    const input: unknown = await request.json()
    if (!isRecord(input) || !Array.isArray(input.pull_requests))
      return invalidStack()
    const numbers: unknown[] = input.pull_requests
    if (
      numbers.length < (stack ? 1 : 2) ||
      numbers.length > 100 ||
      !numbers.every(
        (number): number is number =>
          typeof number === 'number' && Number.isSafeInteger(number),
      ) ||
      !this.canAppend(numbers, stack?.pullNumbers.at(-1))
    )
      return invalidStack()
    if (stack) {
      stack.pullNumbers.push(...numbers)
      return Response.json(this.reply(stack, false))
    }
    const created = {
      number: this.nextNumber++,
      baseBranch: this.api.pulls[numbers[0]].baseRefName,
      pullNumbers: numbers,
    }
    this.stacks.set(created.number, created)
    if (this.loseNextCreateReply) {
      this.loseNextCreateReply = false
      return new Response(null, { status: 503 })
    }
    return Response.json(this.reply(created, false), { status: 201 })
  }
}
