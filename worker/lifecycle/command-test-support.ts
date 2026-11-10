const quotedArgument = `'((?:[^']|'"'"')*)'`
const journalCommand = new RegExp(
  `^bash -c ${quotedArgument} conductive-lifecycle ${quotedArgument} ${quotedArgument}$`,
  's',
)

/** Keep assertions on the script after the shell has removed argument quoting. */
export function lifecycleCommandBody(command: string | undefined): string {
  if (command === undefined) throw new Error('Missing lifecycle command')
  const match = journalCommand.exec(command)
  return match?.[3]?.replaceAll(`'"'"'`, "'") ?? command
}

/** Observe the owned saved startup file, independently of its shell transport encoding. */
export function lifecycleStartupScript(command: string): string | null {
  const writes = new RegExp(
    `printf %s ${quotedArgument} \\| base64 -d > ${quotedArgument}`,
    'g',
  )
  for (const match of lifecycleCommandBody(command).matchAll(writes)) {
    const path = match[2].replaceAll(`'"'"'`, "'")
    if (path === '/run/conductive/startup.sh')
      return Buffer.from(match[1].replaceAll(`'"'"'`, "'"), 'base64').toString(
        'utf8',
      )
  }
  return null
}
