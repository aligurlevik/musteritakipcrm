package com.musteritakipcrm.alarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class SyncWatchdogReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){
        String token=context.getSharedPreferences("crm_alarm",Context.MODE_PRIVATE).getString("token","");
        if(token.isEmpty())return;

        long last=context.getSharedPreferences("crm_alarm",Context.MODE_PRIVATE).getLong("sync_heartbeat",0L);
        long age=System.currentTimeMillis()-last;
        if(last==0L||age>90000L){
            Intent service=new Intent(context,SyncService.class);
            try{
                if(Build.VERSION.SDK_INT>=26)context.startForegroundService(service);else context.startService(service);
            }catch(Exception ignored){}
        }
        SyncWatchdog.schedule(context);
    }
}
