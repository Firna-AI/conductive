# Operator backend tests

This guide belongs to the [operator backend](README.md).

## Development

Run `npm run test -- worker/operator` from the repository root, with Node
24. The tests use local D1 and the fake GitHub and Boat servers.
They check overview access, state counts, time windows, daily counts, and org order.
The directory tests check search keys, cursor pages, status, names, and operator access.
The lift tests check events, access, retained revocations, Restore, and native disk alarms.
Native operator tests use `nativeSuspensionRuntime` from
[`native-runtime.test-support.ts`](native-runtime.test-support.ts).
It supplies the fixture provider for calls from Node.
The native workspace objects use their own fake outbound service.
Run `npm run test -- worker/app-api/account-operator.test.ts` to check the account's operator flag.

The tests of sandbox access and of the automatic refreshes live beside
their code. After a change to them, run:

```sh
npm run test -- worker/previews worker/terminal/access.test.ts worker/chat/tab-access.test.ts worker/lifecycle/image-refresh.test.ts
```
