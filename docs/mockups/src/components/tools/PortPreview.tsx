import { Button } from '@firna/ui/button'
import { InputFrame } from '@firna/ui/input'
import type { LucideIcon } from 'lucide-react'
import { Globe, Plus, RotateCw, X } from 'lucide-react'
import { openPort, previewUrl } from '../../fixtures/previews'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { EmptyState } from '../common/EmptyState'
import { ExternalLink } from '../common/ExternalLink'
import { LinkTabs } from '../common/LinkTabs'
import { StorefrontPage } from './StorefrontPage'
import styles from './PortPreview.module.css'

function IconButton(props: { label: string; icon: LucideIcon }) {
  return (
    <Button
      accessibilityLabel={props.label}
      icon={props.icon}
      onPress={noop}
      shape="square"
      size="sm"
      tone="plain"
    />
  )
}

/** A web server of the sandbox in a frame, with a link to a new tab. */
export function PortPreview() {
  const tabs = [
    {
      label: `Port ${openPort}`,
      to: paths.preview,
      icon: Globe,
      selected: true,
    },
  ]
  return (
    <div className={styles.preview}>
      <div className={styles.toolbar}>
        <span className={styles.ports}>
          <LinkTabs label="Previews" tabs={tabs} />
        </span>
        <IconButton icon={Plus} label="Preview another port" />
        <span className={styles.spacer} />
        <IconButton icon={RotateCw} label="Reload" />
        <span className={styles.link}>
          <ExternalLink href={previewUrl}>Open in new tab</ExternalLink>
        </span>
        <IconButton icon={X} label="Close preview" />
      </div>
      <div className={styles.frame}>
        <StorefrontPage />
      </div>
    </div>
  )
}

/** The preview tab before any port is open. */
export function PreviewEmpty() {
  return (
    <EmptyState
      action={
        <div className={styles.open}>
          <div className={styles.port}>
            <InputFrame
              accessibilityLabel="Port"
              inputMode="numeric"
              onChangeText={noop}
              placeholder="3000"
              size="sm"
              value=""
            />
          </div>
          <Button onPress={noop} size="sm" tone="primary">
            Open preview
          </Button>
        </div>
      }
      body="Open a web server that runs in this sandbox."
      icon={Globe}
      title="Preview a port"
    />
  )
}
