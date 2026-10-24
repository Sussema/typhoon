CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gives gen_random_uuid()

CREATE TABLE facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  partner_type text NOT NULL CHECK (partner_type IN ('municipal','private')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id),
  code text UNIQUE NOT NULL, -- printed on the machine's QR label
  kind text NOT NULL, -- sorting line, baler, ...
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('collector','aggregator','facility_operator',
  'recycler','municipal_viewer','admin')),
  facility_id uuid REFERENCES facilities(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, -- e.g. WRK-0014
  facility_id uuid NOT NULL REFERENCES facilities(id),
  service_area text,
  consent_at timestamptz NOT NULL, -- when consent was recorded
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code text UNIQUE NOT NULL, -- e.g. HOME-0193, printed on sticker
  ward text NOT NULL,
  assigned_worker_id uuid REFERENCES workers(id),
  consent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE people_private ( -- personal data: erasable
  subject_id uuid PRIMARY KEY, -- a workers.id or households.id
  full_name text,
  phone text,
  address text,
  preferred_language text DEFAULT 'mr'
);

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL, -- created on the device: stops duplicates
  worker_id uuid NOT NULL REFERENCES workers(id),
  facility_id uuid NOT NULL REFERENCES facilities(id),
  material text NOT NULL,
  grade text,
  weight_g integer NOT NULL CHECK (weight_g > 0),
  price_paise_per_kg integer NOT NULL CHECK (price_paise_per_kg >= 0),
  weight_source text NOT NULL CHECK (weight_source IN ('scale','manual')),
  scale_id text,
  corrects_id uuid REFERENCES transactions(id), -- set when this row fixes an earlier one
  operator_id uuid NOT NULL REFERENCES users(id),
  captured_at timestamptz NOT NULL, -- time on the device (may be offline)
  received_at timestamptz NOT NULL DEFAULT now() -- time the server got it
);

CREATE TABLE batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL,
  machine_id uuid NOT NULL REFERENCES machines(id),
  input_g integer NOT NULL CHECK (input_g > 0),
  recovered_g integer NOT NULL CHECK (recovered_g >= 0),
  residual_g integer NOT NULL CHECK (residual_g >= 0),
  CHECK (recovered_g + residual_g <= input_g),
  weight_source text NOT NULL CHECK (weight_source IN ('scale','manual')),
  operator_id uuid NOT NULL REFERENCES users(id),
  captured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE batch_inputs (
  batch_id uuid REFERENCES batches(id),
  transaction_id uuid REFERENCES transactions(id),
  PRIMARY KEY (batch_id, transaction_id)
);

CREATE TABLE shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL,
  batch_id uuid NOT NULL REFERENCES batches(id),
  recycler_user_id uuid NOT NULL REFERENCES users(id),
  material text NOT NULL,
  grade text,
  shipped_g integer NOT NULL CHECK (shipped_g > 0),
  vehicle_no text,
  operator_id uuid NOT NULL REFERENCES users(id),
  captured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE shipment_receipts (
  shipment_id uuid PRIMARY KEY REFERENCES shipments(id),
  received_g integer NOT NULL CHECK (received_g >= 0),
  confirmed_by uuid NOT NULL REFERENCES users(id),
  note text,
  confirmed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pickups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL,
  household_id uuid NOT NULL REFERENCES households(id),
  worker_id uuid NOT NULL REFERENCES workers(id),
  result text NOT NULL CHECK (result IN ('correct','partial','incorrect','no_waste')),
  operator_id uuid NOT NULL REFERENCES users(id),
  captured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reward_ledger (
  id bigserial PRIMARY KEY,
  household_id uuid NOT NULL REFERENCES households(id),
  pickup_id uuid REFERENCES pickups(id),
  delta_points integer NOT NULL, -- positive = earned, negative = redeemed
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE machine_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES machines(id),
  kind text NOT NULL CHECK (kind IN ('downtime_start','downtime_end','maintenance','calibration')),
  note text,
  operator_id uuid NOT NULL REFERENCES users(id),
  captured_at timestamptz NOT NULL
);

-- Golden rule 3, enforced by the database itself
CREATE OR REPLACE FUNCTION forbid_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only. Insert a correction instead.', TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER no_change_transactions BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION forbid_change();

CREATE TRIGGER no_change_batches BEFORE UPDATE OR DELETE ON batches
FOR EACH ROW EXECUTE FUNCTION forbid_change();

CREATE TRIGGER no_change_shipments BEFORE UPDATE OR DELETE ON shipments
FOR EACH ROW EXECUTE FUNCTION forbid_change();

CREATE TRIGGER no_change_receipts BEFORE UPDATE OR DELETE ON shipment_receipts
FOR EACH ROW EXECUTE FUNCTION forbid_change();

CREATE TRIGGER no_change_pickups BEFORE UPDATE OR DELETE ON pickups
FOR EACH ROW EXECUTE FUNCTION forbid_change();

CREATE TRIGGER no_change_rewards BEFORE UPDATE OR DELETE ON reward_ledger
FOR EACH ROW EXECUTE FUNCTION forbid_change();
