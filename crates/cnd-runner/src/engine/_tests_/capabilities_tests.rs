//! Capability facts in new instructions and compatibility with older turn commands.

use std::path::Path;

use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::runner_commands::{RunnerCapabilities, RunnerTurn};

use crate::config::Configuration;
use crate::error::{ErrorResultExt, Result};

use super::build;
use super::instructions_tests::settings;

fn configuration() -> Result<Configuration> {
    Configuration::parse(&settings(), Path::new("/repo"), Path::new("/home/user"))
}

fn paragraphs(text: &str) -> Vec<&str> {
    text.split("\n\n")
        .skip_while(|line| !line.starts_with("The workspace tools reach"))
        .skip(1)
        .take_while(|line| !line.starts_with("Reads need only the workspace token"))
        .collect()
}

fn check(capabilities: Option<RunnerCapabilities>, expected: &[&str]) -> Result<()> {
    for agent in [Agent::Claude, Agent::Codex] {
        let (text, _) = build(&configuration()?, None, capabilities.as_ref(), &agent)?;
        assert_eq!(paragraphs(&text), expected, "{agent:?}");
    }
    Ok(())
}

#[test]
fn omits_capability_text_when_facts_are_missing_or_empty() -> Result<()> {
    check(None, &[])?;
    check(Some(RunnerCapabilities { secrets: vec![] }), &[])
}

#[test]
fn names_secrets_as_json_and_keeps_change_notice() -> Result<()> {
    check(
        Some(RunnerCapabilities {
            secrets: vec!["API \"token\"\n".into()],
        }),
        &[
            r#"Use run_with_secrets to use these secrets with no request: "API \"token\"\n". Members can change these capabilities. The app then tells you in a line of the app."#,
        ],
    )
}

#[test]
fn names_a_single_secret_and_keeps_change_notice() -> Result<()> {
    check(
        Some(RunnerCapabilities {
            secrets: vec!["DEPLOY_KEY".into()],
        }),
        &[
            r#"Use run_with_secrets to use these secrets with no request: "DEPLOY_KEY". Members can change these capabilities. The app then tells you in a line of the app."#,
        ],
    )
}

#[test]
fn sorts_and_deduplicates_secret_names() -> Result<()> {
    check(
        Some(RunnerCapabilities {
            secrets: ["Z_TOKEN", "A_TOKEN", "Z_TOKEN", "A_TOKEN", "M_TOKEN"]
                .map(String::from)
                .to_vec(),
        }),
        &[
            r#"Use run_with_secrets to use these secrets with no request: "A_TOKEN", "M_TOKEN", "Z_TOKEN". Members can change these capabilities. The app then tells you in a line of the app."#,
        ],
    )
}

#[test]
fn limits_secret_names_to_ten_and_counts_other_unique_names() -> Result<()> {
    check(
        Some(RunnerCapabilities {
            secrets: [
                "N", "M", "L", "K", "J", "I", "H", "G", "F", "E", "D", "C", "B", "A", "N", "A",
            ]
            .map(String::from)
            .to_vec(),
        }),
        &[
            r#"Use run_with_secrets to use these secrets with no request: "A", "B", "C", "D", "E", "F", "G", "H", "I", "J" and 4 more. Members can change these capabilities. The app then tells you in a line of the app."#,
        ],
    )
}

#[test]
fn builds_instructions_from_an_old_turn_without_capabilities() -> Result<()> {
    let RunnerTurn::Turn {
        branches,
        capabilities,
        message,
        ..
    } = serde_json::from_str(
        r#"{"type":"turn","commandId":"command","sessionId":"session","turnId":"turn","message":{"id":"message","sessionId":"session","sender":{"id":"member","githubLogin":"member","displayName":null,"avatarUrl":null},"text":"Work.","attachments":[],"choice":{"agent":"claude","model":"model","effort":"high"},"createdAt":100,"state":"sent"},"attachments":[],"credential":{"agent":"claude","kind":"token","token":"test-token"},"commitAuthor":null}"#,
    )
    .internal()?;
    assert_eq!(capabilities, None);
    let (text, branches) = build(
        &configuration()?,
        branches.as_ref(),
        capabilities.as_ref(),
        &message.choice.agent,
    )?;
    assert_eq!(paragraphs(&text), Vec::<&str>::new());
    assert_eq!(
        branches.map(|branches| (branches.workspace_branch, branches.target_branch)),
        Some(("member/work".into(), "main".into()))
    );
    Ok(())
}

#[test]
fn names_secret_tools_and_checks_before_asking_for_credentials() -> Result<()> {
    let (text, _) = build(&configuration()?, None, None, &Agent::Codex)?;
    let tools = text
        .split("\n\n")
        .find(|line| line.starts_with("The workspace tools reach"))
        .unwrap_or_default();
    assert!(tools.contains(
        "Use list_secrets to find secrets and run_with_secrets to run commands that need them."
    ));
    assert!(tools.contains(
        "Call list_secrets before you ask a member for an API key, a token, or another credential."
    ));
    Ok(())
}
