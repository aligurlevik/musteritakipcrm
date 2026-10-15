# EngView EVD aktarımı

Bu özellik yayınlandıktan sonra Ali hesabıyla Grafik İşleri > EngView bağlantısı açılır. Kurulum anahtarı oluşturulur, kurulum dosyası indirilip J: sürücüsüne erişen tek bir Windows bilgisayarda çalıştırılır. Anahtar kurulumda yapıştırılır. Yönetici yetkisi gerekmez. Bu bilgisayar açık ve Windows kullanıcısı oturum açmış olmalıdır.

Yardımcı program yalnızca `J:\Dat2026` kökündeki `.evd` dosyalarını okur; alt klasörleri, silinenleri ve diğer uzantıları aktarmaz. Dosyanın uzantısız adı CRM iş koduyla birebir, büyük/küçük harf farkı olmadan eşleştirilir. İlk çalıştırmada mevcut eşleşen dosyalar da aktarılır. Eşleşmeyen veya birden fazla işe eşleşen dosya reddedilir ve sonraki taramada tekrar denenir. Yerel dosyalar değiştirilmez veya silinmez.

30 saniyede bir kontrol edilir; en az 5 saniyedir değişmeyen dosyalardan yazmaya kapalı bir okuma kopyası alınır. Başarıyla aktarılan boyut/tarih kaydedilir; başarısız aktarım yeniden denenir. CRM son başarılı EVD kopyasını tutar; aynı içerik yeniden yazılmaz. Revizyon arşivi ve PDF dönüşümü yoktur. EVD tarayıcıda önizlenmez, indirilip EngView ile açılır. Her dosya en fazla 1 MB olabilir; limit aşımı yerel günlükte görünür. Veriler mevcut D1 veritabanında saklanır; büyük arşivlerde kapasite değerlendirilmelidir.

Anahtar bilgisayarda Windows DPAPI ile kullanıcıya bağlı şifreli saklanır. Sunucuda yalnızca SHA-256 özeti tutulur. Anahtar sadece EVD yükleyebilir; CRM kayıtlarını okuyamaz/değiştiremez. Yeni anahtar oluşturmak eski bağlantıyı iptal eder. EVD indirme Ali ve Çağatay oturumlarıyla sınırlıdır. Recep erişemez.

Durum CRM bağlantı penceresindeki son aktarım zamanından, hatalar `%LOCALAPPDATA%\CRM-EngView\aktarim.log` dosyasından takip edilir. Başlangıç klasöründeki `CRM-EngView.vbs` silinerek otomatik başlatma kaldırılır; CRM'deki Bağlantıyı iptal et ile yeni yüklemeler hemen engellenir. Yeniden eşitlemek için yardımcı program durdurulup yerel `state.xml` silinebilir.

Windows'ta canlı kurulum, J: erişimi ve gerçek EngView dosyasıyla uçtan uca doğrulama ayrıca yapılmalıdır. İlk denemede bir iş kodu seçilip EVD kaydedilir, CRM'den indirilen dosyanın boyutu ve SHA-256 özeti kaynakla karşılaştırılır.
