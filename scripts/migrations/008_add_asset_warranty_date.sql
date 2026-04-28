-- Optional warranty expiration date on assets. Independent of purchase_date
-- because warranty windows vary by vendor / extended-warranty add-ons.

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS warranty_date DATE;
