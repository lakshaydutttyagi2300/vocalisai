// The certificate fonts for the on-screen preview (the PDF embeds the same
// OFL families from src/lib/certificates/fonts). Loaded only on pages that
// show a certificate.
import { Cinzel, Cormorant_Garamond, DM_Serif_Display, Great_Vibes, Inter, Libre_Baskerville, Montserrat, Pinyon_Script, Playfair_Display, Instrument_Serif } from "next/font/google";
import type { FontKey } from "@/lib/certificates/designs";

const cinzel = Cinzel({ subsets: ["latin"], weight: "600" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: "600" });
const dmserif = DM_Serif_Display({ subsets: ["latin"], weight: "400" });
const greatvibes = Great_Vibes({ subsets: ["latin"], weight: "400" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400" });
const inter = Inter({ subsets: ["latin"], weight: "400" });
const interBold = Inter({ subsets: ["latin"], weight: "600" });
const baskerville = Libre_Baskerville({ subsets: ["latin"], weight: "400" });
const baskervilleBold = Libre_Baskerville({ subsets: ["latin"], weight: "700" });
const montserrat = Montserrat({ subsets: ["latin"], weight: "500" });
const montserratBold = Montserrat({ subsets: ["latin"], weight: "700" });
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: "700" });

/** Font family names for renderCertificateSvg in the browser. Bold cuts carry their weight in the name's CSS. */
export const WEB_FONTS: Record<FontKey, string> = {
  cinzel: cinzel.style.fontFamily,
  cormorant: cormorant.style.fontFamily,
  dmserif: dmserif.style.fontFamily,
  greatvibes: greatvibes.style.fontFamily,
  instrument: instrument.style.fontFamily,
  inter: inter.style.fontFamily,
  interBold: interBold.style.fontFamily,
  baskerville: baskerville.style.fontFamily,
  baskervilleBold: baskervilleBold.style.fontFamily,
  montserrat: montserrat.style.fontFamily,
  montserratBold: montserratBold.style.fontFamily,
  pinyon: pinyon.style.fontFamily,
  playfair: playfair.style.fontFamily,
};

