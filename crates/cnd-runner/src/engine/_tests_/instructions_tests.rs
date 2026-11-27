//! The exact instruction text of new sessions.

#![allow(clippy::unwrap_used)]

use std::collections::BTreeMap;
use std::path::Path;
use std::sync::{Arc, Mutex};

use cnd_runner_interface::agents::Agent;
use tracing::field::{Field, Visit};
use tracing::span::{Attributes, Id, Record};
use tracing::{Event, Level, Metadata, Subscriber};

use crate::config::{Configuration, DISK_LINE_ENV};
use crate::error::Result;

use super::build;

pub(super) fn settings() -> BTreeMap<String, String> {
    BTreeMap::from([
        ("CONDUCTIVE_WORKSPACE_ID".into(), "workspace".into()),
        ("CONDUCTIVE_WORKSPACE_TOKEN".into(), "token".into()),
        (
            "CONDUCTIVE_RUNNER_URL".into(),
            "https://machine.test/v1/runner".into(),
        ),
        ("CONDUCTIVE_REPOSITORY".into(), "/repo".into()),
        ("CONDUCTIVE_DEFAULT_BRANCH".into(), "main".into()),
        ("CONDUCTIVE_WORKSPACE_BRANCH".into(), "member/work".into()),
    ])
}

fn configured(depth: &str) -> BTreeMap<String, String> {
    let mut env = settings();
    for (key, value) in [
        (
            "CONDUCTIVE_WORKSPACE_LINK",
            "https://app.test/orgs/org/workspaces/workspace",
        ),
        ("CONDUCTIVE_WORKSPACE_DEPTH", depth),
        ("CONDUCTIVE_WORKSPACE_MAX_DEPTH", "3"),
    ] {
        env.insert(key.into(), value.into());
    }
    if depth != "0" {
        env.insert("CONDUCTIVE_PARENT_WORKSPACE_ID".into(), "parent".into());
        env.insert(
            "CONDUCTIVE_PARENT_WORKSPACE_LINK".into(),
            "https://app.test/orgs/org/workspaces/parent".into(),
        );
    }
    env
}

fn instructions(env: &BTreeMap<String, String>, agent: &Agent) -> Result<Vec<String>> {
    let config = Configuration::parse(env, Path::new("/repo"), Path::new("/home/user"))?;
    let (text, _) = build(&config, None, None, agent)?;
    Ok(text
        .split("\n\n")
        .skip_while(|line| !line.starts_with("Keep the workspace branch name"))
        .skip(1)
        .take_while(|line| !line.starts_with("When computer tools"))
        .map(String::from)
        .collect())
}

#[test]
fn gives_screenshot_guidance_after_computer_tools() -> Result<()> {
    let config = Configuration::parse(
        &configured("0"),
        Path::new("/repo"),
        Path::new("/home/user"),
    )?;
    for agent in [Agent::Claude, Agent::Codex] {
        let (text, _) = build(&config, None, None, &agent)?;
        assert_eq!(
            text.split("\n\n")
                .skip_while(|line| !line.starts_with("When computer tools are available"))
                .nth(1),
            Some(
                "When you design or check an interface in a browser, save a screenshot of the result as a PNG file in the context folder. Show it in your reply as a Markdown image."
            ),
            "{agent:?}"
        );
    }
    Ok(())
}

#[test]
fn gives_the_disk_limit_line_only_when_the_environment_sets_it() -> Result<()> {
    let expected = r#"The cloud computer keeps its files under a fixed disk limit. Writes past it fail with "No space left on device". When that happens, delete build output that can be rebuilt, such as Rust target/ folders, and never change the disk hold."#;
    for agent in [Agent::Claude, Agent::Codex] {
        let mut env = settings();
        let cwd = Path::new("/repo");
        let home = Path::new("/home/user");
        let config = Configuration::parse(&env, cwd, home)?;
        let (text, _) = build(&config, None, None, &agent)?;
        assert_eq!(
            text.split("\n\n").filter(|line| *line == expected).count(),
            0
        );

        env.insert(DISK_LINE_ENV.into(), "72000000000".into());
        let config = Configuration::parse(&env, cwd, home)?;
        let (text, _) = build(&config, None, None, &agent)?;
        assert_eq!(
            text.split("\n\n").filter(|line| *line == expected).count(),
            1
        );
    }
    Ok(())
}

#[test]
fn asks_both_agents_to_label_code_fences_in_replies() -> Result<()> {
    let config = Configuration::parse(
        &configured("0"),
        Path::new("/repo"),
        Path::new("/home/user"),
    )?;
    for agent in [Agent::Claude, Agent::Codex] {
        let (text, _) = build(&config, None, None, &agent)?;
        assert_eq!(
            text.split("\n\n")
                .skip_while(|line| !line.starts_with("Name a file or a folder of the repository"))
                .nth(1),
            Some(
                "Label each opening code fence in your reply with its language, such as ```rust, or use ```text for command output."
            ),
            "{agent:?}"
        );
    }
    Ok(())
}

#[test]
fn gives_exact_top_level_context_to_both_agents() -> Result<()> {
    for agent in [Agent::Claude, Agent::Codex] {
        assert_eq!(
            instructions(&configured("0"), &agent)?,
            vec![
                "Workspace ID: \"workspace\"",
                "Workspace link: \"https://app.test/orgs/org/workspaces/workspace\"",
                "This is a top-level workspace at depth 0.",
                "Nest a new workspace under this one when its work belongs to the task of this workspace: a part of a large task that can run in parallel, follow-up work that the task starts, work in another repository for the same task, or a change that needs its own pull request. A workspace has one branch at a time, so each separate pull request needs its own workspace. Create a top-level workspace for unrelated work. When a member names the place of a new workspace, follow the member.",
                "Nesting stops at depth 3. To nest a new workspace under this one, pass \"workspace\" as parentId to create_workspace.",
                "Use get_workspace to find the parent and the sub-workspaces of a workspace. Use list_workspaces with parentId to list direct sub-workspaces.",
                "A move with move_workspace can change the parent and depth, so use get_workspace to read their current values.",
            ]
        );
    }
    Ok(())
}

#[test]
fn gives_exact_depth_one_context() -> Result<()> {
    assert_eq!(
        instructions(&configured("1"), &Agent::Codex)?,
        vec![
            "Workspace ID: \"workspace\"",
            "Workspace link: \"https://app.test/orgs/org/workspaces/workspace\"",
            "This workspace is nested at depth 1 under its parent. Parent workspace ID: \"parent\". Parent workspace link: \"https://app.test/orgs/org/workspaces/parent\".",
            "Nest a new workspace under this one when its work belongs to the task of this workspace: a part of a large task that can run in parallel, follow-up work that the task starts, work in another repository for the same task, or a change that needs its own pull request. A workspace has one branch at a time, so each separate pull request needs its own workspace. Create a top-level workspace for unrelated work. When a member names the place of a new workspace, follow the member.",
            "Nesting stops at depth 3. To nest a new workspace under this one, pass \"workspace\" as parentId to create_workspace.",
            "Use get_workspace to find the parent and the sub-workspaces of a workspace. Use list_workspaces with parentId to list direct sub-workspaces.",
            "A move with move_workspace can change the parent and depth, so use get_workspace to read their current values.",
        ]
    );
    Ok(())
}

#[test]
fn gives_exact_sibling_advice_at_the_deepest_depth() -> Result<()> {
    assert_eq!(
        instructions(&configured("3"), &Agent::Codex)?,
        vec![
            "Workspace ID: \"workspace\"",
            "Workspace link: \"https://app.test/orgs/org/workspaces/workspace\"",
            "This workspace is nested at depth 3 under its parent. Parent workspace ID: \"parent\". Parent workspace link: \"https://app.test/orgs/org/workspaces/parent\".",
            "Nest a new workspace under this one when its work belongs to the task of this workspace: a part of a large task that can run in parallel, follow-up work that the task starts, work in another repository for the same task, or a change that needs its own pull request. A workspace has one branch at a time, so each separate pull request needs its own workspace. Create a top-level workspace for unrelated work. When a member names the place of a new workspace, follow the member.",
            "Nesting stops at depth 3.",
            "This workspace cannot hold sub-workspaces. Create a sibling instead. Pass \"parent\" as parentId to create_workspace. Start its name with a one-word group prefix, such as \"Limits: \".",
            "Use get_workspace to find the parent and the sub-workspaces of a workspace. Use list_workspaces with parentId to list direct sub-workspaces.",
            "A move with move_workspace can change the parent and depth, so use get_workspace to read their current values.",
        ]
    );
    Ok(())
}

#[test]
fn omits_tree_context_without_the_new_variables() -> Result<()> {
    assert_eq!(
        instructions(&settings(), &Agent::Codex)?,
        Vec::<String>::new()
    );
    Ok(())
}

#[test]
fn follows_the_depth_limit_supplied_by_the_worker() -> Result<()> {
    let mut env = configured("4");
    env.insert("CONDUCTIVE_WORKSPACE_MAX_DEPTH".into(), "4".into());
    let lines = instructions(&env, &Agent::Codex)?;
    assert_eq!(
        lines.get(4).map(String::as_str),
        Some("Nesting stops at depth 4.")
    );
    assert_eq!(
        lines.get(5).map(String::as_str),
        Some(
            "This workspace cannot hold sub-workspaces. Create a sibling instead. Pass \"parent\" as parentId to create_workspace. Start its name with a one-word group prefix, such as \"Limits: \"."
        )
    );
    Ok(())
}

#[derive(Clone, Default)]
struct Warnings(Arc<Mutex<Vec<String>>>);

#[derive(Default)]
struct Message(String);

impl Visit for Message {
    fn record_debug(&mut self, field: &Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.0 = format!("{value:?}");
        }
    }
}

impl Subscriber for Warnings {
    fn enabled(&self, metadata: &Metadata<'_>) -> bool {
        *metadata.level() == Level::WARN
    }
    fn new_span(&self, _: &Attributes<'_>) -> Id {
        Id::from_u64(1)
    }
    fn record(&self, _: &Id, _: &Record<'_>) {}
    fn record_follows_from(&self, _: &Id, _: &Id) {}
    fn enter(&self, _: &Id) {}
    fn exit(&self, _: &Id) {}
    fn event(&self, event: &Event<'_>) {
        let mut message = Message::default();
        event.record(&mut message);
        self.0.lock().unwrap().push(message.0);
    }
}

#[test]
fn warns_once_and_omits_missing_or_malformed_context() -> Result<()> {
    for (key, value) in [
        ("CONDUCTIVE_WORKSPACE_LINK", None),
        ("CONDUCTIVE_WORKSPACE_DEPTH", None),
        ("CONDUCTIVE_WORKSPACE_MAX_DEPTH", None),
        ("CONDUCTIVE_WORKSPACE_LINK", Some("not-a-link")),
        ("CONDUCTIVE_WORKSPACE_LINK", Some("file:///private/path")),
        ("CONDUCTIVE_WORKSPACE_DEPTH", Some("1.0")),
        ("CONDUCTIVE_WORKSPACE_DEPTH", Some("-1")),
        ("CONDUCTIVE_WORKSPACE_DEPTH", Some("+1")),
        ("CONDUCTIVE_WORKSPACE_DEPTH", Some("4")),
        ("CONDUCTIVE_WORKSPACE_MAX_DEPTH", Some("0")),
        ("CONDUCTIVE_WORKSPACE_MAX_DEPTH", Some("not-a-depth")),
        ("CONDUCTIVE_PARENT_WORKSPACE_ID", None),
        ("CONDUCTIVE_PARENT_WORKSPACE_ID", Some(" ")),
        ("CONDUCTIVE_PARENT_WORKSPACE_LINK", None),
        ("CONDUCTIVE_PARENT_WORKSPACE_LINK", Some("bad-parent-link")),
    ] {
        let mut env = configured("1");
        match value {
            Some(value) => {
                env.insert(key.into(), value.into());
            }
            None => {
                env.remove(key);
            }
        }
        let warnings = Warnings::default();
        let result = tracing::subscriber::with_default(warnings.clone(), || {
            instructions(&env, &Agent::Codex)
        });
        assert_eq!(result?, Vec::<String>::new(), "{key}: {value:?}");
        assert_eq!(
            *warnings.0.lock().unwrap(),
            vec!["The workspace tree context is unavailable. Agent instructions will omit it."],
            "{key}: {value:?}"
        );
    }
    let warnings = Warnings::default();
    let result = tracing::subscriber::with_default(warnings.clone(), || {
        instructions(&settings(), &Agent::Codex)
    });
    assert_eq!(result?, Vec::<String>::new());
    assert_eq!(warnings.0.lock().unwrap().len(), 1);
    Ok(())
}
