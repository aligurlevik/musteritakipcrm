package com.musteritakipcrm.alarm;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String PREF="crm_alarm";
    private TextView status;
    private EditText code;

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        AlarmRingingService.ensureChannels(this);
        requestPermissionsIfNeeded();
        setContentView(buildUi());
        refreshStatus();
        String token=prefs().getString("token","");
        if(!token.isEmpty())startServiceNow();
    }

    @Override protected void onResume(){
        super.onResume();
        if(status!=null)refreshStatus();
    }

    private View buildUi(){
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32,48,32,32);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title=new TextView(this);
        title.setText("CRM ANDROID ALARM");
        title.setTextSize(24);
        title.setTypeface(null,Typeface.BOLD);
        root.addView(title,new LinearLayout.LayoutParams(-1,-2));

        TextView info=new TextView(this);
        info.setText("\nCRM kapalı olsa bile alarm servisi çalışır. Alarm zamanı gelince SES ve TİTREŞİM olmaz; diğer uygulamaların ÜSTÜNE tam ekran uyarı çıkar ve ALARMI KAPAT düğmesine basana kadar kalır.\n");
        info.setTextSize(16);
        root.addView(info,new LinearLayout.LayoutParams(-1,-2));

        code=new EditText(this);
        code.setHint("CRM'deki 6 haneli eşleştirme kodu");
        code.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        code.setTextSize(20);
        root.addView(code,new LinearLayout.LayoutParams(-1,-2));

        Button pair=new Button(this);
        pair.setText("BAĞLA VE BAŞLAT");
        pair.setOnClickListener(v->pair());
        root.addView(pair,new LinearLayout.LayoutParams(-1,-2));

        Button exact=new Button(this);
        exact.setText("1 — TAM SAATLİ UYARIYA İZİN VER");
        exact.setOnClickListener(v->openExactAlarmSettings());
        root.addView(exact,new LinearLayout.LayoutParams(-1,-2));

        Button overlay=new Button(this);
        overlay.setText("2 — DİĞER UYGULAMALARIN ÜZERİNDE GÖSTER");
        overlay.setOnClickListener(v->openOverlaySettings());
        root.addView(overlay,new LinearLayout.LayoutParams(-1,-2));

        Button fullScreen=new Button(this);
        fullScreen.setText("3 — EKRANI OTOMATİK AÇMA İZNİ");
        fullScreen.setOnClickListener(v->openFullScreenIntentSettings());
        root.addView(fullScreen,new LinearLayout.LayoutParams(-1,-2));

        Button battery=new Button(this);
        battery.setText("4 — PİL KISITLAMASINI KALDIR");
        battery.setOnClickListener(v->{
            try{startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));}
            catch(Exception ignored){}
        });
        root.addView(battery,new LinearLayout.LayoutParams(-1,-2));

        Button test=new Button(this);
        test.setText("10 SANİYE SONRA TAM EKRAN TEST");
        test.setOnClickListener(v->{
            if(!canDrawOverlays()){
                toast("Önce 'Diğer uygulamaların üzerinde göster' iznini açın.");
                openOverlaySettings();
                return;
            }
            AlarmScheduler.scheduleLocalTest(this,System.currentTimeMillis()+10000);
            toast("Test kuruldu. Ana ekrana veya başka uygulamaya geç; 10 saniye sonra sessiz alarm ekranın üstüne çıkmalı.");
        });
        root.addView(test,new LinearLayout.LayoutParams(-1,-2));

        status=new TextView(this);
        status.setTextSize(16);
        status.setPadding(0,24,0,0);
        root.addView(status,new LinearLayout.LayoutParams(-1,-2));
        return root;
    }

    private android.content.SharedPreferences prefs(){return getSharedPreferences(PREF,MODE_PRIVATE);}

    private void pair(){
        String c=code.getText().toString().trim();
        if(!c.matches("\\d{6}")){toast("6 haneli kodu girin.");return;}
        status.setText("Bağlanıyor…");
        new Thread(()->{
            try{
                String token=Api.pair(c,Build.MANUFACTURER+" "+Build.MODEL+" Android Alarm");
                prefs().edit().putString("token",token).apply();
                runOnUiThread(()->{
                    toast("Telefon bağlandı. Alarm servisi başlatıldı.");
                    refreshStatus();
                    startServiceNow();
                    if(!canDrawOverlays())openOverlaySettings();
                });
            }catch(Exception e){runOnUiThread(()->status.setText("Bağlantı hatası: "+e.getMessage()));}
        }).start();
    }

    private boolean canDrawOverlays(){
        return Build.VERSION.SDK_INT<23||Settings.canDrawOverlays(this);
    }

    private boolean canUseFullScreenIntent(){
        if(Build.VERSION.SDK_INT<34)return true;
        try{
            NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
            return nm!=null&&nm.canUseFullScreenIntent();
        }catch(Exception ignored){return false;}
    }

    private void refreshStatus(){
        String token=prefs().getString("token","");
        String overlayInfo=canDrawOverlays()?"\n✅ Ekran üstü alarm izni açık":"\n❌ EKRAN ÜSTÜ İZNİ KAPALI — 2. düğmeden aç";
        String fullInfo=canUseFullScreenIntent()?"\n✅ Ekran uyandırma izni açık":"\n⚠️ Ekran uyandırma izni kapalı";
        final String permissionInfo=overlayInfo+fullInfo;
        status.setText((token.isEmpty()?"Telefon henüz CRM'ye bağlı değil.":"Telefon CRM'ye bağlı. Sessiz alarm servisi çalışıyor.")+permissionInfo);
        if(!token.isEmpty())new Thread(()->{
            try{
                JSONObject p=Api.ping(token);
                runOnUiThread(()->status.setText("Bağlı — "+p.optString("label","Android Alarm")+permissionInfo));
            }catch(Exception e){runOnUiThread(()->status.setText("Bağlantı kontrolü: "+e.getMessage()+permissionInfo));}
        }).start();
    }

    private void startServiceNow(){
        Intent i=new Intent(this,SyncService.class);
        if(Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);
    }

    private void requestPermissionsIfNeeded(){
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},20);
    }

    private void openOverlaySettings(){
        if(canDrawOverlays()){toast("Diğer uygulamaların üzerinde göster izni açık.");return;}
        try{startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName())));}
        catch(Exception e){startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())));}
    }

    private void openExactAlarmSettings(){
        if(Build.VERSION.SDK_INT>=31){
            AlarmManager am=(AlarmManager)getSystemService(ALARM_SERVICE);
            if(!am.canScheduleExactAlarms()){
                try{startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));}
                catch(Exception e){startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())));}
                return;
            }
        }
        toast("Tam saatli uyarı izni açık.");
    }

    private void openFullScreenIntentSettings(){
        if(Build.VERSION.SDK_INT>=34){
            try{
                if(canUseFullScreenIntent()){
                    toast("Ekranı otomatik açma izni zaten açık.");
                    return;
                }
                startActivity(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:"+getPackageName())));
                return;
            }catch(Exception e){
                try{startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())));return;}
                catch(Exception ignored){}
            }
        }
        toast("Bu Android sürümünde ekranı açma izni ayrıca gerekmiyor.");
    }

    private void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
}
