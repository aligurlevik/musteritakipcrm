package com.musteritakipcrm.alarm;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

final class Api {
    static final String BASE = "https://musteri-takip-crm.musteritakipcrm.workers.dev";

    static final class Reminder {
        final int id;
        final String remindAt;
        final long when;
        final String title;
        final String body;
        Reminder(int id,String remindAt,long when,String title,String body){
            this.id=id;this.remindAt=remindAt;this.when=when;this.title=title;this.body=body;
        }
        String key(){return id+"|"+remindAt;}
    }

    static String pair(String code,String label) throws Exception {
        JSONObject body=new JSONObject().put("code",code).put("label",label);
        JSONObject out=request("POST","/api/native-alarm/pair","",body);
        return out.getString("token");
    }

    static List<Reminder> reminders(String token) throws Exception {
        JSONObject out=request("GET","/api/native-alarm/reminders",token,null);
        JSONArray list=out.optJSONArray("reminders");
        List<Reminder> result=new ArrayList<>();
        if(list==null)return result;
        for(int i=0;i<list.length();i++){
            JSONObject r=list.getJSONObject(i);
            result.add(new Reminder(r.getInt("id"),r.getString("remind_at"),r.getLong("when"),
                    r.optString("title","CRM Alarm"),r.optString("body","Hatırlatma zamanı geldi.")));
        }
        return result;
    }

    static void ack(String token,int id,String remindAt) throws Exception {
        request("POST","/api/native-alarm/ack",token,new JSONObject().put("id",id).put("remind_at",remindAt));
    }

    static JSONObject ping(String token) throws Exception {
        return request("GET","/api/native-alarm/ping",token,null);
    }

    private static JSONObject request(String method,String path,String token,JSONObject body) throws Exception {
        HttpURLConnection c=(HttpURLConnection)new URL(BASE+path).openConnection();
        c.setConnectTimeout(12000);
        c.setReadTimeout(12000);
        c.setRequestMethod(method);
        c.setRequestProperty("Accept","application/json");
        if(token!=null&&!token.isEmpty())c.setRequestProperty("Authorization","Bearer "+token);
        if(body!=null){
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type","application/json; charset=utf-8");
            try(OutputStream os=c.getOutputStream()){os.write(body.toString().getBytes(StandardCharsets.UTF_8));}
        }
        int status=c.getResponseCode();
        InputStream in=status>=200&&status<300?c.getInputStream():c.getErrorStream();
        String text=read(in);
        JSONObject out=text.isEmpty()?new JSONObject():new JSONObject(text);
        if(status<200||status>=300)throw new IOException(out.optString("error","Sunucu hatası: "+status));
        return out;
    }

    private static String read(InputStream in) throws IOException {
        if(in==null)return "";
        try(BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8))){
            StringBuilder b=new StringBuilder();
            String line;
            while((line=r.readLine())!=null)b.append(line);
            return b.toString();
        }
    }
}
