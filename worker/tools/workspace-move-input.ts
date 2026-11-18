import { identifier, invalidInput } from '../chat/inputs'

export function workspaceMoveInput(body: Record<string, unknown>) {
  const sectionId =
    body.sectionId === undefined ? undefined : identifier(body.sectionId)
  const parentId =
    body.parentId === undefined ? undefined : identifier(body.parentId)
  if (body.topLevel !== undefined && typeof body.topLevel !== 'boolean')
    invalidInput()
  if (parentId !== undefined && body.topLevel === true) invalidInput()
  if (
    sectionId === undefined &&
    parentId === undefined &&
    body.topLevel !== true
  )
    invalidInput()
  return {
    kind: 'move' as const,
    sectionId,
    target:
      parentId !== undefined
        ? { kind: 'parent' as const, id: parentId }
        : body.topLevel === true
          ? { kind: 'top-level' as const }
          : undefined,
  }
}
