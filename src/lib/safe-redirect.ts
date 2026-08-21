/**
 * Constrains a post-login redirect to somewhere on this site.
 *
 * `?next=` is attacker-controlled. Passing it straight to router.push turns the
 * shop's own login page into a redirector to anywhere — sign in on a real,
 * trusted domain, land on a copy of it. That is the classic phishing setup, and
 * the reason it works is that the first half really is genuine.
 *
 * Only a single-slash absolute path is allowed. "//evil.com" is protocol-
 * relative and would leave the site, and a backslash is treated as a slash by
 * some browsers, so both are rejected.
 */
export function safeRedirect(target: string | null | undefined, fallback: string): string {
  if (!target) return fallback;

  const trimmed = target.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('\\')) return fallback;

  // A scheme cannot appear in a path; if one does, something is being smuggled.
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback;

  return trimmed;
}

/** Backslash, kept as a named constant so the escapes below stay readable. */
const BACKSLASH = String.fromCharCode(92);

/**
 * Escapes a JSON payload for embedding in a <script> tag.
 *
 * JSON.stringify does not escape "<", so a product named `</script><script>…`
 * closes the tag and runs. The data is admin-authored, which makes this a
 * privilege escalation rather than an open door: someone allowed to edit a
 * product name should not thereby be able to run scripts on every visitor.
 *
 * The replacements must emit a literal backslash followed by "u003c" — writing
 * that as a string escape in the source produces the character itself and the
 * replace silently becomes a no-op, which is exactly the bug this fixes.
 */
export function jsonLdSafe(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, `${BACKSLASH}u003c`)
    .replace(/>/g, `${BACKSLASH}u003e`)
    .replace(/&/g, `${BACKSLASH}u0026`);
}
