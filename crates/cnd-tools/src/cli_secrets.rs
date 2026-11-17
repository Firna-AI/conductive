//! Secret command options and a shell-readable description of exact CLI arguments.

use serde_json::{Map, Value};

use crate::call::Name;
use crate::cli_parse::Arguments;
use crate::error::{Error, InputError, Result};

pub(crate) fn help(args: &[String]) -> bool {
    if args.get(1).is_some_and(|argument| argument == "--help") {
        return true;
    }
    let mut index = 2;
    while let Some(argument) = args.get(index) {
        if argument == "--" {
            return false;
        }
        if argument == "--help" {
            return true;
        }
        index += if argument.contains('=') { 1 } else { 2 };
    }
    false
}

pub(crate) fn parse(args: &[String]) -> Result<Arguments> {
    let invalid = || Error::Input(InputError::Secrets);
    if args.get(1).is_some_and(|verb| verb == "list") && args.len() == 2 {
        return Ok(Arguments {
            name: Name::ListSecrets,
            fields: Map::new(),
            message_path: None,
            command: None,
        });
    }
    if args.get(1).is_none_or(|verb| verb != "run") {
        return Err(invalid());
    }
    let mut names = Vec::new();
    let mut fields = Map::new();
    let mut index = 2;
    while let Some(argument) = args.get(index) {
        if argument == "--" {
            break;
        }
        let option = argument.strip_prefix("--").ok_or_else(invalid)?;
        let (key, inline) = option
            .split_once('=')
            .map_or((option, None), |(key, value)| (key, Some(value)));
        if !matches!(key, "secret" | "reason") {
            return Err(invalid());
        }
        let value = if let Some(value) = inline {
            value
        } else {
            index += 1;
            args.get(index).ok_or_else(invalid)?
        };
        if key == "secret" {
            names.push(Value::String(value.into()));
        } else {
            fields.insert("reason".into(), Value::String(value.into()));
        }
        index += 1;
    }
    let command = args
        .get(index + 1..)
        .filter(|args| !args.is_empty())
        .ok_or_else(invalid)?
        .to_vec();
    fields.insert("names".into(), Value::Array(names));
    fields.insert(
        "command".into(),
        Value::String(
            command
                .iter()
                .map(|argument| quote(argument))
                .collect::<Vec<_>>()
                .join(" "),
        ),
    );
    Ok(Arguments {
        name: Name::RunWithSecrets,
        fields,
        message_path: None,
        command: Some(command),
    })
}

fn quote(argument: &str) -> String {
    if !argument.is_empty()
        && argument
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"_@%+=:,./-".contains(&byte))
    {
        argument.into()
    } else {
        format!("'{}'", argument.replace('\'', "'\\''"))
    }
}
