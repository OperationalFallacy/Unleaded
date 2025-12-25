import { Schema as S } from 'effect';

// Models to exclude from results
const stopList = new Set([
  'solterra',
  'promaster',
  'hardtop',
  'e-transit',
  'ocean',
  'vf8',
  'smart',
  'fortwo',
]);

type NormalizationRule = {
  pattern: RegExp;
  replace: string | ((match: RegExpMatchArray) => string);
};

const rules: NormalizationRule[] = [
  // Tesla: "2", "3", "4" => "Model 2", "Model 3", "Model 4"
  { pattern: /^([234])$/i, replace: (m) => `Model ${m[1]}` },

  // Bolt variants => Bolt
  { pattern: /^bolt\s+.+$/i, replace: 'Bolt' },

  // Hummer variants => Hummer
  { pattern: /^hummer\s+.+$/i, replace: 'Hummer' },

  // Q4/Q8 e-tron variants => Q4/Q8
  { pattern: /^(q\d+)\s+.+$/i, replace: (m) => `Q${m[1].slice(1)}` },

  // SQ6 e-tron => SQ6
  { pattern: /^(sq\d+)\s+.+$/i, replace: (m) => m[1].toUpperCase() },

  // C40 recharge => C40
  { pattern: /^(c\d+)\s+.+$/i, replace: (m) => `C${m[1].slice(1)}` },

  // E-tron variants => E-tron
  { pattern: /^e-tron\s+.+$/i, replace: 'E-tron' },

  // Id.4 => ID.4
  { pattern: /^id\.(\d+)$/i, replace: (m) => `ID.${m[1]}` },

  // Mustang mach-e => Mach-E
  { pattern: /^mustang\s+mach-e$/i, replace: 'Mach-E' },

  // Escalade iq/iql => Escalade
  { pattern: /^escalade\s+.+$/i, replace: 'Escalade' },

  // Sierra ev => Sierra
  { pattern: /^sierra\s+.+$/i, replace: 'Sierra' },

  // Silverado ev => Silverado
  { pattern: /^silverado\s+.+$/i, replace: 'Silverado' },

  // Equinox ev => Equinox
  { pattern: /^equinox\s+.+$/i, replace: 'Equinox' },

  // Blazer ev => Blazer
  { pattern: /^blazer\s+.+$/i, replace: 'Blazer' },

  // F-150 lightning => F-150
  { pattern: /^f-150\s+.+$/i, replace: 'F-150' },

  // Niro ev => Niro
  { pattern: /^niro\s+.+$/i, replace: 'Niro' },

  // Lyriq-v => Lyriq
  { pattern: /^lyriq.+$/i, replace: 'Lyriq' },

  // Filter garbage (length < 2)
  { pattern: /^.{0,1}$/, replace: '' },
];

// Capitalize each word: "IONIQ 6" -> "Ioniq 6", "ARIYA" -> "Ariya"
const capitalizeWords = (s: string): string =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const normalizeModel = (value: string): string => {
  const trimmed = value.trim();

  // Check stop list first
  if (stopList.has(trimmed.toLowerCase())) {
    return '';
  }

  // Apply pattern rules
  for (const rule of rules) {
    const match = trimmed.match(rule.pattern);
    if (match) {
      const result =
        typeof rule.replace === 'function' ? rule.replace(match) : rule.replace;
      return result;
    }
  }

  // Default: capitalize words
  return capitalizeWords(trimmed);
};

export const NormalizedModelName = S.transform(
  S.Union(S.String, S.Number),
  S.String,
  {
    strict: true,
    decode: (value) => normalizeModel(String(value)),
    encode: (value) => value,
  },
);
