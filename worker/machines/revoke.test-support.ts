import type { AppEnv } from '../env'

export function failingMachineRevokes(env: AppEnv): AppEnv {
  const machines = env.MACHINES
  if (!machines) throw new Error('Missing machine binding.')
  return {
    ...env,
    MACHINES: new Proxy(machines, {
      get(target, key) {
        if (key !== 'get') return Reflect.get(target, key)
        return (...input: Parameters<typeof target.get>) =>
          new Proxy(target.get(...input), {
            get(stub, method) {
              if (method === 'revokeToken')
                return async () => {
                  throw new Error('Machine revoke unavailable.')
                }
              return Reflect.get(stub, method)
            },
          })
      },
    }),
  }
}
