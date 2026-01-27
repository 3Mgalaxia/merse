export const SUPPORTED_LOCALES = [
  "pt-BR",
  "en-US",
  "es-ES",
  "fr-FR",
  "de-DE",
  "it-IT",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_ALIASES: Record<string, Locale> = {
  pt: "pt-BR",
  "pt-br": "pt-BR",
  "pt-pt": "pt-BR",
  en: "en-US",
  "en-us": "en-US",
  "en-gb": "en-US",
  es: "es-ES",
  "es-es": "es-ES",
  fr: "fr-FR",
  "fr-fr": "fr-FR",
  de: "de-DE",
  "de-de": "de-DE",
  it: "it-IT",
  "it-it": "it-IT",
};

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  "pt-BR": {},
  "en-US": {
    "Construa mundos, publique coleções e monetize pacotes de prompt em um ambiente futurista, desenhado para criadores visionários e equipes corporativas.":
      "Build worlds, publish collections, and monetize prompt packs in a futuristic environment designed for visionary creators and corporate teams.",
    "Transforme prompts em visuais cinematográficos com controle de estilo e energia cósmica.":
      "Turn prompts into cinematic visuals with style control and cosmic energy.",
    "Gere vídeos fashion em 3D fluido usando suas próprias fotos ou referências.":
      "Generate fluid 3D fashion videos using your own photos or references.",
    "Renders holográficos de produtos com materiais Merse e iluminação volumétrica.":
      "Create holographic product renders with Merse materials and volumetric lighting.",
    "Explore o Prompt Marketplace, compartilhe coleções com o seu público e acompanhe métricas de curtidas e saves em tempo real. Assinantes desbloqueiam a área social completa para seguidores, comentários e vendas recorrentes.":
      "Explore the Prompt Marketplace, share collections with your audience, and track likes and saves in real time. Subscribers unlock the full social area with followers, comments, and recurring sales.",
    "Fluxos claros para qualquer nível. Do briefing à publicação, a IA Merse te acompanha.":
      "Clear flows for any level. From briefing to publishing, Merse AI stays with you.",
    "Conecte-se com visionários, compartilhe pacotes e cresça com feedback constante.":
      "Connect with visionaries, share packs, and grow with constant feedback.",
    "Marketplace, ferramentas corporativas e planos que liberam interações sociais exclusivas.":
      "Marketplace, enterprise tools, and plans that unlock exclusive social interactions.",
    "Das startups às grandes marcas, a Merse oferece uma experiência completa de criação, publicação e monetização com visual futurista e suporte especializado.":
      "From startups to big brands, Merse delivers a complete creation, publishing, and monetization experience with a futuristic look and specialized support.",
    "Converse com a tripulação Merse ou explore os planos para escolher a órbita ideal.":
      "Talk to the Merse crew or explore plans to choose the ideal orbit.",
    "A Merse tornou nosso pipeline 3x mais rápido. Os pacotes de prompt prontos e o Photon Forge reduziram dias de produção para horas.":
      "Merse made our pipeline 3x faster. Ready prompt packs and Photon Forge cut production days down to hours.",
    "Ter marketplace e comunidade no mesmo lugar aproximou nossos produtos do público certo sem precisar sair do ecossistema.":
      "Having a marketplace and community in one place brought our products closer to the right audience without leaving the ecosystem.",
    "Uso o Runway Wear diariamente. Os vídeos têm a estética Merse e impressionam clientes exigentes em segundos.":
      "I use Runway Wear daily. The videos carry the Merse aesthetic and impress demanding clients in seconds.",
  },
  "es-ES": {
    "Construa mundos, publique coleções e monetize pacotes de prompt em um ambiente futurista, desenhado para criadores visionários e equipes corporativas.":
      "Construye mundos, publica colecciones y monetiza packs de prompts en un entorno futurista diseñado para creadores visionarios y equipos corporativos.",
    "Transforme prompts em visuais cinematográficos com controle de estilo e energia cósmica.":
      "Convierte prompts en visuales cinematográficos con control de estilo y energía cósmica.",
    "Gere vídeos fashion em 3D fluido usando suas próprias fotos ou referências.":
      "Genera videos fashion en 3D fluido usando tus propias fotos o referencias.",
    "Renders holográficos de produtos com materiais Merse e iluminação volumétrica.":
      "Renders holográficos de productos con materiales Merse e iluminación volumétrica.",
    "Explore o Prompt Marketplace, compartilhe coleções com o seu público e acompanhe métricas de curtidas e saves em tempo real. Assinantes desbloqueiam a área social completa para seguidores, comentários e vendas recorrentes.":
      "Explora el Prompt Marketplace, comparte colecciones con tu público y sigue métricas de likes y guardados en tiempo real. Los suscriptores desbloquean el área social completa con seguidores, comentarios y ventas recurrentes.",
    "Fluxos claros para qualquer nível. Do briefing à publicação, a IA Merse te acompanha.":
      "Flujos claros para cualquier nivel. Del briefing a la publicación, la IA Merse te acompaña.",
    "Conecte-se com visionários, compartilhe pacotes e cresça com feedback constante.":
      "Conéctate con visionarios, comparte packs y crece con feedback constante.",
    "Marketplace, ferramentas corporativas e planos que liberam interações sociais exclusivas.":
      "Marketplace, herramientas corporativas y planes que desbloquean interacciones sociales exclusivas.",
    "Das startups às grandes marcas, a Merse oferece uma experiência completa de criação, publicação e monetização com visual futurista e suporte especializado.":
      "De startups a grandes marcas, Merse ofrece una experiencia completa de creación, publicación y monetización con visual futurista y soporte especializado.",
    "Converse com a tripulação Merse ou explore os planos para escolher a órbita ideal.":
      "Habla con la tripulación Merse o explora los planes para elegir la órbita ideal.",
    "A Merse tornou nosso pipeline 3x mais rápido. Os pacotes de prompt prontos e o Photon Forge reduziram dias de produção para horas.":
      "Merse hizo nuestro pipeline 3x más rápido. Los packs de prompts listos y Photon Forge redujeron días de producción a horas.",
    "Ter marketplace e comunidade no mesmo lugar aproximou nossos produtos do público certo sem precisar sair do ecossistema.":
      "Tener marketplace y comunidad en el mismo lugar acercó nuestros productos al público correcto sin salir del ecosistema.",
    "Uso o Runway Wear diariamente. Os vídeos têm a estética Merse e impressionam clientes exigentes em segundos.":
      "Uso Runway Wear a diario. Los videos tienen la estética Merse e impresionan a clientes exigentes en segundos.",
  },
  "fr-FR": {
    "Construa mundos, publique coleções e monetize pacotes de prompt em um ambiente futurista, desenhado para criadores visionários e equipes corporativas.":
      "Construisez des mondes, publiez des collections et monétisez des packs de prompts dans un environnement futuriste conçu pour les créateurs visionnaires et les équipes d'entreprise.",
    "Transforme prompts em visuais cinematográficos com controle de estilo e energia cósmica.":
      "Transformez des prompts en visuels cinématographiques avec contrôle du style et énergie cosmique.",
    "Gere vídeos fashion em 3D fluido usando suas próprias fotos ou referências.":
      "Générez des vidéos fashion en 3D fluide à partir de vos photos ou références.",
    "Renders holográficos de produtos com materiais Merse e iluminação volumétrica.":
      "Rendus holographiques de produits avec matériaux Merse et éclairage volumétrique.",
    "Explore o Prompt Marketplace, compartilhe coleções com o seu público e acompanhe métricas de curtidas e saves em tempo real. Assinantes desbloqueiam a área social completa para seguidores, comentários e vendas recorrentes.":
      "Explorez le Prompt Marketplace, partagez des collections avec votre public et suivez les métriques de likes et d'enregistrements en temps réel. Les abonnés débloquent l'espace social complet avec abonnés, commentaires et ventes récurrentes.",
    "Fluxos claros para qualquer nível. Do briefing à publicação, a IA Merse te acompanha.":
      "Des flux clairs pour tous les niveaux. Du brief à la publication, l’IA Merse vous accompagne.",
    "Conecte-se com visionários, compartilhe pacotes e cresça com feedback constante.":
      "Connectez-vous avec des visionnaires, partagez des packs et progressez grâce à un feedback constant.",
    "Marketplace, ferramentas corporativas e planos que liberam interações sociais exclusivas.":
      "Marketplace, outils d'entreprise et plans qui débloquent des interactions sociales exclusives.",
    "Das startups às grandes marcas, a Merse oferece uma experiência completa de criação, publicação e monetização com visual futurista e suporte especializado.":
      "Des startups aux grandes marques, Merse offre une expérience complète de création, publication et monétisation avec un visuel futuriste et un support spécialisé.",
    "Converse com a tripulação Merse ou explore os planos para escolher a órbita ideal.":
      "Discutez avec l’équipage Merse ou explorez les plans pour choisir l’orbite idéale.",
    "A Merse tornou nosso pipeline 3x mais rápido. Os pacotes de prompt prontos e o Photon Forge reduziram dias de produção para horas.":
      "Merse a rendu notre pipeline 3x plus rapide. Les packs de prompts prêts et Photon Forge ont réduit des jours de production à quelques heures.",
    "Ter marketplace e comunidade no mesmo lugar aproximou nossos produtos do público certo sem precisar sair do ecossistema.":
      "Avoir marketplace et communauté au même endroit a rapproché nos produits du bon public sans quitter l’écosystème.",
    "Uso o Runway Wear diariamente. Os vídeos têm a estética Merse e impressionam clientes exigentes em segundos.":
      "J’utilise Runway Wear au quotidien. Les vidéos ont l’esthétique Merse et impressionnent les clients exigeants en quelques secondes.",
  },
  "de-DE": {
    "Construa mundos, publique coleções e monetize pacotes de prompt em um ambiente futurista, desenhado para criadores visionários e equipes corporativas.":
      "Erschaffe Welten, veröffentliche Kollektionen und monetarisiere Prompt-Pakete in einer futuristischen Umgebung für visionäre Kreative und Unternehmensteams.",
    "Transforme prompts em visuais cinematográficos com controle de estilo e energia cósmica.":
      "Verwandle Prompts in filmische Visuals mit Stilkontrolle und kosmischer Energie.",
    "Gere vídeos fashion em 3D fluido usando suas próprias fotos ou referências.":
      "Erzeuge flüssige 3D-Fashion-Videos mit deinen eigenen Fotos oder Referenzen.",
    "Renders holográficos de produtos com materiais Merse e iluminação volumétrica.":
      "Holografische Produktrenders mit Merse-Materialien und volumetrischer Beleuchtung.",
    "Explore o Prompt Marketplace, compartilhe coleções com o seu público e acompanhe métricas de curtidas e saves em tempo real. Assinantes desbloqueiam a área social completa para seguidores, comentários e vendas recorrentes.":
      "Entdecke den Prompt Marketplace, teile Kollektionen mit deinem Publikum und verfolge Likes und Saves in Echtzeit. Abonnenten schalten den vollständigen Social-Bereich mit Followern, Kommentaren und wiederkehrenden Verkäufen frei.",
    "Fluxos claros para qualquer nível. Do briefing à publicação, a IA Merse te acompanha.":
      "Klare Abläufe für jedes Niveau. Vom Briefing bis zur Veröffentlichung begleitet dich Merse AI.",
    "Conecte-se com visionários, compartilhe pacotes e cresça com feedback constante.":
      "Vernetze dich mit Visionären, teile Pakete und wachse mit konstantem Feedback.",
    "Marketplace, ferramentas corporativas e planos que liberam interações sociais exclusivas.":
      "Marketplace, Enterprise-Tools und Pläne, die exklusive soziale Interaktionen freischalten.",
    "Das startups às grandes marcas, a Merse oferece uma experiência completa de criação, publicação e monetização com visual futurista e suporte especializado.":
      "Von Startups bis zu großen Marken bietet Merse eine vollständige Erfahrung für Erstellung, Veröffentlichung und Monetarisierung mit futuristischer Optik und spezialisiertem Support.",
    "Converse com a tripulação Merse ou explore os planos para escolher a órbita ideal.":
      "Sprich mit der Merse-Crew oder entdecke die Pläne, um die ideale Umlaufbahn zu wählen.",
    "A Merse tornou nosso pipeline 3x mais rápido. Os pacotes de prompt prontos e o Photon Forge reduziram dias de produção para horas.":
      "Merse machte unsere Pipeline dreimal schneller. Fertige Prompt-Pakete und Photon Forge reduzierten Produktionstage auf Stunden.",
    "Ter marketplace e comunidade no mesmo lugar aproximou nossos produtos do público certo sem precisar sair do ecossistema.":
      "Marketplace und Community am selben Ort brachten unsere Produkte näher an das richtige Publikum, ohne das Ökosystem zu verlassen.",
    "Uso o Runway Wear diariamente. Os vídeos têm a estética Merse e impressionam clientes exigentes em segundos.":
      "Ich nutze Runway Wear täglich. Die Videos tragen die Merse-Ästhetik und beeindrucken anspruchsvolle Kunden in Sekunden.",
  },
  "it-IT": {
    "Construa mundos, publique coleções e monetize pacotes de prompt em um ambiente futurista, desenhado para criadores visionários e equipes corporativas.":
      "Costruisci mondi, pubblica collezioni e monetizza pacchetti di prompt in un ambiente futuristico pensato per creatori visionari e team aziendali.",
    "Transforme prompts em visuais cinematográficos com controle de estilo e energia cósmica.":
      "Trasforma i prompt in visual cinematografici con controllo dello stile ed energia cosmica.",
    "Gere vídeos fashion em 3D fluido usando suas próprias fotos ou referências.":
      "Genera video fashion in 3D fluido usando le tue foto o riferimenti.",
    "Renders holográficos de produtos com materiais Merse e iluminação volumétrica.":
      "Render olografici di prodotti con materiali Merse e illuminazione volumetrica.",
    "Explore o Prompt Marketplace, compartilhe coleções com o seu público e acompanhe métricas de curtidas e saves em tempo real. Assinantes desbloqueiam a área social completa para seguidores, comentários e vendas recorrentes.":
      "Esplora il Prompt Marketplace, condividi collezioni con il tuo pubblico e monitora like e salvataggi in tempo reale. Gli abbonati sbloccano l’area social completa con follower, commenti e vendite ricorrenti.",
    "Fluxos claros para qualquer nível. Do briefing à publicação, a IA Merse te acompanha.":
      "Flussi chiari per qualsiasi livello. Dal briefing alla pubblicazione, la IA Merse ti accompagna.",
    "Conecte-se com visionários, compartilhe pacotes e cresça com feedback constante.":
      "Connettiti con visionari, condividi pacchetti e cresci con feedback costante.",
    "Marketplace, ferramentas corporativas e planos que liberam interações sociais exclusivas.":
      "Marketplace, strumenti aziendali e piani che sbloccano interazioni social esclusive.",
    "Das startups às grandes marcas, a Merse oferece uma experiência completa de criação, publicação e monetização com visual futurista e suporte especializado.":
      "Dalle startup ai grandi brand, Merse offre un’esperienza completa di creazione, pubblicazione e monetizzazione con look futuristico e supporto specializzato.",
    "Converse com a tripulação Merse ou explore os planos para escolher a órbita ideal.":
      "Parla con l’equipaggio Merse o esplora i piani per scegliere l’orbita ideale.",
    "A Merse tornou nosso pipeline 3x mais rápido. Os pacotes de prompt prontos e o Photon Forge reduziram dias de produção para horas.":
      "Merse ha reso la nostra pipeline 3 volte più veloce. I pacchetti di prompt pronti e Photon Forge hanno ridotto giorni di produzione a ore.",
    "Ter marketplace e comunidade no mesmo lugar aproximou nossos produtos do público certo sem precisar sair do ecossistema.":
      "Avere marketplace e community nello stesso posto ha avvicinato i nostri prodotti al pubblico giusto senza uscire dall’ecosistema.",
    "Uso o Runway Wear diariamente. Os vídeos têm a estética Merse e impressionam clientes exigentes em segundos.":
      "Uso Runway Wear ogni giorno. I video hanno l’estetica Merse e impressionano clienti esigenti in pochi secondi.",
  },
};

export function normalizeLocale(input: string | null | undefined): Locale {
  if (!input) return "pt-BR";
  const lowered = input.toLowerCase();
  if (LOCALE_ALIASES[lowered]) return LOCALE_ALIASES[lowered];
  const prefix = lowered.split("-")[0];
  return LOCALE_ALIASES[prefix] ?? "pt-BR";
}

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "pt-BR";
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const locale of preferred) {
    const normalized = normalizeLocale(locale);
    if (SUPPORTED_LOCALES.includes(normalized)) {
      return normalized;
    }
  }
  return "pt-BR";
}

export function translate(locale: Locale, text: string): string {
  const dict = TRANSLATIONS[locale];
  return dict?.[text] ?? text;
}
