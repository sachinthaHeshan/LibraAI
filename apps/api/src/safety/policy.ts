/**
 * Deterministic Responsible AI policy for chat input. Runs before any LLM or tool call,
 * so refusals do not depend on the model following its prompt.
 */

export type RefusalCode =
  | "destructive_action"
  | "auth_bypass"
  | "cross_tenant"
  | "bulk_pii_export";

const REFUSAL_RULES: { code: RefusalCode; pattern: RegExp }[] = [
  {
    code: "destructive_action",
    pattern: /\b(delete|drop|wipe|erase|purge|truncate|remove)\b.*\b(all|every|entire|whole|database|table)\b/i,
  },
  {
    code: "auth_bypass",
    pattern: new RegExp(
      [
        String.raw`\b(bypass|skip|disable|ignore|override|turn off)\b.*\b(auth|login|password|permission|role|security|safety|guardrail|polic)\w*`,
        String.raw`\bmake me (an? )?(admin|owner)\b`,
        String.raw`\b(ignore|disregard|forget) (all |any |your )?(the )?(previous |prior |above |earlier )?(instructions|rules|prompts?)\b`,
        String.raw`\b(show|reveal|print|repeat|leak|tell me)\b.*\b(system|hidden|developer) (prompt|instructions|message)\b`,
        String.raw`\b(jailbreak|developer mode|DAN mode)\b`,
      ].join("|"),
      "i",
    ),
  },
  {
    code: "cross_tenant",
    pattern: /\b(other|another|different|every)\s+(librar(y|ies)|organi[sz]ations?|tenants?)\b/i,
  },
  {
    code: "bulk_pii_export",
    pattern: /\b(export|dump|download|list|give me|send|show)\b.*\b(all|every)\b.*\b(members?|users?|patrons?)\b.*\b(emails?|phones?|addresses|personal|contact|details|data|passwords?)\b/i,
  },
];

export function checkRequestPolicy(text: string): RefusalCode | null {
  return REFUSAL_RULES.find((rule) => rule.pattern.test(text))?.code ?? null;
}

/** User-facing explanation for each refusal. States what was declined and what the assistant can do. */
export const REFUSAL_MESSAGES: Record<RefusalCode, string> = {
  destructive_action:
    "I can't delete or wipe library records in bulk. Owners can remove individual books, members, or loans from their pages in the dashboard.",
  auth_bypass:
    "I can't change permissions, bypass sign-in, or share my internal instructions. I can help you find, borrow, or get recommendations for books.",
  cross_tenant:
    "I can only access this library's catalog and records. Other libraries' data is never available here.",
  bulk_pii_export:
    "I can't export members' personal or contact details. Owners can view individual member records on the Members page.",
};

/** Removes control characters (except newlines and tabs) and trims surrounding whitespace. */
export function sanitizeUserText(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g, "").trim();
}

const PII_PATTERNS: { label: string; pattern: RegExp; minDigits: number }[] = [
  { label: "[email]", pattern: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu, minDigits: 0 },
  // 13-19 digit runs (payment cards), checked before phone numbers.
  { label: "[card number]", pattern: /\b(?:\d[ -]?){12,18}\d\b/g, minDigits: 13 },
  // Nine or more digits, so year ranges like "1990-2000" are left alone.
  { label: "[phone]", pattern: /(?<![\w-])\+?\d[\d\s().-]{7,}\d(?![\w-])/g, minDigits: 9 },
];

/**
 * Masks emails, card numbers, and phone numbers before text is sent to the LLM.
 * Digit runs with a valid ISBN-10/13 checksum are kept so catalog lookups still work.
 */
export function redactPii(text: string): { text: string; redacted: number } {
  let redacted = 0;
  let result = text;
  for (const { label, pattern, minDigits } of PII_PATTERNS) {
    result = result.replace(pattern, (match) => {
      if (minDigits > 0 && (match.replace(/\D/g, "").length < minDigits || looksLikeIsbn(match))) {
        return match;
      }
      redacted += 1;
      return label;
    });
  }
  return { text: result, redacted };
}

function looksLikeIsbn(value: string): boolean {
  const digits = value.replace(/[^\dXx]/g, "").toUpperCase();
  if (digits.length === 10 && /^\d{9}[\dX]$/.test(digits)) {
    const sum = [...digits].reduce(
      (total, char, index) => total + (char === "X" ? 10 : Number(char)) * (10 - index),
      0,
    );
    return sum % 11 === 0;
  }
  if (digits.length === 13 && /^97[89]\d{10}$/.test(digits)) {
    const sum = [...digits].reduce(
      (total, char, index) => total + Number(char) * (index % 2 === 0 ? 1 : 3),
      0,
    );
    return sum % 10 === 0;
  }
  return false;
}
