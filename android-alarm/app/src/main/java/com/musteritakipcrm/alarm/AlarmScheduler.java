package com.musteritakipcrm.alarm;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

final class AlarmScheduler {
    static void schedule(Context context,Api.Reminder r){
        Intent intent=new Intent(context,AlarmReceiver.class);
        intent.putExtra("id",r.id);
        intent.putExtra("remind_at",r.remindAt);
        intent.putExtra("title",r.title);
        intent.putExtra("body",r.body);
        int requestCode=r.key().hashCode();
        PendingIntent pi=PendingIntent.getBroadcast(context,requestCode,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        long when=Math.max(r.when,System.currentTimeMillis()+1200);
        if(Build.VERSION.SDK_INT>=31&&am.canScheduleExactAlarms())am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
        else if(Build.VERSION.SDK_INT>=23)am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,when,pi);
        else am.setExact(AlarmManager.RTC_WAKEUP,when,pi);
    }

    static void scheduleLocalTest(Context context,long when){
        Api.Reminder r=new Api.Reminder(999999,"local-test-"+when,when,"CRM Alarm Testi","Ekran kapalıyken açılması gereken sessiz görsel uyarı testidir.");
        schedule(context,r);
    }
}
