package com.musteritakipcrm.alarm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

public class AlarmRingingService extends Service {
    static final String CHANNEL_ALARM="crm_alarm_visual_v3";
    static final String CHANNEL_SYNC="crm_alarm_sync";
    private static final long AUTO_STOP_MS=3000L;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;

    static void ensureChannels(Context c){
        if(Build.VERSION.SDK_INT<26)return;
        NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);

        NotificationChannel sync=new NotificationChannel(CHANNEL_SYNC,"CRM alarm servisi",NotificationManager.IMPORTANCE_LOW);
        sync.setSound(null,null);
        sync.enableVibration(false);
        nm.createNotificationChannel(sync);

        NotificationChannel alarm=new NotificationChannel(CHANNEL_ALARM,"CRM sessiz ekran uyarısı",NotificationManager.IMPORTANCE_HIGH);
        alarm.setDescription("Ses yok; tam ekran uyarı ve kısa titreşim");
        alarm.setSound(null,null);
        alarm.enableVibration(false);
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

        Intent display=new Intent(this,AlarmDisplayActivity.class);
        display.putExtra("title",title);
        display.putExtra("body",body);
        display.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int displayRequestCode=(id+"|"+String.valueOf(remindAt)).hashCode();
        PendingIntent displayPi=PendingIntent.getActivity(this,displayRequestCode,display,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);

        Notification n=new Notification.Builder(this,CHANNEL_ALARM)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("AJANDA UYARISI - "+title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(displayPi)
                .setFullScreenIntent(displayPi,true)
                .setOngoing(false)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .build();

        startForeground(2001,n);
        acquireWakeLock();
        vibrateOnce();

        try{startActivity(display);}catch(Exception ignored){}

        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(() -> stopAlarmAndSelf(false),AUTO_STOP_MS);

        String token=getSharedPreferences("crm_alarm",MODE_PRIVATE).getString("token","");
        if(id!=999999&&!token.isEmpty()&&remindAt!=null&&!remindAt.isEmpty()){
            final int alarmId=id;
            final String at=remindAt;
            new Thread(()->{
                try{Api.ack(token,alarmId,at);}catch(Exception ignored){}
            }).start();
        }

        return START_NOT_STICKY;
    }

    private void acquireWakeLock(){
        try{
            PowerManager pm=(PowerManager)getSystemService(POWER_SERVICE);
            wakeLock=pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"CRMAlarm:visual");
            wakeLock.acquire(10000L);
        }catch(Exception ignored){}
    }

    private void vibrateOnce(){
        try{
            vibrator=(Vibrator)getSystemService(VIBRATOR_SERVICE);
            if(Build.VERSION.SDK_INT>=26)vibrator.vibrate(VibrationEffect.createOneShot(500,VibrationEffect.DEFAULT_AMPLITUDE));
            else vibrator.vibrate(500);
        }catch(Exception ignored){}
    }

    private void releaseAlarm(){
        try{if(vibrator!=null)vibrator.cancel();}catch(Exception ignored){}
        try{if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();}catch(Exception ignored){}
    }

    private void stopAlarmAndSelf(boolean removeNotification){
        handler.removeCallbacksAndMessages(null);
        releaseAlarm();
        stopForeground(removeNotification);
        stopSelf();
    }

    @Override public void onDestroy(){
        handler.removeCallbacksAndMessages(null);
        releaseAlarm();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent){return null;}
}
