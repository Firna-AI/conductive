import {
  ownComputersPath,
  type AddOwnComputerRequest,
  type AddOwnComputerResponse,
  type OwnComputerLimitRequest,
  type OwnComputerResponse,
  type OwnComputersResponse,
} from '../../src/shared/own-computers'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import { requireOrgAdmin, requireOrgMember } from '../members/permissions'
import type { RequestContext } from '../security/gate'
import { closeRevokedComputerConnection } from './client'
import {
  insertComputer,
  readCurrentCode,
  replaceComputerCode,
} from './code-data'
import { makeComputerCode, showComputerCode } from './codes'
import { readComputerAccess } from './connection-data'
import {
  markComputerRemoved,
  recordBuildRequest,
  setComputerLimit,
} from './data'
import { computerNotFound, type ComputerOwner } from './identity'
import { computerView, listComputerViews, requireComputer } from './views'

type ComputerAction =
  'read' | 'limit' | 'remove' | 'showCode' | 'newCode' | 'build'

function computerAction(
  method: string,
  suffix: string | undefined,
): ComputerAction | null {
  if (suffix === 'code') {
    if (method === 'GET') return 'showCode'
    if (method === 'POST') return 'newCode'
  }
  if (suffix === 'builds' && method === 'POST') return 'build'
  if (suffix !== undefined) return null
  if (method === 'GET') return 'read'
  if (method === 'PATCH') return 'limit'
  if (method === 'DELETE') return 'remove'
  return null
}

export async function ownComputersRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const userId = context.user.id
  const path = new URL(request.url).pathname
  const root = ownComputersPath(orgId)
  if (path === root && request.method === 'GET') {
    await requireOrgMember(env.DB, orgId, userId)
    return Response.json({
      computers: await listComputerViews(env, orgId, dependencies.now()),
    } satisfies OwnComputersResponse)
  }
  if (path === root && request.method === 'POST') {
    await requireOrgAdmin(env.DB, orgId, userId)
    const input: AddOwnComputerRequest = {
      name: requiredString(context.body?.name),
    }
    const owner = { orgId, computerId: dependencies.randomToken() }
    const now = dependencies.now()
    const code = await makeComputerCode(env, owner, now)
    await insertComputer(env.DB, owner, input.name, userId, now, code.stored)
    const row = await requireComputer(env.DB, owner)
    return Response.json(
      {
        computer: await computerView(env, row, now),
        ...code.reply,
      } satisfies AddOwnComputerResponse,
      { status: 201 },
    )
  }
  if (!path.startsWith(`${root}/`)) return null
  const [id, suffix, ...extra] = path.slice(root.length + 1).split('/')
  if (!id || extra.length) return null
  const action = computerAction(request.method, suffix)
  if (!action) return null
  let computerId: string
  try {
    computerId = decodeURIComponent(id)
  } catch {
    throw computerNotFound()
  }
  if (action === 'read') await requireOrgMember(env.DB, orgId, userId)
  else await requireOrgAdmin(env.DB, orgId, userId)
  const owner = { orgId, computerId }
  const now = dependencies.now()
  if (action === 'remove') return removeComputer(env, owner, userId, now)
  const row = await requireComputer(env.DB, owner)

  switch (action) {
    case 'showCode': {
      const saved = await readCurrentCode(env.DB, owner, now)
      if (!saved) {
        await requireComputer(env.DB, owner)
        throw new HttpError(
          409,
          'code_unavailable',
          'The code is no longer available.',
        )
      }
      return Response.json(await showComputerCode(env, owner, saved))
    }
    case 'newCode': {
      const code = await makeComputerCode(env, owner, now)
      if (!(await replaceComputerCode(env.DB, owner, code.stored))) {
        await requireComputer(env.DB, owner)
        throw new HttpError(
          409,
          'computer_already_connected',
          'The own computer has already connected.',
        )
      }
      await closeRevokedComputerConnection(env, owner)
      return Response.json(code.reply)
    }
    case 'limit': {
      const limit = context.body?.limit
      if (
        typeof limit !== 'number' ||
        !Number.isSafeInteger(limit) ||
        limit < 1
      )
        throw new HttpError(
          400,
          'invalid_input',
          'Enter a whole number of 1 or more.',
        )
      const input: OwnComputerLimitRequest = { limit }
      if (!(await setComputerLimit(env.DB, owner, input.limit))) {
        await requireComputer(env.DB, owner)
        throw connectionRequired()
      }
      break
    }
    case 'build':
      if (!(await recordBuildRequest(env.DB, owner, userId, now))) {
        await requireComputer(env.DB, owner)
        throw connectionRequired()
      }
      break
    case 'read':
      return Response.json({
        computer: await computerView(env, row, now),
      } satisfies OwnComputerResponse)
  }

  return Response.json(
    {
      computer: await computerView(
        env,
        await requireComputer(env.DB, owner),
        now,
      ),
    } satisfies OwnComputerResponse,
    { status: action === 'build' ? 202 : 200 },
  )
}

async function removeComputer(
  env: AppEnv,
  owner: ComputerOwner,
  userId: string,
  now: number,
) {
  if (!(await markComputerRemoved(env.DB, owner, userId, now))) {
    const access = await readComputerAccess(env.DB, owner)
    if (!access) throw computerNotFound()
  }
  await closeRevokedComputerConnection(env, owner, true)
  return new Response(null, { status: 204 })
}

function connectionRequired() {
  return new HttpError(
    409,
    'computer_never_connected',
    'Connect the own computer first.',
  )
}
