package com.musteritakipcrm.alarm;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

final class SyncWatchdog {
    private static final int REQUEST_CODE=41002;
    private static final long DEFAULT_DELAY_MS=60000L;

    static void schedule(Context context){schedule(context,DEFAULT_DELAY_MS);}

    static void schedule(Context context,long delayMs){
        String token=context.getSharedPreferences("crm_alarm",Context.MODE_PRIVATE).getString("token","");
        if(token.isEmpty())return;
        Intent intent=new Intent(context,SyncWatchdogReceiver.class);
        PendingIntent pi=PendingIntent.getBroadcast(context,REQUEST_CODE,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        long when=System.currentTimeMillis()+Math.max(5000L,delayMs);
        if(Build.VERSION.SDK_INT>=31&&am.canScheduleExactAlarms())am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
        else if(Build.VERSION.SDK_INT>=23)am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
        else am.setExact(AlarmManager.RTC_WAKEUP,when,pi);
    }
}
