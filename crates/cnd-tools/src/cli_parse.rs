//! CLI option decoding, including values that start with a dash.

use serde_json::{Map, Value};

use crate::call::Name;
use crate::cli_options::{field, number, options};
use crate::cli_secrets;
use crate::error::{Error, InputError, Result};
use crate::services;

pub(crate) struct Arguments {
    pub(crate) name: Name,
    pub(crate) fields: Map<String, Value>,
    pub(crate) message_path: Option<String>,
    pub(crate) command: Option<Vec<String>>,
}

pub(crate) fn help(args: &[String]) -> bool {
    if args.is_empty() {
        return true;
    }
    if args[0] == "secrets" {
        return cli_secrets::help(args);
    }
    if args[0] == "services" {
        return services::cli::help(args);
    }
    if !matches!(args[0].as_str(), "sessions" | "wake-ups") {
        return args.iter().any(|value| value == "--help");
    }
    if args.get(1).is_some_and(|arg| arg == "--help") {
        return true;
    }
    let mut i = 2;
    while i < args.len() {
        if args[i] == "--help" {
            return true;
        }
        i += if args[i] == "--stop-running-turn" || args[i].contains('=') {
            1
        } else {
            2
        };
    }
    false
}

fn name(group: &str, verb: &str) -> Result<Name> {
    Ok(match (group, verb) {
        ("workspaces", "list") => Name::ListWorkspaces,
        ("workspaces", "get") => Name::GetWorkspace,
        ("workspaces", "create") => Name::CreateWorkspace,
        ("workspaces", "rename") => Name::RenameWorkspace,
        ("workspaces", "move") => Name::MoveWorkspace,
        ("workspaces", "archive") => Name::ArchiveWorkspace,
        ("repositories", "list") => Name::ListRepositories,
        ("sections", "list") => Name::ListSections,
        ("sections", "create") => Name::CreateSection,
        ("sections", "delete") => Name::DeleteSection,
        ("models", "list") => Name::ListModels,
        ("sessions", "list") => Name::ListSessions,
        ("sessions", "get") => Name::GetSession,
        ("sessions", "read") => Name::ReadSession,
        ("sessions", "create") => Name::CreateSession,
        ("sessions", "send") => Name::SendMessage,
        ("sessions", "rename") => Name::RenameSession,
        ("sessions", "close") => Name::CloseSession,
        ("sessions", "stop") => Name::StopSession,
        ("sessions", "watch") => Name::WatchSession,
        ("wake-ups", "schedule") => Name::ScheduleWakeUp,
        ("wake-ups", "list") => Name::ListWakeUps,
        ("wake-ups", "cancel") => Name::CancelWakeUp,
        ("messages", "get") => Name::GetMessage,
        ("previews", "list") => Name::ListPreviews,
        ("previews", "open") => Name::OpenPreview,
        ("previews", "close") => Name::ClosePreview,
        ("mac", "run") => Name::RunMacCommand,
        ("workspaces", _) => return Err(Error::Input(InputError::WorkspaceCommand)),
        ("sessions", _) => return Err(Error::Input(InputError::SessionCommand)),
        ("wake-ups", _) => return Err(Error::Input(InputError::WakeUpCommand)),
        ("mac", _) => return Err(Error::Input(InputError::MacCommand)),
        _ => return Err(Error::Input(InputError::Unknown)),
    })
}

pub(crate) fn parse(args: &[String]) -> Result<Arguments> {
    if args.first().is_some_and(|group| group == "secrets") {
        return cli_secrets::parse(args);
    }
    let invalid = if args.first().is_some_and(|group| group == "sessions") {
        InputError::SessionOptions
    } else {
        InputError::Command
    };
    if args.len() < 2 {
        return Err(Error::Input(invalid));
    }
    let parsed_name = name(&args[0], &args[1]);
    let name = parsed_name
        .as_ref()
        .copied()
        .unwrap_or(match args[0].as_str() {
            "workspaces" => Name::GetWorkspace,
            "sessions" | "messages" => Name::GetSession,
            "previews" => Name::ListPreviews,
            "mac" => Name::RunMacCommand,
            _ => Name::ListModels,
        });
    let allowed = options(name);
    let mut fields = Map::new();
    let mut i = 2;
    while i < args.len() {
        let Some(option) = args[i].strip_prefix("--") else {
            return Err(Error::Input(invalid));
        };
        let (key, inline) = match option.split_once('=') {
            Some((key, value)) => (key, Some(value)),
            None => (option, None),
        };
        if !allowed.contains(&key) {
            return Err(Error::Input(invalid));
        }
        if key == "stop-running-turn" || key == "top-level" {
            if inline.is_some() {
                return Err(Error::Input(invalid));
            }
            fields.insert(field(key), Value::Bool(true));
            i += 1;
            continue;
        }
        let value = if let Some(value) = inline {
            value
        } else {
            i += 1;
            args.get(i).ok_or(Error::Input(invalid))?
        };
        fields.insert(field(key), Value::String(value.into()));
        i += 1;
    }
    let name = parsed_name?;
    let message_path = fields
        .remove("messageFile")
        .and_then(|value| value.as_str().map(String::from));
    if message_path.is_some() && fields.contains_key("message") {
        return Err(Error::Input(InputError::MessageConflict));
    }
    if message_path
        .as_ref()
        .is_some_and(|path| path.trim().is_empty())
    {
        return Err(Error::Input(InputError::Required));
    }
    if let Some(value) = fields.remove("message") {
        fields.insert(
            if matches!(name, Name::SendMessage | Name::ScheduleWakeUp) {
                "text"
            } else {
                "firstMessage"
            }
            .into(),
            value,
        );
    }
    if let Some(Value::String(value)) = fields.get("delaySeconds") {
        let value = if value.trim().is_empty() {
            Value::Null
        } else {
            number(value)
        };
        fields.insert("delaySeconds".into(), value);
    }
    if fields.contains_key("agent") || fields.contains_key("model") {
        let mut model = Map::new();
        if let Some(value) = fields.remove("agent") {
            model.insert("agent".into(), value);
        }
        if let Some(value) = fields.remove("model") {
            model.insert("model".into(), value);
        }
        fields.insert("model".into(), Value::Object(model));
    }
    for key in [
        "limit",
        "offset",
        "updatedSince",
        "startLine",
        "startOffset",
        "port",
        "timeoutSeconds",
    ] {
        if let Some(Value::String(value)) = fields.get(key) {
            let number = number(value);
            fields.insert(key.into(), number);
        }
    }
    if let Some(Value::String(value)) = fields.get("fast") {
        let value = match value.as_str() {
            "true" => true,
            "false" => false,
            _ => return Err(Error::Input(InputError::Fast)),
        };
        fields.insert("fast".into(), Value::Bool(value));
    }
    for (key, error) in [
        ("archived", InputError::Archived),
        ("removed", InputError::Removed),
    ] {
        if let Some(Value::String(value)) = fields.get(key) {
            let value = match value.as_str() {
                "true" => true,
                "false" => false,
                _ => return Err(Error::Input(error)),
            };
            fields.insert(key.into(), Value::Bool(value));
        }
    }
    if name == Name::CloseSession && !fields.contains_key("stopRunningTurn") {
        fields.insert("stopRunningTurn".into(), Value::Bool(false));
    }
    Ok(Arguments {
        name,
        fields,
        message_path,
        command: None,
    })
}
