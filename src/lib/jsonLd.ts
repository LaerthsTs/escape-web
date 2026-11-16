/**
 * JSON for <script type="application/ld+json"> via dangerouslySetInnerHTML.
 *
 * JSON.stringify alone is not safe there: a room or company name containing
 * "</script>" would end the script tag and let the rest run as HTML.
 * Escaping "<" (and the line separators JSON allows but JS didn't) keeps it
 * inside the tag. Checklist item 30.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/ /g, '\\u2028')
    .replace(/ /g, '\\u2029');
}
