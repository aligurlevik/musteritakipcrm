package com.musteritakipcrm.alarm;

import android.app.Notification;
import android.app.Service;
import android.content.Intent;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SyncService extends Service {
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private boolean busy=false;

    private final Runnable tick=new Runnable(){
        @Override public void run(){
            sync();
            handler.postDelayed(this,30000);
        }
    };

    @Override public void onCreate(){
        super.onCreate();
        AlarmRingingService.ensureChannels(this);
        Notification n=new Notification.Builder(this,AlarmRingingService.CHANNEL_SYNC)
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .setContentTitle("CRM alarm servisi")
                .setContentText("Ajanda alarmları takip ediliyor")
                .setOngoing(true)
                .build();
        startForeground(1001,n);
        handler.post(tick);
    }

    private void sync(){
        if(busy)return;
        String token=getSharedPreferences("crm_alarm",MODE_PRIVATE).getString("token","");
        if(token.isEmpty()){stopSelf();return;}
        busy=true;
        executor.execute(()->{
            try{
                List<Api.Reminder> items=Api.reminders(token);
                for(Api.Reminder r:items)AlarmScheduler.schedule(this,r);
            }catch(Exception ignored){
            }finally{
                busy=false;
            }
        });
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){return START_STICKY;}
    @Override public IBinder onBind(Intent intent){return null;}

    @Override public void onDestroy(){
        handler.removeCallbacksAndMessages(null);
        executor.shutdownNow();
        super.onDestroy();
    }
}
