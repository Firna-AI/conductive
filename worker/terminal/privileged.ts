/** Quote the complete script so sudo also owns its redirects and pipelines. */
export function privilegedCommand(script: string): string {
  return `sudo -n -- /bin/sh -c '${script.replaceAll("'", "'\"'\"'")}'`
}
