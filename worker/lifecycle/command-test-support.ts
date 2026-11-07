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
