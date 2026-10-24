-- 004_dashboards_indexes.sql: Performance indexes for dashboard and report queries
-- Stage 11 (Dashboards and Reports)

CREATE INDEX IF NOT EXISTS idx_batches_facility ON batches (machine_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_transactions_facility ON transactions (facility_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_shipments_facility ON shipments (facility_id, dispatched_at);
CREATE INDEX IF NOT EXISTS idx_receipts_shipment ON shipment_receipts (shipment_id);
CREATE INDEX IF NOT EXISTS idx_households_ward ON households (ward);
CREATE INDEX IF NOT EXISTS idx_pickups_captured ON pickups (captured_at);
