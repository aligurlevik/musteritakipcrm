# CRM Alarm Android

Bu uygulama tarayıcı bildiriminden bağımsız çalışır. CRM'den yaklaşan hatırlatmaları alır, Android AlarmManager ile cihaza yerel alarm kurar ve alarm zamanı geldiğinde telefonun ALARM ses kanalını kullanır.

## Eşleştirme
1. CRM'yi açın.
2. GERÇEK ALARM UYGULAMASINI BAĞLA düğmesine basın.
3. Görünen 6 haneli kodu Android uygulamasına girin.
4. Uygulamada bildirim ve tam saatli alarm izinlerini verin.
5. Pil ayarlarında uygulamayı kısıtlamayın.

## Çalışma
- Uygulama ön planda olmasa da SyncService yaklaşan alarmları düzenli olarak CRM'den çeker.
- Yaklaşan alarm Android AlarmManager ile cihazın saatine kurulur.
- Alarm zamanı AlarmRingingService ALARM kullanım türüyle çalar ve titreşir.
- Telefon yeniden başlatılırsa servis tekrar başlatılır.
- 10 saniyelik yerel test düğmesi sunucuya bağlı olmadan alarm sesini doğrular.
