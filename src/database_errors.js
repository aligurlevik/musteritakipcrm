export function databaseFailure(error){
  const detail=String(error?.cause?.message||error?.message||error);
  const quota=/exceeded.*(?:daily|row read|row write)|daily.*limit/i.test(detail);
  return new Response(JSON.stringify({error:quota?'Veritabanı günlük kullanım kotası doldu. Şifreniz kontrol edilemiyor. Ücretli plan etkinleşince veya kota yenilenince tekrar deneyin.':'Sunucuya erişilemiyor. Lütfen biraz sonra tekrar deneyin.',code:quota?'D1_DAILY_LIMIT':'DATABASE_UNAVAILABLE'}),{status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
