import { useRef, type KeyboardEvent, type MouseEvent, type Ref } from 'react'
import { InputFrame, type InputFrameProps } from '@firna/ui/input'
import { Search } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import tabs from '../../../docs/mockups/src/components/common/LinkTabs.module.css'
import { paletteTabs, type PaletteTab } from '../../app/palette/palette-source'
import ui from '../ui/ui.module.css'
import local from './palette.module.css'

const tabLabels: Readonly<Record<PaletteTab, string>> = {
  all: 'All',
  workspaces: 'Workspaces',
  actions: 'Actions',
  settings: 'Settings',
}

/** The words in the empty field of each tab. A phone has no room for the long ones. */
const placeholders: Readonly<Record<PaletteTab, string>> = {
  all: 'Search workspaces, actions, and settings',
  workspaces: 'Search workspaces',
  actions: 'Search actions',
  settings: 'Search settings',
}

const phonePlaceholders: Readonly<Record<PaletteTab, string>> = {
  ...placeholders,
  all: 'Search',
}

/** The handle of the text field of Firna, which takes the focus. */
export type FieldHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

/**
 * The search field, which keeps the focus while the palette is open. It is
 * a combobox: it controls the list, and names its highlighted option.
 */
export function SearchField(props: {
  fieldRef: Ref<FieldHandle>
  text: string
  tab: PaletteTab
  phone: boolean
  /** The list, while it shows. */
  listboxId: string | undefined
  activeId: string | undefined
  onChange: (text: string) => void
}) {
  const { phone } = props
  return (
    <InputFrame
      accessibilityLabel="Search"
      aria-activedescendant={props.activeId}
      aria-autocomplete="list"
      aria-controls={props.listboxId}
      aria-expanded={props.listboxId !== undefined}
      autoCapitalize="none"
      autoComplete="off"
      autoCorrect={false}
      focusIndicator={phone ? undefined : 'none'}
      inputRef={props.fieldRef}
      onChangeText={props.onChange}
      placeholder={(phone ? phonePlaceholders : placeholders)[props.tab]}
      prefixIcon={Search}
      role="combobox"
      size={phone ? 'lg' : 'md'}
      spellCheck={false}
      value={props.text}
      variant={phone ? 'framed' : 'plain'}
    />
  )
}

/** A press on a tab keeps the focus in the search field. */
function keepFieldFocus(event: MouseEvent) {
  event.preventDefault()
}

const tabSteps: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowLeft: -1,
}

/**
 * The tabs of the palette. They are buttons in a tablist, because the
 * palette has no address. The arrow keys move between them, and the tab
 * that takes the focus shows.
 */
export function PaletteTabs(props: {
  tab: PaletteTab
  tabId: (tab: PaletteTab) => string
  panelId: string
  onChange: (tab: PaletteTab) => void
}) {
  const buttons = useRef(new Map<PaletteTab, HTMLButtonElement>())
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = paletteTabs.indexOf(props.tab)
    const step = tabSteps[event.key]
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? paletteTabs.length - 1
          : step === undefined
            ? null
            : (at + step + paletteTabs.length) % paletteTabs.length
    const tab = target === null ? undefined : paletteTabs[target]
    if (tab === undefined) return
    event.preventDefault()
    props.onChange(tab)
    buttons.current.get(tab)?.focus()
  }
  return (
    <div
      aria-label="Search in"
      className={tabs.tabs}
      onKeyDown={onKeyDown}
      role="tablist"
    >
      {paletteTabs.map((tab) => {
        const selected = tab === props.tab
        return (
          <button
            aria-controls={props.panelId}
            aria-selected={selected}
            className={classes(
              tabs.tab,
              local.tab,
              ui.focusable,
              selected && tabs.selected,
            )}
            id={props.tabId(tab)}
            key={tab}
            onClick={() => props.onChange(tab)}
            onMouseDown={keepFieldFocus}
            ref={(button) => {
              if (button) buttons.current.set(tab, button)
              else buttons.current.delete(tab)
            }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {tabLabels[tab]}
          </button>
        )
      })}
    </div>
  )
}
