import process from 'node:process'

/** Worker binding types extend ProcessEnv. Keep Node test children isolated. */
export function isolatedProcessEnvironment(
  values: Readonly<Record<string, string | undefined>>,
): NodeJS.ProcessEnv {
  const environment = { ...process.env }
  for (const key of Object.keys(environment)) delete environment[key]
  return { ...environment, ...values }
}
