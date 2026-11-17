//! Move targets through untrusted fields, CLI flags, and the MCP descriptor.

use serde_json::{Value, json};

use crate::call::{Call, Name};
use crate::cli_parse;
use crate::error::{Error, ErrorResultExt, InputError, Result};
use crate::schema;

use super::parse;

fn parsed(fields: Value) -> Result<Value> {
    let Call::MoveWorkspace(_, input) = parse(
        Name::MoveWorkspace,
        fields.as_object().ok_or(Error::Input(InputError::Object))?,
        "unused-id",
    )?
    else {
        return Err(Error::Input(InputError::Object));
    };
    serde_json::to_value(input).internal()
}

#[test]
fn parses_move_targets_and_keeps_section_only_bodies() -> Result<()> {
    for fields in [
        json!({"sectionId":"section"}),
        json!({"parentId":"parent"}),
        json!({"topLevel":true}),
        json!({"sectionId":"section", "parentId":"parent"}),
        json!({"sectionId":"section", "topLevel":true}),
        json!({"parentId":"parent", "topLevel":false}),
        json!({"sectionId":"section", "topLevel":false}),
    ] {
        let actual = parsed(fields.clone());
        assert!(actual.is_ok(), "{fields}: {actual:?}");
        assert_eq!(actual?, fields);
    }
    Ok(())
}

#[test]
fn rejects_missing_conflicting_and_malformed_move_targets() {
    for fields in [
        json!({}),
        json!({"topLevel":false}),
        json!({"parentId":"parent", "topLevel":true}),
        json!({"parentId":null, "sectionId":"section"}),
        json!({"parentId":"", "sectionId":"section"}),
        json!({"topLevel":"true", "sectionId":"section"}),
        json!({"topLevel":null, "sectionId":"section"}),
    ] {
        let actual = parsed(fields.clone());
        assert!(
            matches!(actual, Err(Error::Input(InputError::Required))),
            "{fields}: {actual:?}"
        );
    }
}

#[test]
fn cli_decodes_parent_and_value_less_top_level_flags() -> Result<()> {
    for (options, expected) in [
        (vec!["--parent", "parent"], json!({"parentId":"parent"})),
        (
            vec!["--parent=parent", "--section", "section"],
            json!({"parentId":"parent", "sectionId":"section"}),
        ),
        (vec!["--top-level"], json!({"topLevel":true})),
        (
            vec!["--top-level", "--section", "section"],
            json!({"topLevel":true, "sectionId":"section"}),
        ),
    ] {
        let args: Vec<String> = [vec!["workspaces", "move"], options]
            .concat()
            .into_iter()
            .map(String::from)
            .collect();
        let actual = cli_parse::parse(&args);
        assert!(actual.is_ok(), "{args:?}");
        assert_eq!(Value::Object(actual?.fields), expected);
    }
    let args = ["workspaces", "move", "--top-level=true"].map(String::from);
    assert!(matches!(
        cli_parse::parse(&args),
        Err(Error::Input(InputError::Command))
    ));
    Ok(())
}

#[test]
fn advertises_move_targets_and_optional_section() -> Result<()> {
    let tools = serde_json::to_value(schema::tools()?).internal()?;
    let tool = tools
        .as_array()
        .and_then(|tools| tools.iter().find(|tool| tool["name"] == "move_workspace"))
        .ok_or(Error::Reply { mac: false })?;
    assert_eq!(
        tool["inputSchema"]["properties"]["parentId"]["type"],
        "string"
    );
    assert_eq!(
        tool["inputSchema"]["properties"]["topLevel"]["type"],
        "boolean"
    );
    assert!(
        !tool["inputSchema"]["required"]
            .as_array()
            .into_iter()
            .flatten()
            .any(|field| field == "sectionId")
    );
    Ok(())
}
