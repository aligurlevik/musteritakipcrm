// Only archived manual agenda notes expire; active notes and CRM jobs survive.
export async function purgeArchivedNotes(env, now=Date.now()) {
  const columns=(await env.DB.prepare('PRAGMA table_info(agenda_entries)').all()).results||[];
  if(!columns.some(c=>c.name==='is_archived'))return;
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  const cutoff=new Date(day+'T12:00:00Z');
  cutoff.setUTCDate(cutoff.getUTCDate()-35);
  const date=cutoff.toISOString().slice(0,10);
  const where="COALESCE(source_type,'manual')='manual' AND is_archived=1 AND date(COALESCE(NULLIF(completed_date,''),entry_date)) < date(?)";
  const tables=(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agenda_voice_notes'").all()).results||[];
  const statements=[];
  if(tables.length)statements.push(env.DB.prepare(`DELETE FROM agenda_voice_notes WHERE agenda_id IN (SELECT id FROM agenda_entries WHERE ${where})`).bind(date));
  statements.push(env.DB.prepare(`DELETE FROM agenda_entries WHERE ${where}`).bind(date));
  if(env.DB.batch)return env.DB.batch(statements);
  for(const statement of statements)await statement.run();
}
