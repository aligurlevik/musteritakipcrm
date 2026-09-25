package com.musteritakipcrm.alarm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

public class AlarmRingingService extends Service {
    // Yeni kanal ID'si eski cihazlarda kalmış ses/titreşim kanal ayarlarını devre dışı bırakır.
    static final String CHANNEL_ALARM="crm_alarm_visual_v6";
    static final String CHANNEL_SYNC="crm_alarm_sync_v2";
    private PowerManager.WakeLock wakeLock;

    static void ensureChannels(Context c){
        if(Build.VERSION.SDK_INT<26)return;
        NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);

        NotificationChannel sync=new NotificationChannel(CHANNEL_SYNC,"CRM alarm servisi",NotificationManager.IMPORTANCE_LOW);
        sync.setSound(null,null);
        sync.enableVibration(false);
        nm.createNotificationChannel(sync);

        NotificationChannel alarm=new NotificationChannel(CHANNEL_ALARM,"CRM sessiz tam ekran alarm",NotificationManager.IMPORTANCE_HIGH);
        alarm.setDescription("Alarm geldiğinde ses ve titreşim olmadan tam ekran uyarı gösterir");
        alarm.setSound(null,null);
        alarm.enableVibration(false);
        alarm.setVibrationPattern(new long[]{0L});
        alarm.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(alarm);
    }

    @Override public void onCreate(){
        super.onCreate();
        ensureChannels(this);
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&"STOP".equals(intent.getAction())){
            stopAlarmAndSelf(true);
            return START_NOT_STICKY;
        }

        int id=intent==null?0:intent.getIntExtra("id",0);
        String remindAt=intent==null?"":intent.getStringExtra("remind_at");
        String title=intent==null?"Ajanda Uyarısı":intent.getStringExtra("title");
        String body=intent==null?"Hatırlatma zamanı geldi.":intent.getStringExtra("body");
        if(title==null||title.isEmpty())title="Ajanda Uyarısı";
        if(body==null)body="";
        if(remindAt==null)remindAt="";

        Intent display=new Intent(this,AlarmDisplayActivity.class);
        display.putExtra("id",id);
        display.putExtra("remind_at",remindAt);
        display.putExtra("title",title);
        display.putExtra("body",body);
        display.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                |Intent.FLAG_ACTIVITY_CLEAR_TOP
                |Intent.FLAG_ACTIVITY_SINGLE_TOP
                |Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);

        int displayRequestCode=(id+"|"+remindAt).hashCode();
        PendingIntent displayPi=PendingIntent.getActivity(
                this,
                displayRequestCode,
                display,
                PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE
        );

        Notification n=new Notification.Builder(this,CHANNEL_ALARM)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("AJANDA UYARISI - "+title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(displayPi)
                .setFullScreenIntent(displayPi,true)
                .setOngoing(true)
                .setAutoCancel(false)
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setPriority(Notification.PRIORITY_MAX)
                .build();

        startForeground(2001,n);
        wakeScreen();

        // Android izin veriyorsa bildirime dokunmayı beklemeden alarm ekranını öne getir.
        try{startActivity(display);}catch(Exception ignored){}

        // Burada ACK YOK. Sunucu onayı yalnızca kullanıcı ALARMI KAPAT düğmesine bastığında gönderilir.
        // Otomatik kapanma da yok: EXE sürümündeki gibi kullanıcı kapatana kadar alarm ekranda kalır.
        return START_NOT_STICKY;
    }

    @SuppressWarnings("deprecation")
    private void wakeScreen(){
        try{
            if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();
            PowerManager pm=(PowerManager)getSystemService(POWER_SERVICE);
            int flags=PowerManager.FULL_WAKE_LOCK
                    |PowerManager.ACQUIRE_CAUSES_WAKEUP
                    |PowerManager.ON_AFTER_RELEASE;
            wakeLock=pm.newWakeLock(flags,"CRMAlarm:force-screen-on");
            wakeLock.setReferenceCounted(false);
            wakeLock.acquire(15000L);
        }catch(Exception ignored){}
    }

    private void releaseAlarm(){
        try{if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();}catch(Exception ignored){}
    }

    private void stopAlarmAndSelf(boolean removeNotification){
        releaseAlarm();
        stopForeground(removeNotification);
        stopSelf();
    }

    @Override public void onDestroy(){
        releaseAlarm();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent){return null;}
}
