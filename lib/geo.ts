import type { JobGeo, UserLocation } from "./types";

// code | name | region | eu | aliases (;) | cities (;)
const RAW = `
NG|Nigeria|Africa|0||lagos;abuja;port harcourt;ibadan;kano;enugu;benin city
GH|Ghana|Africa|0||accra;kumasi
KE|Kenya|Africa|0||nairobi;mombasa
ZA|South Africa|Africa|0|rsa|johannesburg;cape town;pretoria;durban
EG|Egypt|Africa|0||cairo;alexandria
MA|Morocco|Africa|0||casablanca;rabat
TZ|Tanzania|Africa|0||dar es salaam
UG|Uganda|Africa|0||kampala
ET|Ethiopia|Africa|0||addis ababa
RW|Rwanda|Africa|0||kigali
SN|Senegal|Africa|0||dakar
CI|Ivory Coast|Africa|0|côte d'ivoire;cote d'ivoire|abidjan
DZ|Algeria|Africa|0||algiers
TN|Tunisia|Africa|0||tunis
ZW|Zimbabwe|Africa|0||harare
ZM|Zambia|Africa|0||lusaka
CM|Cameroon|Africa|0||douala;yaounde
MU|Mauritius|Africa|0||port louis
GB|United Kingdom|Europe|0|uk;u.k.;england;scotland;wales;great britain;britain;northern ireland|london;manchester;birmingham;edinburgh;bristol;leeds;glasgow;liverpool;cambridge
IE|Ireland|Europe|1||dublin;cork;galway
DE|Germany|Europe|1|deutschland|berlin;munich;münchen;hamburg;frankfurt;cologne;köln;stuttgart;düsseldorf;leipzig;dresden;hannover;nuremberg
FR|France|Europe|1||paris;lyon;marseille;toulouse;nantes;bordeaux;lille
ES|Spain|Europe|1||madrid;barcelona;valencia;seville
PT|Portugal|Europe|1||lisbon;porto
IT|Italy|Europe|1||milan;rome;turin;bologna
NL|Netherlands|Europe|1|holland|amsterdam;rotterdam;utrecht;eindhoven;the hague
BE|Belgium|Europe|1||brussels;antwerp
CH|Switzerland|Europe|0||zurich;geneva;basel;bern
AT|Austria|Europe|1||vienna;wien;graz
SE|Sweden|Europe|1||stockholm;gothenburg;malmö
NO|Norway|Europe|0||oslo;bergen
DK|Denmark|Europe|1||copenhagen;aarhus
FI|Finland|Europe|1||helsinki;espoo
PL|Poland|Europe|1||warsaw;krakow;wroclaw;gdansk
CZ|Czechia|Europe|1|czech republic|prague;brno
RO|Romania|Europe|1||bucharest;cluj
BG|Bulgaria|Europe|1||sofia;plovdiv
GR|Greece|Europe|1||athens;thessaloniki
HU|Hungary|Europe|1||budapest
HR|Croatia|Europe|1||zagreb
EE|Estonia|Europe|1||tallinn
LV|Latvia|Europe|1||riga
LT|Lithuania|Europe|1||vilnius
UA|Ukraine|Europe|0||kyiv;kiev;lviv
RS|Serbia|Europe|0||belgrade
TR|Turkey|Europe|0|türkiye;turkiye|istanbul;ankara
LU|Luxembourg|Europe|1||
MT|Malta|Europe|1||
CY|Cyprus|Europe|1||nicosia
SK|Slovakia|Europe|1||bratislava
SI|Slovenia|Europe|1||ljubljana
US|United States|North America|0|usa;u.s.;u.s.a.;united states of america;america|new york;san francisco;los angeles;chicago;seattle;austin;boston;denver;atlanta;miami;dallas;houston;washington dc
CA|Canada|North America|0||toronto;vancouver;montreal;ottawa;calgary
MX|Mexico|North America|0||mexico city;guadalajara;monterrey
BR|Brazil|LATAM|0|brasil|sao paulo;são paulo;rio de janeiro
AR|Argentina|LATAM|0||buenos aires
CO|Colombia|LATAM|0||bogota;bogotá;medellin
CL|Chile|LATAM|0||santiago
PE|Peru|LATAM|0||lima
CR|Costa Rica|LATAM|0||san jose
UY|Uruguay|LATAM|0||montevideo
EC|Ecuador|LATAM|0||quito
DO|Dominican Republic|LATAM|0||santo domingo
PA|Panama|LATAM|0||
IN|India|Asia|0||bangalore;bengaluru;mumbai;delhi;hyderabad;pune;chennai;kolkata;gurgaon;noida
PK|Pakistan|Asia|0||karachi;lahore;islamabad
BD|Bangladesh|Asia|0||dhaka
LK|Sri Lanka|Asia|0||colombo
PH|Philippines|Asia|0||manila;cebu
ID|Indonesia|Asia|0||jakarta;bali
VN|Vietnam|Asia|0||hanoi;ho chi minh
TH|Thailand|Asia|0||bangkok
MY|Malaysia|Asia|0||kuala lumpur
SG|Singapore|Asia|0||
JP|Japan|Asia|0||tokyo;osaka
KR|South Korea|Asia|0|korea|seoul
CN|China|Asia|0||beijing;shanghai;shenzhen
HK|Hong Kong|Asia|0||
TW|Taiwan|Asia|0||taipei
NP|Nepal|Asia|0||kathmandu
AE|United Arab Emirates|Middle East|0|uae|dubai;abu dhabi
SA|Saudi Arabia|Middle East|0|ksa|riyadh;jeddah
IL|Israel|Middle East|0||tel aviv;jerusalem
QA|Qatar|Middle East|0||doha
JO|Jordan|Middle East|0||amman
KW|Kuwait|Middle East|0||
AU|Australia|Oceania|0||sydney;melbourne;brisbane;perth
NZ|New Zealand|Oceania|0||auckland;wellington
`;

export type Country = { code: string; name: string; region: string; eu: boolean; names: string[]; cities: string[] };

export const COUNTRIES: Country[] = RAW.trim()
  .split("\n")
  .map((line) => {
    const [code, name, region, eu, aliases, cities] = line.split("|");
    const split = (s: string) => (s ? s.split(";").filter(Boolean) : []);
    return { code, name, region, eu: eu === "1", names: [name.toLowerCase(), ...split(aliases)], cities: split(cities) };
  });

export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code);
export const countryName = (code: string) => countryByCode(code)?.name ?? "";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const word = (terms: string[]) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.map((t) => esc(t.toLowerCase())).join("|")})(?![\\p{L}\\p{N}])`, "iu");

// Region keywords found in job location strings -> canonical region tags.
const REGION_WORDS: Record<string, string[]> = {
  europe: ["europe", "european"],
  eu: ["eu", "european union"],
  emea: ["emea"],
  africa: ["africa", "african"],
  apac: ["apac", "asia pacific", "asia-pacific"],
  asia: ["asia"],
  latam: ["latam", "latin america", "south america"],
  americas: ["americas", "north america", "namer", "us/canada", "us & canada"],
  "middle east": ["middle east", "mena"],
  oceania: ["oceania", "anz"],
};
const REGION_RES = Object.entries(REGION_WORDS).map(([tag, w]) => ({ tag, re: word(w) }));
const WORLDWIDE_RE = word(["worldwide", "anywhere", "global", "globally", "world", "international", "any location", "remote", "everywhere"]);
const COUNTRY_RES = COUNTRIES.map((c) => ({ c, re: word([...c.names, ...c.cities]) }));

/** Tags a region/country is covered by when a job says e.g. "Europe" or "EMEA". */
function userRegionTags(c: Country): string[] {
  const tags: Record<string, string[]> = {
    Africa: ["africa", "emea"],
    Europe: ["europe", "emea"],
    "North America": ["americas"],
    LATAM: ["latam", "americas"],
    Asia: ["asia", "apac"],
    "Middle East": ["middle east", "emea", "asia"],
    Oceania: ["oceania", "apac"],
  };
  return [...(tags[c.region] ?? []), ...(c.eu ? ["eu"] : [])];
}

/** Turns free text like "USA, Canada or UK only" / "Europe" / "Berlin" into structured geography. */
export function parseGeo(text: string, countryNames: string[] = []): JobGeo {
  const t = [text, ...countryNames].join(" , ");
  const countries = COUNTRY_RES.filter(({ re }) => re.test(t)).map(({ c }) => c.code);
  const regions = REGION_RES.filter(({ re }) => re.test(t)).map((r) => r.tag);
  const hasWorldword = WORLDWIDE_RE.test(text);
  const worldwide = !countries.length && !regions.length && (hasWorldword || !text.trim());
  return { worldwide, countries, regions };
}

export type LocClass = "local" | "remote" | "abroad";

/**
 * local  = in your country/city (on-site, or remote restricted to your country)
 * remote = remote and open to you (worldwide, or your region)
 * abroad = elsewhere
 */
export function classify(job: { remote: boolean; location: string; geo: JobGeo }, user: UserLocation): LocClass {
  const me = countryByCode(user.country);
  const city = user.city.trim().toLowerCase();
  if (!me && !city) return "remote";
  const g = job.geo;
  if (city && job.location.toLowerCase().includes(city)) return "local";
  if (me && g.countries.includes(me.code)) return "local";
  if (job.remote) {
    if (g.worldwide) return "remote";
    if (me && g.regions.some((r) => userRegionTags(me).includes(r))) return "remote";
    if (!g.countries.length && !g.regions.length) return "remote"; // remote, unrecognised text: give it the benefit of the doubt
  }
  return "abroad";
}

const TZ: Record<string, string> = {
  "Africa/Lagos": "NG", "Africa/Accra": "GH", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA", "Africa/Cairo": "EG",
  "Africa/Casablanca": "MA", "Africa/Dar_es_Salaam": "TZ", "Africa/Kampala": "UG", "Africa/Addis_Ababa": "ET", "Africa/Kigali": "RW",
  "Africa/Dakar": "SN", "Africa/Abidjan": "CI", "Africa/Algiers": "DZ", "Africa/Tunis": "TN", "Africa/Harare": "ZW", "Africa/Lusaka": "ZM",
  "Africa/Douala": "CM", "Indian/Mauritius": "MU",
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Madrid": "ES", "Europe/Lisbon": "PT",
  "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Zurich": "CH", "Europe/Vienna": "AT",
  "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI", "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ", "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Athens": "GR", "Europe/Budapest": "HU",
  "Europe/Zagreb": "HR", "Europe/Tallinn": "EE", "Europe/Riga": "LV", "Europe/Vilnius": "LT", "Europe/Kyiv": "UA", "Europe/Kiev": "UA",
  "Europe/Belgrade": "RS", "Europe/Istanbul": "TR", "Europe/Luxembourg": "LU", "Europe/Malta": "MT", "Asia/Nicosia": "CY",
  "Europe/Bratislava": "SK", "Europe/Ljubljana": "SI",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA", "America/Halifax": "CA",
  "America/Mexico_City": "MX", "America/Sao_Paulo": "BR", "America/Argentina/Buenos_Aires": "AR", "America/Bogota": "CO",
  "America/Santiago": "CL", "America/Lima": "PE", "America/Costa_Rica": "CR", "America/Montevideo": "UY", "America/Guayaquil": "EC",
  "America/Santo_Domingo": "DO", "America/Panama": "PA",
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Karachi": "PK", "Asia/Dhaka": "BD", "Asia/Colombo": "LK", "Asia/Manila": "PH",
  "Asia/Jakarta": "ID", "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN", "Asia/Bangkok": "TH", "Asia/Kuala_Lumpur": "MY",
  "Asia/Singapore": "SG", "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK", "Asia/Taipei": "TW",
  "Asia/Kathmandu": "NP", "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Jerusalem": "IL", "Asia/Tel_Aviv": "IL", "Asia/Qatar": "QA",
  "Asia/Amman": "JO", "Asia/Kuwait": "KW", "Pacific/Auckland": "NZ",
};

/** Best-effort country guess from the browser's timezone, then its language region. No network calls. */
export function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TZ[tz]) return TZ[tz];
    if (tz?.startsWith("America/")) return "US";
    if (tz?.startsWith("Australia/")) return "AU";
    const region = navigator.language?.split("-")[1]?.toUpperCase();
    if (region && countryByCode(region)) return region;
  } catch {}
  return "";
}
