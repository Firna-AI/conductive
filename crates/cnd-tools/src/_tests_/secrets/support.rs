//! Mocked CLI and MCP effects with captured public output.

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use serde_json::{Value, json};
use unimock::{MockFn, Unimock, matching};

use crate::cli::{Program, ToolProgram};
use crate::client::Configuration;
use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::{HttpMock, HttpResponse, RuntimeMock, StreamsMock};

pub(super) enum Adapter {
    Mcp,
    CliOutput,
    CliError,
}

pub(super) struct Observed {
    pub(super) status: u8,
    pub(super) stdout: String,
    pub(super) stderr: String,
}

impl Observed {
    pub(super) fn result(&self) -> Result<Value> {
        let line = self
            .stdout
            .lines()
            .last()
            .ok_or(Error::Reply { mac: false })?;
        let value: Value = serde_json::from_str(line).internal()?;
        let mut value = value.get("result").cloned().unwrap_or(value);
        if value.get("structuredContent").is_some() {
            let text = value["content"][0]["text"]
                .as_str()
                .ok_or(Error::Reply { mac: false })?;
            let decoded = serde_json::from_str(text).internal()?;
            value["content"][0]["text"] = decoded;
        }
        Ok(value)
    }
}

pub(super) fn http(body: Value) -> Unimock {
    Unimock::new(
        HttpMock::send
            .some_call(matching!(_))
            .returns(Ok(HttpResponse {
                status: 200,
                body: body.to_string(),
            })),
    )
}

pub(super) fn allowed() -> Value {
    json!({"status":"allowed", "values":{"TOKEN":"child-value", "KEY":"second-value"},
        "grants":[{"name":"TOKEN","grant":"session"},{"name":"KEY","grant":"15-minutes"}]})
}

pub(super) async fn run(
    adapter: Adapter,
    cli: &[&str],
    name: &str,
    fields: Value,
    http: Unimock,
    process: Unimock,
) -> Result<Observed> {
    let lines = Arc::new(Mutex::new(VecDeque::from([
        json!({"jsonrpc":"2.0","id":"init","method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}).to_string(),
        json!({"jsonrpc":"2.0","method":"notifications/initialized"}).to_string(),
        json!({"jsonrpc":"2.0","id":"secret","method":"tools/call","params":{"name":name,"arguments":fields}}).to_string(),
    ])));
    let stdout = Arc::new(Mutex::new(String::new()));
    let stderr = Arc::new(Mutex::new(String::new()));
    let request_id = RuntimeMock::request_id
        .each_call(matching!())
        .returns(String::from("generated-id"));
    let line = StreamsMock::line
        .each_call(matching!())
        .answers_arc(Arc::new(move |_| {
            Ok(lines
                .lock()
                .map_err(|_| Error::Reply { mac: false })?
                .pop_front())
        }));
    let output = StreamsMock::stdout.each_call(matching!(_)).answers_arc({
        let stdout = stdout.clone();
        Arc::new(move |_, text| {
            stdout
                .lock()
                .map_err(|_| Error::Reply { mac: false })?
                .push_str(text);
            Ok(())
        })
    });
    let error = StreamsMock::stderr.each_call(matching!(_)).answers_arc({
        let stderr = stderr.clone();
        Arc::new(move |_, text| {
            stderr
                .lock()
                .map_err(|_| Error::Reply { mac: false })?
                .push_str(text);
            Ok(())
        })
    });
    let mcp = matches!(adapter, Adapter::Mcp);
    let effects = Arc::new(match adapter {
        Adapter::Mcp => Unimock::new((request_id, line, output)),
        Adapter::CliOutput => Unimock::new((request_id, output)),
        Adapter::CliError => Unimock::new((request_id, error)),
    });
    let configuration = Configuration::new(
        Some("https://machine.test".into()),
        Some("workspace-token".into()),
        (name != "list_secrets").then(|| String::from("active-turn")),
    )?;
    let program = ToolProgram::new(
        configuration,
        Arc::new(http),
        effects.clone(),
        effects,
        Arc::new(process),
    );
    let status = if mcp {
        program.mcp().await?
    } else {
        program
            .cli(
                &cli.iter()
                    .map(|text| String::from(*text))
                    .collect::<Vec<_>>(),
            )
            .await?
    };
    let stdout = stdout
        .lock()
        .map_err(|_| Error::Reply { mac: false })?
        .clone();
    let stderr = stderr
        .lock()
        .map_err(|_| Error::Reply { mac: false })?
        .clone();
    Ok(Observed {
        status,
        stdout,
        stderr,
    })
}
