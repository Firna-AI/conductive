//! Longest credential-fragment matches and incomplete streamed suffixes.

pub(super) const MARKER: &str = "[redacted]";
const MIN_FRAGMENT_CHARS: usize = 21;

/// Already displayed text can lower the minimum for new text of the same answer.
pub(super) struct Continuation<'a> {
    /// Displayed suffix that can still extend into a credential match.
    pub(super) text: &'a str,
    /// Credentials that matched the displayed suffix.
    pub(super) secrets: &'a [String],
}

struct Candidate<'a> {
    text: &'a str,
    minimum: usize,
}

/// Borrow each eligible credential suffix instead of allocating its substrings.
fn candidates(value: &str) -> impl Iterator<Item = Candidate<'_>> {
    let characters = value.chars().count();
    value
        .char_indices()
        .enumerate()
        .take_while(move |(offset, _)| *offset == 0 || characters - offset >= MIN_FRAGMENT_CHARS)
        .map(move |(offset, (index, _))| Candidate {
            text: &value[index..],
            minimum: if offset == 0 {
                characters.min(MIN_FRAGMENT_CHARS)
            } else {
                MIN_FRAGMENT_CHARS
            },
        })
}

#[derive(Default)]
struct Matches {
    longest: usize,
    incomplete: bool,
}

impl Matches {
    /// A missing 21-character seed rules out fragments, but permits whole short credentials.
    fn known(&mut self, text: &str, final_text: bool, values: &[String]) {
        let seed = text
            .char_indices()
            .nth(MIN_FRAGMENT_CHARS - 1)
            .map(|(index, character)| &text[..index + character.len_utf8()]);
        for secret in values {
            if seed.is_some_and(|prefix| !secret.contains(prefix)) {
                if text.starts_with(secret) {
                    self.longest = self.longest.max(secret.len());
                }
            } else {
                for candidate in candidates(secret) {
                    self.consider(text, candidate, final_text);
                }
            }
        }
    }

    fn consider(&mut self, text: &str, candidate: Candidate<'_>, final_text: bool) {
        let mut bytes = 0;
        let mut characters = 0;
        for (left, right) in text.chars().zip(candidate.text.chars()) {
            if left != right {
                break;
            }
            bytes += left.len_utf8();
            characters += 1;
        }
        if !final_text && bytes == text.len() && bytes < candidate.text.len() {
            self.incomplete = true;
        }
        if bytes > 0 && characters >= candidate.minimum {
            self.longest = self.longest.max(bytes);
        }
    }

    fn continued(&mut self, text: &str, final_text: bool, continuations: &[Continuation<'_>]) {
        for context in continuations {
            for (index, _) in context.text.char_indices() {
                let prefix = &context.text[index..];
                let consumed = prefix.chars().count();
                for secret in context.secrets {
                    for candidate in candidates(secret) {
                        if candidate.text.len() > prefix.len() && candidate.text.starts_with(prefix)
                        {
                            self.consider(
                                text,
                                Candidate {
                                    text: &candidate.text[prefix.len()..],
                                    minimum: candidate.minimum.saturating_sub(consumed),
                                },
                                final_text,
                            );
                        }
                    }
                }
            }
        }
    }
}

pub(super) fn filter(
    text: &str,
    final_text: bool,
    values: &[String],
    continuations: &[Continuation<'_>],
) -> (String, String) {
    let mut output = String::new();
    let mut index = 0;
    while index < text.len() {
        let rest = &text[index..];
        let mut matches = Matches::default();
        matches.known(rest, final_text, values);
        if index == 0 {
            matches.continued(rest, final_text, continuations);
        }
        if matches.incomplete {
            return (output, rest.to_owned());
        }
        if rest.starts_with(MARKER) && matches.longest <= MARKER.len() {
            output.push_str(MARKER);
            index += MARKER.len();
        } else if matches.longest > 0 {
            output.push_str(MARKER);
            index += matches.longest;
        } else if let Some(character) = rest.chars().next() {
            output.push(character);
            index += character.len_utf8();
        }
    }
    (output, String::new())
}
