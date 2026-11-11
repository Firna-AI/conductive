import type { Stats } from 'node:fs'
import { lstat, open, readdir, rm, type FileHandle } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { selectClaudeChain } from './native-chain.ts'
import { readNativeLines } from './native-lines.ts'
import { nativeMessage } from './native-messages.ts'

const nativeStat = async (
  path: string,
  signal: AbortSignal,
): Promise<Stats | null> => {
  signal.throwIfAborted()
  try {
    const stat = await lstat(path)
    signal.throwIfAborted()
    return stat
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'ENOENT' || error.code === 'ENOTDIR')
    )
      return null
    throw error
  }
}

const hasNoLinkedAncestor = async (root: string, signal: AbortSignal) => {
  const ancestors: string[] = []
  let path = resolve(root)
  while (true) {
    ancestors.push(path)
    const parent = dirname(path)
    if (parent === path) break
    path = parent
  }
  for (const ancestor of ancestors.reverse()) {
    const stat = await nativeStat(ancestor, signal)
    if (!stat || stat.isSymbolicLink()) return false
  }
  return true
}

export const indexNativeFiles = async (
  roots: readonly string[],
  signal: AbortSignal,
): Promise<Map<string, string>> => {
  const index = new Map<string, string>()
  const visit = async (path: string): Promise<void> => {
    const stat = await nativeStat(path, signal)
    if (!stat || stat.isSymbolicLink()) return
    if (stat.isDirectory()) {
      for (const name of (await readdir(path)).sort())
        await visit(join(path, name))
      return
    }
    if (!stat.isFile()) return
    const name = basename(path)
    if (!name.endsWith('.jsonl') && !name.endsWith('.jsonl.zst')) return
    const stem = name.replace(/\.jsonl(?:\.zst)?$/u, '')
    if (!index.has(stem)) index.set(stem, path)
    const id =
      /^rollout-.+-([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/iu.exec(
        stem,
      )?.[1]
    if (id && !index.has(id)) index.set(id, path)
  }
  for (const root of roots) {
    if (await hasNoLinkedAncestor(root, signal)) await visit(root)
  }
  return index
}

export const inspectNative = async (
  path: string,
  signal: AbortSignal,
): Promise<{ encoding: 'identity' | 'zstd'; sizeBytes: number }> => {
  signal.throwIfAborted()
  const stat = await lstat(path)
  signal.throwIfAborted()
  if (!stat.isFile())
    throw new Error('The native history is not a regular file.')
  return {
    encoding: path.endsWith('.jsonl.zst') ? 'zstd' : 'identity',
    sizeBytes: stat.size,
  }
}

export const convertNative = async (
  stagedPath: string,
  outputPath: string,
  agent: 'claude' | 'codex',
  signal: AbortSignal,
): Promise<{
  restoredBytes: number
  messageCount: number
  occurredAt: number | null
}> => {
  const { encoding } = await inspectNative(stagedPath, signal)
  const chain =
    agent === 'claude'
      ? await selectClaudeChain(stagedPath, outputPath, encoding, signal)
      : null
  let output: FileHandle | undefined
  let complete = false
  try {
    signal.throwIfAborted()
    output = await open(outputPath, 'wx', 0o600)
    const document = output
    await document.writeFile('# Imported session\n\n')
    let messageCount = 0
    let occurredAt: number | null = null
    let previousMessage: string | null = null
    const restoredBytes = await readNativeLines(
      stagedPath,
      encoding,
      signal,
      async (row, ordinal) => {
        if (chain && !chain.includes(ordinal)) return
        const message = nativeMessage(row, agent)
        if (!message) return
        if (message.hasText && message.role) {
          const key =
            message.id === null ? null : `${message.role}:${message.id}`
          if (key === null || key !== previousMessage) {
            await document.writeFile(
              `## ${message.role === 'user' ? 'User' : 'Assistant'}\n\n`,
            )
            messageCount += 1
          }
          previousMessage = key
          if (message.occurredAt !== null) {
            occurredAt =
              occurredAt === null
                ? message.occurredAt
                : Math.min(occurredAt, message.occurredAt)
          }
        }
        for (const part of message.parts) {
          await document.writeFile(
            part.type === 'text'
              ? `${part.text}\n\n`
              : `- Tool: ${part.name}\n\n`,
          )
        }
      },
    )
    signal.throwIfAborted()
    complete = true
    return { restoredBytes, messageCount, occurredAt }
  } finally {
    try {
      await output?.close()
    } finally {
      try {
        if (output && !complete) await rm(outputPath, { force: true })
      } finally {
        await chain?.dispose()
      }
    }
  }
}
