//! Secret CLI arguments and MCP inputs preserve the Worker's accepted forms.

use serde_json::{Value, json};

use crate::call::{Call, Name};
use crate::cli::{HELP, help_requested};
use crate::cli_parse;
use crate::error::{Error, ErrorResultExt, Result};
use crate::input;
use crate::request;
use crate::schema;

#[test]
fn secret_run_inputs_preserve_text_and_reject_only_invalid_forms() -> Result<()> {
    let valid = json!({"names":["TOKEN","TOKEN"," name "],"command":"","reason":""});
    let call = input::parse(
        Name::RunWithSecrets,
        valid.as_object().ok_or(Error::Reply { mac: false })?,
        "ignored",
    )?;
    assert_eq!(
        request::request(&call)?
            .body
            .as_deref()
            .map(serde_json::from_str::<Value>)
            .transpose()
            .internal()?,
        Some(valid)
    );
    for fields in [
        json!({"names":[],"command":"true"}),
        json!({"names":"TOKEN","command":"true"}),
        json!({"names":[""],"command":"true"}),
        json!({"names":[1],"command":"true"}),
        json!({"names":["TOKEN"],"command":1}),
        json!({"names":["TOKEN"],"command":"true","reason":null}),
    ] {
        let error = input::parse(
            Name::RunWithSecrets,
            fields.as_object().ok_or(Error::Reply { mac: false })?,
            "ignored",
        )
        .err()
        .ok_or(Error::Reply { mac: false })?;
        assert_eq!(
            error.message(),
            "Use secrets list or secrets run --secret NAME [--reason TEXT] -- <command>."
        );
    }
    Ok(())
}

#[test]
fn cli_requires_the_command_separator_and_keeps_child_flags_and_quoted_arguments() -> Result<()> {
    let args = [
        "secrets", "run", "--secret", "TOKEN", "--reason", "--help", "--", "printf", "a'b c",
        "--help",
    ]
    .map(String::from);
    assert!(!help_requested(&args));
    let parsed = cli_parse::parse(&args)?;
    assert_eq!(
        parsed.command,
        Some(vec!["printf".into(), "a'b c".into(), "--help".into()])
    );
    assert_eq!(
        parsed.fields,
        json!({"names":["TOKEN"],"reason":"--help","command":"printf 'a'\\''b c' --help"})
            .as_object()
            .ok_or(Error::Reply { mac: false })?
            .clone()
    );
    assert!(help_requested(
        &["secrets", "run", "--help"].map(String::from)
    ));
    assert!(help_requested(&["secrets", "--help"].map(String::from)));
    for args in [
        vec!["secrets", "run", "--secret", "TOKEN", "true"],
        vec!["secrets", "run", "--secret", "TOKEN", "--"],
        vec!["secrets", "list", "--secret", "TOKEN"],
    ] {
        let error = cli_parse::parse(&args.into_iter().map(String::from).collect::<Vec<_>>())
            .err()
            .ok_or(Error::Reply { mac: false })?;
        assert_eq!(
            error.message(),
            "Use secrets list or secrets run --secret NAME [--reason TEXT] -- <command>."
        );
    }
    assert!(matches!(
        input::parse(
            Name::ListSecrets,
            json!({}).as_object().ok_or(Error::Reply { mac: false })?,
            "ignored"
        )?,
        Call::ListSecrets
    ));
    assert!(HELP.contains("conductive secrets list"));
    assert!(HELP.contains("Keep each value out of output, files, and answers."));
    let tools = serde_json::to_value(schema::tools()?).internal()?;
    let tool = tools
        .as_array()
        .ok_or(Error::Reply { mac: false })?
        .iter()
        .find(|tool| tool["name"] == "run_with_secrets")
        .ok_or(Error::Reply { mac: false })?;
    assert_eq!(
        tool["inputSchema"]["properties"]["names"]["items"]["type"],
        "string"
    );
    assert_eq!(tool["inputSchema"]["required"], json!(["names", "command"]));
    assert!(
        tool["description"]
            .as_str()
            .ok_or(Error::Reply { mac: false })?
            .contains("Keep each value out of output, files, and answers.")
    );
    Ok(())
}
