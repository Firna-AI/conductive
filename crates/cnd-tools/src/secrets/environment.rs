//! Derive shell names and check ownership of every command environment entry.

use std::collections::BTreeMap;

use crate::error::{Error, ErrorResultExt, Result};

/// Checked name metadata, with no secret values.
pub(crate) struct SecretEnvironment {
    variables: BTreeMap<String, String>,
    owners: BTreeMap<String, String>,
}

impl SecretEnvironment {
    /// Check aliases and representable original entries before any Worker contact.
    pub(crate) fn new(names: &[String]) -> Result<Self> {
        let mut environment = Self {
            variables: BTreeMap::new(),
            owners: BTreeMap::new(),
        };
        for name in names {
            let variable = variable_name(name);
            environment.claim(&variable, name)?;
            if !name.is_empty() && !name.contains(['=', '\0']) {
                environment.claim(name, name)?;
            }
            environment.variables.insert(name.clone(), variable);
        }
        Ok(environment)
    }

    fn claim(&mut self, key: &str, name: &str) -> Result<()> {
        if let Some(owner) = self.owners.get(key)
            && owner != name
        {
            return Err(Error::SecretEnvironmentConflict {
                first: serde_json::to_string(owner).internal()?,
                second: serde_json::to_string(name).internal()?,
                variable: serde_json::to_string(key).internal()?,
            });
        }
        self.owners.insert(key.into(), name.into());
        Ok(())
    }

    /// Populate only the entries whose ownership passed the preflight.
    pub(crate) fn values(
        &self,
        values: &BTreeMap<String, String>,
    ) -> Result<BTreeMap<String, String>> {
        self.owners
            .iter()
            .map(|(key, owner)| {
                let value = values.get(owner).ok_or(Error::Reply { mac: false })?;
                Ok((key.clone(), value.clone()))
            })
            .collect()
    }

    /// Return printable name metadata after command completion.
    pub(crate) fn variables(self) -> BTreeMap<String, String> {
        self.variables
    }
}

/// Map one exact secret name to its stable shell variable.
pub(crate) fn variable_name(name: &str) -> String {
    if name
        .as_bytes()
        .first()
        .is_some_and(|byte| byte.is_ascii_alphabetic() || *byte == b'_')
        && name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
    {
        return name.into();
    }
    let mut variable = String::new();
    let mut replacing = false;
    for character in name.chars() {
        if character.is_ascii_alphanumeric() || character == '_' {
            variable.push(character.to_ascii_uppercase());
            replacing = false;
        } else if !replacing {
            variable.push('_');
            replacing = true;
        }
    }
    let mut variable = variable.trim_matches('_').to_owned();
    if variable.is_empty() {
        return "SECRET".into();
    }
    if variable.as_bytes()[0].is_ascii_digit() {
        variable.insert(0, '_');
    }
    variable
}
