import { ProviderError } from './errors'

export type BoatRoute =
  | { operation: 'account' | 'create' | 'saveSnapshot' }
  | {
      operation:
        | 'get'
        | 'stop'
        | 'resume'
        | 'fork'
        | 'delete'
        | 'update'
        | 'command'
        | 'host'
        | 'desktop'
      sandboxId: string
    }
  | { operation: 'getSnapshot' | 'deleteSnapshot'; name: string }
  | { operation: 'readFile'; sandboxId: string; path: string; maxBytes: number }
  | { operation: 'fileInfo'; sandboxId: string; path: string }

export function boatRoute(route: BoatRoute): { method: string; path: string } {
  switch (route.operation) {
    case 'readFile':
      return {
        method: 'GET',
        path: `/sandboxes/${segment(route.sandboxId)}/files?${new URLSearchParams({ path: route.path, encoding: 'base64' })}`,
      }
    case 'fileInfo':
      return {
        method: 'GET',
        path: `/sandboxes/${segment(route.sandboxId)}/files/info?${new URLSearchParams({ path: route.path })}`,
      }
    case 'account':
      return { method: 'GET', path: '/orgs' }
    case 'create':
      return { method: 'POST', path: '/sandboxes' }
    case 'saveSnapshot':
      return { method: 'POST', path: '/saved-snapshots' }
    case 'getSnapshot':
      return { method: 'GET', path: `/saved-snapshots/${segment(route.name)}` }
    case 'deleteSnapshot':
      return {
        method: 'DELETE',
        path: `/saved-snapshots/${segment(route.name)}`,
      }
    case 'get':
      return { method: 'GET', path: `/sandboxes/${segment(route.sandboxId)}` }
    case 'update':
      return { method: 'PATCH', path: `/sandboxes/${segment(route.sandboxId)}` }
    case 'delete':
      return {
        method: 'DELETE',
        path: `/sandboxes/${segment(route.sandboxId)}`,
      }
    case 'command':
      return {
        method: 'POST',
        path: `/sandboxes/${segment(route.sandboxId)}/commands`,
      }
    case 'stop':
    case 'resume':
    case 'fork':
    case 'host':
    case 'desktop':
      return {
        method: 'POST',
        path: `/sandboxes/${segment(route.sandboxId)}/${route.operation}`,
      }
  }
}

function segment(value: string): string {
  if (
    !value ||
    value === '.' ||
    value === '..' ||
    /[/\\?#]/.test(value) ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  ) {
    throw new ProviderError('invalid_request', 400)
  }
  return encodeURIComponent(value)
}
