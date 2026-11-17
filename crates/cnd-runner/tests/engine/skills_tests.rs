//! Skills are captured at each helper start, including resumed conversations.

use std::path::PathBuf;

use super::builders::{message, turn};
use super::helpers::Process;
use super::support::{Fixture, TestResult};

fn directory(helper: &Process) -> Option<String> {
    helper
        .options
        .lock()
        .ok()?
        .as_ref()?
        .skills_directory
        .clone()
}

#[tokio::test]
async fn turns_start_without_a_copy_and_resumed_turns_capture_the_latest_complete_folder()
-> TestResult {
    let h = Fixture::new().await?;
    h.command(turn("skills-session", "before-copy")?).await?;
    let first = h.latest()?;
    assert_eq!(directory(&first), None);
    *h.skills.0.lock().map_err(|_| "test lock poisoned")? =
        Some(PathBuf::from("/commit-one/skills"));
    h.command(message("skills-session", "before-copy", "during-copy")?)
        .await?;
    assert_eq!(directory(&first), None);
    first.result(&[]);
    h.engine.idle().await?;
    h.command(turn("skills-session", "after-copy")?).await?;
    let second = h.latest()?;
    assert_eq!(directory(&second).as_deref(), Some("/commit-one/skills"));
    *h.skills.0.lock().map_err(|_| "test lock poisoned")? =
        Some(PathBuf::from("/commit-two/skills"));
    assert_eq!(directory(&second).as_deref(), Some("/commit-one/skills"));
    second.result(&[]);
    h.engine.idle().await?;
    h.command(turn("skills-session", "after-update")?).await?;
    let third = h.latest()?;
    assert_eq!(directory(&third).as_deref(), Some("/commit-two/skills"));
    assert_eq!(
        third
            .options
            .lock()
            .map_err(|_| "test lock poisoned")?
            .as_ref()
            .and_then(|options| options.conversation_id.as_deref()),
        Some("conversation-1")
    );
    h.close().await
}
