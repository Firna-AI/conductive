import { useRef, useState } from 'react'
import { CornerDownLeft, Paperclip } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import layer from '../../../docs/mockups/src/components/common/ConfirmDialog.module.css'
import styles from '../../../docs/mockups/src/components/new-workspace/NewWorkspaceDialog.module.css'
import { useNavigation } from '../../app/navigation'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { defaultSection } from '../../app/sections'
import { useStore, valueOf } from '../../app/store'
import {
  FolderNotice,
  noticedFolder,
  OversizeNotice,
} from '../../chat/components/AttachmentChips'
import { ChipTextField } from '../../chat/components/chip-field/ChipTextField'
import type { FieldHandle } from '../../chat/components/chip-field/focus-plugins'
import { useComposerDrop } from '../../chat/components/composer-drop'
import { useSendKey } from '../../chat/components/send-key'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess, useOrgModel } from '../context'
import { ActionButton, IconButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { ModelPicker } from '../ui/ModelPicker'
import { Overlay, useModalLayer } from '../ui/Overlay'
import { trapTab } from '../ui/Sheet'
import ui from '../ui/ui.module.css'
import { orgRefusal, RefusedBar } from '../workspace/SandboxNotice'
import { ChooseRepositoriesNotice } from './notices'
import { RepositoryMenu, SectionMenu } from './parts'
import local from './new-workspace.module.css'
import { OrgLinks } from './OrgLinks'
import { useNewWorkspaceForm } from './useNewWorkspaceForm'

/**
 * The section that the new workspace joins, such as General: the pick of
 * the draft, else the section of the dialog. It is `undefined` while the
 * sections load, and for a section that the org no longer has.
 */
function useSection(org: OrgSummary, model: NewWorkspaceModel) {
  const sections = valueOf(useStore(useOrgModel(org.id).sections)) ?? []
  const id = useStore(model.draft).sectionId ?? model.sectionId
  const section =
    id === null
      ? defaultSection(sections)
      : sections.find((item) => item.id === id)
  return { sections, section }
}

/**
 * Create, with the hint of its key: on a computer, Enter creates the
 * workspace. Create is off until the message can go.
 */
function CreateButton(props: {
  ready: boolean
  busy: boolean
  create: () => void
}) {
  return (
    <ActionButton
      busy={props.busy}
      disabled={!props.ready}
      onPress={props.create}
      tone={props.ready ? 'primary' : 'secondary'}
      trailing={
        <CornerDownLeft
          aria-hidden
          className={classes(styles.key, props.ready && styles.keyOnSolid)}
          size={13}
        />
      }
    >
      Create
    </ActionButton>
  )
}

/**
 * The card of the dialog. While the create runs, Escape and a press outside
 * leave it open. An action that opens another page closes it first. The
 * message takes the focus as it opens, with the cursor at the end of a
 * kept message. As it closes, the focus goes back to the control that
 * opened it. When another screen opened, the main area of that screen
 * takes the focus. In a suspended org, the refused bar takes the place of
 * the composer. The files of a pick go into the text at the caret, and they
 * upload before the workspace exists, with the chips and the notices of the
 * workspace chat, as on the page. The card is the message box of the
 * dialog, so the whole card takes a drop of files, as `useComposerDrop`
 * says, and its full border shows the drop state.
 */
function DialogCard(props: {
  org: OrgSummary
  sectionId: string | null
  close: () => void
}) {
  const { org } = props
  const go = useGo()
  const navigation = useNavigation()
  const orgModel = useOrgModel(org.id)
  const [model] = useState(() => orgModel.newWorkspace(props.sectionId))
  const [openedAt] = useState(() => navigation.href())
  const leave = (to: string) => {
    props.close()
    go(to)
  }
  const form = useNewWorkspaceForm(org, model, leave)
  const { suspended } = useOrgAccess(org)
  const { sections, section } = useSection(org, model)
  const sending = form.create.state === 'sending'
  const card = useRef<HTMLElement>(null)
  const message = useRef<FieldHandle>(null)
  // The file picker opens from the attach button and from the notice of a
  // file over the size limit. Its files go into the text at the caret.
  const picker = useRef<HTMLInputElement>(null)
  const pick = () => picker.current?.click()
  useModalLayer(
    card,
    () => {
      if (!sending) props.close()
    },
    { initial: message, moved: () => navigation.href() !== openedAt },
  )
  const sendKey = useSendKey(form.ready, form.send)
  const drop = useComposerDrop({
    field: message,
    // A suspended org shows no composer, so its card takes no drop.
    editable: !sending && !suspended,
    attach: (files, folders) => model.attach(files, folders),
  })
  const unchosen = form.repositories?.length === 0
  const oversize = form.draft.refused.length > 0
  const folder = noticedFolder(form.draft)
  const notices =
    form.failure !== null ||
    form.buildNotice !== null ||
    form.notice !== null ||
    oversize ||
    folder !== null ||
    unchosen
  return (
    <section
      aria-label="New workspace"
      aria-modal
      className={classes(styles.dialog, drop.dropping && styles.dropping)}
      onKeyDownCapture={trapTab}
      ref={card}
      role="dialog"
      tabIndex={-1}
      {...drop.handlers}
    >
      <div className={styles.header}>
        {form.repository && !suspended ? (
          <RepositoryMenu
            chevron={styles.chevron}
            choose={(id) => model.setRepository(id)}
            chosen={form.repository}
            repositories={form.repositories ?? []}
            tone="plain"
            waiting={form.waiting}
          />
        ) : null}
        {section ? (
          <SectionMenu
            chevron={styles.chevron}
            choose={(id) => model.setSection(id)}
            chosen={section}
            className={classes(styles.anchor, styles.placeMenu)}
            disabled={sending}
            org={org.name}
            sections={sections}
          />
        ) : (
          <span className={styles.place}>{org.name}</span>
        )}
      </div>
      {suspended ? (
        // A suspended org refuses each create, as on the page.
        <div className={classes(styles.notices, local.refused)}>
          <RefusedBar reason={orgRefusal.reason} />
        </div>
      ) : (
        <>
          <div className={styles.body}>
            <OrgLinks orgId={org.id}>
              <ChipTextField
                caretAtEnd
                editable={!sending}
                files={model.filesSource}
                handle={message}
                label="Message"
                lines={7}
                maxLines={14}
                onChangeText={(text) => model.setText(text)}
                onEnter={sendKey}
                owner={model}
                placeholder="Describe the task"
                value={form.draft.text}
              />
            </OrgLinks>
          </div>
          {notices ? (
            <div className={styles.notices}>
              {form.failure}
              {form.buildNotice}
              {form.notice}
              <OversizeNotice onAttach={pick} refused={form.draft.refused} />
              <FolderNotice folder={folder} onAttach={pick} />
              {unchosen ? (
                <ChooseRepositoriesNotice open={leave} org={org} />
              ) : null}
            </div>
          ) : null}
          <div className={styles.footer}>
            {form.choice ? (
              <ModelPicker
                change={(choice) => model.setChoice(choice)}
                choice={form.choice}
                models={form.models}
              />
            ) : null}
            <span className={styles.spacer} />
            <IconButton
              disabled={sending}
              icon={Paperclip}
              label="Attach files"
              onPress={pick}
            />
            <input
              className={ui.hidden}
              multiple
              onChange={(event) => {
                const chosen = Array.from(event.currentTarget.files ?? [])
                event.currentTarget.value = ''
                if (chosen.length === 0) return
                message.current?.insertFiles(model.attach(chosen))
              }}
              ref={picker}
              tabIndex={-1}
              type="file"
            />
            <CreateButton
              busy={sending}
              create={form.send}
              ready={form.ready}
            />
          </div>
        </>
      )}
    </section>
  )
}

/**
 * New workspace as a dialog over the whole frame, on a computer, as the
 * mockup draws it. The repository picker sits at the top left, and the org
 * and the section of the new workspace at the top right, as a menu of the
 * sections of the org. The message and
 * its files fill the middle, with the notices of the page under them. The
 * model picker sits at the bottom left, and the attach button and Create
 * at the bottom right. The dialog and the page of an org and a section
 * share one draft, so a close keeps the message and its files.
 */
export function NewWorkspaceDialog(props: {
  orgId: string
  sectionId: string | null
  close: () => void
}) {
  const org = useStore(useApp().orgs).find((item) => item.id === props.orgId)
  if (!org) return null
  return (
    <Overlay>
      <div className={layer.layer}>
        <div aria-hidden className={layer.scrim} />
        <DialogCard close={props.close} org={org} sectionId={props.sectionId} />
      </div>
    </Overlay>
  )
}
