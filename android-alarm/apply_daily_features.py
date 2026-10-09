from pathlib import Path
p=Path('android-alarm/app/src/main/java/com/musteritakipcrm/alarm/MainActivity.java')
s=p.read_text(encoding='utf-8')
# BUGUN sekmesi: mevcut sayfalari bozmadan ust arac satirina ekle
old='body.addView(nav);LinearLayout tools=new LinearLayout(this);Button add=new Button(this);'
new='body.addView(nav);LinearLayout quick=new LinearLayout(this);Button todayBtn=new Button(this);todayBtn.setText("☀ BUGÜN");todayBtn.setTextSize(10);todayBtn.setOnClickListener(x->showToday());quick.addView(todayBtn,new LinearLayout.LayoutParams(0,-2,1));body.addView(quick);LinearLayout tools=new LinearLayout(this);Button add=new Button(this);'
s=s.replace(old,new)
# Kartta oncelik/bekleyen etiketi
old='LinearLayout mid=v();TextView title=t(titleOf(e.note),13,true);'
new='LinearLayout mid=v();String tag=statusTag(e);if(!tag.isEmpty()){TextView st=t(tag,9,true);mid.addView(st);}TextView title=t(titleOf(e.note),13,true);'
s=s.replace(old,new)
# Uc nokta menusune gunluk yasam komutlari
old='p.getMenu().add("🎨 Renk Değiştir");p.getMenu().add("📷 Resim Ekle / Değiştir");'
new='p.getMenu().add("🔴 Acil");p.getMenu().add("🟡 Önemli");p.getMenu().add("🟢 Normal");p.getMenu().add("⏳ Bekleyen");p.getMenu().add("➡ Yarına Aktar");p.getMenu().add("🎨 Renk Değiştir");p.getMenu().add("📷 Resim Ekle / Değiştir");'
s=s.replace(old,new)
old='else if(s.startsWith("🎨"))chooseColor(e);'
new='else if(s.startsWith("🔴")){setPriority(e,3);render(cache);}else if(s.startsWith("🟡")){setPriority(e,2);render(cache);}else if(s.startsWith("🟢")){setPriority(e,1);render(cache);}else if(s.startsWith("⏳")){toggleWaiting(e);render(cache);}else if(s.startsWith("➡"))moveTomorrow(e);else if(s.startsWith("🎨"))chooseColor(e);'
s=s.replace(old,new)
# Yardimci metotlar: yerel durum + yarina tasima sunucuya update
anchor=' private String photoKey(Api.Entry e)'
helper=''' private int priority(Api.Entry e){return getSharedPreferences(PREF,MODE_PRIVATE).getInt("prio_"+e.id,1);}private void setPriority(Api.Entry e,int v){getSharedPreferences(PREF,MODE_PRIVATE).edit().putInt("prio_"+e.id,v).apply();}private boolean waiting(Api.Entry e){return getSharedPreferences(PREF,MODE_PRIVATE).getBoolean("wait_"+e.id,false);}private void toggleWaiting(Api.Entry e){getSharedPreferences(PREF,MODE_PRIVATE).edit().putBoolean("wait_"+e.id,!waiting(e)).apply();}private String statusTag(Api.Entry e){String x=priority(e)==3?"🔴 ACİL":priority(e)==2?"🟡 ÖNEMLİ":"🟢 NORMAL";return waiting(e)?x+"   ⏳ BEKLEYEN":x;}private String tomorrow(){Calendar c=Calendar.getInstance();c.add(Calendar.DAY_OF_MONTH,1);return fmt(c,"yyyy-MM-dd");}private void moveTomorrow(Api.Entry e){String d=tomorrow(),r="";if(e.remindAt!=null&&!e.remindAt.trim().isEmpty())r=d+" "+timeOnly(e.remindAt);update(e.id,d,e.note,r);show("Yarına aktarıldı.");}private void showToday(){if(list==null)return;list.removeAllViews();List<Api.Entry>x=new ArrayList<>();for(Api.Entry e:cache)if(e.date.equals(today())&&!e.archived()&&(cat(e)!=3||n3Unlocked))x.add(e);Collections.sort(x,(a,b)->{int c=Integer.compare(priority(b),priority(a));if(c!=0)return c;if(waiting(a)!=waiting(b))return waiting(a)?1:-1;boolean aa=a.remindAt==null||a.remindAt.isEmpty(),bb=b.remindAt==null||b.remindAt.isEmpty();if(aa!=bb)return aa?-1:1;return aa?Integer.compare(b.id,a.id):a.remindAt.compareTo(b.remindAt);});int n=0;for(Api.Entry e:x)list.addView(entryRow(e,++n),rowParams());if(n==0)list.addView(t("Bugün için kayıt yok.",12,false));} 
'''
s=s.replace(anchor,helper+anchor)
p.write_text(s,encoding='utf-8')
print('AJANDAM daily features applied')
