CREATE TABLE otp_requests (
  id bigserial PRIMARY KEY,
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false
);

CREATE TABLE sessions (
  id text PRIMARY KEY, -- sha256 of the random cookie value
  user_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
