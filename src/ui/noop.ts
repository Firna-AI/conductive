/**
 * A handler that does nothing. A Firna control without a handler renders as
 * disabled, so the mockups and the shared parts that get no handler pass
 * this to keep controls enabled.
 */
export function noop(): void {}
