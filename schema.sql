
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  region TEXT,
  sector TEXT,
  priority TEXT DEFAULT 'NORMAL',
  stage TEXT DEFAULT 'Yeni Lead',
  follow_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  meeting_no INTEGER DEFAULT 1,
  meeting_date TEXT,
  note TEXT,
  next_follow_date TEXT,
  remind_at TEXT DEFAULT '',
  remind_note TEXT DEFAULT '',
  reminder_status TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  offer_no TEXT,
  subject TEXT,
  amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'TRY',
  status TEXT DEFAULT 'Taslak',
  offer_date TEXT,
  follow_date TEXT,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  direction TEXT,
  mail_date TEXT,
  email TEXT,
  subject TEXT,
  summary TEXT,
  follow_date TEXT,
  external_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS meeting_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT,
  content_type TEXT,
  file_size INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customers_follow ON customers(follow_date);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_offers_customer ON offers(customer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_customer ON meetings(customer_id);
CREATE INDEX IF NOT EXISTS idx_mails_customer ON mails(customer_id);
CREATE INDEX IF NOT EXISTS idx_meeting_images_meeting ON meeting_images(meeting_id);

INSERT INTO customers (company,contact_name,phone,email,region,sector,priority,stage,follow_date)
SELECT 'Atlas Tekstil','Murat Yılmaz','0532 111 22 33','murat@atlastekstil.com','Bursa','Tekstil','KRİTİK','Teklif','2026-08-21'
WHERE NOT EXISTS (SELECT 1 FROM customers);

INSERT INTO customers (company,contact_name,phone,email,region,sector,priority,stage,follow_date)
SELECT 'Vera Medikal','Ece Kılıç','0541 234 56 78','ece@veramedikal.com','Marmara','Medikal','YÜKSEK','Beklemede','2026-08-21'
WHERE (SELECT COUNT(*) FROM customers)=1;


CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  remind_at TEXT NOT NULL,
  note TEXT NOT NULL,
  status TEXT DEFAULT 'Açık',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_customer ON reminders(customer_id);
