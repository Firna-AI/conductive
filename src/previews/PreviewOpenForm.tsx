import { useState } from 'react'
import { Globe } from 'lucide-react'
import { InputFrame } from '@firna/ui/input'
import rows from '../../docs/mockups/src/components/tools/PortForm.module.css'
import { portFormCopy } from '../../docs/mockups/src/components/tools/previewCopy'
import { ToolButton } from '../terminal/tool-parts/ToolButtons'
import { useControlSizes } from '../terminal/tool-parts/ToolRoot'
import { ToolMessage } from '../terminal/tool-parts/ToolStates'
import type { ToolError } from '../terminal/tool-parts/request'
import type { PortFormList } from './previewsState'
import { ServerRows } from './ServerRows'
import styles from './PreviewOpenForm.module.css'

/** A TCP port from the text of the port field, or null. */
function parsePort(text: string): number | null {
  const digits = text.trim()
  if (!/^\d{1,5}$/.test(digits)) return null
  const port = Number(digits)
  return port >= 1 && port <= 65535 ? port : null
}

interface FormProps {
  /** The servers above the field, or the field alone. */
  list: PortFormList
  opening: boolean
  error: ToolError | null
  onOpen: (port: number) => void
}

/** The port field: a typed port, or a mark when a press has no port. */
function PortField(props: FormProps & { label: string; placeholder: string }) {
  const [text, setText] = useState('')
  /** A press without a port number marks the field, and sends nothing. */
  const [missing, setMissing] = useState(false)
  const { field } = useControlSizes()
  const port = parsePort(text)
  const submit = () => {
    setMissing(port === null)
    if (port !== null && !props.opening) props.onOpen(port)
  }
  const change = (next: string) => {
    setText(next)
    setMissing(false)
  }
  const servers = props.list.kind === 'servers'
  return (
    <>
      <div className={servers ? rows.port : styles.port}>
        <InputFrame
          accessibilityLabel={props.label}
          inputMode="numeric"
          invalid={missing || props.error !== null}
          onChangeText={change}
          onSubmitEditing={submit}
          placeholder={props.placeholder}
          size={field}
          value={text}
        />
      </div>
      <ToolButton
        busy={props.opening}
        onPress={submit}
        tone={servers ? 'secondary' : 'primary'}
      >
        {portFormCopy.open}
      </ToolButton>
    </>
  )
}

function OpenError(props: { error: ToolError | null; className?: string }) {
  if (!props.error) return null
  const className = props.className
    ? `${styles.error} ${props.className}`
    : styles.error
  return (
    <p className={className} role="alert">
      The preview couldn&apos;t open. {props.error.message}
    </p>
  )
}

/**
 * Asks for the port of a web server in the sandbox. With servers in the
 * report, the form lists each one that has no preview yet, over a smaller
 * Other port row. When the runner reports no server, it asks the user to
 * start one. Without a report, and when every server already has a tab, it
 * shows the field alone.
 */
export function PreviewOpenForm(props: FormProps) {
  const { list } = props
  if (list.kind === 'servers') {
    return (
      <div className={rows.list}>
        <p className={rows.intro}>{portFormCopy.body}</p>
        <ServerRows
          disabled={props.opening}
          onOpen={props.onOpen}
          servers={list.servers}
        />
        <div className={rows.other}>
          <span aria-hidden className={rows.otherLabel}>
            {portFormCopy.otherPort}
          </span>
          <PortField
            {...props}
            label={portFormCopy.otherPort}
            placeholder="8080"
          />
        </div>
        <OpenError className={styles.listError} error={props.error} />
      </div>
    )
  }
  return (
    <ToolMessage
      action={
        <div className={styles.form}>
          <div className={styles.open}>
            <PortField {...props} label="Port" placeholder="3000" />
          </div>
          <OpenError error={props.error} />
        </div>
      }
      body={list.kind === 'empty' ? portFormCopy.noServers : portFormCopy.body}
      icon={Globe}
      title={portFormCopy.title}
    />
  )
}
