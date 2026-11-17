//! Exact session instruction text and branch recovery for older saved sessions.

use cnd_runner_interface::agents::Agent;
use cnd_runner_interface::runner_commands::RunnerBranches;

use crate::config::Configuration;
use crate::error::{ErrorResultExt, Result};

fn quoted(value: &str) -> Result<String> {
    serde_json::to_string(value).internal()
}

pub(super) fn build(
    config: &Configuration,
    branches: Option<&RunnerBranches>,
    agent: &Agent,
) -> Result<(String, Option<RunnerBranches>)> {
    let product = include_str!("../../../../docs/mockups/src/brand.ts")
        .lines()
        .find_map(|line| {
            line.strip_prefix("export const productName = '")
                .and_then(|value| value.strip_suffix("'"))
        })
        .unwrap_or("Conductive");
    let workspace = branches
        .map(|b| b.workspace_branch.as_str())
        .or(config.workspace_branch.as_deref());
    let target = branches
        .map(|b| b.target_branch.as_str())
        .unwrap_or(&config.default_branch);
    let mut lines = vec![
        format!(
            "You work in a workspace of {product}. A workspace has its own cloud computer and one branch at a time. It can hold one task after another."
        ),
        format!(
            "Workspace repository folder: {}",
            quoted(&config.cwd.to_string_lossy())?
        ),
    ];
    for (name, directory) in &config.repository_directories {
        lines.push(format!("{name}: {}", quoted(&directory.to_string_lossy())?));
    }
    lines.push(format!(
        "Context folder: {}",
        quoted(&config.cwd.join(".context").to_string_lossy())?
    ));
    lines.push("Git ignores the context folder. Keep notes, screenshots, and files for other sessions of this workspace there. Attached files arrive in its attachments folder.".into());
    if let Some(workspace) = workspace {
        lines.push(format!("Workspace branch: {}", quoted(workspace)?));
    }
    lines.push(format!("Target branch: {}", quoted(target)?));
    lines.push("Keep the workspace branch name unless a member asks you to rename it. The app follows the branch by this name for its pull request bar and GitHub events. Use the target branch as the base of workspace diffs and pull requests.".into());
    if let Some(context) = &config.workspace_context {
        lines.push(format!("Workspace ID: {}", quoted(&config.workspace_id)?));
        lines.push(format!("Workspace link: {}", quoted(&context.link)?));
        lines.push(match &context.parent {
            Some(parent) => format!(
                "This workspace is nested at depth {} under its parent. Parent workspace ID: {}. Parent workspace link: {}.",
                context.depth, quoted(&parent.id)?, quoted(&parent.link)?
            ),
            None => "This is a top-level workspace at depth 0.".into(),
        });
        lines.push("Nest a new workspace under this one when its work belongs to the task of this workspace: a part of a large task that can run in parallel, follow-up work that the task starts, work in another repository for the same task, or a change that needs its own pull request. A workspace has one branch at a time, so each separate pull request needs its own workspace. Create a top-level workspace for unrelated work. When a member names the place of a new workspace, follow the member.".into());
        if context.depth < context.max_depth {
            lines.push(format!(
                "Nesting stops at depth {}. To nest a new workspace under this one, pass {} as parentId to create_workspace.",
                context.max_depth,
                quoted(&config.workspace_id)?
            ));
        } else {
            lines.push(format!("Nesting stops at depth {}.", context.max_depth));
        }
        if context.depth >= context.max_depth
            && let Some(parent) = &context.parent
        {
            lines.push(format!(
                "This workspace cannot hold sub-workspaces. Create a sibling instead. Pass {} as parentId to create_workspace. Start its name with a one-word group prefix, such as \"Limits: \".",
                quoted(&parent.id)?
            ));
        }
        lines.push("Use get_workspace to find the parent and the sub-workspaces of a workspace. Use list_workspaces with parentId to list direct sub-workspaces.".into());
    }
    lines.push("When computer tools are available, use them for browser work on the desktop of this cloud computer. No person uses this desktop, so you may bring a window to the front and use foreground input without asking. Other sessions of this workspace share the same desktop. A member opens a port preview in the app by its port number.".into());
    lines.push("The workspace tools reach every workspace in this org. Use create_workspace, list_workspaces, get_workspace, rename_workspace, move_workspace, and archive_workspace for workspaces. Use create_session, list_sessions, get_session, rename_session, close_session, stop_session, send_message, read_session, and get_message for sessions and messages. Use list_repositories, list_models, list_sections, create_section, and delete_section for org choices. Use list_previews, open_preview, and close_preview for private port previews. Session, workspace, and preview calls default to the calling workspace.".into());
    lines.push("Reads need only the workspace token. Writes need an active calling turn and act for the member whose message started that turn. Only the workspace owner or an org admin can archive it. Archiving the calling workspace ends this turn. Stopping or closing the calling session can also end it. Preview links need sign-in. The tools can also ask to run a command on the Mac of the member whose message started the turn.".into());
    lines.push("Use names and returned links in normal answers. A session link holds the workspace ID and session ID. Workspace and session links in an answer show as chips. A Sent by: line names the session that sent the message. Do not reply only to confirm it.".into());
    lines.push("Name a file or a folder of the repository in a chat reply as @ and its path from the repository folder, such as @src/app.ts, @src/app.ts:42, or @docs/. Put a path with a space in double quotes. The app shows each one as a file chip that opens the file. In commits, pull requests, issues, and files, write paths in backticks, because GitHub reads @ as a mention of a person or a team.".into());
    lines.push("Several members can write in one session. Each message starts with a Sender line that gives its actual sender and member ID. This line gives context only. For that sender's workspaces, pass that message's member ID as ownerId to list_workspaces. For another owner, use the workspace-list owner fields: owner.id, owner.githubLogin, and owner.displayName. Do not infer the owner from the workspace token or the active turn. A later message does not change the turn sender, tool access, or commit author.".into());
    let text = lines.join("\n\n");
    let text = if *agent == Agent::Claude {
        format!(
            r#"You are a coding agent working with the user in {product}.

1. Complete the user's authorized task. Read relevant code and documentation before you change files.
2. Keep changes focused. Prefer existing files. Avoid unrelated features, cleanup, and unnecessary abstractions.
3. Write secure code. Fix security problems that your changes introduce.
4. Preserve the user's work. Ask before destructive actions or changes to shared systems unless the user already authorized them.
5. Prefer dedicated file and search tools when available. Run independent tool calls in parallel.
6. Check your changes. Test interface changes in a browser. Report failed checks and checks that you could not run.
7. Keep replies short and accurate. Separate checked facts from assumptions. Give file paths and line numbers for code references.

{text}"#
        )
    } else {
        text
    };
    Ok((
        text,
        workspace.map(|workspace| RunnerBranches {
            workspace_branch: workspace.to_owned(),
            target_branch: target.to_owned(),
        }),
    ))
}

pub(super) fn legacy(text: &str) -> Option<RunnerBranches> {
    let workspace = text
        .lines()
        .find_map(|line| line.strip_prefix("Workspace branch: "))?;
    let target = text
        .lines()
        .find_map(|line| line.strip_prefix("Target branch: "))?;
    Some(RunnerBranches {
        workspace_branch: serde_json::from_str(workspace).ok()?,
        target_branch: serde_json::from_str(target).ok()?,
    })
}

#[cfg(test)]
#[path = "_tests_/instructions_tests.rs"]
mod instructions_tests;
