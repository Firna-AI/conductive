import type { ActivityStatus } from './activityStatus'
import { classes } from '../common/classes'
import { activityPresentation } from './status'

/**
 * The classes that a place gives to each emphasis of the name beside its
 * list mark. Bold text alone marks unread output, so every place gives
 * `strong`. A place without the look of a working or a stopped workspace
 * leaves out `active` or `dim`. The normal emphasis takes no class.
 */
export type EmphasisClasses = Readonly<{
  /** Output that the reader has not read. */
  strong: string
  /** An agent that works or needs input. */
  active?: string
  /** A stopped or archived workspace. */
  dim?: string
}>

/**
 * The text beside the list mark of a workspace: its name, or the title of a
 * session in a session chip. It reads the emphasis of the state of the
 * workspace from `activityPresentation`, and gives the text the class of
 * that emphasis from `emphasis`. Each place passes its own classes, so it
 * keeps its layout, its size, and its colours. The mark, the number label,
 * the time, and the words that screen readers hear stay with the place. It
 * imports no fixture value, so the app uses it too.
 */
export function WorkspaceName(props: {
  /** The state of the workspace, which chooses the emphasis. */
  status: ActivityStatus
  /** The class of the text in its place, whatever the state. */
  className: string
  emphasis: EmphasisClasses
  children: string
}) {
  const emphasis = activityPresentation[props.status].emphasis
  return (
    <span
      className={classes(
        props.className,
        emphasis === 'normal' ? undefined : props.emphasis[emphasis],
      )}
    >
      {props.children}
    </span>
  )
}
