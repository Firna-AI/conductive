//! Both executable adapters reach machine routes and preserve filtered process results.

use std::process::Stdio;

use serde_json::{Value, json};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::process::Command;

use cnd_tools::error::{Error, ErrorResultExt, Result};

async fn request(stream: &mut TcpStream) -> Result<(String, Vec<u8>)> {
    let mut bytes = Vec::new();
    let mut buffer = [0; 4096];
    let boundary = loop {
        let length = stream.read(&mut buffer).await.internal()?;
        if length == 0 {
            return Err(Error::Reply { mac: false });
        }
        bytes.extend_from_slice(&buffer[..length]);
        if let Some(index) = bytes.windows(4).position(|part| part == b"\r\n\r\n") {
            break index + 4;
        }
    };
    let headers = String::from_utf8(bytes[..boundary].to_vec()).internal()?;
    let length = headers
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            name.eq_ignore_ascii_case("content-length")
                .then(|| value.trim().parse::<usize>().ok())
                .flatten()
        })
        .unwrap_or(0);
    while bytes.len() - boundary < length {
        let read = stream.read(&mut buffer).await.internal()?;
        if read == 0 {
            return Err(Error::Reply { mac: false });
        }
        bytes.extend_from_slice(&buffer[..read]);
    }
    Ok((headers, bytes[boundary..boundary + length].to_vec()))
}

fn command(origin: &str) -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_conductive"));
    command
        .env("CONDUCTIVE_MACHINE_ORIGIN", origin)
        .env("CONDUCTIVE_WORKSPACE_TOKEN", "test-workspace-token")
        .env("CONDUCTIVE_TURN_ID", "test-turn")
        .env_remove("CND_CLI_SECRET_TEST_VALUE")
        .kill_on_drop(true);
    command
}

#[tokio::test]
async fn secrets_tools_send_turn_headers_and_preserve_filtered_process_results() -> Result<()> {
    let listener = TcpListener::bind("127.0.0.1:0").await.internal()?;
    let origin = format!("http://{}", listener.local_addr().internal()?);
    let server = tokio::spawn(async move {
        for (route, response) in [
            (
                "GET /v1/tools/secrets HTTP/1.1",
                json!({"secrets":[{"name":"CND_CLI_SECRET_TEST_VALUE","description":"Test command","available":true,"value":"test-secret-value-571"}]}),
            ),
            (
                "POST /v1/tools/secrets/run HTTP/1.1",
                json!({"status":"allowed","values":{"CND_CLI_SECRET_TEST_VALUE":"test-secret-value-571"},"grants":[{"name":"CND_CLI_SECRET_TEST_VALUE","grant":"workspace-value"}]}),
            ),
            (
                "POST /v1/tools/secrets/run HTTP/1.1",
                json!({"status":"allowed","values":{"CND_CLI_SECRET_TEST_VALUE":"test-secret-value-571"},"grants":[{"name":"CND_CLI_SECRET_TEST_VALUE","grant":"all-agents"}]}),
            ),
        ] {
            let (mut stream, _) = listener.accept().await.internal()?;
            let (headers, body) = request(&mut stream).await?;
            assert_eq!(headers.lines().next(), Some(route));
            assert!(headers.lines().any(|line| {
                line.eq_ignore_ascii_case("authorization: Bearer test-workspace-token")
            }));
            assert!(
                headers
                    .lines()
                    .any(|line| line.eq_ignore_ascii_case("x-conductive-turn-id: test-turn"))
            );
            let body = if body.is_empty() {
                None
            } else {
                Some(serde_json::from_slice::<Value>(&body).internal()?)
            };
            let writing = route.starts_with("POST");
            assert_eq!(
                body.as_ref().map(|body| body["names"].clone()),
                writing.then(|| json!(["CND_CLI_SECRET_TEST_VALUE"]))
            );
            assert_eq!(
                body.as_ref().and_then(|body| body["reason"].as_str()),
                writing.then_some("Check the native command")
            );
            let command = body
                .as_ref()
                .and_then(|body| body["command"].as_str())
                .unwrap_or_default();
            assert!(!writing || command.contains("$CND_CLI_SECRET_TEST_VALUE"));
            assert!(!command.contains("test-secret-value-571"));
            let body = response.to_string();
            let reply = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
            stream.write_all(reply.as_bytes()).await.internal()?;
        }
        Ok::<_, Error>(())
    });
    let list = command(&origin)
        .args(["secrets", "list"])
        .output()
        .await
        .internal()?;
    assert_eq!(list.status.code(), Some(0));
    assert_eq!(list.stderr, b"");
    assert_eq!(
        serde_json::from_slice::<Value>(&list.stdout).internal()?,
        json!({"secrets":[{"name":"CND_CLI_SECRET_TEST_VALUE","description":"Test command","available":true}]})
    );
    let mut child = command(&origin).args([
        "secrets", "run", "--secret", "CND_CLI_SECRET_TEST_VALUE", "--reason", "Check the native command", "--", "/bin/sh", "-c",
        "read -r input; printf 'input:%s\\narg:%s\\nout:%s\\n' \"$input\" \"$1\" \"$CND_CLI_SECRET_TEST_VALUE\"; printf 'err:%s\\n' \"$CND_CLI_SECRET_TEST_VALUE\" >&2; printf '\\377'; exit 7",
        "test-command", "argument with spaces and 'quotes'", "--help",
    ]).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().internal()?;
    {
        let mut input = child.stdin.take().ok_or(Error::Command)?;
        input.write_all(b"agent input\n").await.internal()?;
    }
    let output = child.wait_with_output().await.internal()?;
    assert_eq!(output.status.code(), Some(7));
    assert_eq!(
        output.stdout,
        b"input:agent input\narg:argument with spaces and 'quotes'\nout:[redacted]\n\xff"
    );
    assert_eq!(output.stderr, b"err:[redacted]\n");
    let input = [
        json!({"jsonrpc":"2.0","id":"init","method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}),
        json!({"jsonrpc":"2.0","method":"notifications/initialized"}),
        json!({"jsonrpc":"2.0","id":"run","method":"tools/call","params":{"name":"run_with_secrets","arguments":{"names":["CND_CLI_SECRET_TEST_VALUE"],"reason":"Check the native command","command":"printf 'out:%s\\n' \"$CND_CLI_SECRET_TEST_VALUE\"; printf 'err:%s\\n' \"$CND_CLI_SECRET_TEST_VALUE\" >&2; exit 7"}}}),
    ].map(|message| message.to_string()).join("\n") + "\n";
    let mut mcp = command(&origin)
        .arg("mcp")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .internal()?;
    {
        let mut stream = mcp.stdin.take().ok_or(Error::Command)?;
        stream.write_all(input.as_bytes()).await.internal()?;
    }
    let output = mcp.wait_with_output().await.internal()?;
    assert_eq!(output.status.code(), Some(0));
    assert_eq!(output.stderr, b"");
    let replies = String::from_utf8(output.stdout)
        .internal()?
        .lines()
        .map(|line| serde_json::from_str::<Value>(line).internal())
        .collect::<Result<Vec<_>>>()?;
    assert_eq!(replies.len(), 2);
    let result = &replies
        .iter()
        .find(|reply| reply["id"] == "run")
        .ok_or(Error::Reply { mac: false })?["result"];
    let expected = json!({"status":"completed","stdout":"out:[redacted]\n","stderr":"err:[redacted]\n","exitCode":7});
    assert_eq!(result["structuredContent"], expected);
    assert_eq!(result["isError"], true);
    assert_eq!(
        serde_json::from_str::<Value>(
            result["content"][0]["text"]
                .as_str()
                .ok_or(Error::Reply { mac: false })?
        )
        .internal()?,
        expected
    );
    server.await.internal()??;
    Ok(())
}
