/**
 * JSON for <script type="application/ld+json"> via dangerouslySetInnerHTML.
 *
 * JSON.stringify alone is not safe there: a room or company name containing
 * "</script>" would end the script tag and let the rest run as HTML.
 * Escaping < > & (and the line separators JSON allows but JS did not) keeps
 * it inside the tag. Checklist item 30.
 *
 * Written without backslashes or non-ASCII characters on purpose: a literal
 * U+2028 in a regex broke the build once.
 */
const BACKSLASH = String.fromCharCode(92);

function unicodeEscape(ch: string): string {
  return BACKSLASH + "u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
}

const UNSAFE = new Set(["<", ">", "&", String.fromCharCode(0x2028), String.fromCharCode(0x2029)]);

export function jsonLd(data: unknown): string {
  let out = "";
  for (const ch of JSON.stringify(data)) out += UNSAFE.has(ch) ? unicodeEscape(ch) : ch;
  return out;
}
