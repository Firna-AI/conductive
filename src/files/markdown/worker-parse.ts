import type { MarkdownDocument } from './markdown-document'

/** The outcome of one parse in the Markdown worker. */
export type WorkerParse =
  { status: 'parsed'; document: MarkdownDocument } | { status: 'failed' }

/**
 * Parses one text in a new module worker. `done` runs once, with the
 * document, or with a failure when the worker cannot start or parse. The
 * worker ends after its reply. The returned function ends it sooner, and
 * then `done` never runs, so the reply for an older text never shows.
 */
export function parseInWorker(
  text: string,
  done: (parse: WorkerParse) => void,
): () => void {
  let worker: Worker
  try {
    worker = new Worker(new URL('./markdown-worker.ts', import.meta.url), {
      type: 'module',
    })
  } catch {
    done({ status: 'failed' })
    return () => {}
  }
  const end = () => {
    worker.onmessage = null
    worker.onerror = null
    worker.onmessageerror = null
    worker.terminate()
  }
  const settle = (parse: WorkerParse) => {
    end()
    done(parse)
  }
  // The worker is a module of this app, so its reply needs no parser.
  worker.onmessage = (event: MessageEvent<MarkdownDocument>) =>
    settle({ status: 'parsed', document: event.data })
  worker.onerror = () => settle({ status: 'failed' })
  worker.onmessageerror = () => settle({ status: 'failed' })
  worker.postMessage(text)
  return end
}
