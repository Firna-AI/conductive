export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

export function repositoryDirectory(id: string): string {
  return `/home/user/conducting/repositories/${encodeURIComponent(id)}`
}

export function writeFileCommand(
  path: string,
  text: string,
  mode = '600',
): string {
  const bytes = new TextEncoder().encode(text)
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 4_096)
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 4_096)))
  const encoded = btoa(chunks.join(''))
  return `printf %s ${shellQuote(encoded)} | base64 -d > ${shellQuote(path)}\nchmod ${mode} ${shellQuote(path)}`
}
