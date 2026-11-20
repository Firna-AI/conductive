export function codexStdioServer(
  name: string,
  server: {
    command: string
    args?: readonly string[]
    env?: Readonly<Record<string, string>>
  },
): string[] {
  const prefix = `mcp_servers.${name}`
  const settings: [string, string][] = [
    [`${prefix}.command`, JSON.stringify(server.command)],
  ]
  if (server.args)
    settings.push([`${prefix}.args`, JSON.stringify(server.args)])
  if (server.env) {
    const entries = Object.entries(server.env).map(
      ([key, value]) => `${JSON.stringify(key)}=${JSON.stringify(value)}`,
    )
    settings.push([`${prefix}.env`, `{${entries.join(',')}}`])
  }
  return settings.flatMap(([key, value]) => ['-c', `${key}=${value}`])
}
