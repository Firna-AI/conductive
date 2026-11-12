import { sandboxSegment, snapshotId } from './identity'

export type E2bRoute =
  | { operation: 'create' | 'listSandboxes' | 'listSnapshots' }
  | {
      operation:
        'get' | 'delete' | 'pause' | 'connect' | 'timeout' | 'saveSnapshot'
      sandboxId: string
    }
  | { operation: 'deleteSnapshot'; snapshotId: string }

export function controlRoute(route: E2bRoute): {
  method: string
  path: string
} {
  switch (route.operation) {
    case 'create':
      return { method: 'POST', path: '/v2/sandboxes' }
    case 'listSandboxes':
      return { method: 'GET', path: '/v2/sandboxes' }
    case 'listSnapshots':
      return { method: 'GET', path: '/snapshots' }
    case 'deleteSnapshot':
      return {
        method: 'DELETE',
        path: `/templates/${encodeURIComponent(snapshotId(route.snapshotId))}`,
      }
    case 'get':
      return {
        method: 'GET',
        path: `/sandboxes/${sandboxSegment(route.sandboxId)}`,
      }
    case 'delete':
      return {
        method: 'DELETE',
        path: `/sandboxes/${sandboxSegment(route.sandboxId)}`,
      }
    case 'connect':
      return {
        method: 'POST',
        path: `/v2/sandboxes/${sandboxSegment(route.sandboxId)}/connect`,
      }
    case 'pause':
    case 'timeout':
      return {
        method: 'POST',
        path: `/sandboxes/${sandboxSegment(route.sandboxId)}/${route.operation}`,
      }
    case 'saveSnapshot':
      return {
        method: 'POST',
        path: `/sandboxes/${sandboxSegment(route.sandboxId)}/snapshots`,
      }
  }
}
