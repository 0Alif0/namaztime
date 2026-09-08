const EVENTS = new Map([
  ['1-1', 'Islamic New Year'],
  ['1-10', 'Ashura'],
  ['3-12', 'Mawlid an-Nabi'],
  ['7-27', 'Shab-e-Meraj'],
  ['8-15', 'Shab-e-Barat'],
  ['9-1', '1st Day of Ramadan'],
  ['9-27', 'Shab-e-Qadr'],
  ['10-1', 'Eid al-Fitr'],
  ['12-9', 'Day of Arafah'],
  ['12-10', 'Eid al-Adha']
]);

const MONTHS = [
  'Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Awwal','Jumada al-Thani',
  'Rajab', 'Sha’ban', 'Ramadan', 'Shawwal', 'Dhul-Qa’dah', 'Dhul-Hijjah'
];

export function getHijri(date, timezone) {
  const fmt = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
    timeZone: timezone, day: 'numeric', month: 'numeric', year: 'numeric'
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const day = Number(parts.day), month = Number(parts.month), year = Number(parts.year);
  return { day, month, year, label: `${day} ${MONTHS[month - 1] || `Month ${month}`} ${year} AH` };
}

export function getSpecialEvent(hijri) {
  return EVENTS.get(`${hijri.month}-${hijri.day}`) || '';
}
