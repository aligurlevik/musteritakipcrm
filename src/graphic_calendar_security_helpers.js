export function redactGraphicRevenue(value){
  const redact=row=>{if(!row||typeof row!=='object')return row;const copy={...row};delete copy.price;delete copy.revenue;delete copy.total;delete copy.revenue_total;return copy};
  return Array.isArray(value)?value.map(redact):redact(value);
}

export function addGraphicCalendarPatch(html,patch){
  if(html.includes('data-graphic-monthly-calendar-v2'))return html;
  return html.replace(/<\/body>/i,patch+'\n</body>');
}
