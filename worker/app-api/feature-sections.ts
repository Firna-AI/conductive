import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import type { RequestContext } from '../security/gate'
import {
  deleteShellSection,
  insertShellSection,
  updateShellSection,
} from './feature-sections-data'
import {
  invalidShellInput,
  optionalShellPosition,
  optionalShellString,
  requireShellWriter,
} from './feature-shell-access'
import { shellSections } from './shell-data'
import { workspaceBinding } from './workspace-state'

export async function featureSectionWrite(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  sectionId: string | null,
): Promise<Response> {
  if (!context.org) throw invalidShellInput()
  const orgId = context.org.id
  const userId = context.user.id
  await requireShellWriter(env.DB, orgId, userId)
  const sections = await shellSections(env.DB, orgId, userId)
  if (request.method === 'POST') {
    const id = dependencies.randomToken()
    const inserted = await insertShellSection(env.DB, {
      id,
      orgId,
      userId,
      name: requiredString(context.body?.name),
      now: dependencies.now(),
    })
    if (!inserted) await requireShellWriter(env.DB, orgId, userId)
    return Response.json(
      {
        section: (await shellSections(env.DB, orgId, userId)).find(
          (entry) => entry.id === id,
        ),
      },
      { status: 201 },
    )
  }
  const section = sections.find((entry) => entry.id === sectionId)
  if (!section) throw sectionNotFound()
  if (request.method === 'DELETE') {
    if (section.isDefault) return new Response(null, { status: 204 })
    const binding = workspaceBinding(env)
    const result = await deleteShellSection(env.DB, {
      orgId,
      userId,
      sectionId: section.id,
      now: dependencies.now(),
    })
    if (!result.deleted) {
      await requireShellWriter(env.DB, orgId, userId)
      throw sectionNotFound()
    }
    await Promise.all(
      result.workspaceIds.map((id) =>
        binding.getByName(id).publishWorkspaceMetadata(orgId, id),
      ),
    )
    return new Response(null, { status: 204 })
  }
  const requestedName = optionalShellString(context.body?.name)
  const name =
    requestedName === undefined ? undefined : requiredString(requestedName)
  const collapsed = context.body?.collapsed
  if (collapsed !== undefined && typeof collapsed !== 'boolean')
    throw invalidShellInput()
  const position = optionalShellPosition(context.body?.position)
  if (
    !(await updateShellSection(env.DB, {
      orgId,
      userId,
      sectionId: section.id,
      name,
      collapsed,
      position,
    }))
  ) {
    await requireShellWriter(env.DB, orgId, userId)
    throw sectionNotFound()
  }
  return Response.json({
    section: (await shellSections(env.DB, orgId, userId)).find(
      (entry) => entry.id === section.id,
    ),
  })
}

function sectionNotFound(): HttpError {
  return new HttpError(
    404,
    'section_not_found',
    'The section is not available.',
  )
}
