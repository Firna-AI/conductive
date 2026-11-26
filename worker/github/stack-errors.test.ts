import { expect, it, vi } from 'vitest'

import type { HttpFetch } from '../env'
import { errorResponse, HttpError } from '../http'
import {
  addPullRequestsToStack,
  createPullRequestStack,
  getPullRequestStack,
  listPullRequestStacks,
  unstackPullRequests,
} from './stack-client'
import {
  memberToken,
  repository,
  stackRepository,
} from './stack-client.test-support'
import { StreamedBody } from './streamed-body'

const list = (fetch: HttpFetch) =>
  listPullRequestStacks(fetch, memberToken, repository, 3)
const get = (fetch: HttpFetch) =>
  getPullRequestStack(fetch, memberToken, repository, 1)
const create = (fetch: HttpFetch) =>
  createPullRequestStack(fetch, memberToken, repository, [2, 3])
const add = (fetch: HttpFetch) =>
  addPullRequestsToStack(fetch, memberToken, repository, 1, [4])
const unstack = (fetch: HttpFetch) =>
  unstackPullRequests(fetch, memberToken, repository, 1)

const missing = [
  404,
  'github_not_found',
  'GitHub could not find the requested resource.',
] as const
const invalid = [
  422,
  'github_validation_failed',
  'GitHub refused the request.',
] as const
const conflict = [
  409,
  'github_conflict',
  'GitHub is processing another change. Try again.',
] as const
const forbidden = [
  403,
  'github_access_required',
  'Your GitHub account cannot access this resource.',
] as const
const unavailable = [
  502,
  'github_unavailable',
  'GitHub is not available. Try again.',
] as const

it.each([
  ['list', 404, list, missing],
  ['list', 422, list, invalid],
  ['get', 404, get, missing],
  ['create', 404, create, missing],
  ['create', 422, create, invalid],
  ['add', 404, add, missing],
  ['add', 409, add, conflict],
  ['add', 422, add, invalid],
  ['unstack', 404, unstack, missing],
  ['unstack', 409, unstack, conflict],
  ['unstack', 422, unstack, invalid],
  ['create', 401, create, forbidden],
  ['create', 403, create, forbidden],
  ['list', 429, list, unavailable],
  ['list', 503, list, unavailable],
  ['list', 302, list, unavailable],
] as const)(
  'maps %s HTTP %i to a safe error',
  async (_route, status, call, mapped) => {
    const body = new StreamedBody(100)
    const [statusCode, code, message] = mapped
    const response = await call(
      async () => new Response(body.stream, { status }),
    ).then(
      () => null,
      (error: unknown) => errorResponse(error),
    )
    expect(response?.status).toBe(statusCode)
    expect(await response?.json()).toEqual({ error: { code, message } })
    expect(body.readBytes).toBe(0)
    expect(body.cancelled).toBe(true)
  },
)

it('treats a GitHub rate limit as unavailable even when it returns 403', async () => {
  await expect(
    list(async () =>
      Response.json(
        {},
        {
          status: 403,
          headers: { 'Retry-After': '60' },
        },
      ),
    ),
  ).rejects.toMatchObject({ status: 502, code: 'github_unavailable' })
})

it('refuses an invalid stack without adding layers to the fake repository', async () => {
  const api = stackRepository()
  await expect(
    createPullRequestStack(api.fetch, memberToken, repository, [2]),
  ).rejects.toMatchObject({
    status: 422,
    code: 'github_validation_failed',
  })
  await create(api.fetch)
  api.pulls[4].baseRefName = 'main'
  await expect(add(api.fetch)).rejects.toMatchObject({
    status: 422,
    code: 'github_validation_failed',
  })
  api.stacks.lockedPulls.add(2).add(3)
  await expect(unstack(api.fetch)).rejects.toMatchObject({
    status: 422,
    code: 'github_validation_failed',
  })
  const stack = await get(api.fetch)
  expect(stack.layers.map((layer) => layer.number)).toEqual([2, 3])
})

it('rejects malformed JSON and success replies that do not match the route', async () => {
  await expect(
    list(async () => new Response('{bad private detail')),
  ).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
    message: 'GitHub is not available. Try again.',
  })
  await expect(list(async () => Response.json({}))).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
  await expect(create(async () => Response.json({}))).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
  await expect(
    get(async () => new Response(null, { status: 204 })),
  ).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
  await expect(unstack(async () => Response.json(null))).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
})

it('cancels a stack reply that exceeds the shared JSON budget', async () => {
  const body = new StreamedBody(28 * 1024 * 1024)
  await expect(
    get(async () => new Response(body.stream)),
  ).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
  })
  expect(body.readBytes).toBe(27_328_512)
  expect(body.cancelled).toBe(true)
})

it('keeps the shared request deadline during the stack body read', async () => {
  vi.useFakeTimers()
  try {
    let started: (signal: AbortSignal) => void = () => undefined
    const reading = new Promise<AbortSignal>((resolve) => {
      started = resolve
    })
    const result = get(
      async (request) =>
        new Response(
          new ReadableStream({
            pull(controller) {
              const { signal } = request
              signal.addEventListener(
                'abort',
                () => controller.error(signal.reason),
                { once: true },
              )
              started(signal)
            },
          }),
        ),
    )
    const outcome = expect(result).rejects.toMatchObject({
      status: 502,
      code: 'github_unavailable',
    })
    const signal = await reading
    await vi.advanceTimersByTimeAsync(29_999)
    expect(signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(signal.aborted).toBe(true)
    await outcome
  } finally {
    vi.useRealTimers()
  }
})

it('replaces a fetch exception with the fixed GitHub error', async () => {
  await expect(
    list(async () => {
      throw new HttpError(
        403,
        'github_access_required',
        'private network error',
      )
    }),
  ).rejects.toMatchObject({
    status: 502,
    code: 'github_unavailable',
    message: 'GitHub is not available. Try again.',
  })
})
