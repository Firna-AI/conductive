//! Computer credentials, server URL validation, and private settings storage.

use std::fmt;
use std::io;
use std::net::{Ipv4Addr, Ipv6Addr};
use std::path::{Path, PathBuf};
use std::str::FromStr;

use async_trait::async_trait;
use cnd_release::version::BASE_URL;
use serde::{Deserialize, Serialize};
use url::{Host, Url};

use crate::disk::{atomic_write, private_directory};
use crate::error::{Error, ErrorResultExt, Result};

/// Default Worker origin for computer connections.
pub const DEFAULT_ORIGIN: &str = "https://api.conductive.build";
/// Default public release server.
pub const DEFAULT_RELEASE_SERVER: &str = BASE_URL;

/// An HTTPS server or an HTTP server on the permitted loopback hosts.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ServerUrl(Url);

impl FromStr for ServerUrl {
    type Err = Error;

    fn from_str(value: &str) -> Result<Self> {
        let Ok(mut url) = Url::parse(value) else {
            return Err(Error::InvalidServer);
        };
        let loopback = match url.host() {
            Some(Host::Domain("localhost")) => true,
            Some(Host::Ipv4(ip)) => ip == Ipv4Addr::LOCALHOST,
            Some(Host::Ipv6(ip)) => ip == Ipv6Addr::LOCALHOST,
            _ => false,
        };
        if (url.scheme() != "https" && !(url.scheme() == "http" && loopback))
            || url.host().is_none()
            || !url.username().is_empty()
            || url.password().is_some()
        {
            return Err(Error::InvalidServer);
        }
        url.set_query(None);
        url.set_fragment(None);
        Ok(Self(url))
    }
}

impl ServerUrl {
    /// The configured server address for use by the pinned updater.
    pub fn as_str(&self) -> &str {
        self.0.as_str().trim_end_matches('/')
    }

    pub(crate) fn endpoint(&self, path: &str) -> Url {
        let mut url = self.0.clone();
        url.set_path(path);
        url
    }

    pub(crate) fn release_file(&self, key: &str) -> Url {
        self.endpoint(&format!("{}/{}", self.0.path().trim_end_matches('/'), key))
    }
}

/// Credentials and release server for one computer.
#[derive(Clone, PartialEq, Eq)]
pub struct Settings {
    /// Worker origin for the outbound connection.
    pub origin: ServerUrl,
    /// Computer bearer token.
    pub token: String,
    /// Source of signed releases.
    pub release_server: ServerUrl,
}

impl fmt::Debug for Settings {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Settings { credentials: [hidden] }")
    }
}

/// Settings reused by enrollment, preflight, and the reconnect loop.
#[cfg_attr(test, unimock::unimock(api = SettingsStoreMock))]
#[async_trait]
pub trait SettingsStore: Send + Sync {
    /// Load settings without modifying the file. A missing file returns None.
    async fn read(&self) -> Result<Option<Settings>>;
    /// Replace the settings atomically after a successful enrollment.
    fn save(&self, settings: &Settings) -> Result<()>;
}

/// Local settings file of the computer user.
pub struct SavedSettings {
    /// The path to computer.json.
    pub path: PathBuf,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Saved {
    origin: String,
    token: String,
    release_server: String,
}

#[async_trait]
impl SettingsStore for SavedSettings {
    async fn read(&self) -> Result<Option<Settings>> {
        let bytes = match tokio::fs::read(&self.path).await {
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
            result => result?,
        };
        let Ok(saved) = serde_json::from_slice::<Saved>(&bytes) else {
            return Err(Error::InvalidSettings);
        };
        if !valid_token(&saved.token) {
            return Err(Error::InvalidSettings);
        }
        Ok(Some(Settings {
            origin: saved.origin.parse()?,
            token: saved.token,
            release_server: saved.release_server.parse()?,
        }))
    }

    fn save(&self, settings: &Settings) -> Result<()> {
        let parent = self.path.parent().ok_or(Error::InvalidSettings)?;
        private_directory(parent)?;
        let bytes = serde_json::to_vec(&Saved {
            origin: settings.origin.as_str().to_owned(),
            token: settings.token.clone(),
            release_server: settings.release_server.as_str().to_owned(),
        })
        .internal()?;
        atomic_write(&self.path, &bytes)
    }
}

pub(crate) fn valid_token(value: &str) -> bool {
    let Some((object, secret)) = value.strip_prefix("cndc1.").and_then(|s| s.split_once('.'))
    else {
        return false;
    };
    object.len() == 64
        && object
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        && secret.len() == 43
        && secret
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// Paths under the dedicated computer user's home and XDG folders.
pub struct Paths {
    /// Saved computer credentials.
    pub settings: PathBuf,
    /// Installed systemd user unit.
    pub unit: PathBuf,
    /// Cached verified releases.
    pub cache: PathBuf,
    /// The program's versions, current link, and update state.
    pub data: PathBuf,
}

impl Paths {
    /// Use absolute XDG overrides or the defaults under HOME.
    pub fn new(home: &Path, config: Option<PathBuf>, cache: Option<PathBuf>) -> Result<Self> {
        if !home.is_absolute() {
            return Err(Error::MissingHome);
        }
        let config = config
            .filter(|path| path.is_absolute())
            .unwrap_or_else(|| home.join(".config"));
        let cache = cache
            .filter(|path| path.is_absolute())
            .unwrap_or_else(|| home.join(".cache"));
        Ok(Self {
            settings: config.join("conductive/computer.json"),
            unit: config.join("systemd/user/conductive-computer.service"),
            cache: cache.join("conductive"),
            data: home.join(".local/share/conductive"),
        })
    }
}
