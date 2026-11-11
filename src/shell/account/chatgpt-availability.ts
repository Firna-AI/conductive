/**
 * The Codex Connect form hides the ChatGPT plan while this is false.
 * chatgpt.com refuses requests from Cloudflare Workers, so the model gateway
 * cannot reach it, and each Codex turn on a ChatGPT plan fails. Set this to
 * true when the gateway reaches chatgpt.com through an egress proxy.
 */
export const chatGptSignInAvailable: boolean = false
