export interface StopSessionReference {
  workspaceId: string
  sessionId: string
}

export type TurnStopRequester =
  | { requestedById: string; requestedBySession?: never }
  | { requestedById?: never; requestedBySession: StopSessionReference }
