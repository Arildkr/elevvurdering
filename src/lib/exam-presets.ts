export type ExamGenre = "skjønnlitteratur" | "sakprosa";
export type ExamLanguage = "bokmål" | "nynorsk";

export interface ExamPreset {
  id: string;
  genre: ExamGenre;
  language: ExamLanguage;
  text: string;
}

export const EXAM_PRESETS: ExamPreset[] = [
  // --- Skjønnlitteratur bokmål ---
  {
    id: "sk-bm-1",
    genre: "skjønnlitteratur",
    language: "bokmål",
    text: "Skriv en tekst der hovedpersonen oppdager noe spennende. Lag en tydelig spenningskurve, og få fram at hovedpersonen må gjøre sitt beste for å holde oppdagelsen hemmelig. Du bør skrive 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-bm-2",
    genre: "skjønnlitteratur",
    language: "bokmål",
    text: "Skriv en tekst der hovedpersonen får møte forbildet sitt og de to har en interessant dag sammen. Teksten må ha en tydelig spenningsoppbygging, og en overraskende slutt på dagen. Du bør skrive 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-bm-3",
    genre: "skjønnlitteratur",
    language: "bokmål",
    text: "Skriv en tekst der hovedpersonen viser mot i en vanskelig situasjon. Bruk språklige virkemidler for å skildre situasjonen og hvordan hovedpersonen løser den. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-bm-4",
    genre: "skjønnlitteratur",
    language: "bokmål",
    text: "Skriv en tekst der to hovedpersoner står for hver sin mening om en sak. Det er kontrasten mellom de to meningene som må utgjøre hovedhandlingen. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-bm-5",
    genre: "skjønnlitteratur",
    language: "bokmål",
    text: "Skriv en tekst der hovedpersonen skaper en positiv endring ved å engasjere seg. Bygg opp historien mot et vendepunkt der endringen kommer tydelig fram. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-bm-6",
    genre: "skjønnlitteratur",
    language: "bokmål",
    text: "Skriv en tekst der hovedpersonen utvikler en oppfinnelse som endrer samfunnet. Bruk virkemidler for å skildre hvordan utviklingen skjer, og hvordan den påvirker samfunnet. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-bm-7",
    genre: "skjønnlitteratur",
    language: "bokmål",
    text: "Skriv en tekst der du får fram hvordan kommunikasjon mellom mennesker kan skje på ulike måter. Teksten må inneholde et vendepunkt der kommunikasjonen er avgjørende. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-bm-8",
    genre: "skjønnlitteratur",
    language: "bokmål",
    text: "Skriv en tekst der hovedpersonen står overfor et valg om å fortelle sannheten eller ikke. Bruk språklige virkemidler for å underbygge at det er et vanskelig valg. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },

  // --- Skjønnlitteratur nynorsk ---
  {
    id: "sk-nn-1",
    genre: "skjønnlitteratur",
    language: "nynorsk",
    text: "Skriv ein tekst der hovudpersonen oppdagar noko spennande. Lag ei tydeleg spenningskurve, og få fram at hovudpersonen må gjere sitt beste for å halde oppdaginga hemmeleg. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-nn-2",
    genre: "skjønnlitteratur",
    language: "nynorsk",
    text: "Skriv ein tekst der hovudpersonen får møte forbildet sitt og dei to har ein interessant dag saman. Teksten må ha ei tydeleg spenningsoppbygging, og ein overraskande slutt på dagen. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-nn-3",
    genre: "skjønnlitteratur",
    language: "nynorsk",
    text: "Skriv ein tekst der hovudpersonen viser mot i ein vanskeleg situasjon. Bruk språklege verkemiddel for å skildre situasjonen og korleis hovudpersonen løyser han. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-nn-4",
    genre: "skjønnlitteratur",
    language: "nynorsk",
    text: "Skriv ein tekst der to hovudpersonar står for kvar si meining om ei sak. Det er kontrasten mellom dei to meiningane som må utgjere hovudhandlinga. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-nn-5",
    genre: "skjønnlitteratur",
    language: "nynorsk",
    text: "Skriv ein tekst der hovudpersonen skapar ei positiv endring ved å engasjere seg. Bygg opp historia mot eit vendepunkt der endringa kjem tydeleg fram. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-nn-6",
    genre: "skjønnlitteratur",
    language: "nynorsk",
    text: "Skriv ein tekst der hovudpersonen utviklar ei oppfinning som endrar samfunnet. Bruk verkemiddel for å skildre korleis utviklinga av oppfinninga skjer, og korleis ho påverkar samfunnet. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-nn-7",
    genre: "skjønnlitteratur",
    language: "nynorsk",
    text: "Skriv ein tekst der du får fram korleis kommunikasjon mellom menneske kan skje på ulike måtar. Teksten skal innehalde eit vendepunkt der kommunikasjonen er avgjerande. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sk-nn-8",
    genre: "skjønnlitteratur",
    language: "nynorsk",
    text: "Skriv ein tekst der hovudpersonen står overfor eit val om å fortelje sanninga eller ikkje. Bruk språklege verkemiddel for å underbygge at det er eit vanskeleg val. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },

  // --- Sakprosa bokmål ---
  {
    id: "sp-bm-1",
    genre: "sakprosa",
    language: "bokmål",
    text: "Skriv en tekst der du reflekterer over hvordan ungdom kan bidra positivt på ulike arenaer i nærmiljøet sitt, og hva som kan være med på å skape engasjement hos ungdom. Du bør skrive 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-bm-2",
    genre: "sakprosa",
    language: "bokmål",
    text: "Skriv en tekst der du reflekterer over hvordan språklig variasjon kan forme identiteten vår og styrke fellesskapet mellom mennesker. Du bør skrive 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-bm-3",
    genre: "sakprosa",
    language: "bokmål",
    text: "Skriv en tekst der du reflekterer over hvilke muligheter unge har for å uttrykke sin mening, og hvordan ytringer kan påvirke hverdagen til ungdom. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-bm-4",
    genre: "sakprosa",
    language: "bokmål",
    text: "Skriv en tekst der du reflekterer over hvordan språklig variasjon og mangfold kan bidra til positive møter med andre. Underbygg det du skriver med eksempler. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-bm-5",
    genre: "sakprosa",
    language: "bokmål",
    text: "Skriv en tekst der du reflekterer over hvordan lesing av sakprosa og skjønnlitteratur kan påvirke forståelsen for andre mennesker og verden. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-bm-6",
    genre: "sakprosa",
    language: "bokmål",
    text: "Skriv en tekst der du reflekterer over hvordan det å hjelpe andre kan være med på å skape samhold og knytte bånd mellom mennesker. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-bm-7",
    genre: "sakprosa",
    language: "bokmål",
    text: "Skriv en tekst der du informerer en ungdom i år 2130 om det muntlige og skriftlige språket ungdom bruker i dag. Bruk eksempler for å utdype det du skriver, og få fram hvilke framtidsutsikter du ser for språket. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-bm-8",
    genre: "sakprosa",
    language: "bokmål",
    text: "Skriv en tekst der du argumenterer for at ungdom bør bli hørt i saker de er opptatt av. Lag overskrift selv. Vi anbefaler at du skriver 1–2 sider (450–900 ord).",
  },

  // --- Sakprosa nynorsk ---
  {
    id: "sp-nn-1",
    genre: "sakprosa",
    language: "nynorsk",
    text: "Skriv ein tekst der du reflekterer over korleis ungdom kan bidra positivt på ulike arenaer i nærmiljøet sitt, og kva som kan vere med på å skape engasjement hos ungdom. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-nn-2",
    genre: "sakprosa",
    language: "nynorsk",
    text: "Skriv ein tekst der du reflekterer over korleis språkleg variasjon kan forme identiteten vår og styrkje fellesskapet mellom menneske. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-nn-3",
    genre: "sakprosa",
    language: "nynorsk",
    text: "Skriv ein tekst der du reflekterer over kva moglegheiter unge har til å uttrykkje meininga si, og korleis ytringar kan påverke kvardagen til ungdom. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-nn-4",
    genre: "sakprosa",
    language: "nynorsk",
    text: "Skriv ein tekst der du reflekterer over korleis språkleg variasjon og mangfald kan bidra til positive møte med andre. Underbygg det du skriv med døme. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-nn-5",
    genre: "sakprosa",
    language: "nynorsk",
    text: "Skriv ein tekst der du reflekterer over korleis lesing av sakprosa og skjønnlitteratur kan påverke forståinga for andre menneske og verda. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-nn-6",
    genre: "sakprosa",
    language: "nynorsk",
    text: "Skriv ein tekst der du reflekterer over korleis det å hjelpe andre kan vere med på å skape samhald og knyte band mellom menneske. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-nn-7",
    genre: "sakprosa",
    language: "nynorsk",
    text: "Skriv ein tekst der du informerer ein ungdom i år 2130 om det munnlege og skriftlege språket ungdom bruker i dag. Bruk døme for å utdjupe det du skriv, og få fram kva for framtidsutsikter du ser for språket. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
  {
    id: "sp-nn-8",
    genre: "sakprosa",
    language: "nynorsk",
    text: "Skriv ein tekst der du argumenterer for at ungdom bør bli høyrde i saker dei er opptekne av. Lag overskrift sjølv. Vi tilrår at du skriv 1–2 sider (450–900 ord).",
  },
];

export function getPresets(genre: ExamGenre, language: ExamLanguage): ExamPreset[] {
  return EXAM_PRESETS.filter((p) => p.genre === genre && p.language === language);
}

export function getRandomPreset(genre: ExamGenre, language: ExamLanguage): ExamPreset | null {
  const pool = getPresets(genre, language);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
