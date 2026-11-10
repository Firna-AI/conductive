/** Copy plain lifecycle results before releasing their native RPC session. */
export function nativeLifecycleRpc<T extends object>(transport: T): T {
  return new Proxy(transport, {
    get: (target, key) => {
      const method: unknown = Reflect.get(target, key)
      if (typeof method !== 'function') return method
      return async (...arguments_: unknown[]) => {
        const call: unknown = Reflect.apply(method, target, arguments_)
        try {
          const result: unknown = await call
          if (typeof result !== 'object' || result === null) return result
          const dispose: unknown = Reflect.get(result, Symbol.dispose)
          try {
            return structuredClone(result)
          } finally {
            if (typeof dispose === 'function')
              Reflect.apply(dispose, result, [])
          }
        } finally {
          if (
            call &&
            (typeof call === 'object' || typeof call === 'function')
          ) {
            const dispose: unknown = Reflect.get(call, Symbol.dispose)
            if (typeof dispose === 'function') Reflect.apply(dispose, call, [])
          }
        }
      }
    },
  })
}
