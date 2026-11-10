interface ClipboardItemConstructor {
  new (data: Record<string, Blob | Promise<Blob>>): ClipboardItem
}

export interface ClipboardTarget {
  navigator: {
    clipboard: Pick<Clipboard, 'writeText'> & Partial<Pick<Clipboard, 'write'>>
  }
  ClipboardItem?: ClipboardItemConstructor
  Blob?: typeof Blob
}

/** Starts a pending write before the user press loses clipboard access. */
export async function copyText(
  target: ClipboardTarget,
  text: string | Promise<string>,
): Promise<void> {
  const clipboard = target.navigator.clipboard
  if (typeof text === 'string') return clipboard.writeText(text)
  const pending = Promise.resolve(text)
  // A refused write can finish before the request that supplies its text.
  void pending.catch(() => undefined)
  const Item = target.ClipboardItem
  if (!Item || !clipboard.write) {
    return pending.then((value) => clipboard.writeText(value))
  }
  const BlobType = target.Blob ?? Blob
  const blob = pending.then(
    (value) => new BlobType([value], { type: 'text/plain' }),
  )
  void blob.catch(() => undefined)
  let item: ClipboardItem
  try {
    item = new Item({ 'text/plain': blob })
  } catch {
    return pending.then((value) => clipboard.writeText(value))
  }
  return clipboard.write([item])
}
