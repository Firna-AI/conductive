import type { AppEnv } from '../env'

export interface LoginQuery {
  query: string
  bindings: unknown[]
}

export function captureLoginQueries(env: AppEnv): LoginQuery[] {
  const queries: LoginQuery[] = []
  const wrap = (
    statement: D1PreparedStatement,
    query: string,
    bindings: unknown[],
  ): D1PreparedStatement =>
    new Proxy(statement, {
      get(target, property) {
        if (property === 'bind')
          return (...values: unknown[]) =>
            wrap(target.bind(...values), query, values)
        if (property === 'first')
          return (...args: Parameters<D1PreparedStatement['first']>) => {
            queries.push({ query, bindings })
            return target.first(...args)
          }
        if (property === 'all')
          return () => {
            queries.push({ query, bindings })
            return target.all()
          }
        const value: unknown = Reflect.get(target, property)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  env.DB = new Proxy(env.DB, {
    get(target, property) {
      if (property === 'prepare')
        return (query: string) => {
          const statement = target.prepare(query)
          return /\bagent_logins\b|\bloginOwnerAllowed\b/.test(query)
            ? wrap(statement, query, [])
            : statement
        }
      const value: unknown = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return queries
}
