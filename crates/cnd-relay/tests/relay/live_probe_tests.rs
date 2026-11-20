//! Shipped live probe checks use the current Rust relay for both protocol paths.

use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;
use tokio_tungstenite::{
    connect_async,
    tungstenite::{Message, client::IntoClientRequest},
};

use crate::support::fixture::Fixture;
use crate::support::ingress::TestIngress;
use crate::support::probe::Probe;
use crate::support::wire::{TestResult, read_reply};

#[derive(Deserialize)]
struct Reply {
    marker: String,
    host: String,
    clean: bool,
}

#[tokio::test]
async fn runs_shipped_ipv4_ipv6_binary_websocket_and_direct_network_probes() -> TestResult {
    let probe = Probe::start()?;
    let identity = Arc::new(TestIngress::new());
    let relay = Fixture::with_ingress(identity.clone()).await?;
    identity.alias(relay.port, 41235);
    let private = "E2b-Traffic-Access-Token: live-probe-traffic-token\r\nX-Access-Token: conductive-live-header-probe\r\nE2b-Sandbox-Id: sandbox-one\r\nE2b-Sandbox-Port: 41235\r\n";
    for port in [probe.ports.ipv4, probe.ports.ipv6] {
        let mut connection = relay.stream("GET", "/probe", &format!("Host: 41235-sandbox-one.eu.e2b.test\r\nX-Conductive-Preview-Port: {port}\r\n{private}")).await?;
        let (head, bytes) = read_reply(&mut connection).await?;
        let body: Reply = serde_json::from_slice(&bytes)?;
        assert!(head.starts_with("HTTP/1.1 200"), "{head}");
        assert!(head.contains("x-conductive-relay: 1\r\n"), "{head}");
        assert_eq!(body.marker, "conductive-e2b-probe");
        assert_eq!(body.host, format!("localhost:{port}"));
        assert!(body.clean);
    }
    let mut request = format!("ws://127.0.0.1:{}/socket", relay.port).into_client_request()?;
    for (name, value) in [
        ("host", "41235-sandbox-one.eu.e2b.test".to_owned()),
        ("x-conductive-preview-port", probe.ports.ipv4.to_string()),
        (
            "e2b-traffic-access-token",
            "live-probe-traffic-token".into(),
        ),
        ("x-access-token", "conductive-live-header-probe".into()),
        ("e2b-sandbox-id", "sandbox-one".into()),
        ("e2b-sandbox-port", "41235".into()),
    ] {
        request.headers_mut().insert(name, value.parse()?);
    }
    let (mut websocket, response) = connect_async(request).await?;
    assert_eq!(response.status(), 101);
    websocket
        .send(Message::Binary(vec![0, 255, 128, 1].into()))
        .await?;
    assert_eq!(
        websocket.next().await.ok_or("missing live probe echo")??,
        Message::Binary(vec![0, 255, 128, 1].into())
    );
    let mut network = TcpStream::connect(("127.0.0.1", probe.ports.network)).await?;
    network.write_all(format!("GET /probe HTTP/1.1\r\nHost: {}-sandbox-one.eu.e2b.test\r\nE2b-Traffic-Access-Token: live-probe-traffic-token\r\nX-Conductive-Preview-Port: {}\r\n\r\n", probe.ports.network, probe.ports.network).as_bytes()).await?;
    let (head, bytes) = read_reply(&mut network).await?;
    let body: Reply = serde_json::from_slice(&bytes)?;
    assert!(head.starts_with("HTTP/1.1 200"), "{head}");
    assert_eq!(body.marker, "conductive-e2b-probe");
    assert_eq!(
        body.host,
        format!("{}-sandbox-one.eu.e2b.test", probe.ports.network)
    );
    Ok(())
}
