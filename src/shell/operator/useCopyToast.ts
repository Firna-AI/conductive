import { useToast } from '@firna/ui/toast'
import { useServices } from '../../app/services'
import { asApiError } from '../../app/store'

/** The words of the toast after a copy, when they do not name the text. */
interface CopyWords {
  copied: string
  failed: string
}

/**
 * Copy of the operator section, for a value such as a code or a cloud
 * computer ID. A toast says what the clipboard took, or that it took
 * nothing. Its words name the value, unless the caller gives other words,
 * such as for a link.
 */
export function useCopyToast() {
  const { copy } = useServices()
  const { toast } = useToast()
  return (text: string, words?: CopyWords) => {
    const copied = words?.copied ?? `Copied ${text}`
    const failed = words?.failed ?? `${text} didn't copy`
    copy(text).then(
      () => toast({ title: copied, tone: 'success' }),
      (error: unknown) =>
        toast({
          title: failed,
          description: asApiError(error).message,
          tone: 'error',
        }),
    )
  }
}
