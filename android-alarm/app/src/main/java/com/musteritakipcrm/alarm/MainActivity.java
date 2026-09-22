package com.musteritakipcrm.alarm;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.net.Uri;
import android.media.Ringtone;
import android.media.RingtoneManager;
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
    private static final int REQ_RINGTONE=41;
    private TextView status;
    private TextView soundStatus;
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

    private View buildUi(){
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(32,48,32,32);
        root.setGravity(Gravity.CENTER_HORIZONTAL);

        TextView title=new TextView(this);
        title.setText("CRM GERÇEK ALARM");
        title.setTextSize(24);
        title.setTypeface(null,Typeface.BOLD);
        root.addView(title,new LinearLayout.LayoutParams(-1,-2));

        TextView info=new TextView(this);
        info.setText("\nTarayıcı kapalı olsa bile CRM alarmlarını telefonun ALARM ses kanalıyla çalar.\n");
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
        exact.setText("TAM SAATLİ ALARMA İZİN VER");
        exact.setOnClickListener(v->openExactAlarmSettings());
        root.addView(exact,new LinearLayout.LayoutParams(-1,-2));

        Button battery=new Button(this);
        battery.setText("PİL KISITLAMASINI KONTROL ET");
        battery.setOnClickListener(v->{
            try{startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));}
            catch(Exception ignored){}
        });
        root.addView(battery,new LinearLayout.LayoutParams(-1,-2));

        Button sound=new Button(this);
        sound.setText("🔊 ALARM SESİNİ SEÇ");
        sound.setTextSize(18);
        sound.setOnClickListener(v->openSoundPicker());
        root.addView(sound,new LinearLayout.LayoutParams(-1,-2));

        soundStatus=new TextView(this);
        soundStatus.setTextSize(15);
        soundStatus.setPadding(0,6,0,10);
        root.addView(soundStatus,new LinearLayout.LayoutParams(-1,-2));
        refreshSoundName();

        Button stop=new Button(this);
        stop.setText("🛑 ALARM SESİNİ DURDUR");
        stop.setTextSize(20);
        stop.setOnClickListener(v->{
            Intent i=new Intent(this,AlarmRingingService.class).setAction("STOP");
            if(Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);
            toast("Alarm durduruldu.");
        });
        root.addView(stop,new LinearLayout.LayoutParams(-1,-2));

        Button test=new Button(this);
        test.setText("10 SANİYE SONRAYA TEST ALARMI");
        test.setOnClickListener(v->AlarmScheduler.scheduleLocalTest(this,System.currentTimeMillis()+10000));
        root.addView(test,new LinearLayout.LayoutParams(-1,-2));

        status=new TextView(this);
        status.setTextSize(16);
        status.setPadding(0,24,0,0);
        root.addView(status,new LinearLayout.LayoutParams(-1,-2));
        return root;
    }

    private android.content.SharedPreferences prefs(){
        return getSharedPreferences(PREF,MODE_PRIVATE);
    }

    private void pair(){
        String c=code.getText().toString().trim();
        if(!c.matches("\\d{6}")){toast("6 haneli kodu girin.");return;}
        status.setText("Bağlanıyor…");
        new Thread(()->{
            try{
                String token=Api.pair(c,Build.MANUFACTURER+" "+Build.MODEL);
                prefs().edit().putString("token",token).apply();
                runOnUiThread(()->{toast("Telefon bağlandı.");refreshStatus();startServiceNow();});
            }catch(Exception e){
                runOnUiThread(()->status.setText("Bağlantı hatası: "+e.getMessage()));
            }
        }).start();
    }

    private void refreshStatus(){
        String token=prefs().getString("token","");
        status.setText(token.isEmpty()?"❌ Telefon henüz CRM'ye bağlı değil.":"✅ Telefon CRM'ye bağlı. Alarm servisi çalışacak.");
        if(!token.isEmpty())new Thread(()->{
            try{
                JSONObject p=Api.ping(token);
                runOnUiThread(()->status.setText("✅ Bağlı — "+p.optString("label","Android Alarm")));
            }catch(Exception e){
                runOnUiThread(()->status.setText("⚠️ Bağlantı kontrolü: "+e.getMessage()));
            }
        }).start();
    }

    private void openSoundPicker(){
        Uri saved=null;
        String raw=prefs().getString("alarm_uri","");
        if(!raw.isEmpty())try{saved=Uri.parse(raw);}catch(Exception ignored){}
        Intent picker=new Intent(RingtoneManager.ACTION_RINGTONE_PICKER);
        picker.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE,RingtoneManager.TYPE_ALARM);
        picker.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT,true);
        picker.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT,false);
        picker.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI,
                saved!=null?saved:RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));
        startActivityForResult(picker,REQ_RINGTONE);
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode!=REQ_RINGTONE||resultCode!=RESULT_OK||data==null)return;
        Uri picked=data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI);
        if(picked==null){toast("Ses seçilmedi.");return;}
        prefs().edit().putString("alarm_uri",picked.toString()).apply();
        refreshSoundName();
        toast("Alarm sesi kaydedildi.");
    }

    private void refreshSoundName(){
        if(soundStatus==null)return;
        String raw=prefs().getString("alarm_uri","");
        Uri uri;
        try{uri=raw.isEmpty()?RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM):Uri.parse(raw);}
        catch(Exception e){uri=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);}
        String name="Varsayılan alarm sesi";
        try{
            Ringtone ringtone=RingtoneManager.getRingtone(this,uri);
            if(ringtone!=null)name=ringtone.getTitle(this);
        }catch(Exception ignored){}
        soundStatus.setText("Seçili ses: "+name);
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
                try{
                    startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));
                }catch(Exception e){
                    startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())));
                }
                return;
            }
        }
        toast("Tam saatli alarm izni açık.");
    }

    private void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
}
