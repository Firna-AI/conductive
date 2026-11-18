import { TabPlaces } from '../../app/tab-places'
import type { ChatPlace } from '../components/chat-place'
import { initialSnapshot, type ChatSnapshot } from './chat-snapshot'

/** Holds the snapshot, and tells React when it changes. */
export class ChatStore {
  /**
   * The reader's place in each session tab, which stays while the app keeps
   * the chat. It is no part of the snapshot, because the chat reads it only
   * when a session shows. A send of this tab puts its session at the bottom,
   * also while another tab shows, as `showWaiting` says.
   */
  readonly places = new TabPlaces<ChatPlace>()
  private snapshot: ChatSnapshot = initialSnapshot
  private readonly listeners = new Set<() => void>()

  get = (): ChatSnapshot => this.snapshot

  update(change: (snapshot: ChatSnapshot) => ChatSnapshot): void {
    const next = change(this.snapshot)
    if (next === this.snapshot) return
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
