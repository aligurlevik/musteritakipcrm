
const {spawnSync} = require("child_process");

const commands = [
  "ALTER TABLE customers ADD COLUMN invoice_title TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN tax_office TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN tax_number TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN invoice_address TEXT DEFAULT ''",
  "ALTER TABLE customers ADD COLUMN record_status TEXT DEFAULT 'Aktif'",
  "ALTER TABLE meetings ADD COLUMN remind_at TEXT DEFAULT ''",
  "ALTER TABLE meetings ADD COLUMN remind_note TEXT DEFAULT ''",
  "ALTER TABLE meetings ADD COLUMN reminder_status TEXT DEFAULT ''",
  "ALTER TABLE meetings ADD COLUMN result TEXT DEFAULT 'Beklemede'",
  "ALTER TABLE meetings ADD COLUMN result_note TEXT DEFAULT ''",
  "CREATE INDEX IF NOT EXISTS idx_customers_record_status ON customers(record_status)",
  "CREATE INDEX IF NOT EXISTS idx_meetings_result ON meetings(result)",
  "CREATE INDEX IF NOT EXISTS idx_meetings_remind_at ON meetings(remind_at)"
];

for (const sql of commands) {
  console.log("\n>>", sql);
  const r = spawnSync("npx", ["wrangler","d1","execute","musteri-takip-crm","--remote","--command",sql], {
    shell:true, encoding:"utf8"
  });
  const text=(r.stdout||"")+(r.stderr||"");
  if (r.status !== 0) {
    if (/duplicate column name|already exists/i.test(text)) {
      console.log("Zaten mevcut, geçiliyor.");
      continue;
    }
    console.error(text);
    process.exit(r.status || 1);
  }
  console.log(r.stdout || "Tamam.");
}
console.log("\nTüm veritabanı güncellemeleri tamamlandı.");
