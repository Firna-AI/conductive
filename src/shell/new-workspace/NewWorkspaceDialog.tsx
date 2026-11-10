import { useRef, useState } from 'react'
import { CornerDownLeft, Paperclip } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import layer from '../../../docs/mockups/src/components/common/ConfirmDialog.module.css'
import styles from '../../../docs/mockups/src/components/new-workspace/NewWorkspaceDialog.module.css'
import { useNavigation } from '../../app/navigation'
import { defaultSection } from '../../app/sections'
import { useStore, valueOf } from '../../app/store'
import {
  DraftFiles,
  OversizeNotice,
} from '../../chat/components/AttachmentChips'
import { ChipTextField } from '../../chat/components/chip-field/ChipTextField'
import type { FieldHandle } from '../../chat/components/chip-field/focus-plugins'
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
import { BranchControl } from './BranchChoice'
import { ChooseRepositoriesNotice } from './notices'
import { RepositoryMenu } from './parts'
import local from './new-workspace.module.css'
import { useOpener } from './opener'
import { OrgLinks } from './OrgLinks'
import { useNewWorkspaceForm } from './useNewWorkspaceForm'

/** The org and the section that the new workspace joins, such as General. */
function usePlace(org: OrgSummary, sectionId: string | null): string {
  const sections = valueOf(useStore(useOrgModel(org.id).sections))
  const section =
    sectionId === null
      ? defaultSection(sections ?? [])
      : sections?.find((item) => item.id === sectionId)
  return section ? `${org.name} · ${section.name}` : org.name
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
 * opened it, the one with the focus as the dialog first showed. When
 * another screen opened, the main area of that screen takes the focus. In
 * a suspended org, the refused bar takes the place of the composer. The
 * files upload before the workspace exists, with the chips and the notice
 * of the workspace chat, as on the page.
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
  const place = usePlace(org, props.sectionId)
  const sending = form.create.state === 'sending'
  const card = useRef<HTMLElement>(null)
  const message = useRef<FieldHandle>(null)
  // The file picker opens from the attach button and from the notice of a
  // file over the size limit.
  const files = useRef<HTMLInputElement>(null)
  const pick = () => files.current?.click()
  const returnFocus = useOpener()
  useModalLayer(
    card,
    () => {
      if (!sending) props.close()
    },
    {
      initial: message,
      moved: () => navigation.href() !== openedAt,
      returnFocus,
    },
  )
  const sendKey = useSendKey(form.ready, form.send)
  const unchosen = form.repositories?.length === 0
  const oversize = form.draft.refused.length > 0
  const notices =
    form.failure !== null ||
    form.buildNotice !== null ||
    form.notice !== null ||
    oversize ||
    unchosen
  return (
    <section
      aria-label="New workspace"
      aria-modal
      className={styles.dialog}
      onKeyDownCapture={trapTab}
      ref={card}
      role="dialog"
      tabIndex={-1}
    >
      <div className={styles.header}>
        {form.repository && !suspended ? (
          <>
            <RepositoryMenu
              chevron={styles.chevron}
              choose={(id) => model.setRepository(id)}
              chosen={form.repository}
              repositories={form.repositories ?? []}
              tone="plain"
              waiting={form.waiting}
            />
            <BranchControl
              model={model}
              orgId={org.id}
              repository={form.repository}
            />
          </>
        ) : null}
        <span className={styles.place}>{place}</span>
      </div>
      {suspended ? (
        // A suspended org refuses each create, as on the page.
        <div className={classes(styles.notices, local.refused)}>
          <RefusedBar reason={orgRefusal.reason} />
        </div>
      ) : (
        <>
          <div className={styles.body}>
            {form.draft.files.length > 0 ? (
              <DraftFiles
                files={form.draft.files}
                onRemove={(id) => model.removeFile(id)}
                onRetry={(id) => void model.retryFile(id)}
              />
            ) : null}
            <OrgLinks orgId={org.id}>
              <ChipTextField
                caretAtEnd
                editable={!sending}
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
                if (chosen.length > 0) void model.attach(chosen)
              }}
              ref={files}
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
 * mockup draws it. The repository picker sits at the top left, with the
 * quiet branch picker beside it, and the org and the section of the new
 * workspace at the top right. The message and its files fill the middle,
 * with the notices of the page under them. The model picker sits at the
 * bottom left, and the attach button and Create at the bottom right. The
 * dialog and the page of an org and a section share one draft, so a close
 * keeps the message and its files.
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
