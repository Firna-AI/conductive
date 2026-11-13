import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { useToast } from '@firna/ui/toast'
import type { CopyServices } from '../transcript-copy'

/** The words of the Copy button of a code block and of its result. */
export const codeCopyWords = {
  button: 'Copy code',
  copied: 'Code copied',
  failed: "The code didn't copy. Try again.",
} as const

/** Copies the text of a code block. */
export type CopyCode = (text: string) => void

const CodeCopyContext = createContext<CopyCode | null>(null)

/** Gives each code block inside it a Copy button that calls `value`. */
export function CodeCopyProvider(props: {
  value: CopyCode
  children: ReactNode
}) {
  return (
    <CodeCopyContext.Provider value={props.value}>
      {props.children}
    </CodeCopyContext.Provider>
  )
}

/** The copy of a code block. Outside a provider, a code block has no Copy. */
export function useCodeCopy(): CopyCode | null {
  return useContext(CodeCopyContext)
}

/**
 * The copy of the text of a code block, and a toast with its result, as
 * Copy link gives. The press of the button calls it, so that the clipboard
 * write starts during the press.
 */
export function useCodeCopyAction(services: CopyServices): CopyCode {
  const { toast } = useToast()
  return useCallback(
    (text: string) => {
      services.copy(text).then(
        () => toast({ title: codeCopyWords.copied, tone: 'success' }),
        () => toast({ title: codeCopyWords.failed, tone: 'error' }),
      )
    },
    [services, toast],
  )
}
