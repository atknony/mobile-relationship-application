-- The offline queue retries a ping whenever send-ping did not return a
-- success. If the insert actually committed and only the response was lost,
-- the retry created a second identical moment — the partner got the same ping
-- twice. Client-side deduplication cannot fix this; the server needs a key.
--
-- The client already generates a localId per ping, so store it and let a
-- unique index collapse retries onto the original row.

alter table public.moments
  add column if not exists client_id text;

create unique index if not exists moments_sender_client_id_key
  on public.moments (sender_id, client_id)
  where client_id is not null;
