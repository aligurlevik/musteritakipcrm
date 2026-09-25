package com.musteritakipcrm.alarm;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class AlarmOverlayService extends Service {
    private WindowManager wm;
    private View overlay;
    private int alarmId;
    private String remindAt="";

    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent!=null&&"STOP".equals(intent.getAction())){
            closeOverlay(false);
            return START_NOT_STICKY;
        }
        if(Build.VERSION.SDK_INT>=23&&!Settings.canDrawOverlays(this)){
            stopSelf();
            return START_NOT_STICKY;
        }

        alarmId=intent==null?0:intent.getIntExtra("id",0);
        remindAt=intent==null?"":String.valueOf(intent.getStringExtra("remind_at"));
        String title=intent==null?"Ajanda Uyarısı":intent.getStringExtra("title");
        String body=intent==null?"Hatırlatma zamanı geldi.":intent.getStringExtra("body");
        if(title==null||title.trim().isEmpty())title="Ajanda Uyarısı";
        if(body==null)body="";

        showOverlay(title,body);
        return START_NOT_STICKY;
    }

    private void showOverlay(String title,String body){
        closeOverlay(false);
        wm=(WindowManager)getSystemService(Context.WINDOW_SERVICE);

        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(48,80,48,80);
        root.setBackgroundColor(Color.rgb(18,31,48));

        TextView head=new TextView(this);
        head.setText("AJANDA UYARISI");
        head.setTextColor(Color.rgb(255,211,56));
        head.setTextSize(26);
        head.setTypeface(null,Typeface.BOLD);
        head.setGravity(Gravity.CENTER);
        root.addView(head,new LinearLayout.LayoutParams(-1,-2));

        TextView t=new TextView(this);
        t.setText(title);
        t.setTextColor(Color.WHITE);
        t.setTextSize(34);
        t.setTypeface(null,Typeface.BOLD);
        t.setGravity(Gravity.CENTER);
        t.setPadding(0,50,0,20);
        root.addView(t,new LinearLayout.LayoutParams(-1,-2));

        TextView b=new TextView(this);
        b.setText(body);
        b.setTextColor(Color.rgb(230,235,240));
        b.setTextSize(22);
        b.setGravity(Gravity.CENTER);
        b.setPadding(0,0,0,50);
        root.addView(b,new LinearLayout.LayoutParams(-1,-2));

        Button close=new Button(this);
        close.setText("ALARMI KAPAT");
        close.setTextSize(22);
        close.setTypeface(null,Typeface.BOLD);
        close.setOnClickListener(v->closeOverlay(true));
        root.addView(close,new LinearLayout.LayoutParams(-1,-2));

        int type=Build.VERSION.SDK_INT>=26?WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY:WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp=new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                type,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        |WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                        |WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                        |WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
                PixelFormat.TRANSLUCENT
        );
        lp.gravity=Gravity.TOP|Gravity.START;
        overlay=root;
        wm.addView(overlay,lp);
    }

    private void closeOverlay(boolean acknowledge){
        if(overlay!=null&&wm!=null){
            try{wm.removeViewImmediate(overlay);}catch(Exception ignored){}
        }
        overlay=null;
        if(acknowledge){
            try{
                Intent stop=new Intent(this,AlarmRingingService.class).setAction("STOP");
                if(Build.VERSION.SDK_INT>=26)startForegroundService(stop);else startService(stop);
            }catch(Exception ignored){}
            final String token=getSharedPreferences("crm_alarm",MODE_PRIVATE).getString("token","");
            final int id=alarmId;
            final String at=remindAt;
            if(id!=999999&&!token.isEmpty()&&!at.isEmpty()){
                new Thread(()->{try{Api.ack(token,id,at);}catch(Exception ignored){}}).start();
            }
        }
        stopSelf();
    }

    @Override public void onDestroy(){closeOverlay(false);super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
