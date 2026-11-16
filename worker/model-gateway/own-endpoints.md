# Own endpoints in the model gateway

This page belongs to the [workspace model gateway](README.md).

An own endpoint login replaces the native upstream base in the
[model request table](README.md#model-requests).
[`readEndpointAddress`](../../src/shared/endpoint-address.ts) validates and builds that address at save, dispatch, and fetch time.
It accepts only public HTTPS addresses with host names.
It refuses every IPv4 and IPv6 address, credentials, internal names, and the app and preview domains.
It normalizes the base path.
The host check reads the product domain from `productDomain` in `docs/mockups/src/brand.ts`.
The gateway runtime supplies `env.PREVIEW_DOMAIN` as an extra refused domain before each fetch.
It preserves the endpoint query and appends the model request query.
Claude drops a final `/v1` from the base before its route is added.
Codex keeps its API base, including `/v1` when present.
The builder also supports model-list addresses, but this gateway exposes no model-list route.

[`endpoint-models.ts`](endpoint-models.ts) reads an own endpoint's model list.
It builds the agent's GET address and key headers.
It follows no redirect and allows ten seconds and 1 MiB for the complete response.
Claude requests `limit=1000` after the saved endpoint query.
A Claude reply with `has_more: true` fails the read, so a partial list never replaces the cached list.
It reads only `data[].id` and keeps no error body or diagnostic text.
`EndpointModelsResult` distinguishes a readable list, an HTTP answer without a list, and no HTTP answer.
The save makes its second read only after an HTTP answer without a list.
It skips the second read for a base whose path already ends with `/v1`.
It validates the candidate `/v1` base through the same address builder, with the same refused domains.
Each read uses the same headers and limits.
The successful read supplies the stored list, so the save makes no third read.
[Own endpoint logins](../../docs/protocol/own-endpoint-logins.md) states when the Worker reads, also the second read of a Codex save.

[`endpoint-model-save.ts`](endpoint-model-save.ts) selects the base for the account save.
The save reads the list before it encrypts and stores the login.
A Codex save can store `<base>/v1` in place of the typed base.
One statement stores the login, the list of the read that worked, if any, and the attempt time.
So the first turn does not read the list again at once.
The save reply includes `endpointV1Added` and `modelListReadFailed` for endpoint logins.
Both are booleans, and the reply never holds the address.
Native login replies omit them.

[`endpoint-model-refresh.ts`](endpoint-model-refresh.ts) runs the account Refresh and the background read.
Neither changes the stored address.
Refresh returns HTTP 200 with `RefreshAgentLoginModelsResponse.modelListReadFailed`.
The flag is false when it read a list and true otherwise, including a removed or native login.
A failed read writes no failure mark.
Runner delivery schedules a background read after it sends a turn.
[`endpoint-model-data.ts`](endpoint-model-data.ts) claims each attempt in D1.
The claim limits background reads to once in ten minutes, including failed reads.
A failure keeps the previous IDs and successful read time.
Writes check the login ciphertext and attempt ID, so an old response cannot replace a newer read or login.
The account API compares those IDs with the app catalogue.
No model discovery route becomes available to sandbox code.
