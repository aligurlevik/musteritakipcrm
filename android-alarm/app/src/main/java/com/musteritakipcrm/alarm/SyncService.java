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
            heartbeat();
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
        heartbeat();
        SyncWatchdog.schedule(this);
        handler.post(tick);
    }

    private void heartbeat(){
        getSharedPreferences("crm_alarm",MODE_PRIVATE).edit()
                .putLong("sync_heartbeat",System.currentTimeMillis())
                .apply();
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
                getSharedPreferences("crm_alarm",MODE_PRIVATE).edit()
                        .putLong("last_sync_ok",System.currentTimeMillis())
                        .putInt("last_sync_count",items.size())
                        .remove("last_sync_error")
                        .apply();
            }catch(Exception e){
                getSharedPreferences("crm_alarm",MODE_PRIVATE).edit()
                        .putLong("last_sync_error_at",System.currentTimeMillis())
                        .putString("last_sync_error",String.valueOf(e.getMessage()))
                        .apply();
            }finally{
                heartbeat();
                busy=false;
            }
        });
    }

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        heartbeat();
        SyncWatchdog.schedule(this);
        sync();
        return START_STICKY;
    }

    @Override public void onTaskRemoved(Intent rootIntent){
        SyncWatchdog.schedule(this,5000L);
        super.onTaskRemoved(rootIntent);
    }

    @Override public IBinder onBind(Intent intent){return null;}

    @Override public void onDestroy(){
        handler.removeCallbacksAndMessages(null);
        SyncWatchdog.schedule(this,5000L);
        executor.shutdownNow();
        super.onDestroy();
    }
}
