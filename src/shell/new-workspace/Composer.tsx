import type { AgentModel } from '../../shared/generated/AgentModel'
import { useRef, type RefObject } from 'react'
import { Button } from '@firna/ui/button'
import { ArrowUp, Paperclip } from 'lucide-react'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import styles from '../../ui/components/chat/Composer.module.css'
import {
  SessionLoginLabel,
  type SessionLogin,
} from '../../ui/components/chat/SessionLogin'
import { classes } from '../../ui/components/common/classes'
import { useControlSizes } from '../../ui/components/common/touch'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { useStore } from '../../app/store'
import {
  FolderNotice,
  noticedFolder,
  OversizeNotice,
} from '../../chat/components/AttachmentChips'
import { ChipTextField } from '../../chat/components/chip-field/ChipTextField'
import type { FieldHandle } from '../../chat/components/chip-field/focus-plugins'
import { useComposerDrop } from '../../chat/components/composer-drop'
import { ComposerStart } from '../../chat/components/ComposerMenu'
import type { ComposerTool } from '../../chat/components/ComposerTools'
import { useSendKey } from '../../chat/components/send-key'

import { IconButton } from '../ui/actions'
import { ModelPicker } from '../ui/ModelPicker'
import ui from '../ui/ui.module.css'

/**
 * The composer of a new workspace: the text, with a chip for each attached
 * file at its place, then the attach button, the icon of each tool, such as
 * Capabilities, the model and effort picker, and Send. A phone holds Attach
 * files and the tools in the menu of one + button. The files of a pick go into the text at the caret, or at the end
 * when the text has no caret. The whole box takes a drop of files, as
 * `useComposerDrop` says. They upload before the workspace exists, with
 * the chips and the notices of the workspace chat. When the first message
 * runs on a login that is not the person's own, such as the org login, a
 * label after the model picker names it. Send is off until the
 * message can go, as the screen decides for Send and Try again. Enter sends
 * as in every composer: on a computer, Enter sends and Shift+Enter adds a
 * line. While the create runs, the text, the attach button, and the drop
 * are off. A kept message shows with the cursor at its end. A pasted
 * workspace link shows as a chip, which `OrgLinks` finds.
 */
export function Composer(props: {
  model: NewWorkspaceModel
  choice: AgentChoice | undefined
  /** The login of the first message when it is not the person's own. */
  login?: SessionLogin
  models: readonly AgentModel[]
  /** The favourites of the account, which the model menu lists first. */
  favourites: readonly AgentChoice[]
  /** Whether the message can go now. */
  ready: boolean
  send: () => void
  /** The handle of the message field, which the page can focus. */
  field: RefObject<FieldHandle | null>
  /** The tools of the form, such as Capabilities. */
  tools: readonly ComposerTool[]
}) {
  const control = useControlSizes()
  const draft = useStore(props.model.draft)
  const create = useStore(props.model.create)
  const picker = useRef<HTMLInputElement>(null)
  const { field } = props
  const sending = create.state === 'sending'
  const sendKey = useSendKey(props.ready, props.send)
  const drop = useComposerDrop({
    field,
    editable: !sending,
    attach: (files, refusals) => props.model.attach(files, refusals),
  })
  const pick = () => picker.current?.click()
  return (
    <>
      <OversizeNotice onAttach={pick} refused={draft.refused} />
      <FolderNotice folder={noticedFolder(draft)} onAttach={pick} />
      <div className={styles.wrap}>
        <div
          className={classes(styles.composer, drop.dropping && styles.dropping)}
          {...drop.handlers}
        >
          <ChipTextField
            caretAtEnd
            editable={!sending}
            files={props.model.filesSource}
            handle={field}
            label="Message"
            lines={2}
            maxLines={8}
            onAttach={(files) => props.model.attach(files)}
            onChangeText={(text) => props.model.setText(text)}
            onEnter={sendKey}
            owner={props.model}
            placeholder="Describe the task"
            value={draft.text}
          />
          <div className={styles.bar}>
            <ComposerStart
              attach={pick}
              attachButton={
                <IconButton
                  disabled={sending}
                  icon={Paperclip}
                  label="Attach files"
                  onPress={pick}
                />
              }
              disabled={sending}
              tools={props.tools}
            />
            <input
              className={ui.hidden}
              multiple
              onChange={(event) => {
                const chosen = Array.from(event.currentTarget.files ?? [])
                event.currentTarget.value = ''
                if (chosen.length === 0) return
                field.current?.insertFiles(props.model.attach(chosen))
              }}
              ref={picker}
              tabIndex={-1}
              type="file"
            />
            {props.choice ? (
              <ModelPicker
                change={(choice) => props.model.setChoice(choice)}
                choice={props.choice}
                favourites={props.favourites}
                models={props.models}
              />
            ) : null}
            {props.login ? <SessionLoginLabel {...props.login} /> : null}
            <span className={styles.spacer} />
            <Button
              accessibilityLabel="Send"
              boxSize={control.height}
              busy={sending}
              disabled={!props.ready}
              icon={ArrowUp}
              onPress={props.send}
              shape="square"
              size="sm"
              tone={props.ready ? 'primary' : 'secondary'}
            />
          </div>
        </div>
      </div>
    </>
  )
}
