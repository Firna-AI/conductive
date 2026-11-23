//! Decode the flags and numeric values of workspace CLI commands.

use serde_json::Value;

use crate::call::Name;

pub(crate) fn options(name: Name) -> Vec<&'static str> {
    let options = match name {
        Name::ListSecrets | Name::RunWithSecrets => "",
        Name::CreateWorkspace => {
            "repository message message-file agent model effort fast section parent name first-session-title request-id start-branch base-branch"
        }
        Name::ListWorkspaces => {
            "owner parent state repository query updated-since archived removed limit offset"
        }
        Name::GetWorkspace | Name::ArchiveWorkspace | Name::ListPreviews => "workspace",
        Name::RenameWorkspace => "workspace name",
        Name::MoveWorkspace => "workspace section parent top-level",
        Name::ListSessions => "workspace limit offset",
        Name::ReadSession => "workspace session detail start-line start-offset",
        Name::CreateSession => {
            "workspace message message-file title agent model effort fast request-id"
        }
        Name::SendMessage => {
            "workspace session message message-file agent model effort fast request-id"
        }
        Name::GetSession | Name::StopSession | Name::ListWakeUps => "workspace session",
        Name::WatchSession => "workspace session turn-id",
        Name::ScheduleWakeUp => "message delay-seconds at",
        Name::CancelWakeUp => "workspace session wake-up-id",
        Name::RenameSession => "workspace session title",
        Name::CloseSession => "workspace session stop-running-turn",
        Name::GetMessage => "workspace session message-id",
        Name::CreateSection => "name",
        Name::DeleteSection => "section",
        Name::OpenPreview => "workspace port",
        Name::ClosePreview => "workspace preview",
        Name::RunMacCommand => {
            "command folder reason timeout-seconds longer-timeout-reason request-id"
        }
        Name::ListRepositories | Name::ListSections | Name::ListModels => "",
    };
    options.split_whitespace().collect()
}

pub(crate) fn field(key: &str) -> String {
    match key {
        "workspace" | "session" | "repository" | "section" | "preview" | "owner" | "parent" => {
            format!("{key}Id")
        }
        _ => {
            let mut parts = key.split('-');
            let mut result = parts.next().unwrap_or_default().to_string();
            for part in parts {
                let mut chars = part.chars();
                if let Some(first) = chars.next() {
                    result.extend(first.to_uppercase());
                    result.extend(chars);
                }
            }
            result
        }
    }
}

pub(crate) fn number(value: &str) -> Value {
    let value = value.trim();
    if value.is_empty() {
        return Value::from(0);
    }
    for (prefixes, radix) in [(["0x", "0X"], 16), (["0b", "0B"], 2), (["0o", "0O"], 8)] {
        if let Some(digits) = prefixes
            .iter()
            .find_map(|prefix| value.strip_prefix(prefix))
        {
            return u64::from_str_radix(digits, radix)
                .map(Value::from)
                .unwrap_or(Value::Null);
        }
    }
    if let Ok(integer) = value.parse::<i64>() {
        return Value::from(integer);
    }
    if let Ok(number) = value.parse::<f64>() {
        if number.is_finite() && number.fract() == 0.0 && number.abs() <= 9_007_199_254_740_991.0 {
            return Value::from(number as i64);
        }
        return Value::from(number);
    }
    Value::Null
}
