//! TLS-only host upgrades and sensitive bearer credentials.

use tokio_tungstenite::tungstenite::http::header::AUTHORIZATION;

use crate::config::ConnectionRequest;
use crate::error::Error;
use crate::socket::connect::upgrade;

#[test]
fn upgrades_use_the_host_path_tls_and_sensitive_authentication() -> crate::error::Result<()> {
    let request = ConnectionRequest {
        origin: "https://machine.test/".into(),
        token: "private".into(),
    };
    let upgrade_request = upgrade(&request)?;
    assert_eq!(upgrade_request.uri(), "wss://machine.test/v1/host");
    assert_eq!(upgrade_request.headers()[AUTHORIZATION], "Bearer private");
    assert!(upgrade_request.headers()[AUTHORIZATION].is_sensitive());
    assert_eq!(
        format!("{request:?}"),
        "ConnectionRequest { credentials: [hidden] }"
    );
    for origin in [
        "http://machine.test",
        "ws://machine.test",
        "file:///tmp/host",
    ] {
        assert!(matches!(
            upgrade(&ConnectionRequest {
                origin: origin.into(),
                token: "private".into()
            }),
            Err(Error::TlsRequired)
        ));
    }
    Ok(())
}
