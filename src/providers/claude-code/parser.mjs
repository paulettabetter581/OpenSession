import { readFileSync } from "node:fs";

/**
 * Parse a Claude Code JSONL transcript file into records.
 * @param {string} filePath - Absolute path to .jsonl file
 * @returns {object[]} Parsed records
 */
export function parseTranscript(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const records = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      records.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines
    }
  }
  return records;
}

/**
 * Extract session metadata from a transcript's records.
 * @param {object[]} records
 * @param {string} sessionId
 * @returns {import('../interface.mjs').RawSession}
 */
export function extractSessionMeta(records, sessionId) {
  let timeCreated = 0;
  let timeUpdated = 0;
  let messageCount = 0;
  let totalTokens = 0;
  let directory = null;

  for (const r of records) {
    const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;
    if (ts && (!timeCreated || ts < timeCreated)) timeCreated = ts;
    if (ts > timeUpdated) timeUpdated = ts;

    if (r.type === "user" || r.type === "assistant") messageCount++;
    if (r.type === "system" && r.cwd) directory = r.cwd;
    if (r.cwd && !directory) directory = r.cwd;

    if (r.type === "assistant" && r.message?.usage) {
      totalTokens += (r.message.usage.input_tokens || 0) + (r.message.usage.output_tokens || 0);
    }
  }

  return {
    id: sessionId,
    provider: "claude-code",
    parentId: null,
    title: null, // Claude Code doesn't have session titles in transcripts
    directory,
    timeCreated,
    timeUpdated,
    messageCount,
    tokenCount: totalTokens || null
  };
}

/**
 * Convert transcript records to unified Message[] format.
 * @param {object[]} records
 * @param {string} sessionId
 * @returns {import('../interface.mjs').Message[]}
 */
export function recordsToMessages(records, sessionId) {
  const messages = [];
  let msgIndex = 0;

  for (const r of records) {
    const ts = r.timestamp ? new Date(r.timestamp).getTime() : 0;

    if (r.type === "user") {
      const text = extractTextContent(r.message?.content);
      if (text) {
        messages.push({
          id: r.uuid || `msg-${msgIndex++}`,
          sessionId,
          role: "user",
          content: text,
          thinking: null,
          toolName: null,
          toolInput: null,
          toolOutput: null,
          timestamp: ts,
          tokens: null,
          metadata: { version: r.version, cwd: r.cwd }
        });
      }
    }

    if (r.type === "assistant") {
      const contentBlocks = r.message?.content || [];
      let text = "";
      let thinking = null;

      for (const block of contentBlocks) {
        if (block.type === "text") text += block.text;
        if (block.type === "thinking") thinking = block.thinking;
        if (block.type === "tool_use") {
          messages.push({
            id: block.id || `tool-${msgIndex++}`,
            sessionId,
            role: "tool",
            content: "",
            thinking: null,
            toolName: block.name || "unknown",
            toolInput: block.input || null,
            toolOutput: null, // output comes from tool_result records
            timestamp: ts,
            tokens: null,
            metadata: null
          });
        }
      }

      if (text) {
        messages.push({
          id: r.uuid || `msg-${msgIndex++}`,
          sessionId,
          role: "assistant",
          content: text,
          thinking,
          toolName: null,
          toolInput: null,
          toolOutput: null,
          timestamp: ts,
          tokens: r.message?.usage
            ? { input: r.message.usage.input_tokens || 0, output: r.message.usage.output_tokens || 0 }
            : null,
          metadata: {
            model: r.message?.model || null,
            stopReason: r.message?.stop_reason || null,
            cacheRead: r.message?.usage?.cache_read_input_tokens || 0,
            cacheCreation: r.message?.usage?.cache_creation_input_tokens || 0
          }
        });
      }
    }

    if (r.type === "tool_result") {
      const content = typeof r.content === "string" ? r.content : JSON.stringify(r.content || "");
      messages.push({
        id: `tool-result-${msgIndex++}`,
        sessionId,
        role: "tool",
        content: content.slice(0, 5000), // Truncate long tool outputs
        thinking: null,
        toolName: r.tool_name || "tool_result",
        toolInput: null,
        toolOutput: r.content,
        timestamp: ts,
        tokens: null,
        metadata: { isError: r.is_error || false }
      });
    }
  }

  return messages;
}

function extractTextContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}
