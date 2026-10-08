package com.musteritakipcrm.alarm;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String PREF="crm_alarm";

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        AlarmRingingService.ensureChannels(this);
        requestPermissionsIfNeeded();
        setContentView(buildUi());
        String token=prefs().getString("token","");
        if(!token.isEmpty()) startServiceNow();
    }

    private LinearLayout buildUi(){
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(247,247,247));

        TextView header=new TextView(this);
        header.setText("AJANDA");
        header.setTextSize(25);
        header.setTextColor(Color.BLACK);
        header.setTypeface(null,Typeface.BOLD);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(32,28,32,28);
        header.setBackgroundColor(Color.rgb(255,193,7));
        root.addView(header,new LinearLayout.LayoutParams(-1,-2));

        LinearLayout body=new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(28,28,28,28);
        root.addView(body,new LinearLayout.LayoutParams(-1,-1));

        Button yeni=new Button(this);
        yeni.setText("+  YENİ NOT");
        yeni.setTextSize(19);
        yeni.setTypeface(null,Typeface.BOLD);
        yeni.setOnClickListener(v->Toast.makeText(this,"Yeni not ekranı hazırlanıyor.",Toast.LENGTH_SHORT).show());
        body.addView(yeni,new LinearLayout.LayoutParams(-1,-2));

        LinearLayout tabs=new LinearLayout(this);
        tabs.setOrientation(LinearLayout.HORIZONTAL);
        tabs.setPadding(0,22,0,18);
        Button notlar=new Button(this);
        notlar.setText("NOTLAR");
        Button arsiv=new Button(this);
        arsiv.setText("ARŞİV");
        tabs.addView(notlar,new LinearLayout.LayoutParams(0,-2,1));
        tabs.addView(arsiv,new LinearLayout.LayoutParams(0,-2,1));
        body.addView(tabs,new LinearLayout.LayoutParams(-1,-2));

        TextView bilgi=new TextView(this);
        bilgi.setText("Ajandanız\n\nNotlarınız burada görünecek.\nTarih ve saat verilen notların alarmı arka planda çalışmaya devam eder.");
        bilgi.setTextSize(17);
        bilgi.setTextColor(Color.DKGRAY);
        bilgi.setPadding(16,22,16,16);
        body.addView(bilgi,new LinearLayout.LayoutParams(-1,-2));

        TextView durum=new TextView(this);
        boolean bagli=!prefs().getString("token","").isEmpty();
        durum.setText(bagli?"✓ Alarm bağlantısı aktif":"Alarm bağlantısı henüz kurulmamış");
        durum.setTextSize(13);
        durum.setTextColor(Color.GRAY);
        durum.setPadding(16,30,16,0);
        body.addView(durum,new LinearLayout.LayoutParams(-1,-2));
        return root;
    }

    private android.content.SharedPreferences prefs(){return getSharedPreferences(PREF,MODE_PRIVATE);}

    private void startServiceNow(){
        Intent i=new Intent(this,SyncService.class);
        if(Build.VERSION.SDK_INT>=26) startForegroundService(i); else startService(i);
    }

    private void requestPermissionsIfNeeded(){
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},20);
    }
}
