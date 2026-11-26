//! JSON snapshots of the repository folder messages: hello, move, refusal, and turn fields.

use cnd_runner_interface::runner_handshake::{RunnerToWorkspace, WorkspaceToRunner};
use serde_json::json;

macro_rules! wire_message {
    ($name:ident, $ty:ty, $json:literal) => {
        #[test]
        fn $name() {
            let message: $ty = serde_json::from_str($json).expect("valid current protocol fixture");
            insta::with_settings!({description => "Current protocol JSON. Optional fields stay absent; nullable fields stay null."}, {
                insta::assert_json_snapshot!(stringify!($name), message);
            });
        }
    };
}

wire_message!(
    hello_with_repository_folder,
    RunnerToWorkspace,
    r#"{"type":"hello","protocolVersion":2,"workspaceId":"workspace-1","streamId":"stream-1","repositoryFolder":"/home/user/code/storefront"}"#
);

wire_message!(
    repository_move,
    WorkspaceToRunner,
    r#"{"type":"repository.move","commandId":"command-1","folder":"/home/user/code/billing","branches":{"workspaceBranch":"member/cart-v2-cd34","targetBranch":"main"}}"#
);

#[test]
fn retains_the_folder_addition_fields() -> Result<(), serde_json::Error> {
    let hello = json!({
        "type": "hello",
        "protocolVersion": 2,
        "workspaceId": "workspace-1",
        "streamId": "stream-1",
        "repositoryFolder": "/home/user/code/storefront",
        "addsRepositoryFolder": true
    });
    let command = json!({
        "type": "repository.move",
        "commandId": "command-1",
        "folder": "/home/user/code/billing",
        "branches": {"workspaceBranch": "member/cart-v2-cd34", "targetBranch": "main"},
        "variable": "CONDUCTIVE_REPOSITORY_BILLING_DIR"
    });
    let runner: RunnerToWorkspace = serde_json::from_value(hello.clone())?;
    let worker: WorkspaceToRunner = serde_json::from_value(command.clone())?;
    assert_eq!(serde_json::to_value(runner)?, hello);
    assert_eq!(serde_json::to_value(worker)?, command);
    Ok(())
}

wire_message!(
    repository_move_refused,
    RunnerToWorkspace,
    r#"{"type":"repository.move.refused","commandId":"command-1","reason":"not_repository"}"#
);

wire_message!(
    message_with_repository,
    WorkspaceToRunner,
    r#"{"type":"message","commandId":"command-2","sessionId":"session-1","turnId":"turn-1","message":{"id":"message-1","sessionId":"session-1","sender":{"id":"member-1","githubLogin":"member","displayName":null,"avatarUrl":null},"text":"Read the file.","attachments":[],"choice":{"agent":"claude","model":"test-model","effort":"high"},"createdAt":1730000000000,"state":"sent"},"attachments":[],"branches":{"workspaceBranch":"feature","targetBranch":"main"},"repository":{"fullName":"acme/billing","folder":"/home/user/code/billing"}}"#
);
