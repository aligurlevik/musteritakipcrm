package com.musteritakipcrm.alarm;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class AlarmDisplayActivity extends Activity {
    private TextView titleView;
    private TextView bodyView;
    private boolean allowClose=false;
    private int alarmId=0;
    private String remindAt="";

    @Override public void onCreate(Bundle state){
        super.onCreate(state);

        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                        |WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                        |WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                        |WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                        |WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        if(Build.VERSION.SDK_INT>=27){
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        if(Build.VERSION.SDK_INT>=26){
            try{
                KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);
                if(km!=null&&km.isKeyguardLocked())km.requestDismissKeyguard(this,null);
            }catch(Exception ignored){}
        }

        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        |View.SYSTEM_UI_FLAG_FULLSCREEN
                        |View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        |View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        |View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        |View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );

        setFinishOnTouchOutside(false);
        setContentView(buildUi());
        renderIntent(getIntent());
    }

    @Override protected void onNewIntent(Intent intent){
        super.onNewIntent(intent);
        setIntent(intent);
        renderIntent(intent);
    }

    private LinearLayout buildUi(){
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(42,64,42,64);
        root.setBackgroundColor(Color.rgb(17,24,39));

        LinearLayout card=new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(42,42,42,42);
        card.setBackgroundColor(Color.rgb(255,248,220));

        TextView head=new TextView(this);
        head.setText("AJANDA UYARISI");
        head.setTextSize(27);
        head.setTypeface(null,Typeface.BOLD);
        head.setTextColor(Color.rgb(153,27,27));
        head.setGravity(Gravity.CENTER);
        card.addView(head,new LinearLayout.LayoutParams(-1,-2));

        titleView=new TextView(this);
        titleView.setTextSize(32);
        titleView.setTypeface(null,Typeface.BOLD);
        titleView.setTextColor(Color.rgb(23,63,99));
        titleView.setGravity(Gravity.CENTER);
        titleView.setPadding(0,40,0,22);
        card.addView(titleView,new LinearLayout.LayoutParams(-1,-2));

        bodyView=new TextView(this);
        bodyView.setTextSize(21);
        bodyView.setTextColor(Color.rgb(31,41,55));
        bodyView.setGravity(Gravity.CENTER);
        bodyView.setPadding(0,0,0,44);
        card.addView(bodyView,new LinearLayout.LayoutParams(-1,-2));

        Button close=new Button(this);
        close.setText("ALARMI KAPAT");
        close.setTextSize(22);
        close.setTypeface(null,Typeface.BOLD);
        close.setTextColor(Color.WHITE);
        close.setBackgroundColor(Color.rgb(23,63,99));
        close.setMinHeight(70);
        close.setOnClickListener(v->closeAlarm());
        card.addView(close,new LinearLayout.LayoutParams(-1,-2));

        root.addView(card,new LinearLayout.LayoutParams(-1,-2));
        return root;
    }

    private void renderIntent(Intent intent){
        String title=intent==null?null:intent.getStringExtra("title");
        String body=intent==null?null:intent.getStringExtra("body");
        alarmId=intent==null?0:intent.getIntExtra("id",0);
        String at=intent==null?null:intent.getStringExtra("remind_at");
        remindAt=at==null?"":at;
        if(title==null||title.trim().isEmpty())title="AJANDA UYARISI";
        if(body==null)body="";
        titleView.setText(title);
        bodyView.setText(body);
    }

    private void closeAlarm(){
        allowClose=true;

        try{
            NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
            if(nm!=null)nm.cancel(2001);
        }catch(Exception ignored){}

        try{
            Intent stop=new Intent(this,AlarmRingingService.class).setAction("STOP");
            if(Build.VERSION.SDK_INT>=26)startForegroundService(stop);else startService(stop);
        }catch(Exception ignored){}

        if(alarmId!=999999&&alarmId!=0&&!remindAt.isEmpty()){
            final int id=alarmId;
            final String at=remindAt;
            final String token=getSharedPreferences("crm_alarm",MODE_PRIVATE).getString("token","");
            if(!token.isEmpty()){
                new Thread(()->{
                    try{Api.ack(token,id,at);}catch(Exception ignored){}
                }).start();
            }
        }

        finishAndRemoveTask();
    }

    @Override public void finish(){
        if(allowClose)super.finish();
    }

    @Override public void onBackPressed(){
        // EXE sürümündeki gibi alarm sadece ALARMI KAPAT düğmesiyle kapatılır.
    }
}
