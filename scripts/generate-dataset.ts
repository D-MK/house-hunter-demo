/**
 * Deterministic generator for the demo dataset.
 *
 * Run with `npm run generate-data`. Writes `src/data/listings.json`.
 *
 * Everything here is synthetic: there is no scraped listing content, no real
 * address, no photo and no source URL anywhere in the output. Real town names,
 * county names and Eircode routing keys are used (these are public reference
 * data); the four-character Eircode unique identifiers are randomly generated
 * and are not intended to resolve to any real property.
 *
 * The output must be byte-identical on every run, so the only source of
 * randomness is a seeded PRNG — no `Math.random()`, no `Date.now()`.
 *
 * The generated shape is `DemoListing`, which is deliberately a subset of the
 * private house-hunter schema. The personal scoring/verdict fields
 * (score, tier, dan_verdict, drive_min, over_budget_flag, reno_*, all_in_*,
 * tags, url) encode private buying criteria and must never be emitted here;
 * `validate()` enforces that before the file is written.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DemoListing } from "../src/lib/types";

// ---------------------------------------------------------------------------
// Seeded PRNG
// ---------------------------------------------------------------------------

const SEED = 20260824;
const TARGET_COUNT = 300;

/** mulberry32 — small, fast, fully deterministic for a given 32-bit seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(SEED);

/** Uniform integer in [min, max] inclusive. */
function int(min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

/** Uniform float in [min, max). */
function float(min: number, max: number): number {
  return min + rnd() * (max - min);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rnd() * items.length)];
}

type Weighted<T> = readonly (readonly [T, number])[];

function weighted<T>(items: Weighted<T>): T {
  const total = items.reduce((sum, [, w]) => sum + w, 0);
  let r = rnd() * total;
  for (const [value, w] of items) {
    r -= w;
    if (r <= 0) return value;
  }
  return items[items.length - 1][0];
}

function chance(p: number): boolean {
  return rnd() < p;
}

/** Deterministic Fisher-Yates using the shared PRNG stream. */
function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

interface Town {
  name: string;
  /** Real Eircode routing key for the town's post area. */
  rk: string;
  lat: number;
  lng: number;
  /** Local price multiplier relative to the county baseline. */
  premium: number;
}

type Tier = "capital" | "city" | "commuter" | "regional";

interface CountyConfig {
  tier: Tier;
  /** How many listings to generate for this county. */
  count: number;
  /** Baseline second-hand asking price per square metre, in euro. */
  eurPerSqm: number;
}

/**
 * Routing keys and coordinates are real reference data (An Post / Eircode
 * routing key areas; settlement coordinates). Town lists are a representative
 * sample per county, not exhaustive.
 */
const TOWNS: Record<string, Town[]> = {
  Carlow: [
    { name: "Carlow", rk: "R93", lat: 52.8306, lng: -6.9317, premium: 1.05 },
    { name: "Tullow", rk: "R93", lat: 52.8003, lng: -6.7369, premium: 0.9 },
    { name: "Bagenalstown", rk: "R21", lat: 52.701, lng: -6.957, premium: 0.9 },
    { name: "Borris", rk: "R21", lat: 52.60211, lng: -6.92508, premium: 0.9 },
    {
      name: "Leighlinbridge",
      rk: "R93",
      lat: 52.7364,
      lng: -6.9725,
      premium: 0.95,
    },
  ],
  Cavan: [
    { name: "Cavan", rk: "H12", lat: 53.991, lng: -7.3601, premium: 1.0 },
    { name: "Belturbet", rk: "H14", lat: 54.1, lng: -7.45, premium: 0.85 },
    {
      name: "Cootehill",
      rk: "H16",
      lat: 54.07395,
      lng: -7.08079,
      premium: 0.85,
    },
    { name: "Virginia", rk: "A82", lat: 53.83333, lng: -7.08333, premium: 1.0 },
    { name: "Kingscourt", rk: "A82", lat: 53.9046, lng: -6.8049, premium: 0.9 },
  ],
  Clare: [
    { name: "Ennis", rk: "V95", lat: 52.8463, lng: -8.9807, premium: 1.05 },
    { name: "Shannon", rk: "V14", lat: 52.71373, lng: -8.86863, premium: 0.95 },
    { name: "Kilrush", rk: "V15", lat: 52.64, lng: -9.486, premium: 0.8 },
    { name: "Kilkee", rk: "V15", lat: 52.679, lng: -9.647, premium: 0.9 },
    { name: "Ennistymon", rk: "V95", lat: 52.94, lng: -9.29, premium: 0.9 },
    {
      name: "Sixmilebridge",
      rk: "V95",
      lat: 52.743,
      lng: -8.773,
      premium: 1.0,
    },
  ],
  Cork: [
    { name: "Cork City", rk: "T12", lat: 51.89722, lng: -8.47, premium: 1.15 },
    { name: "Blarney", rk: "T23", lat: 51.93307, lng: -8.56795, premium: 1.0 },
    {
      name: "Ballincollig",
      rk: "P31",
      lat: 51.88793,
      lng: -8.58929,
      premium: 1.05,
    },
    {
      name: "Carrigaline",
      rk: "P43",
      lat: 51.81639,
      lng: -8.39139,
      premium: 1.0,
    },
    { name: "Cobh", rk: "P24", lat: 51.851, lng: -8.2967, premium: 0.95 },
    { name: "Midleton", rk: "P25", lat: 51.916, lng: -8.175, premium: 1.0 },
    { name: "Mallow", rk: "P51", lat: 52.131, lng: -8.6415, premium: 0.8 },
    { name: "Youghal", rk: "P36", lat: 51.95167, lng: -7.84562, premium: 0.8 },
    { name: "Bandon", rk: "P72", lat: 51.746, lng: -8.735, premium: 0.9 },
    {
      name: "Clonakilty",
      rk: "P85",
      lat: 51.62194,
      lng: -8.88639,
      premium: 0.95,
    },
    {
      name: "Skibbereen",
      rk: "P81",
      lat: 51.54917,
      lng: -9.2675,
      premium: 0.8,
    },
    { name: "Bantry", rk: "P75", lat: 51.67979, lng: -9.45322, premium: 0.75 },
    { name: "Macroom", rk: "P12", lat: 51.9047, lng: -8.9597, premium: 0.8 },
    { name: "Kinsale", rk: "P17", lat: 51.70556, lng: -8.52222, premium: 1.15 },
    { name: "Fermoy", rk: "P61", lat: 52.141, lng: -8.276, premium: 0.75 },
    {
      name: "Mitchelstown",
      rk: "P67",
      lat: 52.2656,
      lng: -8.2699,
      premium: 0.7,
    },
  ],
  Donegal: [
    {
      name: "Letterkenny",
      rk: "F92",
      lat: 54.9566,
      lng: -7.7203,
      premium: 1.05,
    },
    { name: "Donegal Town", rk: "F94", lat: 54.654, lng: -8.11, premium: 0.95 },
    { name: "Lifford", rk: "F93", lat: 54.834, lng: -7.486, premium: 0.8 },
    { name: "Ballybofey", rk: "F93", lat: 54.8, lng: -7.79, premium: 0.85 },
    { name: "Bundoran", rk: "F94", lat: 54.4754, lng: -8.2838, premium: 0.95 },
    { name: "Buncrana", rk: "F93", lat: 55.1364, lng: -7.456, premium: 0.9 },
    {
      name: "Ballyshannon",
      rk: "F94",
      lat: 54.5015,
      lng: -8.1901,
      premium: 0.85,
    },
  ],
  Dublin: [
    { name: "Rathmines", rk: "D06", lat: 53.3225, lng: -6.2657, premium: 1.2 },
    { name: "Clontarf", rk: "D03", lat: 53.365, lng: -6.21, premium: 1.25 },
    { name: "Drumcondra", rk: "D09", lat: 53.368, lng: -6.256, premium: 1.1 },
    { name: "Terenure", rk: "D6W", lat: 53.30985, lng: -6.2835, premium: 1.15 },
    {
      name: "Blanchardstown",
      rk: "D15",
      lat: 53.387,
      lng: -6.38,
      premium: 0.85,
    },
    { name: "Castleknock", rk: "D15", lat: 53.374, lng: -6.359, premium: 1.15 },
    { name: "Tallaght", rk: "D24", lat: 53.2886, lng: -6.3572, premium: 0.8 },
    { name: "Dundrum", rk: "D14", lat: 53.28972, lng: -6.24417, premium: 1.2 },
    { name: "Sandyford", rk: "D18", lat: 53.27, lng: -6.225, premium: 1.05 },
    { name: "Clondalkin", rk: "D22", lat: 53.32, lng: -6.395, premium: 0.8 },
    { name: "Howth", rk: "D13", lat: 53.386, lng: -6.066, premium: 1.25 },
    { name: "Blackrock", rk: "A94", lat: 53.3015, lng: -6.1778, premium: 1.35 },
    { name: "Dun Laoghaire", rk: "A96", lat: 53.3, lng: -6.14, premium: 1.3 },
    { name: "Malahide", rk: "K36", lat: 53.4508, lng: -6.1544, premium: 1.25 },
    { name: "Swords", rk: "K67", lat: 53.4603, lng: -6.22, premium: 0.9 },
    { name: "Skerries", rk: "K34", lat: 53.5828, lng: -6.1083, premium: 1.05 },
    {
      name: "Balbriggan",
      rk: "K32",
      lat: 53.60861,
      lng: -6.18306,
      premium: 0.72,
    },
    { name: "Lucan", rk: "K78", lat: 53.3544, lng: -6.4486, premium: 0.9 },
    { name: "Rush", rk: "K56", lat: 53.522, lng: -6.089, premium: 0.8 },
    { name: "Lusk", rk: "K45", lat: 53.526, lng: -6.167, premium: 0.8 },
  ],
  Galway: [
    {
      name: "Galway City",
      rk: "H91",
      lat: 53.27194,
      lng: -9.04889,
      premium: 1.2,
    },
    { name: "Salthill", rk: "H91", lat: 53.261, lng: -9.07506, premium: 1.3 },
    { name: "Oranmore", rk: "H91", lat: 53.2683, lng: -8.92, premium: 1.1 },
    { name: "Athenry", rk: "H65", lat: 53.3, lng: -8.746, premium: 0.95 },
    { name: "Loughrea", rk: "H62", lat: 53.197, lng: -8.567, premium: 0.85 },
    {
      name: "Ballinasloe",
      rk: "H53",
      lat: 53.3275,
      lng: -8.2194,
      premium: 0.8,
    },
    { name: "Tuam", rk: "H54", lat: 53.515, lng: -8.851, premium: 0.8 },
    { name: "Clifden", rk: "H71", lat: 53.489, lng: -10.021, premium: 0.9 },
    { name: "Gort", rk: "H91", lat: 53.066, lng: -8.818, premium: 0.8 },
    { name: "Portumna", rk: "H53", lat: 53.0892, lng: -8.2189, premium: 0.75 },
  ],
  Kerry: [
    { name: "Tralee", rk: "V92", lat: 52.2675, lng: -9.6962, premium: 0.95 },
    { name: "Killarney", rk: "V93", lat: 52.0588, lng: -9.5072, premium: 1.15 },
    { name: "Dingle", rk: "V92", lat: 52.13991, lng: -10.2715, premium: 1.2 },
    { name: "Listowel", rk: "V31", lat: 52.447, lng: -9.486, premium: 0.8 },
    { name: "Kenmare", rk: "V93", lat: 51.8801, lng: -9.5835, premium: 1.15 },
    {
      name: "Cahersiveen",
      rk: "V23",
      lat: 51.948,
      lng: -10.224,
      premium: 0.75,
    },
    {
      name: "Killorglin",
      rk: "V93",
      lat: 52.1065,
      lng: -9.78504,
      premium: 0.9,
    },
    {
      name: "Castleisland",
      rk: "V92",
      lat: 52.2307,
      lng: -9.4647,
      premium: 0.8,
    },
  ],
  Kildare: [
    { name: "Naas", rk: "W91", lat: 53.217, lng: -6.663, premium: 1.1 },
    { name: "Newbridge", rk: "W12", lat: 53.1805, lng: -6.7959, premium: 1.0 },
    {
      name: "Maynooth",
      rk: "W23",
      lat: 53.38157,
      lng: -6.59098,
      premium: 1.15,
    },
    { name: "Celbridge", rk: "W23", lat: 53.338, lng: -6.5388, premium: 1.05 },
    { name: "Leixlip", rk: "W23", lat: 53.36427, lng: -6.48807, premium: 1.1 },
    { name: "Athy", rk: "R14", lat: 52.99197, lng: -6.98698, premium: 0.8 },
    { name: "Kildare", rk: "R51", lat: 53.15772, lng: -6.91128, premium: 0.9 },
    {
      name: "Monasterevin",
      rk: "W34",
      lat: 53.13867,
      lng: -7.06082,
      premium: 0.85,
    },
    { name: "Clane", rk: "W91", lat: 53.29185, lng: -6.68612, premium: 1.0 },
    { name: "Sallins", rk: "W91", lat: 53.24923, lng: -6.66503, premium: 1.05 },
  ],
  Kilkenny: [
    { name: "Kilkenny", rk: "R95", lat: 52.65056, lng: -7.25139, premium: 1.1 },
    {
      name: "Thomastown",
      rk: "R95",
      lat: 52.52667,
      lng: -7.13722,
      premium: 0.95,
    },
    { name: "Callan", rk: "R95", lat: 52.55, lng: -7.38333, premium: 0.85 },
    { name: "Castlecomer", rk: "R95", lat: 52.806, lng: -7.21, premium: 0.85 },
    {
      name: "Graiguenamanagh",
      rk: "R95",
      lat: 52.54,
      lng: -6.955,
      premium: 0.9,
    },
  ],
  Laois: [
    {
      name: "Portlaoise",
      rk: "R32",
      lat: 53.03083,
      lng: -7.30083,
      premium: 1.05,
    },
    { name: "Portarlington", rk: "R32", lat: 53.16, lng: -7.19, premium: 0.95 },
    {
      name: "Mountmellick",
      rk: "R32",
      lat: 53.11628,
      lng: -7.3241,
      premium: 0.9,
    },
    { name: "Abbeyleix", rk: "R32", lat: 52.914, lng: -7.349, premium: 0.95 },
    { name: "Mountrath", rk: "R32", lat: 53, lng: -7.46667, premium: 0.85 },
  ],
  Leitrim: [
    {
      name: "Carrick-on-Shannon",
      rk: "N41",
      lat: 53.944,
      lng: -8.095,
      premium: 1.05,
    },
    {
      name: "Manorhamilton",
      rk: "F91",
      lat: 54.3064,
      lng: -8.1761,
      premium: 0.9,
    },
    { name: "Drumshanbo", rk: "N41", lat: 54.05, lng: -8.0333, premium: 0.9 },
    { name: "Mohill", rk: "N41", lat: 53.922, lng: -7.866, premium: 0.85 },
    { name: "Ballinamore", rk: "N41", lat: 54.052, lng: -7.802, premium: 0.85 },
  ],
  Limerick: [
    {
      name: "Limerick City",
      rk: "V94",
      lat: 52.6653,
      lng: -8.6238,
      premium: 1.05,
    },
    { name: "Adare", rk: "V94", lat: 52.564, lng: -8.79, premium: 1.25 },
    {
      name: "Castleconnell",
      rk: "V94",
      lat: 52.7143,
      lng: -8.5016,
      premium: 1.0,
    },
    {
      name: "Newcastle West",
      rk: "V42",
      lat: 52.451,
      lng: -9.055,
      premium: 0.8,
    },
    { name: "Kilmallock", rk: "V35", lat: 52.399, lng: -8.575, premium: 0.8 },
    {
      name: "Rathkeale",
      rk: "V94",
      lat: 52.51667,
      lng: -8.93333,
      premium: 0.7,
    },
  ],
  Longford: [
    { name: "Longford", rk: "N39", lat: 53.727, lng: -7.8, premium: 1.0 },
    { name: "Granard", rk: "N39", lat: 53.78, lng: -7.5, premium: 0.85 },
    {
      name: "Edgeworthstown",
      rk: "N39",
      lat: 53.69655,
      lng: -7.6097,
      premium: 0.85,
    },
    {
      name: "Ballymahon",
      rk: "N39",
      lat: 53.56667,
      lng: -7.76667,
      premium: 0.9,
    },
    {
      name: "Drumlish",
      rk: "N39",
      lat: 53.82052,
      lng: -7.76854,
      premium: 0.85,
    },
  ],
  Louth: [
    { name: "Dundalk", rk: "A91", lat: 54.00444, lng: -6.40028, premium: 1.0 },
    { name: "Drogheda", rk: "A92", lat: 53.715, lng: -6.3525, premium: 1.0 },
    { name: "Ardee", rk: "A92", lat: 53.8554, lng: -6.5379, premium: 0.85 },
    {
      name: "Carlingford",
      rk: "A91",
      lat: 54.04294,
      lng: -6.18609,
      premium: 1.1,
    },
    { name: "Dunleer", rk: "A92", lat: 53.83, lng: -6.395, premium: 0.85 },
    { name: "Clogherhead", rk: "A92", lat: 53.792, lng: -6.238, premium: 0.9 },
  ],
  Mayo: [
    { name: "Castlebar", rk: "F23", lat: 53.8608, lng: -9.2988, premium: 1.0 },
    { name: "Ballina", rk: "F26", lat: 54.1167, lng: -9.1667, premium: 0.9 },
    { name: "Westport", rk: "F28", lat: 53.8, lng: -9.5333, premium: 1.2 },
    {
      name: "Claremorris",
      rk: "F12",
      lat: 53.7169,
      lng: -8.99833,
      premium: 0.9,
    },
    {
      name: "Ballinrobe",
      rk: "F31",
      lat: 53.63333,
      lng: -9.2333,
      premium: 0.9,
    },
    {
      name: "Ballyhaunis",
      rk: "F35",
      lat: 53.7667,
      lng: -8.7667,
      premium: 0.8,
    },
    { name: "Belmullet", rk: "F26", lat: 54.225, lng: -9.991, premium: 0.8 },
    { name: "Swinford", rk: "F12", lat: 53.9417, lng: -8.95, premium: 0.8 },
  ],
  Meath: [
    { name: "Navan", rk: "C15", lat: 53.6528, lng: -6.6814, premium: 0.95 },
    { name: "Trim", rk: "C15", lat: 53.553, lng: -6.793, premium: 1.0 },
    { name: "Kells", rk: "A82", lat: 53.7272, lng: -6.8769, premium: 0.85 },
    { name: "Ashbourne", rk: "A84", lat: 53.512, lng: -6.398, premium: 1.1 },
    { name: "Ratoath", rk: "A85", lat: 53.506, lng: -6.463, premium: 1.15 },
    {
      name: "Dunshaughlin",
      rk: "A85",
      lat: 53.5118,
      lng: -6.5395,
      premium: 1.05,
    },
    { name: "Dunboyne", rk: "A86", lat: 53.42, lng: -6.475, premium: 1.15 },
    { name: "Enfield", rk: "A83", lat: 53.414, lng: -6.83, premium: 0.9 },
    {
      name: "Bettystown",
      rk: "A92",
      lat: 53.7014,
      lng: -6.2461,
      premium: 0.95,
    },
    { name: "Slane", rk: "C15", lat: 53.7086, lng: -6.5434, premium: 1.0 },
  ],
  Monaghan: [
    { name: "Monaghan", rk: "H18", lat: 54.24778, lng: -6.97083, premium: 1.0 },
    {
      name: "Carrickmacross",
      rk: "A81",
      lat: 53.976,
      lng: -6.719,
      premium: 0.95,
    },
    {
      name: "Castleblayney",
      rk: "A75",
      lat: 54.12,
      lng: -6.73889,
      premium: 0.85,
    },
    { name: "Clones", rk: "H23", lat: 54.183, lng: -7.2337, premium: 0.8 },
    {
      name: "Ballybay",
      rk: "A75",
      lat: 54.12934,
      lng: -6.90292,
      premium: 0.85,
    },
  ],
  Offaly: [
    { name: "Tullamore", rk: "R35", lat: 53.2667, lng: -7.5, premium: 1.05 },
    { name: "Birr", rk: "R42", lat: 53.0914, lng: -7.9133, premium: 0.95 },
    { name: "Edenderry", rk: "R45", lat: 53.345, lng: -7.05116, premium: 0.95 },
    {
      name: "Banagher",
      rk: "R42",
      lat: 53.18333,
      lng: -7.98333,
      premium: 0.85,
    },
    { name: "Clara", rk: "R35", lat: 53.34266, lng: -7.61353, premium: 0.85 },
  ],
  Roscommon: [
    { name: "Roscommon", rk: "F42", lat: 53.6333, lng: -8.1833, premium: 1.0 },
    { name: "Boyle", rk: "F52", lat: 53.973, lng: -8.301, premium: 0.9 },
    { name: "Castlerea", rk: "F45", lat: 53.7667, lng: -8.5, premium: 0.85 },
    { name: "Strokestown", rk: "F42", lat: 53.777, lng: -8.104, premium: 0.85 },
    {
      name: "Ballaghaderreen",
      rk: "F45",
      lat: 53.90008,
      lng: -8.58144,
      premium: 0.8,
    },
  ],
  Sligo: [
    { name: "Sligo", rk: "F91", lat: 54.2667, lng: -8.4833, premium: 1.05 },
    { name: "Ballymote", rk: "F56", lat: 54.0896, lng: -8.5167, premium: 0.85 },
    { name: "Tubbercurry", rk: "F91", lat: 54.05, lng: -8.7333, premium: 0.8 },
    {
      name: "Strandhill",
      rk: "F91",
      lat: 54.2719,
      lng: -8.5933,
      premium: 1.15,
    },
    { name: "Collooney", rk: "F91", lat: 54.183, lng: -8.492, premium: 0.95 },
  ],
  Tipperary: [
    { name: "Clonmel", rk: "E91", lat: 52.3539, lng: -7.7116, premium: 1.0 },
    { name: "Nenagh", rk: "E45", lat: 52.8632, lng: -8.1995, premium: 1.0 },
    { name: "Thurles", rk: "E41", lat: 52.679, lng: -7.814, premium: 0.9 },
    { name: "Cashel", rk: "E25", lat: 52.51672, lng: -7.88943, premium: 0.95 },
    { name: "Tipperary", rk: "E34", lat: 52.474, lng: -8.162, premium: 0.85 },
    { name: "Cahir", rk: "E21", lat: 52.375, lng: -7.925, premium: 0.9 },
    {
      name: "Carrick-on-Suir",
      rk: "E32",
      lat: 52.34651,
      lng: -7.412,
      premium: 0.8,
    },
    { name: "Roscrea", rk: "E53", lat: 52.955, lng: -7.797, premium: 0.8 },
    { name: "Templemore", rk: "E41", lat: 52.8, lng: -7.83, premium: 0.8 },
  ],
  Waterford: [
    {
      name: "Waterford City",
      rk: "X91",
      lat: 52.25667,
      lng: -7.12917,
      premium: 1.05,
    },
    { name: "Tramore", rk: "X91", lat: 52.1588, lng: -7.1463, premium: 1.1 },
    { name: "Dungarvan", rk: "X35", lat: 52.0845, lng: -7.6397, premium: 1.0 },
    {
      name: "Kilmacthomas",
      rk: "X42",
      lat: 52.20682,
      lng: -7.42249,
      premium: 0.85,
    },
    {
      name: "Dunmore East",
      rk: "X91",
      lat: 52.155,
      lng: -6.996,
      premium: 1.15,
    },
    { name: "Portlaw", rk: "X91", lat: 52.28333, lng: -7.31667, premium: 0.85 },
  ],
  Westmeath: [
    { name: "Mullingar", rk: "N91", lat: 53.5224, lng: -7.3378, premium: 1.0 },
    { name: "Athlone", rk: "N37", lat: 53.42361, lng: -7.9425, premium: 1.0 },
    { name: "Moate", rk: "N37", lat: 53.3954, lng: -7.7205, premium: 0.85 },
    { name: "Kinnegad", rk: "N91", lat: 53.455, lng: -7.101, premium: 0.95 },
    {
      name: "Castlepollard",
      rk: "N91",
      lat: 53.6798,
      lng: -7.2988,
      premium: 0.85,
    },
  ],
  Wexford: [
    { name: "Wexford", rk: "Y35", lat: 52.3383, lng: -6.4617, premium: 1.05 },
    {
      name: "Enniscorthy",
      rk: "Y21",
      lat: 52.50206,
      lng: -6.56588,
      premium: 0.9,
    },
    { name: "Gorey", rk: "Y25", lat: 52.677, lng: -6.292, premium: 1.0 },
    { name: "New Ross", rk: "Y34", lat: 52.396, lng: -6.945, premium: 0.85 },
    { name: "Rosslare", rk: "Y35", lat: 52.2513, lng: -6.3415, premium: 1.0 },
    { name: "Bunclody", rk: "Y21", lat: 52.655, lng: -6.651, premium: 0.85 },
    { name: "Courtown", rk: "Y25", lat: 52.645, lng: -6.229, premium: 0.95 },
  ],
  Wicklow: [
    { name: "Wicklow", rk: "A67", lat: 52.9779, lng: -6.033, premium: 1.0 },
    { name: "Rathnew", rk: "A67", lat: 52.9906, lng: -6.0853, premium: 0.95 },
    { name: "Rathdrum", rk: "A67", lat: 52.929, lng: -6.228, premium: 0.85 },
    { name: "Greystones", rk: "A63", lat: 53.144, lng: -6.072, premium: 1.3 },
    { name: "Delgany", rk: "A63", lat: 53.131, lng: -6.091, premium: 1.28 },
    { name: "Kilcoole", rk: "A63", lat: 53.1063, lng: -6.0645, premium: 1.05 },
    {
      name: "Newtownmountkennedy",
      rk: "A63",
      lat: 53.09011,
      lng: -6.11029,
      premium: 1.05,
    },
    { name: "Bray", rk: "A98", lat: 53.20139, lng: -6.11083, premium: 1.15 },
    { name: "Arklow", rk: "Y14", lat: 52.7941, lng: -6.1649, premium: 0.85 },
    { name: "Blessington", rk: "W91", lat: 53.17, lng: -6.533, premium: 1.05 },
  ],
};

/**
 * Counts sum to TARGET_COUNT. Price baselines are rough 2026 second-hand
 * asking-price levels per square metre — plausible rather than researched, and
 * deliberately so: this is demo data, not a market model.
 */
const COUNTIES: Record<string, CountyConfig> = {
  Dublin: { tier: "capital", count: 36, eurPerSqm: 4800 },
  Cork: { tier: "city", count: 26, eurPerSqm: 3000 },
  Galway: { tier: "city", count: 16, eurPerSqm: 2900 },
  Kildare: { tier: "commuter", count: 15, eurPerSqm: 3100 },
  Wicklow: { tier: "commuter", count: 14, eurPerSqm: 3400 },
  Meath: { tier: "commuter", count: 13, eurPerSqm: 2800 },
  Limerick: { tier: "city", count: 11, eurPerSqm: 2500 },
  Wexford: { tier: "regional", count: 11, eurPerSqm: 2200 },
  Tipperary: { tier: "regional", count: 11, eurPerSqm: 1900 },
  Kerry: { tier: "regional", count: 11, eurPerSqm: 2200 },
  Mayo: { tier: "regional", count: 11, eurPerSqm: 1750 },
  Donegal: { tier: "regional", count: 10, eurPerSqm: 1650 },
  Louth: { tier: "commuter", count: 10, eurPerSqm: 2350 },
  Waterford: { tier: "city", count: 10, eurPerSqm: 2300 },
  Clare: { tier: "regional", count: 10, eurPerSqm: 2200 },
  Kilkenny: { tier: "regional", count: 9, eurPerSqm: 2300 },
  Westmeath: { tier: "regional", count: 9, eurPerSqm: 2100 },
  Cavan: { tier: "regional", count: 8, eurPerSqm: 1750 },
  Offaly: { tier: "regional", count: 8, eurPerSqm: 1900 },
  Laois: { tier: "regional", count: 8, eurPerSqm: 2000 },
  Sligo: { tier: "regional", count: 8, eurPerSqm: 1900 },
  Roscommon: { tier: "regional", count: 8, eurPerSqm: 1550 },
  Carlow: { tier: "regional", count: 7, eurPerSqm: 2050 },
  Monaghan: { tier: "regional", count: 7, eurPerSqm: 1750 },
  Longford: { tier: "regional", count: 7, eurPerSqm: 1450 },
  Leitrim: { tier: "regional", count: 6, eurPerSqm: 1450 },
};

type PropertyType =
  "Detached" | "Semi-D" | "Terrace" | "Bungalow" | "Apartment" | "Cottage";

type Era = "period" | "midCentury" | "lateCentury" | "millennium" | "modern";

const TYPE_WEIGHTS: Record<Tier, Weighted<PropertyType>> = {
  capital: [
    ["Semi-D", 34],
    ["Apartment", 26],
    ["Terrace", 18],
    ["Detached", 14],
    ["Bungalow", 5],
    ["Cottage", 3],
  ],
  city: [
    ["Semi-D", 32],
    ["Detached", 22],
    ["Terrace", 16],
    ["Apartment", 16],
    ["Bungalow", 10],
    ["Cottage", 4],
  ],
  commuter: [
    ["Semi-D", 32],
    ["Detached", 30],
    ["Bungalow", 14],
    ["Terrace", 12],
    ["Apartment", 7],
    ["Cottage", 5],
  ],
  regional: [
    ["Detached", 36],
    ["Bungalow", 22],
    ["Semi-D", 18],
    ["Terrace", 12],
    ["Cottage", 9],
    ["Apartment", 3],
  ],
};

/** Older stock skews to the older eras, which in turn drives the BER bands. */
const ERA_WEIGHTS: Record<PropertyType, Weighted<Era>> = {
  Detached: [
    ["period", 10],
    ["midCentury", 16],
    ["lateCentury", 30],
    ["millennium", 28],
    ["modern", 16],
  ],
  "Semi-D": [
    ["period", 8],
    ["midCentury", 20],
    ["lateCentury", 34],
    ["millennium", 26],
    ["modern", 12],
  ],
  Terrace: [
    ["period", 30],
    ["midCentury", 30],
    ["lateCentury", 22],
    ["millennium", 13],
    ["modern", 5],
  ],
  Bungalow: [
    ["period", 8],
    ["midCentury", 30],
    ["lateCentury", 40],
    ["millennium", 18],
    ["modern", 4],
  ],
  // Purpose-built apartments barely exist in Ireland before the 1970s, and a
  // house marketed as a "cottage" is almost always pre-war stock.
  Apartment: [
    ["lateCentury", 16],
    ["millennium", 50],
    ["modern", 34],
  ],
  Cottage: [
    ["period", 70],
    ["midCentury", 24],
    ["lateCentury", 6],
  ],
};

const ERA_YEARS: Record<Era, [number, number]> = {
  period: [1890, 1939],
  midCentury: [1940, 1974],
  lateCentury: [1975, 1999],
  millennium: [2000, 2012],
  modern: [2013, 2025],
};

type BerBand = "A" | "B" | "C" | "D" | "E" | "F" | "G";

const BER_WEIGHTS: Record<Era, Weighted<BerBand>> = {
  period: [
    ["G", 16],
    ["F", 20],
    ["E", 28],
    ["D", 22],
    ["C", 12],
    ["B", 2],
  ],
  midCentury: [
    ["G", 6],
    ["F", 12],
    ["E", 24],
    ["D", 32],
    ["C", 20],
    ["B", 6],
  ],
  lateCentury: [
    ["F", 5],
    ["E", 14],
    ["D", 33],
    ["C", 33],
    ["B", 14],
    ["A", 1],
  ],
  millennium: [
    ["E", 5],
    ["D", 20],
    ["C", 43],
    ["B", 28],
    ["A", 4],
  ],
  modern: [
    ["C", 12],
    ["B", 38],
    ["A", 50],
  ],
};

const BER_SUBGRADES: Record<BerBand, Weighted<string>> = {
  A: [
    ["A1", 15],
    ["A2", 45],
    ["A3", 40],
  ],
  B: [
    ["B1", 20],
    ["B2", 45],
    ["B3", 35],
  ],
  C: [
    ["C1", 30],
    ["C2", 40],
    ["C3", 30],
  ],
  D: [
    ["D1", 55],
    ["D2", 45],
  ],
  E: [
    ["E1", 60],
    ["E2", 40],
  ],
  F: [["F", 1]],
  G: [["G", 1]],
};

const BER_PRICE_MULT: Record<BerBand, number> = {
  A: 1.1,
  B: 1.06,
  C: 1,
  D: 0.96,
  E: 0.9,
  F: 0.85,
  G: 0.8,
};

const TYPE_PRICE_MULT: Record<PropertyType, number> = {
  Detached: 1.06,
  "Semi-D": 1,
  Terrace: 0.94,
  Bungalow: 0.98,
  Apartment: 1.05,
  Cottage: 0.82,
};

const BEDS_WEIGHTS: Record<PropertyType, Weighted<number>> = {
  Apartment: [
    [1, 20],
    [2, 55],
    [3, 25],
  ],
  Terrace: [
    [2, 25],
    [3, 50],
    [4, 25],
  ],
  "Semi-D": [
    [2, 5],
    [3, 55],
    [4, 35],
    [5, 5],
  ],
  Bungalow: [
    [2, 10],
    [3, 50],
    [4, 35],
    [5, 5],
  ],
  Detached: [
    [3, 30],
    [4, 42],
    [5, 22],
    [6, 6],
  ],
  Cottage: [
    [1, 5],
    [2, 45],
    [3, 45],
    [4, 5],
  ],
};

/** floor_area_sqm ≈ base + perBed * beds, before noise. */
const AREA_MODEL: Record<PropertyType, [number, number]> = {
  Apartment: [30, 22],
  Terrace: [30, 25],
  "Semi-D": [28, 27],
  Bungalow: [25, 32],
  Detached: [30, 34],
  Cottage: [25, 22],
};

const OUTBUILDING_PROB: Record<PropertyType, number> = {
  Apartment: 0,
  Terrace: 0.12,
  "Semi-D": 0.2,
  Detached: 0.4,
  Bungalow: 0.45,
  Cottage: 0.5,
};

const FIBRE_PROB: Record<Tier, number> = {
  capital: 0.82,
  city: 0.78,
  commuter: 0.7,
  regional: 0.55,
};

// Address vocabulary — synthetic combinations, deliberately generic.
const ESTATE_PREFIX = [
  "Ash",
  "Beech",
  "Birch",
  "Cedar",
  "Elm",
  "Hazel",
  "Maple",
  "Oak",
  "Rowan",
  "Willow",
  "Alder",
  "Chestnut",
  "Hawthorn",
  "Sycamore",
];
const ESTATE_SUFFIX = [
  "field",
  "grove",
  "brook",
  "dale",
  "vale",
  "wood",
  "mount",
  "park",
  "court",
];
const STREET_TYPE = [
  "Avenue",
  "Close",
  "Court",
  "Crescent",
  "Drive",
  "Green",
  "Grove",
  "Lawn",
  "Manor",
  "Park",
  "Rise",
  "Road",
  "Square",
  "View",
  "Walk",
  "Way",
];
const RURAL_PREFIX = [
  "Ballin",
  "Cool",
  "Derry",
  "Drum",
  "Glen",
  "Knock",
  "Lis",
  "Rath",
  "Ross",
  "Tul",
];
const RURAL_SUFFIX = [
  "beg",
  "more",
  "duff",
  "keel",
  "rea",
  "namona",
  "aghy",
  "cara",
  "gowna",
];
const RURAL_ROAD = [
  "Old Mill Road",
  "Chapel Lane",
  "Church Road",
  "Station Road",
  "Bog Road",
  "Hill Road",
  "Mill Lane",
  "Forge Road",
  "Quarry Road",
  "Bridge Road",
];

/** Eircode character set: digits plus the 15 letters used by Eircodes. */
const EIRCODE_CHARS = "0123456789ACDEFHKNPRTVWXY";

// ---------------------------------------------------------------------------
// Field generators
// ---------------------------------------------------------------------------

function formatEuro(value: number): string {
  return "€" + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function eircode(rk: string): string {
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += EIRCODE_CHARS[Math.floor(rnd() * EIRCODE_CHARS.length)];
  }
  return `${rk} ${id}`;
}

function makeAddress(type: PropertyType, tier: Tier): string {
  const rural = tier === "regional" ? 0.45 : tier === "commuter" ? 0.3 : 0.12;
  if (type === "Apartment") {
    return `Apt ${int(1, 84)}, ${pick(ESTATE_PREFIX)}${pick(ESTATE_SUFFIX)} ${pick(["Court", "Hall", "Quay", "House", "Square"])}`;
  }
  if (chance(rural)) {
    return `${pick(RURAL_PREFIX)}${pick(RURAL_SUFFIX)}, ${pick(RURAL_ROAD)}`;
  }
  return `${int(1, 148)} ${pick(ESTATE_PREFIX)}${pick(ESTATE_SUFFIX)} ${pick(STREET_TYPE)}`;
}

function bathsFor(
  beds: number,
  type: PropertyType,
  area: number,
  era: Era,
): number {
  let baths = beds <= 2 ? 1 : beds <= 4 ? 2 : 3;
  if (type === "Apartment") baths = beds >= 3 ? 2 : chance(0.35) ? 2 : 1;
  const modern = era === "millennium" || era === "modern";
  if (modern && area > 140 && chance(0.45)) baths += 1;
  if (!modern && area < 95 && baths > 1 && chance(0.4)) baths -= 1;
  return Math.max(1, Math.min(4, baths));
}

/** Days since 2026-02-02, converted to an ISO date. The window is a fixed
 *  constant, never `Date.now()`, so the output stays reproducible. */
const WINDOW_START = Date.UTC(2026, 1, 2);
const WINDOW_DAYS = 194;

function publishDate(priceDrop: boolean): string {
  // Bias towards recent listings; price-dropped ones have been sitting longer.
  let day = Math.floor(Math.pow(rnd(), 0.7) * WINDOW_DAYS);
  if (priceDrop) day = Math.max(0, day - int(30, 70));
  return new Date(WINDOW_START + day * 86400000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Description assembly
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<PropertyType, string> = {
  Detached: "detached house",
  "Semi-D": "semi-detached house",
  Terrace: "terraced house",
  Bungalow: "bungalow",
  Apartment: "apartment",
  Cottage: "cottage",
};

const SETTING: Record<Tier, string[]> = {
  capital: [
    "in a mature residential scheme",
    "on a quiet tree-lined road",
    "a short walk from the village",
    "close to schools and transport links",
  ],
  city: [
    "in a settled residential area",
    "within walking distance of the town centre",
    "on the edge of the city",
    "convenient to schools, shops and the ring road",
  ],
  commuter: [
    "in a well-established estate",
    "on the outskirts of the town",
    "within easy reach of the motorway",
    "a few minutes from the train station",
  ],
  regional: [
    "in a quiet residential street near the town centre",
    "on the edge of the village",
    "a short walk from the main street",
    "in a settled residential estate",
  ],
};

/** Site-sized settings only make sense for a house on its own plot. */
const RURAL_SETTING = [
  "on a generous site on the edge of the village",
  "in a quiet rural setting",
  "on approximately half an acre",
  "with open country views to the rear",
];

const APARTMENT_SETTING = [
  "in a well-managed development",
  "a short walk from the town centre",
  "in a modern scheme close to transport links",
  "convenient to shops and services",
];

function settingFor(tier: Tier, type: PropertyType): string {
  if (type === "Apartment") return pick(APARTMENT_SETTING);
  if (
    tier === "regional" &&
    (type === "Detached" || type === "Bungalow" || type === "Cottage")
  ) {
    return pick(RURAL_SETTING);
  }
  return pick(SETTING[tier]);
}

const INTERIOR_FEATURES = [
  "a dual-aspect living room and an open-plan kitchen/dining area",
  "a large kitchen/diner to the rear and a separate sitting room",
  "a bright south-facing living room and a utility off the kitchen",
  "a hallway with original floors and two good reception rooms",
  "an open-plan living space with a wood-burning stove",
  "a sunroom off the kitchen overlooking the garden",
];

const APARTMENT_FEATURES = [
  "an open-plan living/dining area and a private balcony",
  "a bright living room with floor-to-ceiling glazing and a designated parking space",
  "a fitted kitchen open to the living area and a west-facing balcony",
  "a well-proportioned living room and secure underground parking",
];

const CONDITION_BY_ERA: Record<Era, string[]> = {
  period: [
    "Dating from {year}, it retains original features including sash windows and cast-iron fireplaces, and would benefit from modernisation throughout.",
    "Built around {year}, the property is structurally sound but is offered in need of refurbishment.",
  ],
  midCentury: [
    "Built in {year} and well maintained by the same family for many years, with scope to extend to the rear subject to planning.",
    "A solid {year} build, presented in good order with some updating advised.",
  ],
  lateCentury: [
    "Built in {year} and upgraded by the current owners over recent years, including rewiring and new windows.",
    "A {year} build with generous room proportions, presented in good decorative order.",
  ],
  millennium: [
    "Built in {year}, the property is presented in excellent decorative order throughout.",
    "Completed in {year} and carefully maintained since, with no work required.",
  ],
  modern: [
    "Completed in {year} and presented in turnkey condition.",
    "A {year} build finished to a high specification, with heat-recovery ventilation throughout.",
  ],
};

const OUTBUILDING_TEXT = [
  "A detached garage of c. {sqm} sqm sits to the side of the house, with power and light connected.",
  "A stone outbuilding of c. {sqm} sqm to the rear is dry and roofed, with obvious conversion potential subject to planning.",
  "A block-built workshop of c. {sqm} sqm adjoins the driveway and is currently used for storage.",
  "A former hay barn of c. {sqm} sqm stands at the end of the yard, structurally sound and ripe for conversion.",
];

const POD_TEXT = [
  "The rear garden is level and enclosed, with a serviced corner that would comfortably take a garden office pod.",
  "A flat, south-facing section of the rear garden is already ducted for power — an obvious spot for a garden room or office pod.",
  "There is ample room in the side garden for a home-office pod, with the boundary well screened by mature hedging.",
];

const PLAIN_GARDEN_TEXT = [
  "The rear garden is lawned and enclosed, with a paved patio off the kitchen.",
  "To the rear is a private garden laid mainly in lawn with mature planting.",
  "The garden to the rear is modest and low-maintenance, bounded by block walls.",
];

const CLOSING = [
  "Viewing comes highly recommended.",
  "Viewing strictly by appointment.",
  "Early viewing is advised.",
  "Immediate viewing available.",
];

interface DescriptionContext {
  beds: number;
  baths: number;
  area: number;
  type: PropertyType;
  town: string;
  county: string;
  tier: Tier;
  era: Era;
  year: number;
  ber: string;
  band: BerBand;
  outbuilding: boolean;
  outbuildingSqm: number | null;
  podSpace: boolean;
  fibre: boolean;
  priceDrop: boolean;
  price: number;
}

function buildDescription(c: DescriptionContext): string {
  const parts: string[] = [];

  parts.push(
    `A ${c.beds}-bed ${TYPE_LABEL[c.type]} in ${c.town}, Co. ${c.county}, ${settingFor(c.tier, c.type)}.`,
  );

  const features =
    c.type === "Apartment" ? pick(APARTMENT_FEATURES) : pick(INTERIOR_FEATURES);
  parts.push(
    `Accommodation extends to c. ${c.area} sqm with ${c.beds} bedrooms and ${c.baths} bathroom${c.baths > 1 ? "s" : ""}, including ${features}.`,
  );

  parts.push(pick(CONDITION_BY_ERA[c.era]).replace("{year}", String(c.year)));

  const fuel =
    c.type === "Apartment"
      ? "Gas-fired central heating"
      : c.tier === "capital" || c.tier === "city"
        ? "Gas-fired central heating"
        : "Oil-fired central heating";
  if (c.band === "A" || c.band === "B") {
    parts.push(
      `Heating is via an air-to-water heat pump with underfloor heating at ground level; BER ${c.ber}.`,
    );
  } else if (c.band === "C") {
    parts.push(`${fuel} and upgraded attic insulation give a BER of ${c.ber}.`);
  } else if (c.band === "D") {
    parts.push(
      `${fuel} throughout; BER ${c.ber}, with clear scope for an insulation upgrade.`,
    );
  } else {
    parts.push(
      `${fuel} and a solid-fuel stove; BER ${c.ber} — a strong candidate for a deep-retrofit grant.`,
    );
  }

  // Only ever mention an outbuilding when the flag says there is one.
  if (c.outbuilding && c.outbuildingSqm !== null) {
    parts.push(
      pick(OUTBUILDING_TEXT).replace("{sqm}", String(c.outbuildingSqm)),
    );
  }

  if (c.podSpace) {
    parts.push(pick(POD_TEXT));
  } else if (c.type !== "Apartment") {
    parts.push(pick(PLAIN_GARDEN_TEXT));
  }

  parts.push(
    c.fibre
      ? "Gigabit fibre broadband is connected at the property."
      : "Broadband is currently by fixed wireless; the street has not yet been passed for fibre.",
  );

  if (c.priceDrop) {
    const previous = Math.round((c.price * float(1.05, 1.14)) / 5000) * 5000;
    parts.push(
      `Recently reduced from ${formatEuro(previous)}; genuine reason for sale.`,
    );
  }

  parts.push(pick(CLOSING));

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Listing generation
// ---------------------------------------------------------------------------

function generateListing(
  county: string,
  cfg: CountyConfig,
  town: Town,
): DemoListing {
  const type = weighted(TYPE_WEIGHTS[cfg.tier]);
  const era = weighted(ERA_WEIGHTS[type]);
  const [yearFrom, yearTo] = ERA_YEARS[era];
  const year = int(yearFrom, yearTo);
  const beds = weighted(BEDS_WEIGHTS[type]);

  const [areaBase, areaPerBed] = AREA_MODEL[type];
  const area = Math.round((areaBase + areaPerBed * beds) * float(0.88, 1.15));
  const baths = bathsFor(beds, type, area, era);

  const band = weighted(BER_WEIGHTS[era]);
  const ber = weighted(BER_SUBGRADES[band]);

  let price =
    cfg.eurPerSqm *
    town.premium *
    area *
    TYPE_PRICE_MULT[type] *
    BER_PRICE_MULT[band] *
    float(0.9, 1.12);
  price = Math.round(price / 5000) * 5000;
  price = Math.max(75000, Math.min(1750000, price));

  let outbuildingProb = OUTBUILDING_PROB[type];
  if (cfg.tier === "regional") outbuildingProb += 0.08;
  if (cfg.tier === "capital") outbuildingProb -= 0.05;
  const outbuilding = chance(Math.max(0, Math.min(0.65, outbuildingProb)));
  const outbuildingSqm = outbuilding
    ? weighted([
        [int(12, 25), 30],
        [int(26, 45), 40],
        [int(46, 90), 30],
      ])
    : null;

  let podProb = 0;
  if (type !== "Apartment") {
    podProb = 0.28;
    if (outbuilding) podProb += 0.22;
    if (area >= 150) podProb += 0.1;
    if (cfg.tier === "regional" || cfg.tier === "commuter") podProb += 0.05;
  }
  const podSpace = chance(podProb);

  let fibreProb = FIBRE_PROB[cfg.tier];
  if (era === "modern") fibreProb += 0.1;
  const fibre = chance(Math.min(0.95, fibreProb));

  let dropProb = 0.18;
  if (band === "E" || band === "F" || band === "G") dropProb += 0.06;
  if (price > 500000) dropProb += 0.05;
  const priceDrop = chance(dropProb);

  const description = buildDescription({
    beds,
    baths,
    area,
    type,
    town: town.name,
    county,
    tier: cfg.tier,
    era,
    year,
    ber,
    band,
    outbuilding,
    outbuildingSqm,
    podSpace,
    fibre,
    priceDrop,
    price,
  });

  return {
    id: "",
    source: "demo",
    address: makeAddress(type, cfg.tier),
    town: town.name,
    county,
    eircode: eircode(town.rk),
    price_eur: price,
    beds,
    baths,
    property_type: type,
    ber,
    floor_area_sqm: area,
    lat: Number((town.lat + float(-0.018, 0.018)).toFixed(5)),
    lng: Number((town.lng + float(-0.026, 0.026)).toFixed(5)),
    description,
    publish_date: publishDate(priceDrop),
    outbuilding,
    outbuilding_sqm: outbuildingSqm,
    pod_space: podSpace,
    fibre,
    price_drop: priceDrop,
  };
}

function generateAll(): DemoListing[] {
  const listings: DemoListing[] = [];

  for (const [county, cfg] of Object.entries(COUNTIES)) {
    const towns = TOWNS[county];
    if (!towns || towns.length === 0) {
      throw new Error(`No towns configured for county ${county}`);
    }
    // Cycle through the county's towns so every town appears at least once,
    // then shuffle the order to avoid a mechanical-looking sequence.
    const order = shuffle(
      Array.from({ length: cfg.count }, (_, i) => towns[i % towns.length]),
    );
    for (const town of order) {
      listings.push(generateListing(county, cfg, town));
    }
  }

  const shuffled = shuffle(listings);
  shuffled.forEach((listing, i) => {
    listing.id = `demo-${String(i + 1).padStart(4, "0")}`;
  });
  return shuffled;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const PRIVATE_FIELDS = [
  "score",
  "tier",
  "dan_verdict",
  "drive_min",
  "over_budget_flag",
  "reno_band",
  "reno_cost_low",
  "reno_cost_high",
  "all_in_low",
  "all_in_high",
  "tags",
  "url",
];

const ALLOWED_FIELDS = [
  "id",
  "source",
  "address",
  "town",
  "county",
  "eircode",
  "price_eur",
  "beds",
  "baths",
  "property_type",
  "ber",
  "floor_area_sqm",
  "lat",
  "lng",
  "description",
  "publish_date",
  "outbuilding",
  "outbuilding_sqm",
  "pod_space",
  "fibre",
  "price_drop",
];

function validate(listings: DemoListing[]): string[] {
  const errors: string[] = [];

  if (listings.length !== TARGET_COUNT) {
    errors.push(`expected ${TARGET_COUNT} listings, got ${listings.length}`);
  }

  const counties = new Set(listings.map((l) => l.county));
  if (counties.size !== 26) {
    errors.push(`expected 26 counties, got ${counties.size}`);
  }

  for (const listing of listings) {
    const keys = Object.keys(listing);
    for (const key of keys) {
      if (PRIVATE_FIELDS.includes(key)) {
        errors.push(`${listing.id}: private-only field "${key}" present`);
      }
      if (!ALLOWED_FIELDS.includes(key)) {
        errors.push(`${listing.id}: unexpected field "${key}"`);
      }
    }
    for (const key of ALLOWED_FIELDS) {
      if (!keys.includes(key))
        errors.push(`${listing.id}: missing field "${key}"`);
    }

    if (!/^[A-Z][0-9A-Z]{2} [0-9ACDEFHKNPRTVWXY]{4}$/.test(listing.eircode)) {
      errors.push(`${listing.id}: malformed eircode "${listing.eircode}"`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(listing.publish_date)) {
      errors.push(
        `${listing.id}: malformed publish_date "${listing.publish_date}"`,
      );
    }
    if (listing.outbuilding !== (listing.outbuilding_sqm !== null)) {
      errors.push(
        `${listing.id}: outbuilding flag and outbuilding_sqm disagree`,
      );
    }

    // Description must never claim a feature the flags say is absent.
    const text = listing.description;
    if (
      !listing.outbuilding &&
      /garage|outbuilding|workshop|hay barn/i.test(text)
    ) {
      errors.push(
        `${listing.id}: description mentions an outbuilding but outbuilding=false`,
      );
    }
    if (!listing.pod_space && /office pod|garden room/i.test(text)) {
      errors.push(
        `${listing.id}: description mentions pod space but pod_space=false`,
      );
    }
    if (!listing.fibre && /fibre broadband is connected/i.test(text)) {
      errors.push(`${listing.id}: description claims fibre but fibre=false`);
    }
    if (!listing.price_drop && /recently reduced/i.test(text)) {
      errors.push(
        `${listing.id}: description claims a price drop but price_drop=false`,
      );
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Stats + main
// ---------------------------------------------------------------------------

function countBy<T>(
  items: T[],
  key: (item: T) => string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function printStats(listings: DemoListing[]): void {
  const prices = listings.map((l) => l.price_eur).sort((a, b) => a - b);
  const bands = countBy(listings, (l) => l.ber[0]);
  const types = countBy(listings, (l) => l.property_type);

  console.log(`listings:        ${listings.length}`);
  console.log(
    `counties:        ${new Set(listings.map((l) => l.county)).size}`,
  );
  console.log(`towns:           ${new Set(listings.map((l) => l.town)).size}`);
  console.log(
    `price range:     ${formatEuro(prices[0])} – ${formatEuro(prices[prices.length - 1])} (median ${formatEuro(prices[Math.floor(prices.length / 2)])})`,
  );
  console.log(
    `BER bands:       ${["A", "B", "C", "D", "E", "F", "G"]
      .map((b) => `${b}:${bands[b] ?? 0}`)
      .join("  ")}`,
  );
  console.log(
    `property types:  ${Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => `${t}:${n}`)
      .join("  ")}`,
  );
  const pct = (n: number) => `${Math.round((n / listings.length) * 100)}%`;
  console.log(
    `flags:           outbuilding ${pct(listings.filter((l) => l.outbuilding).length)}  pod_space ${pct(
      listings.filter((l) => l.pod_space).length,
    )}  fibre ${pct(listings.filter((l) => l.fibre).length)}  price_drop ${pct(
      listings.filter((l) => l.price_drop).length,
    )}`,
  );
}

function main(): void {
  const listings = generateAll();
  const errors = validate(listings);
  if (errors.length > 0) {
    console.error("Dataset validation failed:");
    for (const error of errors.slice(0, 20)) console.error(`  - ${error}`);
    if (errors.length > 20)
      console.error(`  ... and ${errors.length - 20} more`);
    process.exit(1);
  }

  const outPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "src",
    "data",
    "listings.json",
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(listings, null, 2) + "\n", "utf8");

  printStats(listings);
  console.log(`wrote ${outPath}`);
}

// Only run when invoked directly (`npm run generate-data`), never on import.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
