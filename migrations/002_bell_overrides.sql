-- Small, shared collection saved under the same revision lock as the school data.
ALTER TABLE dayline_meta
  ADD COLUMN IF NOT EXISTS bell_overrides jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(bell_overrides) = 'array');
