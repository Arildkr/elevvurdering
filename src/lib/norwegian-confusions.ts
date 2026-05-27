/**
 * Kjente ord dyslektiske elever eller elever med dialektbakgrunn
 * skriver feil i norsk bokmål/nynorsk.
 *
 * Brukes av stavekontroll-API (server) og lesehjelp (klient).
 */
export interface Confusion {
  standard: string; // korrekt form
  rule: string;     // regeltype for gruppering i lesehjelp
}

export const KNOWN_CONFUSIONS: Record<string, Confusion> = {
  // --- gj/j-forveksling ---
  jore:        { standard: "gjorde",               rule: "gj/j" },
  jort:        { standard: "gjort",                rule: "gj/j" },
  jøre:        { standard: "gjøre/kjøre",          rule: "gj/j" },
  jøres:       { standard: "gjøres",               rule: "gj/j" },
  jerne:       { standard: "gjerne/kjerne/hjerne", rule: "gj/j" },
  jennom:      { standard: "gjennom",              rule: "gj/j" },
  jentom:      { standard: "gjennom",              rule: "gj/j" },
  jelder:      { standard: "gjelder",              rule: "gj/j" },
  jelde:       { standard: "gjelde",               rule: "gj/j" },
  jeldt:       { standard: "gjeldt",               rule: "gj/j" },
  jest:        { standard: "gjest",                rule: "gj/j" },
  jemme:       { standard: "gjemme",               rule: "gj/j" },
  jerde:       { standard: "gjerde",               rule: "gj/j" },
  jøk:         { standard: "gjøk",                 rule: "gj/j" },
  jennomsnitt: { standard: "gjennomsnitt",         rule: "gj/j" },

  // --- kj/j-forveksling ---
  jøkken:      { standard: "kjøkken",              rule: "kj/j" },
  jøtt:        { standard: "kjøtt",                rule: "kj/j" },
  jærleighet:  { standard: "kjærlighet",           rule: "kj/j" },
  jærlighet:   { standard: "kjærlighet",           rule: "kj/j" },
  jenne:       { standard: "kjenne",               rule: "kj/j" },
  jent:        { standard: "kjent",                rule: "kj/j" },
  jøp:         { standard: "kjøp",                 rule: "kj/j" },
  jøpe:        { standard: "kjøpe",                rule: "kj/j" },
  jørt:        { standard: "kjørt",                rule: "kj/j" },
  jøl:         { standard: "kjøl",                 rule: "kj/j" },
  jønn:        { standard: "kjønn",                rule: "kj/j" },
  jemi:        { standard: "kjemi",                rule: "kj/j" },
  jedelig:     { standard: "kjedelig",             rule: "kj/j" },
  jede:        { standard: "kjede",                rule: "kj/j" },

  // --- hj/j-forveksling ---
  jem:         { standard: "hjem",                 rule: "hj/j" },
  jerte:       { standard: "hjerte",               rule: "hj/j" },
  jelp:        { standard: "hjelp",                rule: "hj/j" },
  jelpe:       { standard: "hjelpe",               rule: "hj/j" },
  jemsted:     { standard: "hjemsted",             rule: "hj/j" },
  jemland:     { standard: "hjemland",             rule: "hj/j" },

  // --- hv/v-forveksling ---
  vor:         { standard: "hvor",                 rule: "hv/v" },
  vorfor:      { standard: "hvorfor",              rule: "hv/v" },
  vordan:      { standard: "hvordan",              rule: "hv/v" },
  vordant:     { standard: "hvordan",              rule: "hv/v" },
  vem:         { standard: "hvem",                 rule: "hv/v" },
  vilken:      { standard: "hvilken",              rule: "hv/v" },
  vilket:      { standard: "hvilket",              rule: "hv/v" },
  vile:        { standard: "hvile",                rule: "hv/v" },

  // --- skj/sj-forveksling ---
  sjønn:       { standard: "skjønn",               rule: "skj/sj" },
  sjul:        { standard: "skjul",                rule: "skj/sj" },
  sjule:       { standard: "skjule",               rule: "skj/sj" },
  sjære:       { standard: "skjære",               rule: "skj/sj" },
  sjema:       { standard: "skjema",               rule: "skj/sj" },
  sjell:       { standard: "skjell",               rule: "skj/sj" },
  sjerm:       { standard: "skjerm",               rule: "skj/sj" },
  sjorte:      { standard: "skjorte",              rule: "skj/sj" },
  sjebne:      { standard: "skjebne",              rule: "skj/sj" },

  // --- Feil suffikser ---
  // "gøyt" er et kjent eksempel: eleven legger til -t der det ikke skal være
  gøyt:        { standard: "gøy",                  rule: "stavemåte" },

  // --- Vanlige stavefeil ---
  // Ord som er genuint vanskelig å stave riktig
  desverre:    { standard: "dessverre",            rule: "stavemåte" },
  dessvere:    { standard: "dessverre",            rule: "stavemåte" },
  // Fonetisk skriving av faste uttrykk (typisk dysleksi)
  jaffal:      { standard: "i alle fall",          rule: "stavemåte" },
  jaffall:     { standard: "i alle fall",          rule: "stavemåte" },
  jahfall:     { standard: "i alle fall",          rule: "stavemåte" },

  // --- Sammenskriving (ord som feilaktig skrives i ett) ---
  // Kilde: Språkrådet, Korrekturavdelingen
  selvom:      { standard: "selv om",              rule: "sammenskriving" },
  ihvertfall:  { standard: "i hvert fall",         rule: "sammenskriving" },
  ihvertfal:   { standard: "i hvert fall",         rule: "sammenskriving" },
  hvertfall:   { standard: "i hvert fall",         rule: "sammenskriving" },
  tilsammen:   { standard: "til sammen",           rule: "sammenskriving" },
  istedenfor:  { standard: "i stedet for",         rule: "sammenskriving" },
  istad:       { standard: "i stad",               rule: "sammenskriving" },
  likegodt:    { standard: "like godt",            rule: "sammenskriving" },
  allikevell:  { standard: "allikevel",            rule: "stavemåte" },
  etterhvert:  { standard: "etter hvert",          rule: "sammenskriving" },
  idag:        { standard: "i dag",                rule: "sammenskriving" },
  imorgen:     { standard: "i morgen",             rule: "sammenskriving" },
  ikveld:      { standard: "i kveld",              rule: "sammenskriving" },
  utifra:      { standard: "ut ifra",              rule: "sammenskriving" },
  pågrunn:     { standard: "på grunn av",          rule: "sammenskriving" },

  // --- Spesifikke dokumenterte stavefeil ---
  // Kilde: Språkrådet, Korrekturavdelingen
  nyskjerrig:  { standard: "nysgjerrig",           rule: "stavemåte" },
  bilett:      { standard: "billett",              rule: "stavemåte" },

  // --- Dialektformer (brukes på tvers av norske dialekter) ---
  mista:       { standard: "mistet",               rule: "dialekt" },
  maste:       { standard: "mistet",               rule: "dialekt" },
  åsså:        { standard: "også",                 rule: "dialekt" },
  nokka:       { standard: "noe",                  rule: "dialekt" },
  noke:        { standard: "noe",                  rule: "dialekt" },
  noa:         { standard: "noe",                  rule: "dialekt" },
  ikkje:       { standard: "ikke",                 rule: "dialekt" },
  itj:         { standard: "ikke",                 rule: "dialekt" },
  kor:         { standard: "hvor",                 rule: "dialekt" },
  kossen:      { standard: "hvordan",              rule: "dialekt" },
  koffår:      { standard: "hvorfor",              rule: "dialekt" },
  ka:          { standard: "hva",                  rule: "dialekt" },
  hæ:          { standard: "hva",                  rule: "dialekt" },
  ska:         { standard: "skal",                 rule: "dialekt" },
  sku:         { standard: "skulle",               rule: "dialekt" },
  blei:        { standard: "ble",                  rule: "dialekt" },
  veit:        { standard: "vet",                  rule: "dialekt" },
  dæm:         { standard: "dem/de",               rule: "dialekt" },
  mæ:          { standard: "meg",                  rule: "dialekt" },
  dæ:          { standard: "deg",                  rule: "dialekt" },
  åkke:        { standard: "også",                 rule: "dialekt" },

  // --- sj/kj-forveksling (skriver sj der det skal være kj/sky) ---
  sjempe:      { standard: "kjempe",               rule: "skj/sj" },
  sjino:       { standard: "kino",                 rule: "skj/sj" },
  sjylling:    { standard: "kylling",              rule: "skj/sj" },
  sjøre:       { standard: "kjøre",                rule: "skj/sj" },
  sjønner:     { standard: "skjønner",             rule: "skj/sj" },
  kjønner:     { standard: "skjønner",             rule: "skj/sj" },
  skære:       { standard: "skjære",               rule: "skj/sj" },

  // --- kj/tj-forveksling ---
  kjene:       { standard: "tjene",                rule: "kj/j" },
  kjino:       { standard: "kino",                 rule: "kj/j" },

  // --- Feil verbformer som Hunspell aksepterer ---
  kommene:     { standard: "komne/kommet",         rule: "stavemåte" },

  // --- Dyslektiske stavefeil fra frekvenslist ---
  alldri:           { standard: "aldri",               rule: "stavemåte" },
  altid:            { standard: "alltid",              rule: "stavemåte" },
  annbefale:        { standard: "anbefale",            rule: "stavemåte" },
  blandt:           { standard: "blant",               rule: "stavemåte" },
  blo:              { standard: "blod",                rule: "stavemåte" },
  borre:            { standard: "bore",                rule: "stavemåte" },
  dektektiv:        { standard: "detektiv",            rule: "stavemåte" },
  demostrasjon:     { standard: "demonstrasjon",       rule: "stavemåte" },
  dæi:              { standard: "deg",                 rule: "dialekt" },
  dær:              { standard: "der",                 rule: "stavemåte" },
  fjelle:           { standard: "fjellet",             rule: "stavemåte" },
  flått:            { standard: "flott",               rule: "stavemåte" },
  hjærne:           { standard: "hjerne",              rule: "stavemåte" },
  huse:             { standard: "huset",               rule: "stavemåte" },
  hvær:             { standard: "hver",                rule: "stavemåte" },
  ia:               { standard: "ja",                  rule: "stavemåte" },
  ifjor:            { standard: "i fjor",              rule: "sammenskriving" },
  igloo:            { standard: "iglo",                rule: "stavemåte" },
  ike:              { standard: "ikke",                rule: "stavemåte" },
  imun:             { standard: "immun",               rule: "stavemåte" },
  innstallere:      { standard: "installere",          rule: "stavemåte" },
  interju:          { standard: "intervju",            rule: "stavemåte" },
  interjuv:         { standard: "intervju",            rule: "stavemåte" },
  intresant:        { standard: "interessant",         rule: "stavemåte" },
  inviduell:        { standard: "individuell",         rule: "stavemåte" },
  jei:              { standard: "jeg",                 rule: "stavemåte" },
  jha:              { standard: "ja",                  rule: "stavemåte" },
  jæi:              { standard: "jeg",                 rule: "stavemåte" },
  kansje:           { standard: "kanskje",             rule: "stavemåte" },
  kåm:              { standard: "kom",                 rule: "stavemåte" },
  låv:              { standard: "lov",                 rule: "stavemåte" },
  mei:              { standard: "meg",                 rule: "stavemåte" },
  nai:              { standard: "nei",                 rule: "stavemåte" },
  næi:              { standard: "nei",                 rule: "stavemåte" },
  sæi:              { standard: "seg",                 rule: "stavemåte" },
  såve:             { standard: "sove",                rule: "stavemåte" },
  ungdomskole:      { standard: "ungdomsskole",        rule: "stavemåte" },
  ungå:             { standard: "unngå",               rule: "stavemåte" },
  untatt:           { standard: "unntatt",             rule: "stavemåte" },
  utolmodig:        { standard: "utålmodig",           rule: "stavemåte" },
  uunværlig:        { standard: "uunnværlig",          rule: "stavemåte" },
  va:               { standard: "hva",                 rule: "dialekt" },
  veldi:            { standard: "veldig",              rule: "stavemåte" },
  åpp:              { standard: "opp",                 rule: "stavemåte" },
  eg:               { standard: "jeg",                 rule: "dialekt" },

  // --- Vanlige stavefeil på lange ord ---
  plusselig:   { standard: "plutselig",            rule: "stavemåte" },
  plutelig:    { standard: "plutselig",            rule: "stavemåte" },
  selvføljelig:{ standard: "selvfølgelig",         rule: "stavemåte" },
  egentelig:   { standard: "egentlig",             rule: "stavemåte" },
  forsjellig:  { standard: "forskjellig",          rule: "stavemåte" },
  forsjelig:   { standard: "forskjellig",          rule: "stavemåte" },
  forsjell:    { standard: "forskjell",            rule: "stavemåte" },
  vanligviss:  { standard: "vanligvis",            rule: "stavemåte" },
  mulihet:     { standard: "mulighet",             rule: "stavemåte" },
  nødvenig:    { standard: "nødvendig",            rule: "stavemåte" },
  nødvending:  { standard: "nødvendig",            rule: "stavemåte" },
  interesert:  { standard: "interessert",          rule: "stavemåte" },
  interesant:  { standard: "interessant",          rule: "stavemåte" },
  istedet:     { standard: "i stedet",             rule: "sammenskriving" },
};

/** Ordene som SKAL vises i stavekontroll-lista (ikke bare i lesehjelp). */
export const CONFUSION_WORDS = new Set(Object.keys(KNOWN_CONFUSIONS));
