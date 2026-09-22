package com.musteritakipcrm.alarm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent){
        String token=context.getSharedPreferences("crm_alarm",Context.MODE_PRIVATE).getString("token","");
        if(token.isEmpty())return;
        Intent service=new Intent(context,SyncService.class);
        if(Build.VERSION.SDK_INT>=26)context.startForegroundService(service);else context.startService(service);
    }
}
