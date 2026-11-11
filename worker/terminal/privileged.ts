/** Quote the complete script so sudo also owns its redirects and pipelines. */
export function privilegedCommand(script: string): string {
  return `sudo -n -- /bin/sh -c ${shellArgument(script)}`
}

/** Run a privileged script from a private file without a script argument. */
export function privilegedFileCommand(script: string): string {
  const delimiter = 'CONDUCTIVE_PRIVILEGED_SCRIPT'
  if (script.split('\n').includes(delimiter))
    throw new Error('The privileged script contains its heredoc delimiter.')
  return `set -eu
umask 077
script_directory=$(mktemp -d /tmp/conductive-privileged.XXXXXX)
cleanup() {
  result=$?
  trap - EXIT HUP INT TERM
  rm -rf -- "$script_directory" || true
  exit "$result"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM
cat > "$script_directory/update.sh" <<'${delimiter}'
${script}
${delimiter}
sudo -n -- /bin/sh "$script_directory/update.sh" </dev/null`
}

export function shellArgument(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}
