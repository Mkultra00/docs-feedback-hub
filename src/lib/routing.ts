export type RouteStep = { title: string; detail: string };

const DEPTS: [RegExp, string, string][] = [
  [/heat|hot water|boiler|housing/i, "Dept. of Housing Preservation & Development (HPD)", "HPD sends an inspector; landlord gets a violation notice and a repair deadline."],
  [/mold|leak|ceiling/i, "Dept. of Housing Preservation & Development (HPD)", "HPD schedules an inspection; mold and leaks are class-B/C violations with repair deadlines."],
  [/signal|crosswalk|traffic|street|pothole/i, "Dept. of Transportation (DOT)", "DOT's borough engineering unit reviews signal timing and crossing safety at the location."],
  [/trash|garbage|pickup|rat|sanitation/i, "Dept. of Sanitation (DSNY)", "DSNY district garage logs the missed pickup and dispatches a collection crew."],
  [/noise|jackhammer|construction/i, "Dept. of Environmental Protection (DEP)", "DEP's noise unit checks after-hours construction permits for the site."],
  [/playground|park|slide/i, "Dept. of Parks & Recreation", "Parks sends a maintenance crew to inspect and cordon off unsafe equipment."],
];

const OFFICIALS: Record<string, { bp: string; council: string }> = {
  Brooklyn: { bp: "Brooklyn Borough President's office", council: "City Council Member for the district" },
  Bronx: { bp: "Bronx Borough President's office", council: "City Council Member for the district" },
  Queens: { bp: "Queens Borough President's office", council: "City Council Member for the district" },
  Manhattan: { bp: "Manhattan Borough President's office", council: "City Council Member for the district" },
  "Staten Island": { bp: "Staten Island Borough President's office", council: "City Council Member for the district" },
};

export function routeFor(input: { category: string; borough: string; district?: string }): RouteStep[] {
  const [, dept, deptDetail] = DEPTS.find(([re]) => re.test(input.category)) ?? [
    null,
    "311 service desk",
    "Logged with 311 and assigned to the responsible agency.",
  ];
  const officials = OFFICIALS[input.borough] ?? OFFICIALS["Brooklyn"]!;
  const cb = input.district && /CB/.test(input.district) ? input.district : `${input.borough} Community Board (district matched from the address)`;

  return [
    { title: "Report classified", detail: `Read as "${input.category}" and time-stamped on arrival.` },
    { title: `Routed to ${dept}`, detail: deptDetail },
    { title: `Flagged to ${officials.bp}`, detail: "The Borough President's office sees a rollup of open issues in the borough and can escalate chronic problems." },
    { title: `Copied to the ${officials.council}`, detail: "The Council office tracks constituent cases in the district and can press the agency for a timeline." },
    { title: `Filed with ${cb}`, detail: "Lands on the Community Board's review list with location, category, and how many neighbors reported the same spot." },
    { title: "Resident kept in the loop", detail: "The resident gets a tracking ID and a text when the agency or board responds." },
  ];
}
