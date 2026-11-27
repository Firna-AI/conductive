# Local service tools

The CLI and MCP server give five local service calls.
They use this cloud computer's runner socket, with no Worker request,
workspace token, or active turn. A service never keeps the computer running.
[Service calls](../docs/protocol/service-calls.md) states their requirements.

| MCP tool | CLI command |
| --- | --- |
| `start_service` | `conductive services start --name TEXT [--env NAME=VALUE ...] [--wait-for-port [PORT]] [--request-id ID] -- <command> [arguments ...]` |
| `list_services` | `conductive services list` |
| `stop_service` | `conductive services stop --name TEXT [--request-id ID]` |
| `restart_service` | `conductive services restart --name TEXT [--request-id ID]` |
| `read_service_logs` | `conductive services logs --name TEXT` |

Start preserves the exact name and argv. Empty names and spaces remain exact.
The CLI uses its current folder. MCP takes `command` as an argv array and
an optional `folder`. Its omission uses the MCP process's current folder.
MCP `env` is an object of explicit string values.
The clean service environment uses frozen org settings, recorded repository
folder variables, and basic user variables. It inherits no caller credentials,
turn context, or secret-run additions.
Definitions and environment maps remain local. Results show the actual saved
command and folder, without environment maps.

A running exact name returns unchanged, with `outcome: "already_running"`.
A nonrunning Start uses the supplied definition and a new generation.
Restart uses the saved definition, also after Stop, an end, or a failure.
Stop ends the whole process tree. A nonrunning Stop returns unchanged.

`--wait-for-port` waits for the first owned listener.
`--wait-for-port PORT` selects a specific owned listener.
MCP uses `waitForPort: { kind: "first" }` or
`waitForPort: { kind: "port", port: 5173 }`.
The fixed maximum is 30 seconds. A `not_confirmed` result leaves it running.

CLI replies are JSON. MCP gives the same JSON as text and structured content.
Each service entry gives the observed `target` with boot, service, and generation IDs.
Named controls first read that target, then send one control with `requestId`.
A stale target changes nothing. A lost reply returns `unconfirmed`.
Check the list before another explicit try. No adapter resends automatically.
An explicit `requestId` identifies one operation across duplicate delivery.

Logs returns the complete retained stdout and stderr source, with an `omitted`
flag when rotation removed older output. It applies no app line or byte cut.
The log spans runs and uses at most 10 MiB of runtime memory per service.
It ends, with the service records and definitions, when the computer stops.
The app log contract has separate filtering and excerpt rules.

The [native library](../crates/cnd-services/README.md) gives code entry points.
