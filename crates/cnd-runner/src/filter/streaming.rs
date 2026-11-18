//! Held answer suffixes and already displayed continuation contexts.

use std::sync::Arc;

use cnd_runner_interface::chat_events::{AgentChatEvent, TurnEventContext};
use cnd_runner_interface::runner::RunnerEvent;

use super::fields::clean;
use super::registry::Registry;
use super::text::{Continuation, filter};

#[derive(Clone)]
struct Context {
    text: String,
    position: usize,
}

#[derive(Clone)]
struct Held {
    context: TurnEventContext,
    message_id: String,
    text: String,
    position: usize,
    contexts: Vec<Context>,
}

#[derive(Default, Clone)]
pub(super) struct Sanitizer {
    pub(super) registry: Registry,
    pending: Vec<Held>,
}

impl Sanitizer {
    pub(super) fn text(&self, text: &str) -> String {
        filter(text, true, &self.registry.active, &[]).0
    }

    fn delta(
        &mut self,
        context: TurnEventContext,
        message_id: String,
        text: String,
        final_text: bool,
    ) -> Vec<RunnerEvent> {
        let previous = self
            .pending
            .iter()
            .position(|h| h.context == context && h.message_id == message_id)
            .map(|i| self.pending[i].clone());
        let mut secrets = self.registry.active.clone();
        if let Some(held) = &previous {
            secrets.extend(self.registry.supporting(&held.text, held.position));
            for c in &held.contexts {
                secrets.extend(self.registry.supporting(&c.text, c.position));
            }
        }
        secrets.sort();
        secrets.dedup();
        let contexts = previous
            .as_ref()
            .map(|h| h.contexts.clone())
            .unwrap_or_default();
        let supported: Vec<_> = contexts
            .iter()
            .map(|context| self.registry.supporting(&context.text, context.position))
            .collect();
        let continuations: Vec<_> = contexts
            .iter()
            .zip(&supported)
            .map(|(context, secrets)| Continuation {
                text: &context.text,
                secrets,
            })
            .collect();
        let source = previous
            .as_ref()
            .map(|h| h.text.as_str())
            .unwrap_or_default()
            .to_owned()
            + &text;
        let (shown, held_text) = filter(&source, final_text, &secrets, &continuations);
        let mut texts: Vec<String> = contexts.iter().map(|c| c.text.clone() + &shown).collect();
        texts.push(shown.clone());
        self.retain(
            context.clone(),
            message_id.clone(),
            held_text,
            &secrets,
            texts,
        );
        if shown.is_empty() {
            vec![]
        } else {
            vec![RunnerEvent::AgentChatEvent(
                AgentChatEvent::AssistantDelta {
                    turn_event_context: context,
                    message_id,
                    text: shown,
                },
            )]
        }
    }

    fn retain(
        &mut self,
        context: TurnEventContext,
        message_id: String,
        text: String,
        secrets: &[Arc<str>],
        texts: Vec<String>,
    ) {
        let mut contexts: Vec<Context> = vec![];
        for value in texts {
            let suffix = filter(&value, false, secrets, &[]).1;
            if !suffix.is_empty() && !contexts.iter().any(|c| c.text == suffix) {
                contexts.push(Context {
                    text: suffix,
                    position: self.registry.position(),
                });
            }
        }
        if !text.is_empty() || !contexts.is_empty() {
            let held = Held {
                context,
                message_id,
                text,
                position: self.registry.position(),
                contexts,
            };
            if let Some(index) = self
                .pending
                .iter()
                .position(|h| h.context == held.context && h.message_id == held.message_id)
            {
                self.pending[index] = held;
            } else {
                self.pending.push(held);
            }
        } else {
            self.pending
                .retain(|h| h.context != context || h.message_id != message_id);
        }
    }

    fn flush(&mut self, context: &TurnEventContext, message: Option<&str>) -> Vec<RunnerEvent> {
        let held: Vec<_> = self
            .pending
            .iter()
            .filter(|h| {
                h.context == *context
                    && message.is_none_or(|id| id == h.message_id)
                    && !h.text.is_empty()
            })
            .cloned()
            .collect();
        let mut events = vec![];
        for h in held {
            events.extend(self.delta(h.context, h.message_id, String::new(), true));
        }
        events
    }

    pub(super) fn accept(&mut self, mut event: RunnerEvent) -> Vec<RunnerEvent> {
        let mut events = vec![];
        match &mut event {
            RunnerEvent::AgentChatEvent(AgentChatEvent::AssistantDelta {
                turn_event_context,
                message_id,
                text,
            }) => {
                return self.delta(
                    turn_event_context.clone(),
                    message_id.clone(),
                    text.clone(),
                    false,
                );
            }
            RunnerEvent::AgentChatEvent(AgentChatEvent::AssistantCompleted {
                turn_event_context,
                message_id,
                text,
                ..
            }) => {
                events.extend(self.flush(turn_event_context, Some(message_id)));
                let previous = self
                    .pending
                    .iter()
                    .position(|h| h.context == *turn_event_context && h.message_id == *message_id)
                    .map(|i| self.pending[i].clone());
                let mut secrets = self.registry.active.clone();
                let mut texts = vec![];
                if let Some(h) = previous {
                    secrets.extend(self.registry.supporting(&h.text, h.position));
                    for c in h.contexts {
                        secrets.extend(self.registry.supporting(&c.text, c.position));
                        texts.push(c.text);
                    }
                }
                secrets.sort();
                secrets.dedup();
                *text = filter(text, true, &secrets, &[]).0;
                texts.push(text.clone());
                self.retain(
                    turn_event_context.clone(),
                    message_id.clone(),
                    String::new(),
                    &secrets,
                    texts,
                );
                events.push(event);
                return events;
            }
            RunnerEvent::AgentChatEvent(
                AgentChatEvent::TurnCompleted {
                    turn_event_context, ..
                }
                | AgentChatEvent::TurnFailed {
                    turn_event_context, ..
                },
            ) => events.extend(self.flush(turn_event_context, None)),
            _ => {}
        }
        events.push(clean(event, &|s| self.text(s)));
        events
    }
}
