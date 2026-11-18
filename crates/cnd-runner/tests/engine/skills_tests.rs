//! Skills are captured at each helper start, including resumed conversations.

use std::path::PathBuf;

use cnd_runner_interface::sdk_helper_options::OrgSkills;

use super::builders::{message, skills_configuration, turn};
use super::helpers::Process;
use super::support::{Fixture, TestResult};

fn directory(helper: &Process) -> Option<String> {
    helper
        .options
        .lock()
        .ok()?
        .as_ref()?
        .org_skills
        .as_ref()?
        .directory
        .clone()
}

#[tokio::test]
async fn turns_start_without_a_copy_and_resumed_turns_capture_the_latest_complete_folder()
-> TestResult {
    let h = Fixture::configured(skills_configuration(Some("Owner/Skills"), None)?).await?;
    h.command(turn("skills-session", "before-copy")?).await?;
    let first = h.latest()?;
    assert_eq!(directory(&first), None);
    assert_eq!(
        first
            .options
            .lock()
            .map_err(|_| "test lock poisoned")?
            .as_ref()
            .and_then(|options| options.org_skills.clone()),
        Some(OrgSkills {
            repository: "Owner/Skills".into(),
            trusted_repository: None,
            directory: None
        })
    );
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
    let mut released = Box::pin(h.skills.1.notified());
    *h.skills.0.lock().map_err(|_| "test lock poisoned")? =
        Some(PathBuf::from("/commit-two/skills"));
    assert_eq!(directory(&second).as_deref(), Some("/commit-one/skills"));
    assert!(futures_util::poll!(&mut released).is_pending());
    second.result(&[]);
    h.engine.idle().await?;
    assert!(futures_util::poll!(&mut released).is_ready());
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

#[tokio::test]
async fn helper_starts_carry_only_valid_repository_bound_trust_even_without_a_copy() -> TestResult {
    for (source, grant, expected) in [
        (None, Some("owner/skills"), None),
        (Some("owner/../skills"), Some("owner/skills"), None),
        (Some("Owner/Skills"), None, Some(("Owner/Skills", None))),
        (
            Some("Owner/Skills"),
            Some("owner/../skills"),
            Some(("Owner/Skills", None)),
        ),
        (
            Some("Owner/Skills"),
            Some("other/skills"),
            Some(("Owner/Skills", None)),
        ),
        (
            Some("Owner/Skills"),
            Some("OWNER/SKILLS"),
            Some(("Owner/Skills", Some("owner/skills"))),
        ),
    ] {
        let h = Fixture::configured(skills_configuration(source, grant)?).await?;
        h.command(turn("skills-session", "before-copy")?).await?;
        let first = h.latest()?;
        let actual = first
            .options
            .lock()
            .map_err(|_| "test lock poisoned")?
            .as_ref()
            .and_then(|options| options.org_skills.clone());
        assert_eq!(
            actual,
            expected.map(|(repository, trusted_repository)| OrgSkills {
                repository: repository.into(),
                trusted_repository: trusted_repository.map(str::to_owned),
                directory: None
            }),
            "{source:?} {grant:?}"
        );
        h.close().await?;
    }
    Ok(())
}
