import { basename, isAbsolute, relative, resolve, sep } from 'node:path'

const interpreters =
  /^(?:node(?:js)?|bun|deno|python(?:\d+(?:\.\d+)*)?|ruby|perl|php|bash|sh|zsh|dash)$/u
const safeFlags =
  /^--(?:no-warnings|enable-source-maps|watch|inspect(?:-brk)?|allow-[a-z-]+)$/u

function interpreter(name: string): string | null {
  if (!interpreters.test(name)) return null
  if (/^python/u.test(name)) return 'python'
  return name === 'nodejs' ? 'node' : name
}

export function portName(
  value: unknown,
  executablePath: unknown,
): string | null {
  if (
    typeof value !== 'string' ||
    typeof executablePath !== 'string' ||
    !isAbsolute(executablePath)
  )
    return null
  const words = value.split('\0')
  const executable = basename(executablePath)
  const invoked = basename(words[0] ?? '')
  if (!invoked) return null
  const runtime = interpreter(executable)
  const originalArguments =
    invoked === executable ||
    (runtime !== null && runtime === interpreter(invoked))
  if (!runtime)
    return (
      executable +
      (originalArguments && /^[a-z][a-z-]{0,19}$/u.test(words[1] ?? '')
        ? ` ${words[1]}`
        : '')
    )
  if (!originalArguments) return null
  let index = 1
  if ((runtime === 'deno' || runtime === 'bun') && words[index] === 'run')
    index++
  while (words[index]?.startsWith('-')) {
    if (runtime === 'python' && words[index] === '-m') {
      index++
      break
    }
    if (words[index] === '--') {
      index++
      break
    }
    const pythonFlag =
      runtime === 'python' && /^-(?:[uBEIsSqv]|OO?)$/u.test(words[index])
    const denoFlag = runtime === 'deno' && words[index] === '-A'
    if (
      !pythonFlag &&
      !denoFlag &&
      !safeFlags.test(words[index]) &&
      !/^--[a-z-]+=/u.test(words[index])
    )
      return null
    index++
  }
  const program = words[index]
  if (!program || program.startsWith('-')) return null
  const next = words[index + 1] ?? ''
  return (
    basename(program) + (/^[a-z][a-z-]{0,19}$/u.test(next) ? ` ${next}` : '')
  )
}

function below(root: string, path: string): string | null {
  const folder = relative(root, path)
  return isAbsolute(folder) || folder === '..' || folder.startsWith(`..${sep}`)
    ? null
    : folder
}

export function portFolder(
  value: unknown,
  home: string,
  cwd: string,
): string | null {
  if (typeof value !== 'string' || !isAbsolute(value)) return null
  const code = resolve(home, 'code')
  const inCode = below(code, value)
  if (!inCode) return null
  const inRepository = below(resolve(cwd), value)
  const folder = inRepository === null ? inCode : inRepository
  if (!folder) return null
  return folder
}
