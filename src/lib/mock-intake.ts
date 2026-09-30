export type Turn = { who: "line" | "caller"; text: string };

export type Call = {
  id: string;
  caller: string;
  phone: string;
  borough: string;
  district: string;
  category: string;
  urgency: "low" | "medium" | "high";
  receivedAt: string;
  duration: string;
  voiceId: string;
  lang: string;
  transcript: Turn[];
};

export type Sms = {
  id: string;
  phone: string;
  borough: string;
  district: string;
  category: string;
  urgency: "low" | "medium" | "high";
  messages: { from: "resident" | "line"; text: string; at: string }[];
};

// Open Line's own voice for prompts
export const LINE_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah

export const calls: Call[] = [
  {
    id: "C-1042",
    caller: "Resident (anonymous)",
    phone: "(718) 555-0142",
    borough: "Brooklyn",
    district: "BK CB 3",
    category: "Housing — no heat",
    urgency: "high",
    receivedAt: "Today 7:12 AM",
    duration: "1:04",
    voiceId: "JBFqnCBsd6RMkjVDRZzb", // George
    lang: "EN",
    transcript: [
      { who: "line", text: "You've reached Open Line NYC. Tell us what's going on and where." },
      { who: "caller", text: "Hi, yeah. I'm on Gates Avenue near Marcy. We haven't had heat in the building for three days now. There's a baby on the fourth floor and it's freezing." },
      { who: "line", text: "Thank you. Have you reported this to the landlord or to 311?" },
      { who: "caller", text: "The super says the boiler's broken and they're waiting on a part. I called 311 once but nothing happened." },
    ],
  },
  {
    id: "C-1043",
    caller: "Marisol R.",
    phone: "(347) 555-0198",
    borough: "Bronx",
    district: "BX CB 4",
    category: "Street safety — broken signal",
    urgency: "medium",
    receivedAt: "Today 8:40 AM",
    duration: "0:48",
    voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica
    lang: "EN",
    transcript: [
      { who: "line", text: "You've reached Open Line NYC. Tell us what's going on and where." },
      { who: "caller", text: "The walk signal at Grand Concourse and 167th has been out all week. Kids from the school cross there every morning and cars just don't stop." },
      { who: "line", text: "Got it. We'll attach this to the existing reports for that intersection." },
    ],
  },
  {
    id: "C-1044",
    caller: "Resident (anonymous)",
    phone: "(929) 555-0107",
    borough: "Queens",
    district: "QN CB 3",
    category: "Sanitation — missed pickup",
    urgency: "low",
    receivedAt: "Today 10:05 AM",
    duration: "0:39",
    voiceId: "nPczCjzI2devNBz1zQrb", // Brian
    lang: "ES",
    transcript: [
      { who: "line", text: "Hola, ha llamado a Open Line NYC. Cuéntenos qué pasa y dónde." },
      { who: "caller", text: "Hola. En la calle noventa y cinco en Jackson Heights no han recogido la basura en dos semanas. Hay ratas por todas partes." },
      { who: "line", text: "Gracias. Lo enviaremos a su junta comunitaria hoy." },
    ],
  },
  {
    id: "C-1045",
    caller: "Dev P.",
    phone: "(646) 555-0163",
    borough: "Manhattan",
    district: "MN CB 11",
    category: "Parks — unsafe playground",
    urgency: "medium",
    receivedAt: "Today 12:31 PM",
    duration: "0:52",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ", // Liam
    lang: "EN",
    transcript: [
      { who: "line", text: "You've reached Open Line NYC. Tell us what's going on and where." },
      { who: "caller", text: "At the playground in Thomas Jefferson Park, the slide has a big crack with sharp metal sticking out. Somebody's kid is going to get hurt." },
    ],
  },
];

export const sms: Sms[] = [
  {
    id: "S-2201",
    phone: "(917) 555-0121",
    borough: "Manhattan",
    district: "MN CB 3",
    category: "Noise — construction after hours",
    urgency: "low",
    messages: [
      { from: "resident", text: "Construction on Delancey + Clinton going past 11pm again. Jackhammers.", at: "11:14 PM" },
      { from: "line", text: "Open Line NYC: Thanks. Logged as #S-2201 for MN CB 3. Reply PHOTO to add a picture, STOP to opt out.", at: "11:14 PM" },
      { from: "resident", text: "PHOTO", at: "11:16 PM" },
      { from: "line", text: "Got it — photo attached. We'll text you when the board responds.", at: "11:16 PM" },
    ],
  },
  {
    id: "S-2202",
    phone: "(718) 555-0176",
    borough: "Staten Island",
    district: "SI CB 1",
    category: "Transit — bus stop shelter",
    urgency: "low",
    messages: [
      { from: "resident", text: "bus shelter on victory blvd by the college glass smashed, been 2 weeks", at: "9:02 AM" },
      { from: "line", text: "Open Line NYC: Thanks. Which side of Victory Blvd — eastbound or westbound?", at: "9:02 AM" },
      { from: "resident", text: "westbound", at: "9:05 AM" },
      { from: "line", text: "Logged as #S-2202 for SI CB 1. 3 neighbors reported this too.", at: "9:05 AM" },
    ],
  },
  {
    id: "S-2203",
    phone: "(347) 555-0110",
    borough: "Brooklyn",
    district: "BK CB 16",
    category: "Housing — mold / leak",
    urgency: "high",
    messages: [
      { from: "resident", text: "Ceiling leaking into my kids room, black mold on walls. Landlord ignores me. Brownsville, Livonia Ave.", at: "6:48 PM" },
      { from: "line", text: "Open Line NYC: We're sorry. Logged as #S-2203 (high priority). Want info on free tenant legal help? Reply YES.", at: "6:48 PM" },
      { from: "resident", text: "YES", at: "6:50 PM" },
      { from: "line", text: "Tenant Helpline: 311 → 'Tenant Helpline', or call Housing Court Answers (212) 962-4795.", at: "6:50 PM" },
    ],
  },
];
