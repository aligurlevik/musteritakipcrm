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


## Örnek şablon
Yeni sürümde ana ekranın sağ üstünde **Örnek Şablonu Yükle** butonu vardır. Buna bastığında 10 örnek müşteri, görüşmeler, teklifler ve mail kayıtları D1 veritabanına otomatik eklenir.


## Hatırlatıcılar
Bu sürümde CRM içinde ayrı **Hatırlatıcılar** bölümü vardır.

- Müşteri seç
- Tarih ve saat belirle
- Hatırlatma notu yaz
- Ana panelde açık hatırlatıcı sayısını gör
- Zamanı gelince CRM açık ve tarayıcı bildirim izni verilmişse masaüstü bildirimi al
- Hatırlatıcıyı tamamla veya sil

### Veritabanı güncellemesi
Mevcut D1 veritabanına yeni `reminders` tablosunu eklemek için güncel `schema.sql` dosyasını tekrar çalıştır:

`npm run db:init:remote`

`CREATE TABLE IF NOT EXISTS` kullanıldığı için mevcut müşteri/görüşme/teklif/mail verileri silinmez.

### Önemli
Bu sürümde tarayıcı bildirimi CRM sayfası açıkken çalışır.
CRM kapalıyken veya telefonda arka planda gerçek push bildirimi için Web Push/VAPID servisi eklenmelidir.


## Görüşme içinde hatırlatıcı
Hatırlatıcı artık ayrı menü yerine **Görüşmeler** bölümünün içindedir.
Yeni görüşme eklerken:
- Görüşme tarihi ve notu
- Sonraki takip tarihi
- Hatırlatma tarih/saat
- Hatırlatma notu

aynı formda kaydedilir.

Mevcut D1 veritabanına alanları eklemek için güncellemeden sonra şu komutu **bir kez** çalıştır:
`npx wrangler d1 execute musteri-takip-crm --remote --file=./migration_gorusme_hatirlatici.sql`

Ardından:
`npm run deploy`

Tarayıcı bildirimi için Görüşmeler ekranındaki **Bildirim İzni** düğmesine basın. CRM açıkken zamanı gelen görüşme hatırlatması Windows bildirimi olarak gösterilir.
