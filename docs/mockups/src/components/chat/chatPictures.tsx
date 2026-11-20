import { createContext, useContext, type ReactNode } from 'react'

/**
 * The reads of the pictures of the answers while the cloud computer runs:
 * done, so each picture shows, or still running, so each shows the box of
 * its label.
 */
export const pictureReads = ['shown', 'loading'] as const

export type PictureRead = (typeof pictureReads)[number]

const ChatPicturesContext = createContext<PictureRead | undefined>(undefined)

/**
 * Gives each answer inside it the reads of its pictures. Without a read,
 * as while the cloud computer does not run, each picture shows as its
 * link, because the chat then reads no picture.
 */
export function ChatPictures(props: {
  read: PictureRead | undefined
  children: ReactNode
}) {
  return (
    <ChatPicturesContext.Provider value={props.read}>
      {props.children}
    </ChatPicturesContext.Provider>
  )
}

/** The reads of the pictures of the chat, or none while it reads none. */
export function useChatPictures(): PictureRead | undefined {
  return useContext(ChatPicturesContext)
}
