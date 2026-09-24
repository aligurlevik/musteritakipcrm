package com.musteritakipcrm.alarm;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class AlarmDisplayActivity extends Activity {
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        if(Build.VERSION.SDK_INT>=27){
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }else{
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED|WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(buildUi());
    }

    private LinearLayout buildUi(){
        String title=getIntent().getStringExtra("title");
        String body=getIntent().getStringExtra("body");
        if(title==null||title.trim().isEmpty())title="AJANDA UYARISI";
        if(body==null)body="";

        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(40,60,40,60);
        root.setBackgroundColor(Color.rgb(255,245,204));

        TextView head=new TextView(this);
        head.setText("AJANDA UYARISI");
        head.setTextSize(26);
        head.setTypeface(null,Typeface.BOLD);
        head.setTextColor(Color.rgb(138,75,0));
        head.setGravity(Gravity.CENTER);
        root.addView(head,new LinearLayout.LayoutParams(-1,-2));

        TextView t=new TextView(this);
        t.setText(title);
        t.setTextSize(34);
        t.setTypeface(null,Typeface.BOLD);
        t.setTextColor(Color.rgb(23,63,99));
        t.setGravity(Gravity.CENTER);
        t.setPadding(0,40,0,20);
        root.addView(t,new LinearLayout.LayoutParams(-1,-2));

        TextView b=new TextView(this);
        b.setText(body);
        b.setTextSize(22);
        b.setTextColor(Color.rgb(31,41,55));
        b.setGravity(Gravity.CENTER);
        b.setPadding(0,0,0,40);
        root.addView(b,new LinearLayout.LayoutParams(-1,-2));

        Button close=new Button(this);
        close.setText("KAPAT");
        close.setTextSize(22);
        close.setOnClickListener(v->closeAlarm());
        root.addView(close,new LinearLayout.LayoutParams(-1,-2));
        return root;
    }

    private void closeAlarm(){
        try{
            NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
            nm.cancel(2001);
        }catch(Exception ignored){}
        try{
            Intent stop=new Intent(this,AlarmRingingService.class).setAction("STOP");
            if(Build.VERSION.SDK_INT>=26)startForegroundService(stop);else startService(stop);
        }catch(Exception ignored){}
        finish();
    }

    @Override public void onBackPressed(){closeAlarm();}
}
