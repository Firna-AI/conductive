import { useEffect, useRef, useState } from 'react'
import {
  CopyLinkButton,
  type CopyResult,
} from '../../../docs/mockups/src/components/workspace/CopyLinkButton'
import { workspaceLabel } from '../../../docs/mockups/src/components/workspaces/label'
import { useServices } from '../../app/services'
import type { Workspace } from '../../shared/workspaces'

/** How long the note says that the link was copied, in ms. */
const copiedMs = 2_000

/**
 * The label of the number of the workspace, such as `W-395`, as the button
 * that copies the link of the workspace. The link holds no tab path. After a
 * press, the note under the button says "Link copied" for a moment. A copy
 * that fails says to try again until the next press, as the file page does.
 * The note is a status, and it lies over the content, so nothing moves. The
 * header gives each workspace its own button, so a note never outlives the
 * workspace that it names.
 */
export function CopyLink(props: { workspace: Workspace; inline: boolean }) {
  const services = useServices()
  const [result, setResult] = useState<CopyResult | undefined>(undefined)
  const press = useRef(0)
  const clear = useRef<(() => void) | null>(null)
  useEffect(
    () => () => {
      // A copy that ends after the button goes shows nothing.
      press.current += 1
      clear.current?.()
    },
    [],
  )
  const copy = () => {
    const current = ++press.current
    clear.current?.()
    clear.current = null
    setResult(undefined)
    const show = (next: CopyResult) => {
      if (press.current !== current) return
      setResult(next)
      if (next === 'copied') {
        clear.current = services.delay(copiedMs, () => {
          if (press.current === current) setResult(undefined)
        })
      }
    }
    services.copy(props.workspace.link).then(
      () => show('copied'),
      () => show('failed'),
    )
  }
  return (
    <CopyLinkButton
      inline={props.inline}
      label={workspaceLabel(props.workspace.number)}
      onPress={copy}
      result={result}
    />
  )
}
