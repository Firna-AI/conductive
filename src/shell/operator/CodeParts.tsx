import { Ban, Copy, Link } from 'lucide-react'
import { useToast } from '@firna/ui/toast'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import {
  codeStateLabels,
  copyLabels,
  referralCodeName,
} from '../../../docs/mockups/src/components/operator/codeCopy'
import styles from '../../../docs/mockups/src/components/operator/codes.module.css'
import { asApiError } from '../../app/store'
import { useServices } from '../../app/services'
import type { OperatorAccessCode } from '../../shared/operator-waitlist'
import { joinPath } from '../../shared/waitlist'
import { IconButton } from '../ui/actions'

/** The state of a code as a glyph and a word. */
export function CodeStateText(props: { state: OperatorAccessCode['state'] }) {
  switch (props.state) {
    case 'active':
      return <StatusText label={codeStateLabels.active} tone="success" />
    case 'used_up':
      return <StatusText label={codeStateLabels.usedUp} tone="muted" />
    case 'disabled':
      return (
        <StatusText icon={Ban} label={codeStateLabels.disabled} tone="muted" />
      )
  }
}

/**
 * The name of a code in a question or a button: the label of an invite
 * code, or whose referral code it is. A code without either goes by its
 * text.
 */
export function codeName(code: OperatorAccessCode): string {
  if (code.kind === 'invite') return code.label ?? code.code
  return code.owner ? referralCodeName(code.owner.login) : code.code
}

/**
 * Copy for a code and its join link. A toast says what the clipboard took,
 * or that it took nothing.
 */
function useCopy() {
  const { appOrigin, copy } = useServices()
  const { toast } = useToast()
  const put = (text: string, copied: string, failed: string) => {
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
  return {
    code: (code: string) => put(code, `Copied ${code}`, `${code} didn't copy`),
    joinLink: (code: string) =>
      put(
        new URL(joinPath(code), appOrigin).href,
        `Copied the join link of ${code}`,
        `The join link of ${code} didn't copy`,
      ),
  }
}

/**
 * A code in the monospace font with Copy, and Copy join link while the
 * code still lets people in. The join link on the app host carries the code
 * through the sign-in, so a person does not type it.
 */
export function CopyableCode(props: { code: string; works: boolean }) {
  const copy = useCopy()
  return (
    <span className={styles.codeCell}>
      <span className={styles.code}>{props.code}</span>
      <IconButton
        icon={Copy}
        label={copyLabels.code(props.code)}
        onPress={() => copy.code(props.code)}
        quiet
      />
      {props.works ? (
        <IconButton
          icon={Link}
          label={copyLabels.joinLink(props.code)}
          onPress={() => copy.joinLink(props.code)}
          quiet
        />
      ) : null}
    </span>
  )
}
