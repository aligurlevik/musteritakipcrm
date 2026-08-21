-- Müşteri tablosuna fatura bilgileri ekler.
-- SADECE BİR KEZ çalıştır.
ALTER TABLE customers ADD COLUMN invoice_title TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN tax_office TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN tax_number TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN invoice_address TEXT DEFAULT '';
