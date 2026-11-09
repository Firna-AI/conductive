export interface NativeQuery {
  query: string
  bindings: unknown[]
}

export function nativeDatabase(db: D1Database) {
  const state: { observe?: (query: NativeQuery) => Promise<void> } = {}
  const statement = (
    value: D1PreparedStatement,
    query: string,
    bindings: unknown[],
  ): D1PreparedStatement =>
    new Proxy(value, {
      get: (target, key) => {
        if (key === 'bind')
          return (...values: unknown[]) =>
            statement(target.bind(...values), query, values)
        const member: unknown = Reflect.get(target, key)
        if ((key === 'first' || key === 'all') && typeof member === 'function')
          return async (...args: unknown[]) => {
            if (/\bagent_logins\b|\bloginOwnerAllowed\b/.test(query))
              await state.observe?.({ query, bindings })
            return Reflect.apply(member, target, args)
          }
        return typeof member === 'function' ? member.bind(target) : member
      },
    })
  return {
    state,
    db: new Proxy(db, {
      get: (target, key) => {
        if (key === 'prepare')
          return (query: string) => statement(target.prepare(query), query, [])
        const member: unknown = Reflect.get(target, key)
        return typeof member === 'function' ? member.bind(target) : member
      },
    }),
  }
}
