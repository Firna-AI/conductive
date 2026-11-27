//! Service settings, parsed without reading the process environment.

use std::collections::BTreeMap;
use std::path::{Component, Path, PathBuf};

use url::Url;

use crate::error::{Error, Result};

/// Sandbox environment variable that supplies the disk line in bytes.
pub const DISK_LINE_ENV: &str = "CONDUCTIVE_DISK_LINE_BYTES";

/// A WebSocket request. Its token must never enter event state or diagnostics.
#[derive(Clone)]
pub struct ConnectionRequest {
    /// HTTPS or WSS runner route on the machine hostname.
    pub url: String,
    /// Workspace bearer token.
    pub workspace_token: String,
}

/// Stable workspace tree facts supplied by the Worker at each start.
#[derive(Clone)]
pub struct WorkspaceContext {
    /// Canonical workspace link.
    pub link: String,
    /// Number of stored parent links above this workspace.
    pub depth: u32,
    /// Deepest permitted depth supplied by the Worker.
    pub max_depth: u32,
    /// Direct parent, absent only for a top-level workspace.
    pub parent: Option<ParentWorkspace>,
}

/// Identity and canonical link of a workspace's direct parent.
#[derive(Clone)]
pub struct ParentWorkspace {
    /// Parent workspace ID used to create a sibling.
    pub id: String,
    /// Canonical parent workspace link.
    pub link: String,
}

/// Parsed service configuration shared with the file and turn owners.
#[derive(Clone)]
pub struct Configuration {
    /// Workspace identity sent in hello.
    pub workspace_id: String,
    /// Authenticated transport settings.
    pub request: ConnectionRequest,
    /// Absolute repository folder.
    pub cwd: PathBuf,
    /// Absolute agent home folder.
    pub home: PathBuf,
    /// Base branch of repository reports.
    pub default_branch: String,
    /// Branch tracked by the workspace, when supplied by its service.
    pub workspace_branch: Option<String>,
    /// Public GitHub skills repository, validated before use in paths or URLs.
    pub skills_repository: Option<String>,
    /// Matching trusted source identity, compared without letter case.
    pub trusted_skills_repository: Option<String>,
    /// Validated tree facts, omitted for older or malformed service settings.
    pub workspace_context: Option<WorkspaceContext>,
    /// Image repository variables in name order.
    pub repository_directories: BTreeMap<String, PathBuf>,
    /// State file path, with the Node runner's default.
    pub state_path: PathBuf,
    /// Whether the sandbox environment supplies a disk line.
    pub disk_hold_enabled: bool,
}

impl Configuration {
    /// Parse supplied environment values with explicit path and home defaults.
    pub fn parse(env: &BTreeMap<String, String>, cwd: &Path, home: &Path) -> Result<Self> {
        let home = absolute(
            cwd,
            env.get("CONDUCTIVE_HOME").map(Path::new).unwrap_or(home),
        );
        let workspace_branch = env
            .get("CONDUCTIVE_WORKSPACE_BRANCH")
            .filter(|s| !s.is_empty())
            .cloned();
        if workspace_branch.is_none() {
            tracing::warn!("The workspace branch is unavailable. Agent instructions will omit it.");
        }
        let workspace_id = required(env, "CONDUCTIVE_WORKSPACE_ID")?;
        let workspace_context = workspace_context(env, &workspace_id);
        if workspace_context.is_none() {
            tracing::warn!(
                "The workspace tree context is unavailable. Agent instructions will omit it."
            );
        }
        let skills_repository = env
            .get("CONDUCTIVE_SKILLS_REPOSITORY")
            .filter(|value| !value.is_empty())
            .filter(|value| {
                if is_skills_repository(value) {
                    true
                } else {
                    tracing::warn!(
                        "The skills repository name is invalid. No org skills will load."
                    );
                    false
                }
            })
            .cloned();
        let trusted_skills_repository = env
            .get("CONDUCTIVE_TRUSTED_SKILLS_REPOSITORY")
            .filter(|value| is_skills_repository(value))
            .filter(|value| {
                skills_repository
                    .as_ref()
                    .is_some_and(|source| source.eq_ignore_ascii_case(value))
            })
            .map(|value| value.to_ascii_lowercase());
        Ok(Self {
            workspace_id,
            request: ConnectionRequest {
                url: required(env, "CONDUCTIVE_RUNNER_URL")?,
                workspace_token: required(env, "CONDUCTIVE_WORKSPACE_TOKEN")?,
            },
            cwd: absolute(cwd, Path::new(&required(env, "CONDUCTIVE_REPOSITORY")?)),
            state_path: env
                .get("CONDUCTIVE_STATE_PATH")
                .map(PathBuf::from)
                .unwrap_or_else(|| home.join(".conductive/runner-state.json")),
            disk_hold_enabled: env.contains_key(DISK_LINE_ENV),
            home,
            default_branch: required(env, "CONDUCTIVE_DEFAULT_BRANCH")?,
            workspace_branch,
            skills_repository,
            trusted_skills_repository,
            workspace_context,
            repository_directories: env
                .iter()
                .filter(|(name, value)| repository_variable(name) && !value.is_empty())
                .map(|(name, value)| (name.clone(), absolute(cwd, Path::new(value))))
                .collect(),
        })
    }
}

pub(crate) fn is_skills_repository(value: &str) -> bool {
    let Some((owner, name)) = value.split_once('/') else {
        return false;
    };
    !owner.is_empty()
        && owner.len() <= 39
        && owner
            .split('-')
            .all(|part| !part.is_empty() && part.bytes().all(|c| c.is_ascii_alphanumeric()))
        && !name.is_empty()
        && name.len() <= 100
        && name
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"_.-".contains(&c))
        && name != "."
        && !name.contains("..")
}

fn workspace_context(
    env: &BTreeMap<String, String>,
    workspace_id: &str,
) -> Option<WorkspaceContext> {
    identifier(workspace_id)?;
    let workspace_link = link(env.get("CONDUCTIVE_WORKSPACE_LINK")?)?;
    let depth = decimal(env.get("CONDUCTIVE_WORKSPACE_DEPTH")?)?;
    let max_depth = decimal(env.get("CONDUCTIVE_WORKSPACE_MAX_DEPTH")?)?;
    if max_depth == 0 || depth > max_depth {
        return None;
    }
    let parent = if depth == 0 {
        if env.contains_key("CONDUCTIVE_PARENT_WORKSPACE_ID")
            || env.contains_key("CONDUCTIVE_PARENT_WORKSPACE_LINK")
        {
            return None;
        }
        None
    } else {
        let id = identifier(env.get("CONDUCTIVE_PARENT_WORKSPACE_ID")?)?;
        if id == workspace_id {
            return None;
        }
        Some(ParentWorkspace {
            id: id.into(),
            link: link(env.get("CONDUCTIVE_PARENT_WORKSPACE_LINK")?)?,
        })
    };
    Some(WorkspaceContext {
        link: workspace_link,
        depth,
        max_depth,
        parent,
    })
}

fn identifier(value: &str) -> Option<&str> {
    (!value.is_empty() && !value.chars().any(|c| c.is_whitespace() || c.is_control()))
        .then_some(value)
}

fn decimal(value: &str) -> Option<u32> {
    if value.is_empty() || !value.bytes().all(|c| c.is_ascii_digit()) {
        return None;
    }
    value.parse().ok()
}

fn link(value: &str) -> Option<String> {
    if value.trim() != value || value.chars().any(char::is_control) {
        return None;
    }
    let url = Url::parse(value).ok()?;
    (matches!(url.scheme(), "http" | "https") && url.host_str().is_some()).then(|| value.to_owned())
}

fn required(env: &BTreeMap<String, String>, name: &'static str) -> Result<String> {
    env.get(name)
        .filter(|s| !s.is_empty())
        .cloned()
        .ok_or(Error::MissingSetting { name })
}

fn repository_variable(name: &str) -> bool {
    name.strip_prefix("CONDUCTIVE_REPOSITORY_")
        .and_then(|s| s.strip_suffix("_DIR"))
        .is_some_and(|s| {
            !s.is_empty()
                && s.bytes()
                    .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == b'_')
        })
}

fn absolute(cwd: &Path, path: &Path) -> PathBuf {
    let mut result = PathBuf::new();
    for component in cwd.join(path).components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                result.pop();
            }
            other => result.push(other),
        }
    }
    result
}

#[cfg(test)]
#[path = "_tests_/config_tests.rs"]
mod config_tests;
