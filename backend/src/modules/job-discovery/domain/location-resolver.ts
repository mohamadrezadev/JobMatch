// Each group is one real place's known aliases (Persian, English, common
// transliterations). This is an equivalence catalog, not an allowlist of
// supported cities — adding a place here never requires touching matching
// code elsewhere (discovery.ts's filterAndRank, etc).
const places: readonly {
  readonly id: string;
  readonly aliases: readonly string[];
}[] = [
  { id: "tehran", aliases: ["تهران", "Tehran"] },
  { id: "isfahan", aliases: ["اصفهان", "Isfahan", "Esfahan"] },
  { id: "fars-shiraz", aliases: ["شیراز", "Shiraz", "فارس", "Fars"] },
  {
    id: "khorasan-razavi-mashhad",
    aliases: ["مشهد", "Mashhad", "Mashad", "خراسان رضوی", "Khorasan Razavi"],
  },
  {
    id: "east-azerbaijan-tabriz",
    aliases: ["تبریز", "Tabriz", "آذربایجان شرقی", "East Azerbaijan"],
  },
  {
    id: "west-azerbaijan-urmia",
    aliases: [
      "ارومیه",
      "Urmia",
      "Orumiyeh",
      "Orumieh",
      "آذربایجان غربی",
      "West Azerbaijan",
    ],
  },
  { id: "alborz-karaj", aliases: ["کرج", "Karaj", "البرز", "Alborz"] },
  { id: "qom", aliases: ["قم", "Qom", "Ghom"] },
  {
    id: "khuzestan-ahvaz",
    aliases: ["اهواز", "Ahvaz", "Ahwaz", "خوزستان", "Khuzestan"],
  },
  { id: "kermanshah", aliases: ["کرمانشاه", "Kermanshah"] },
  { id: "gilan-rasht", aliases: ["رشت", "Rasht", "گیلان", "Gilan"] },
  {
    id: "sistan-baluchestan-zahedan",
    aliases: [
      "زاهدان",
      "Zahedan",
      "سیستان و بلوچستان",
      "Sistan and Baluchestan",
      "Sistan va Baluchestan",
    ],
  },
  { id: "hamadan", aliases: ["همدان", "Hamadan", "Hamedan"] },
  { id: "kerman", aliases: ["کرمان", "Kerman"] },
  { id: "yazd", aliases: ["یزد", "Yazd"] },
  { id: "ardabil", aliases: ["اردبیل", "Ardabil", "Ardebil"] },
  {
    id: "hormozgan-bandar-abbas",
    aliases: [
      "بندرعباس",
      "بندر عباس",
      "Bandar Abbas",
      "Bandar-e Abbas",
      "هرمزگان",
      "Hormozgan",
    ],
  },
  { id: "markazi-arak", aliases: ["اراک", "Arak", "مرکزی", "Markazi"] },
  { id: "zanjan", aliases: ["زنجان", "Zanjan"] },
  {
    id: "kurdistan-sanandaj",
    aliases: ["سنندج", "Sanandaj", "کردستان", "Kurdistan"],
  },
  { id: "qazvin", aliases: ["قزوین", "Qazvin", "Ghazvin"] },
  {
    id: "lorestan-khorramabad",
    aliases: ["خرم آباد", "خرم‌آباد", "Khorramabad", "لرستان", "Lorestan"],
  },
  {
    id: "golestan-gorgan",
    aliases: ["گرگان", "Gorgan", "گلستان", "Golestan"],
  },
  {
    id: "mazandaran-sari",
    aliases: ["ساری", "Sari", "مازندران", "Mazandaran"],
  },
  {
    id: "south-khorasan-birjand",
    aliases: ["بیرجند", "Birjand", "خراسان جنوبی", "South Khorasan"],
  },
  {
    id: "north-khorasan-bojnurd",
    aliases: ["بجنورد", "Bojnurd", "Bojnord", "خراسان شمالی", "North Khorasan"],
  },
  { id: "bushehr", aliases: ["بوشهر", "Bushehr", "Bushire"] },
  { id: "ilam", aliases: ["ایلام", "Ilam"] },
  {
    id: "chaharmahal-bakhtiari-shahrekord",
    aliases: [
      "شهرکرد",
      "Shahrekord",
      "Shahr-e Kord",
      "چهارمحال و بختیاری",
      "Chaharmahal and Bakhtiari",
    ],
  },
  { id: "semnan", aliases: ["سمنان", "Semnan"] },
  {
    id: "kohgiluyeh-boyerahmad-yasuj",
    aliases: [
      "یاسوج",
      "Yasuj",
      "Yasouj",
      "کهگیلویه و بویراحمد",
      "Kohgiluyeh and Boyer-Ahmad",
    ],
  },
];

export interface LocationResolution {
  input: string;
  status: "resolved" | "ambiguous" | "unresolved";
  canonicalId?: string;
  canonicalNameFa?: string;
  canonicalNameEn?: string;
  candidateIds?: string[];
}

export function locationTokens(value: string): string[] {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‍]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

interface CatalogEntry {
  readonly id: string;
  readonly alias: string;
  readonly terms: string[];
}

function buildCatalog(
  groups: readonly {
    readonly id: string;
    readonly aliases: readonly string[];
  }[],
): CatalogEntry[] {
  return groups
    .flatMap((group) =>
      group.aliases.map((alias) => ({
        id: group.id,
        alias,
        terms: locationTokens(alias),
      })),
    )
    .filter((entry) => entry.terms.length > 0)
    .sort((a, b) => b.terms.length - a.terms.length);
}

const catalog = buildCatalog(places);

// Exported only so the ambiguous-resolution path can be unit-tested against a
// small synthetic catalog without fabricating a fake collision in real
// Iranian geographic data.
export function resolveAgainstCatalog(
  input: string,
  entries: readonly CatalogEntry[],
): LocationResolution {
  const words = new Set(locationTokens(input));
  if (!words.size) return { input, status: "unresolved" };
  const matches = entries.filter((entry) =>
    entry.terms.every((term) => words.has(term)),
  );
  if (!matches.length) return { input, status: "unresolved" };
  const maxTerms = Math.max(...matches.map((entry) => entry.terms.length));
  const mostSpecific = matches.filter(
    (entry) => entry.terms.length === maxTerms,
  );
  const ids = [...new Set(mostSpecific.map((entry) => entry.id))];
  if (ids.length > 1) return { input, status: "ambiguous", candidateIds: ids };
  const winner = mostSpecific[0];
  return {
    input,
    status: "resolved",
    canonicalId: winner.id,
    canonicalNameFa: places.find((group) => group.id === winner.id)?.aliases[0],
    canonicalNameEn: places.find((group) => group.id === winner.id)?.aliases[1],
  };
}

export function resolveLocation(input: string): LocationResolution {
  return resolveAgainstCatalog(input, catalog);
}

// Falls back to the caller's own substring match (discovery.ts's existing
// `has`) whenever either side doesn't resolve to exactly one canonical
// place, so matching for anything outside the catalog is never worse than
// before this resolver existed. Taking the fallback as a parameter (instead
// of importing discovery.ts's `has`/`normalizeText`) keeps this module
// dependency-free, like occupation-title.ts, and avoids a circular import.
export function locationsMatch(
  requested: string,
  jobLocation: string,
  fallbackMatch: (jobLocation: string, requested: string) => boolean,
): boolean {
  const goal = resolveLocation(requested);
  const job = resolveLocation(jobLocation);
  if (goal.status === "resolved" && job.status === "resolved")
    return goal.canonicalId === job.canonicalId;
  return fallbackMatch(jobLocation, requested);
}
