package com.musteritakipcrm.alarm;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class AlarmDisplayActivity extends Activity {
    private static final long AUTO_CLOSE_MS=10000L;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private TextView titleView;
    private TextView bodyView;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);

        // Hem yeni hem eski Android sürümlerinde kilit ekranının üzerinde görün.
        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                        |WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                        |WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                        |WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        );
        if(Build.VERSION.SDK_INT>=27){
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        if(Build.VERSION.SDK_INT>=26){
            try{
                KeyguardManager km=(KeyguardManager)getSystemService(KEYGUARD_SERVICE);
                if(km!=null&&km.isKeyguardLocked()){
                    km.requestDismissKeyguard(this,null);
                }
            }catch(Exception ignored){}
        }

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
        root.setPadding(40,60,40,60);
        root.setBackgroundColor(Color.rgb(255,245,204));

        TextView head=new TextView(this);
        head.setText("AJANDA UYARISI");
        head.setTextSize(26);
        head.setTypeface(null,Typeface.BOLD);
        head.setTextColor(Color.rgb(138,75,0));
        head.setGravity(Gravity.CENTER);
        root.addView(head,new LinearLayout.LayoutParams(-1,-2));

        titleView=new TextView(this);
        titleView.setTextSize(34);
        titleView.setTypeface(null,Typeface.BOLD);
        titleView.setTextColor(Color.rgb(23,63,99));
        titleView.setGravity(Gravity.CENTER);
        titleView.setPadding(0,40,0,20);
        root.addView(titleView,new LinearLayout.LayoutParams(-1,-2));

        bodyView=new TextView(this);
        bodyView.setTextSize(22);
        bodyView.setTextColor(Color.rgb(31,41,55));
        bodyView.setGravity(Gravity.CENTER);
        bodyView.setPadding(0,0,0,40);
        root.addView(bodyView,new LinearLayout.LayoutParams(-1,-2));

        Button close=new Button(this);
        close.setText("KAPAT");
        close.setTextSize(22);
        close.setOnClickListener(v->closeAlarm());
        root.addView(close,new LinearLayout.LayoutParams(-1,-2));
        return root;
    }

    private void renderIntent(Intent intent){
        String title=intent==null?null:intent.getStringExtra("title");
        String body=intent==null?null:intent.getStringExtra("body");
        if(title==null||title.trim().isEmpty())title="AJANDA UYARISI";
        if(body==null)body="";
        titleView.setText(title);
        bodyView.setText(body);
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(this::finish,AUTO_CLOSE_MS);
    }

    private void closeAlarm(){
        handler.removeCallbacksAndMessages(null);
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

    @Override protected void onDestroy(){
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    @Override public void onBackPressed(){closeAlarm();}
}
