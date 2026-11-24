//! Saved shell settings are reread without changing the host environment.

use std::error::Error;

use cnd_host::config::SavedConfiguration;
use cnd_host::ports::Configuration;

#[tokio::test]
async fn saved_settings_wait_for_both_values_and_reread_rotation_without_exporting()
-> Result<(), Box<dyn Error>> {
    assert!(
        std::env::var_os("CARGO_MANIFEST_DIR").is_some_and(|value| !value.is_empty()),
        "cargo test must supply a nonempty inherited variable outside the allowed six"
    );
    let folder = tempfile::tempdir()?;
    let source = SavedConfiguration {
        path: folder.path().join("settings.sh"),
    };
    let original = std::env::var_os("CONDUCTIVE_MACHINE_TOKEN");
    assert_eq!(
        source
            .read()
            .await?
            .map(|value| (value.origin, value.token)),
        None
    );
    tokio::fs::write(
        &source.path,
        "export CONDUCTIVE_MACHINE_ORIGIN='https://machine.test'\n",
    )
    .await?;
    assert_eq!(
        source
            .read()
            .await?
            .map(|value| (value.origin, value.token)),
        None
    );
    tokio::fs::write(
        &source.path,
        "export CONDUCTIVE_MACHINE_ORIGIN='https://machine.test'\nexport CONDUCTIVE_MACHINE_TOKEN=\"${CARGO_MANIFEST_DIR-}\"\n",
    )
    .await?;
    assert_eq!(source.read().await?.map(|_| ()), None);
    for token in ["first-private", "rotated-private"] {
        tokio::fs::write(&source.path, format!("export CONDUCTIVE_MACHINE_ORIGIN='https://machine.test'\nexport CONDUCTIVE_MACHINE_TOKEN='{token}'\n")).await?;
        assert_eq!(
            source
                .read()
                .await?
                .map(|value| (value.origin, value.token)),
            Some(("https://machine.test".into(), token.into()))
        );
    }
    assert!(std::env::var_os("CONDUCTIVE_MACHINE_TOKEN") == original);
    Ok(())
}
