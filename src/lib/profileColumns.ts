/**
 * Every column of `profiles` a client may read — i.e. all of them except
 * `push_token`, which is not granted to clients at all (20260919100000): the
 * partner-read policy returns the partner's whole row, and with their Expo push
 * token anyone could put arbitrary text on their lock screen. Only `send-ping`
 * (service role) reads it.
 *
 * Name the columns wherever a client selects from `profiles`, including the
 * `.select()` after an update/upsert — `*` or an empty select asks for the
 * ungranted column and Postgres rejects the whole query.
 */
export const PROFILE_COLUMNS =
  'id, username, avatar_url, partner_id, locale, quiet_hours_start, quiet_hours_end, created_at';
