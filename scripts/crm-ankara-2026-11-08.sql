-- One-time import, 2026-11-08. Only public business contact data. Idempotent: skip names already in CRM.

-- No existing customer data is overwritten or deleted.

-- Elif Oluklu is in Çorum, not Ankara.

INSERT INTO customers (company,contact_name,phone,email,region,sector,priority,stage,follow_date,city,district,neighborhood,record_status,special_notes,phones_json,emails_json,contacts_json,categories)
SELECT 'RONAPACK Ambalaj','','0312 475 18 58','info@ronapack.com','Ankara','Ambalaj,Oluklu Mukavva,Karton Kutu','NORMAL','Yeni Lead','','Ankara','Kahramankazan','Saray','Aktif','İletişim adresi (fatura adresi teyit edilmedi): Saray Mahallesi, Bekir Adıbelli Bulvarı, 12. Cadde No:15, Kahramankazan/Ankara. Karton kutu ve oluklu mukavva üretimi. Kaynak: https://www.ronapack.com/services/','["0312 475 18 58","0540 609 17 18"]','["info@ronapack.com"]','[]','Ambalaj,Oluklu Mukavva,Karton Kutu'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE (company LIKE '%ronapack%'));

INSERT INTO customers (company,contact_name,phone,email,region,sector,priority,stage,follow_date,city,district,neighborhood,record_status,special_notes,phones_json,emails_json,contacts_json,categories)
SELECT 'AKON Kutu Ambalaj','','0534 734 44 72','','Ankara','Ambalaj,Karton Kutu','NORMAL','Yeni Lead','','Ankara','Kahramankazan','Saray','Aktif','İletişim adresi (fatura adresi teyit edilmedi): Saray Mahallesi, 614. Cadde No:43A, Kahramankazan/Ankara. Karton kutu ve ambalaj üreticisi. Kaynak: https://www.find.com.tr/Company/akonkutuambalajsanayiveticaretanonimsirketi','["0534 734 44 72"]','[]','[]','Ambalaj,Karton Kutu'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE (company LIKE '%akon kutu%' OR company LIKE '%akon ambalaj%'));

INSERT INTO customers (company,contact_name,phone,email,region,sector,priority,stage,follow_date,city,district,neighborhood,record_status,special_notes,phones_json,emails_json,contacts_json,categories)
SELECT 'Başkent Şimşek Ambalaj','','0536 253 85 25','info@baskentsimsekambalaj.com','Ankara','Ambalaj,Karton Kutu,Oluklu Mukavva','NORMAL','Yeni Lead','','Ankara','Yenimahalle','İvedik OSB','Aktif','İletişim adresi (fatura adresi teyit edilmedi): İvedik OSB, 1342. Sokak No:62, Yenimahalle/Ankara. Karton kutu ve oluklu mukavva ambalaj. Kaynak: https://www.find.com.tr/Company/hasansimsekbaskentsimsekambalaj','["0536 253 85 25","0539 654 05 99","0312 395 62 70"]','["info@baskentsimsekambalaj.com"]','[]','Ambalaj,Karton Kutu,Oluklu Mukavva'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE (company LIKE '%şimşek ambalaj%' OR company LIKE '%ŞİMŞEK AMBALAJ%' OR company LIKE '%simsek ambalaj%'));

INSERT INTO customers (company,contact_name,phone,email,region,sector,priority,stage,follow_date,city,district,neighborhood,record_status,special_notes,phones_json,emails_json,contacts_json,categories)
SELECT 'ES Oluklu Mukavva','','0312 394 45 38','info@esoluklu.com','Ankara','Ambalaj,Oluklu Mukavva,Karton Kutu','NORMAL','Yeni Lead','','Ankara','Kahramankazan','Saray','Aktif','İletişim adresi (fatura adresi teyit edilmedi): Saray Mahallesi, 675. Cadde No:8 A Blok, Kahramankazan/Ankara. İvedik OSB şubesi: 2266. Cadde No:38 Yenimahalle/Ankara. Oluklu mukavva ve karton koli üretimi. Kaynak: https://www.esoluklu.com/iletisim/','["0312 394 45 38"]','["info@esoluklu.com"]','[]','Ambalaj,Oluklu Mukavva,Karton Kutu'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE (company LIKE '%es oluklu%' OR company LIKE '%es ambalaj oluklu%'));

INSERT INTO customers (company,contact_name,phone,email,region,sector,priority,stage,follow_date,city,district,neighborhood,record_status,special_notes,phones_json,emails_json,contacts_json,categories)
SELECT 'Esmer Kutu (Oluklu Mukavva)','','0312 999 86 09','esmerkutu@gmail.com','Ankara','Ambalaj,Oluklu Mukavva,Karton Kutu','NORMAL','Yeni Lead','','Ankara','Yenimahalle','İvedik OSB','Aktif','İletişim adresi (fatura adresi teyit edilmedi): İvedik OSB Mahallesi, 1548. Cadde No:33, Yenimahalle/Ankara. Kullanıcının ''Esmer Oluklu'' olarak belirttiği firma: Esmer Kutu ve Ambalaj. Oluklu mukavva, koli ve kalıp kesim kutu imalatı. Kaynak: https://www.esmerkutu.com/','["0312 999 86 09","0533 294 28 49","0542 237 12 34"]','["esmerkutu@gmail.com"]','[]','Ambalaj,Oluklu Mukavva,Karton Kutu'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE (company LIKE '%esmer kutu%' OR company LIKE '%esmer oluklu%'));

INSERT INTO customers (company,contact_name,phone,email,region,sector,priority,stage,follow_date,city,district,neighborhood,record_status,special_notes,phones_json,emails_json,contacts_json,categories)
SELECT 'Elif Oluklu Mukavva','','0533 205 80 14','info@elifoluklu.com.tr','Çorum','Ambalaj,Oluklu Mukavva,Karton Kutu','NORMAL','Yeni Lead','','Çorum','Merkez','','Aktif','İletişim adresi (fatura adresi teyit edilmedi): Cemilbey Yolu 5. km, Merkez/Çorum. DİKKAT: Ankara değil, Çorum''da. Kullanıcının Ankara listesinde adı geçmesine rağmen doğru il Çorum olarak kaydedildi. Kaynak: https://www.omko.org.tr/omkouygulama/?dil=tr&sayfa=-26574 ; https://www.sanayiden.com/?magaza=11808','["0533 205 80 14"]','["info@elifoluklu.com.tr"]','[]','Ambalaj,Oluklu Mukavva,Karton Kutu'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE (company LIKE '%elif oluklu%'));
