import { Paperclip, Play } from 'lucide-react'
import { defaultChoice } from '../../fixtures/agents'
import { MessageField } from '../chat/MessageField'
import { ModelPicker } from '../chat/ModelPicker'
import { ActionButton, IconButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import composer from '../chat/Composer.module.css'
import styles from './StartComposer.module.css'

/**
 * The message box of an issue that has not started, in variation B: the
 * box of a workspace, with Start in place of Send. The issue is the first
 * message, so the box adds only a note to it. Start makes the cloud
 * computer and the branch, and the issue becomes the workspace.
 */
export function StartComposer(props: { startTo: string }) {
  return (
    <div className={styles.dock}>
      <div className={composer.composer}>
        <MessageField
          lines={1}
          maxLines={6}
          placeholder="Add a note to the issue for the agent"
          text=""
        />
        <div className={composer.bar}>
          <IconButton icon={Paperclip} label="Attach files" />
          <ModelPicker choice={defaultChoice} />
          <span className={composer.spacer} />
          <ScreenLink asChild to={props.startTo}>
            <ActionButton icon={Play} tone="primary">
              Start
            </ActionButton>
          </ScreenLink>
        </div>
      </div>
    </div>
  )
}
