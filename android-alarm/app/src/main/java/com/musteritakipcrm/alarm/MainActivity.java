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
        title.setText("CRM SESSİZ UYARI");
        title.setTextSize(24);
        title.setTypeface(null,Typeface.BOLD);
        root.addView(title,new LinearLayout.LayoutParams(-1,-2));

        TextView info=new TextView(this);
        info.setText("\nAlarm zamanı gelince SES ve TİTREŞİM OLMAZ. Ekran kapalıysa açılır ve büyük görsel uyarı gösterilir.\n");
        info.setTextSize(16);
        root.addView(info,new LinearLayout.LayoutParams(-1,-2));

        code=new EditText(this);
        code.setHint("CRM'deki 6 haneli eşleştirme kodu");
        code.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        code.setTextSize(20);
        root.addView(code,new LinearLayout.LayoutParams(-1,-2));

        Button pair=new Button(this);
        pair.setText("TELEFONU BAĞLA");
        pair.setOnClickListener(v->pair());
        root.addView(pair,new LinearLayout.LayoutParams(-1,-2));

        Button exact=new Button(this);
        exact.setText("TAM SAATLİ UYARIYA İZİN VER");
        exact.setOnClickListener(v->openExactAlarmSettings());
        root.addView(exact,new LinearLayout.LayoutParams(-1,-2));

        Button fullScreen=new Button(this);
        fullScreen.setText("EKRANI AÇMA İZNİNİ KONTROL ET");
        fullScreen.setOnClickListener(v->openFullScreenIntentSettings());
        root.addView(fullScreen,new LinearLayout.LayoutParams(-1,-2));

        Button battery=new Button(this);
        battery.setText("PİL KISITLAMASINI KONTROL ET");
        battery.setOnClickListener(v->{
            try{startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));}
            catch(Exception ignored){}
        });
        root.addView(battery,new LinearLayout.LayoutParams(-1,-2));

        Button test=new Button(this);
        test.setText("10 SANİYE SONRA EKRANI AÇ TESTİ");
        test.setOnClickListener(v->{
            AlarmScheduler.scheduleLocalTest(this,System.currentTimeMillis()+10000);
            toast("Test kuruldu. Şimdi ekranı kapatın; 10 saniye sonra sessiz uyarı ekranı açılmalı.");
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
                String token=Api.pair(c,Build.MANUFACTURER+" "+Build.MODEL);
                prefs().edit().putString("token",token).apply();
                runOnUiThread(()->{toast("Telefon bağlandı.");refreshStatus();startServiceNow();});
            }catch(Exception e){runOnUiThread(()->status.setText("Bağlantı hatası: "+e.getMessage()));}
        }).start();
    }

    private void refreshStatus(){
        String token=prefs().getString("token","");
        String permissionInfo="";
        if(Build.VERSION.SDK_INT>=34){
            try{
                NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
                permissionInfo=nm.canUseFullScreenIntent()?"\n✅ Ekranı açma izni açık":"\n❌ Ekranı açma izni kapalı — yukarıdaki izin düğmesine basın";
            }catch(Exception ignored){}
        }
        final String extra=permissionInfo;
        status.setText((token.isEmpty()?"Telefon henüz CRM'ye bağlı değil.":"Telefon CRM'ye bağlı. Sessiz uyarı servisi çalışacak.")+extra);
        if(!token.isEmpty())new Thread(()->{
            try{
                JSONObject p=Api.ping(token);
                runOnUiThread(()->status.setText("Bağlı — "+p.optString("label","Android Uyarı")+extra));
            }catch(Exception e){runOnUiThread(()->status.setText("Bağlantı kontrolü: "+e.getMessage()+extra));}
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
                NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
                if(nm.canUseFullScreenIntent()){
                    toast("Ekranı açma izni zaten açık.");
                    return;
                }
                Intent i=new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:"+getPackageName()));
                startActivity(i);
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
