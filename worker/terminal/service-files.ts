import type { WorkspaceTools } from '../previews/provider'
import { ProviderError } from '../sandbox/errors'
import { TERMINAL_RUNTIME_VIEW, TERMINAL_SUPPORT_FILE } from './scripts'

/** An unreadable support marker is distinct from an explicit one-terminal value. */
export async function readTerminalFiles(
  provider: Pick<WorkspaceTools, 'readFile'>,
): Promise<{ password: string; several: boolean | undefined }> {
  const file = await provider.readFile(`${TERMINAL_RUNTIME_VIEW}/password`, 64)
  if (file.kind !== 'file') throw new ProviderError('invalid_response', 502)
  let password: string
  try {
    password =
      file.file.encoding === 'base64'
        ? atob(file.file.content)
        : file.file.content
  } catch {
    throw new ProviderError('invalid_response', 502)
  }
  if (file.file.sizeBytes !== 64 || !/^[a-f0-9]{64}$/.test(password))
    throw new ProviderError('invalid_response', 502)
  let several: boolean | undefined
  try {
    const marker = await provider.readFile(
      `${TERMINAL_RUNTIME_VIEW}/${TERMINAL_SUPPORT_FILE}`,
      2,
    )
    if (marker.kind === 'file' && marker.file.sizeBytes === 2) {
      const content =
        marker.file.encoding === 'base64'
          ? atob(marker.file.content)
          : marker.file.content
      if (content === '1\n' || content === '0\n') several = content === '1\n'
    }
  } catch {
    // Starts use one terminal. Restart preserves the previous cache on failure.
  }
  return { password, several }
}
