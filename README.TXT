# CRM Müşteri Takip — Cloudflare Workers + D1

Bu sürüm gerçek sunuculu CRM yapısıdır.

## Özellikler
- Şifreli yönetici girişi
- Cloudflare D1 veritabanı
- Müşteri kartları
- Görüşme geçmişi (1., 2., 3. görüşme şeklinde sınırsız)
- Teklif takibi
- Mail geçmişi
- Bugün takip / geciken / açık teklif paneli
- Mobil uyumlu arayüz
- Mail adresine tıklayınca e-posta uygulamasını açma

## Kurulum

1. Node.js 18+ kurulu olmalı.
2. Bu klasörde:
   npm install

3. Cloudflare hesabına giriş:
   npx wrangler login

4. D1 oluştur:
   npx wrangler d1 create musteri-takip-crm

5. Komutun verdiği `database_id` değerini `wrangler.jsonc` içindeki:
   BURAYA_D1_DATABASE_ID
   yerine yaz.

6. Veritabanını oluştur:
   npm run db:init:remote

7. Giriş şifresi belirle:
   npx wrangler secret put ADMIN_PASSWORD

8. Oturum imza anahtarı belirle:
   npx wrangler secret put SESSION_SECRET
   Buraya uzun ve rastgele bir metin gir.

9. Yayınla:
   npm run deploy

Wrangler sana `https://musteri-takip-crm....workers.dev` benzeri adres verir.

## Yerel test

npm run db:init:local
npx wrangler secret put ADMIN_PASSWORD --local
npx wrangler secret put SESSION_SECRET --local
npm run dev

## Outlook otomasyonu

`POST /api/mails` endpoint'i hazırdır. Power Automate'ten gelen veya giden mail olduğunda bu endpoint'e veri gönderilebilir.
Ancak endpoint şu an giriş oturumu gerektirir; Outlook otomasyonu için sonraki adımda ayrı bir webhook anahtarlı endpoint eklenmesi önerilir.

## Bildirimler

Ana panel günü gelen ve geciken kayıtları gösterir. Gerçek telefon/Windows push bildirimi için Web Push/VAPID veya e-posta/Telegram gibi bir bildirim kanalı ayrıca bağlanmalıdır.
