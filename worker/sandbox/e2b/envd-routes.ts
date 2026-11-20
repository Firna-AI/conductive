export type EnvdRoute =
  | { operation: 'start' }
  | { operation: 'stat' | 'read' | 'write'; path: string }

export type EnvdUser = 'root' | 'user'

export function envdRoute(
  route: EnvdRoute,
  user: EnvdUser,
): { method: string; path: string } {
  switch (route.operation) {
    case 'start':
      return { method: 'POST', path: '/process.Process/Start' }
    case 'stat':
      return { method: 'POST', path: '/filesystem.Filesystem/Stat' }
    case 'read':
    case 'write':
      return {
        method: route.operation === 'read' ? 'GET' : 'POST',
        path: `/files?${new URLSearchParams({ path: route.path, username: user })}`,
      }
  }
}
