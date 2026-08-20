/**
 * Cookie names live here, apart from src/lib/session.ts, because client
 * components need the names but must not pull node:crypto and next/headers into
 * the browser bundle.
 */
export const SESSION_COOKIE = "ydc_session";

/**
 * Non-sensitive mirror of the entitlement, readable by client JS.
 *
 * It exists so the nav can show the right state without the *page* having to
 * read cookies — reading cookies in a Server Component opts the whole route out
 * of static rendering, which would take the marketing pages off the CDN. This
 * cookie grants nothing: every privileged path still verifies the signed
 * session server-side.
 */
export const ENTITLEMENT_HINT_COOKIE = "ydc_member";
