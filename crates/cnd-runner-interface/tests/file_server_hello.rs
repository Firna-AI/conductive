//! Optional file-server capability preserves the version 2 handshake.

use cnd_runner_interface::runner_handshake::RunnerHello;
use serde_json::json;

#[test]
fn hello_retains_file_server_and_omits_it_for_older_runners() -> Result<(), serde_json::Error> {
    for input in [
        json!({"type":"hello", "protocolVersion":2, "workspaceId":"workspace", "streamId":"stream"}),
        json!({"type":"hello", "protocolVersion":2, "workspaceId":"workspace", "streamId":"stream", "fileServer":true}),
    ] {
        let hello: RunnerHello = serde_json::from_value(input.clone())?;
        assert_eq!(serde_json::to_value(hello)?, input);
    }
    Ok(())
}
