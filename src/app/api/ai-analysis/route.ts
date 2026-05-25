import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_KEY || "");

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    // Strip HTML for analysis
    const plainText = text
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Du er en norsk norsklærer på ungdomsskolen. Du gir vennlig og konkret tilbakemelding til en ungdomsskoleelev.

Analyser denne teksten grundig. Skriv svaret på norsk, tilpasset en 13–16-åring. Vær konkret og unngå tung fagsjargong.

Tekst:
${plainText}

Gi svar som JSON med denne strukturen (uten markdown-omslag):
{
  "spellingErrors": [
    "Ta med konkrete feil du ser i teksten med forslag til rettelse – f.eks. «'jore' ser ut som 'gjorde'». Sjekk spesifikt for: å/og-forveksling (f.eks. 'vil og gjøre' i stedet for 'vil å gjøre'), de/dem-forveksling (dem som subjekt eller de som objekt), da/når-forveksling (da om engangstilfeller i fortid, når om gjentagende/framtid), og forvekslingslyder som gj/j, kj/j, hv/v der konteksten tydelig viser hva som var ment. Kun feil du faktisk ser i teksten – maks 4 punkter."
  ],
  "dyslexiaFriendlyTips": [
    "Setningsbygging: er setningene varierte i lengde og oppbygging? Starter mange setninger likt? Gi et konkret eksempel fra teksten.",
    "Vokabular: bruker eleven de samme ordene om og om igjen? Foreslå konkrete alternativer fra teksten.",
    "Virkemidler: bruker eleven bilder, sammenligninger eller levende detaljer? Gi ett konkret råd om hva som kan gjøre teksten mer engasjerende."
  ],
  "structureTips": [
    "Komma og tegnsetting: er komma brukt riktig, særlig foran leddsetninger med 'at', 'som', 'når', 'da', 'fordi'? Gi et konkret eksempel hvis du finner feil.",
    "Særskriving: er sammensatte ord skrevet feil som to ord (f.eks. 'jule nisse' i stedet for 'julenisse', 'kaffe kopp' i stedet for 'kaffekopp')? Nevn konkrete tilfeller hvis du finner dem.",
    "Avsnitt og oppbygging: har teksten tydelig innledning, hoveddel og avslutning? Er avsnittene brukt fornuftig?",
    "Flyt og lesbarhet: leser teksten seg godt høyt? Hva ville gjort den enda bedre?"
  ],
  "overallFeedback": "2–3 setninger. Start med noe konkret som er bra i teksten. Avslutt med ett klart råd om hva eleven bør jobbe videre med."
}

Viktige regler:
- Bruk enkelt, vennlig språk – eleven er 13–16 år
- Alltid konstruktiv: pek på hva som er bra og hva som kan bli bedre
- Gi konkrete råd med eksempler direkte fra teksten
- Ta BARE med feil du faktisk observerer i teksten – ikke generelle råd uten belegg
- Maks 3 punkter per kategori
- Hvert punkt skal være én konkret, nyttig setning`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        {
          spellingErrors: [],
          dyslexiaFriendlyTips: ["Teksten er lesbar"],
          structureTips: [],
          overallFeedback: "Bra innsats!",
        }
      );
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json(analysis);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("AI analysis error:", errorMessage);
    console.error("Full error:", error);

    // Check if it's an API key error
    if (errorMessage.includes("API key") || errorMessage.includes("401")) {
      return NextResponse.json(
        { error: "Google API key problem - check .env.local" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `AI analysis failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
