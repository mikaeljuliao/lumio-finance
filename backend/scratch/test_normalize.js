function normalizeWhatsAppId(jidOrPhone) {
  if (!jidOrPhone) return null;
  const str = String(jidOrPhone).trim();

  if (str.includes('@g.us')) return null;

  let digits = str.split('@')[0].replace(/\D/g, '');
  if (!digits || digits.length < 8) return null;

  if (digits.length === 10 || digits.length === 11) {
    if (!digits.startsWith('55')) {
      digits = '55' + digits;
    }
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const num = digits.slice(4);
    // Some landlines might be 12 digits (starting with 2, 3, 4, 5).
    // WhatsApp cellphones start with 6, 7, 8, 9.
    // Let's only inject 9 if it looks like a cell phone without the 9th digit.
    if (num[0] >= '6' && num[0] <= '9') {
      digits = `55${ddd}9${num}`;
    }
  }

  return digits;
}

const cases = [
  '85986066467', // 11 digits
  '8586066467',  // 10 digits
  '5585986066467@s.whatsapp.net', // 13 digits JID
  '558586066467@s.whatsapp.net',  // 12 digits JID
  '551199999999', // 12 digits
  '5511999999999', // 13 digits
  '351912345678', // Portugal
];

cases.forEach(c => console.log(c, '->', normalizeWhatsAppId(c)));
