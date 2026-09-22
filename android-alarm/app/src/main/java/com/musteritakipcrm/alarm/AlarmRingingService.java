package com.musteritakipcrm.alarm;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

public class AlarmRingingService extends Service {
    static final String CHANNEL_ALARM="crm_alarm_loud";
    static final String CHANNEL_SYNC="crm_alarm_sync";
    private Ringtone ringtone;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;

    static void ensureChannels(Context c){
        if(Build.VERSION.SDK_INT<26)return;
        NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);

        NotificationChannel sync=new NotificationChannel(CHANNEL_SYNC,"CRM alarm servisi",NotificationManager.IMPORTANCE_LOW);
        sync.setSound(null,null);
        nm.createNotificationChannel(sync);

        Uri sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        AudioAttributes attrs=new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        NotificationChannel alarm=new NotificationChannel(CHANNEL_ALARM,"CRM yüksek sesli alarm",NotificationManager.IMPORTANCE_HIGH);
        alarm.setDescription("CRM ajanda alarmları");
        alarm.enableVibration(true);
        alarm.setVibrationPattern(new long[]{0,500,200,500,200,900});
        alarm.setSound(sound,attrs);
        nm.createNotificationChannel(alarm);
    }

    @Override public void onCreate(){
        super.onCreate();
        ensureChannels(this);
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&"STOP".equals(intent.getAction())){
            stopAlarmAndSelf();
            return START_NOT_STICKY;
        }

        int id=intent==null?0:intent.getIntExtra("id",0);
        String remindAt=intent==null?"":intent.getStringExtra("remind_at");
        String title=intent==null?"CRM Alarm":intent.getStringExtra("title");
        String body=intent==null?"Hatırlatma zamanı geldi.":intent.getStringExtra("body");
        if(title==null||title.isEmpty())title="CRM Alarm";
        if(body==null)body="";

        Intent stop=new Intent(this,AlarmRingingService.class).setAction("STOP");
        PendingIntent stopPi=PendingIntent.getService(this,2002,stop,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);

        Intent open=new Intent(this,MainActivity.class);
        PendingIntent openPi=PendingIntent.getActivity(this,2003,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);

        Notification.Action stopAction=new Notification.Action.Builder(android.R.drawable.ic_media_pause,"ALRMI DURDUR",stopPi).build();
        Notification n=new Notification.Builder(this,CHANNEL_ALARM)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("⏰ "+title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setContentIntent(openPi)
                .setOngoing(true)
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(stopAction)
                .build();

        startForeground(2001,n);
        acquireWakeLock();
        raiseAlarmVolume();
        playAlarm();
        vibrate();

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
            wakeLock=pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"CRMAlarm:ring");
            wakeLock.acquire(10*60*1000L);
        }catch(Exception ignored){}
    }

    private void raiseAlarmVolume(){
        try{
            AudioManager am=(AudioManager)getSystemService(AUDIO_SERVICE);
            int max=am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            if(am.getStreamVolume(AudioManager.STREAM_ALARM)<Math.max(1,max/2)){
                am.setStreamVolume(AudioManager.STREAM_ALARM,max,0);
            }
        }catch(Exception ignored){}
    }

    private void playAlarm(){
        try{
            String raw=getSharedPreferences("crm_alarm",MODE_PRIVATE).getString("alarm_uri","");
            Uri uri=null;
            if(!raw.isEmpty())try{uri=Uri.parse(raw);}catch(Exception ignored){}
            if(uri==null)uri=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if(uri==null)uri=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            ringtone=RingtoneManager.getRingtone(this,uri);
            if(Build.VERSION.SDK_INT>=21){
                ringtone.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
            }
            if(Build.VERSION.SDK_INT>=28)ringtone.setLooping(true);
            ringtone.play();
        }catch(Exception ignored){}
    }

    private void vibrate(){
        try{
            vibrator=(Vibrator)getSystemService(VIBRATOR_SERVICE);
            long[] pattern={0,600,200,600,200,1000};
            if(Build.VERSION.SDK_INT>=26)vibrator.vibrate(VibrationEffect.createWaveform(pattern,0));
            else vibrator.vibrate(pattern,0);
        }catch(Exception ignored){}
    }

    private void releaseAlarm(){
        try{if(ringtone!=null&&ringtone.isPlaying())ringtone.stop();}catch(Exception ignored){}
        try{if(vibrator!=null)vibrator.cancel();}catch(Exception ignored){}
        try{if(wakeLock!=null&&wakeLock.isHeld())wakeLock.release();}catch(Exception ignored){}
    }

    private void stopAlarmAndSelf(){
        releaseAlarm();
        stopForeground(true);
        stopSelf();
    }

    @Override public void onDestroy(){
        releaseAlarm();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent){return null;}
}
