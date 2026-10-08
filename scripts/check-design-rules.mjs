#!/usr/bin/env node
// Fails the build when the source carries a pattern DESIGN.md bans.
//
// Usage:
//   node scripts/check-design-rules.mjs            scan src/ and public/*.svg
//   node scripts/check-design-rules.mjs <paths...>  scan only these files or folders
//
// Scopes, so a rule only looks where the pattern can do harm:
//   file     the whole file, comments included (characters, colors, effects)
//   code     whole TS and JS files only (three.js and inline style patterns)
//   css      whole CSS files only
//   svg      whole SVG files only
//   text     user-facing text: string literals, template text, JSX text and
//            CSS content strings (module specifiers and className values are
//            left out, so identifiers never trip a copy rule)
//   classes  every string literal including className values, plus CSS @apply
//            lines (Tailwind classes)
//
// Exceptions live in ALLOW below, each with the reason it exists. Add to it
// only with a matching line in DESIGN.md.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXCLUDE = new Set(["src/data/github.ts"]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const SCAN_EXT = new Set([...CODE_EXT, ".css", ".svg"]);

const ALLOW = {
  hatch: {
    files: [
      "src/app/styles/pathfinding.css",
      "src/components/site/Pathfinding.tsx",
      "src/components/portfolio/Playground.tsx",
      "src/lib/playground.ts",
    ],
    why: "the BFS explored-cell hatch is the one gradient DESIGN.md allows",
  },
  colorFunctions: {
    files: ["src/app/globals.css"],
    why: "the token file is the only place a color is defined",
  },
};

const TOKEN_HEX = new Set([
  "#000", "#000000", "#fff", "#ffffff",
  "#595959", "#a6a6a6", "#d9d9d9", "#333333", "#f2f2f2", "#111111",
]);
const TOKEN_HEX_NUMERIC = new Set([...TOKEN_HEX].filter((h) => h.length === 7).map((h) => `0x${h.slice(1)}`));
const BLACK_WHITE_LITERALS = /^\s*(["'`](#000|#000000|#fff|#ffffff|black|white)["'`]|0x000000|0xffffff|0\s*,\s*0\s*,\s*0|1\s*,\s*1\s*,\s*1)\s*[,)]/i;

const HUES =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";

const CSS_NAMED_COLOR = new RegExp(
  ":\\s*[^;{}]*?\\b(?:dark|light|medium|pale|deep|dim|hot|indian|royal|steel|sky|sea|slate|dodger|cornflower|midnight|rebecca|forest|lawn|spring|olive|cadet|blanched|floral|ghost|navajo|papaya|peach|powder|rosy|saddle|sandy|white)?" +
    "(?:red|green|blue|yellow|orange|purple|violet|pink|teal|cyan|magenta|lime|indigo|navy|maroon|olive|aqua|fuchsia|gold|silver|gray|grey|brown|beige|coral|salmon|crimson|khaki|lavender|plum|orchid|tomato|turquoise|chocolate|ivory|linen|wheat|azure|smoke|gainsboro|chartreuse|bisque|moccasin|honeydew|seashell|snow|thistle|sienna|peru)\\b",
  "gi",
);

const BANNED_PHRASES = [
  "explore", "explores", "exploring",
  "unlock", "unlocks", "unlocked", "unlocking",
  "elevate", "elevates", "elevated", "elevating",
  "seamless", "seamlessly",
  "empower", "empowers", "empowered", "empowering", "empowerment",
  "supercharge", "supercharged", "supercharges",
  "streamline", "streamlined", "streamlines",
  "delve", "delves", "delving",
  "journey", "journeys",
  "passionate", "passionately",
  "cutting-edge",
  "innovate", "innovates", "innovative", "innovation", "innovations",
  "crafted", "handcrafted",
  "curiosity", "curious",
  "on purpose", "under the hood", "behind the", "the space in between",
  "let's talk", "let\u2019s talk", "say hello", "worth building", "built with",
  "brain", "brains",
  "from the ground up", "end to end", "end-to-end",
  "challenge", "challenges", "challenging",
  "clearer", "dependable", "echoed",
  "foster", "fosters", "fostered", "fostering",
  "leverage", "leverages", "leveraged", "leveraging",
  "matters", "multifaceted", "practical", "practically",
  "prioritize", "prioritizes", "prioritized", "prioritizing",
  "quietly", "steady", "steadily", "universally",
  "additionally", "align with", "aligns with", "boasts", "boast",
  "crucial", "crucially", "pivotal", "robust", "robustly",
  "showcase", "showcases", "showcased", "showcasing",
  "highlight", "highlights", "highlighted", "highlighting",
  "underscore", "underscores", "underscored",
  "testament", "tapestry", "vibrant", "intricate", "meticulous", "meticulously",
  "landscape", "enhance", "enhances", "enhanced", "enhancing", "enhancement",
  "serves as",
  "robotics engineer", "ai engineer", "building in public", "built in public", "work in progress",
  "junior", "sophomore",
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BANNED_RE = new RegExp(`(?<![\\w-])(?:${BANNED_PHRASES.map(escapeRe).join("|")})(?![\\w-])`, "gi");

const COLOR_WORDS =
  /\b(?:green|violet|purple|lime|teal|indigo|lavender|cyan|magenta|fuchsia|orange|yellow|blue|red|pink|amber|emerald|cream|beige|gold|golden|brass|copper)\b/gi;

// Words that are fine once but read as a modesty motif when they pile up (critic 7.3 item 2).
const ECHO_WORDS = /\b(?:small|little|actual|actually|real|really)\b/gi;

const RULES = [
  // Type
  { id: "uppercase", scope: "css", re: /text-transform\s*:\s*uppercase/gi, msg: "uppercase text is banned (T3)" },
  { id: "uppercase", scope: "classes", re: /(?<![\w-])uppercase(?![\w-])/g, msg: "uppercase class or value is banned (T3)" },
  { id: "small-caps", scope: "file", re: /small-caps|font-variant-caps/gi, msg: "caps variants are banned (T3)" },
  { id: "tracking", scope: "css", re: /letter-spacing\s*:\s*(-?(?:\d+\.?\d*|\.\d+))(em|rem|px)?/gi, check: trackingCheck, msg: "letter-spacing must be 0 or between -0.02em and 0 (T3, T5)" },
  { id: "tracking", scope: "file", re: /letterSpacing\s*:\s*["'`]?(-?(?:\d+\.?\d*|\.\d+))(em|rem|px)?/g, check: trackingCheck, msg: "letterSpacing must be 0 or between -0.02em and 0 (T3, T5)" },
  { id: "tracking", scope: "classes", re: /(?<![\w-])tracking-(?:wide|wider|widest|\[(?:0?\.\d*[1-9]|[1-9])[^\]]*\])/g, msg: "positive tracking classes are banned (T3)" },
  { id: "min-size", scope: "css", re: /(?<![-\w])font-size\s*:\s*(\d+\.?\d*|\.\d+)(px|rem)\b/gi, check: minSizeCheck, msg: "text under 14px is banned (T3)" },
  { id: "min-size", scope: "classes", re: /(?<![\w-])text-(?:xs|\[(?:\d|1[0-3])px\])(?![\w-])/g, msg: "text under 14px is banned (T3)" },
  { id: "font", scope: "file", re: /\b(?:Inter|Geist|Space[ _]Grotesk|Instrument[ _](?:Sans|Serif)|Fraunces|Fragment[ _]Mono|Satoshi|Plus[ _]Jakarta(?:[ _]Sans)?|DM[ _]Sans|Manrope|Bricolage(?:[ _]Grotesque)?|Playfair(?:[ _]Display)?|JetBrains[ _]Mono|IBM[ _]Plex(?:[ _]\w+)?|Roboto|Overpass(?:[ _]Mono)?)(?![\w-])/g, msg: "only Atkinson Hyperlegible Next and Mono are allowed (T1)" },
  { id: "mono", scope: "classes", re: /(?<![\w-])font-mono(?![\w-])/g, msg: "use the .mono class on measurements, part numbers, code and counts only (T2)" },
  { id: "mono", scope: "code", re: /var\(\s*--font-mono\s*\)/g, msg: "set mono with the .mono class, not inline (T2)" },
  { id: "mono", scope: "css", re: /var\(\s*--font-mono\s*\)/g, check: monoSelectorCheck, msg: "var(--font-mono) only in code, pre, kbd, samp, time, .mono, .measure or a status selector (T2)" },

  // Characters, anywhere, comments included
  { id: "dash", scope: "file", re: /[\u2014\u2013]/g, msg: "no em or en dashes (W11)" },
  { id: "dash", scope: "file", re: /\s--\s/g, check: (m, src) => !/eslint-(?:disable|enable)/.test(lineOf(src, m.index)), msg: "no double-hyphen dashes (W11); the ESLint directive separator is fine" },
  { id: "arrow", scope: "file", re: /[\u2190-\u21ff\u2794\u279c\u27f6\u27f5\u2b62\u2b95\u203a\u00bb\u00ab]/g, msg: "no arrows (T7)" },
  { id: "arrow", scope: "file", re: /(?<!-)->(?!>)/g, msg: "no ASCII arrows (T7)" },
  { id: "dot", scope: "file", re: /[\u00b7\u2022\u2219\u22c5]/g, msg: "no middle dots or bullets as separators (T6)" },
  { id: "glyph", scope: "file", re: /\u00d7/g, msg: "no multiplication sign as an icon (I2)" },
  { id: "numbered", scope: "file", re: /(?<![\w.])0[1-9]\s*\//g, msg: "no numbered labels like 01 / (L6)" },

  // Color
  { id: "hex", scope: "file", re: /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g, check: (m) => !TOKEN_HEX.has(m[0].toLowerCase()), msg: "hex color outside the five tokens (C1)" },
  { id: "hex", scope: "code", re: /(?<![\w])0x[0-9a-fA-F]{6}(?![\w])/g, check: (m) => !TOKEN_HEX_NUMERIC.has(m[0].toLowerCase()), msg: "numeric hex color outside the five tokens (C1)" },
  { id: "color-fn", scope: "file", re: /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(/gi, allow: "colorFunctions", msg: "color functions are banned outside the token file (C1)" },
  { id: "color-fn", scope: "code", re: /\.(?:setHSL|offsetHSL)\(/g, msg: "three.js colors come from resolved tokens, never from a hue (C1)" },
  { id: "three-color", scope: "code", re: /new\s+(?:THREE\.)?Color\(\s*(?=["'`\d])/g, check: (m, src) => !BLACK_WHITE_LITERALS.test(src.slice(m.index + m[0].length)), msg: "THREE.Color takes a resolved token; literals only for the black OLED panel and white eyes (C1)" },
  { id: "named-color", scope: "css", re: CSS_NAMED_COLOR, msg: "named colors are hues; use a token (C1)" },
  { id: "named-color", scope: "svg", re: /(?:fill|stroke|stop-color|flood-color|lighting-color|color)\s*=\s*["'](?!none|currentColor|transparent|black|white|#|url|var)[a-z]+["']/gi, msg: "named colors are hues; use a token (C1)" },
  { id: "tailwind-color", scope: "classes", re: new RegExp(`(?<![\\w-])(?:bg|text|border|from|via|to|ring|fill|stroke|outline|decoration|divide|accent|caret|placeholder|shadow)-(?:${HUES})-`, "g"), msg: "Tailwind palette classes are banned (C1)" },
  { id: "color-word", scope: "text", re: COLOR_WORDS, msg: "no color words in user-facing text (K7)" },

  // Effects
  { id: "gradient", scope: "file", re: /(?<![\w-])(?:linear|radial|conic|repeating-radial|repeating-conic)-gradient\(/gi, msg: "gradients are banned (C2)" },
  { id: "gradient", scope: "file", re: /repeating-linear-gradient\(/gi, allow: "hatch", msg: "the only gradient is the BFS explored-cell hatch (C2)" },
  { id: "gradient", scope: "classes", re: /(?<![\w-])bg-(?:linear|gradient|radial|conic)-/g, msg: "gradient classes are banned (C2)" },
  { id: "shadow", scope: "file", re: /(?<![\w-])(?:box-shadow|boxShadow)\s*:\s*["'`]?([^;"'`}]*)/g, check: (m) => !/^\s*(none|inset\s+0(px)?\s+0(px)?\s+0(px)?\s+\d+px\s+var\(--(ink|paper|muted|rule|wash)\))\s*$/.test(m[1]), msg: "shadows are banned; a zero-blur inset ring in a token is the one exception (V5)" },
  { id: "shadow", scope: "file", re: /(?<![\w-])(?:text-shadow|textShadow)\s*:/g, msg: "text shadows are banned (V1)" },
  { id: "shadow", scope: "classes", re: /(?<![\w-])(?:shadow|drop-shadow|text-shadow|inset-shadow)-(?!none)/g, msg: "shadow classes are banned (V5)" },
  { id: "blur", scope: "file", re: /(?<![\w.-])(?:backdrop-filter|backdropFilter|blur\(|drop-shadow\()/g, msg: "blur and glass are banned (V2)" },
  { id: "blur", scope: "classes", re: /(?<![\w-])(?:backdrop-blur(?:-[\w[\]]+)?(?![\w-])|blur-(?:none|xs|sm|md|lg|xl|2xl|3xl|\[))/g, msg: "blur classes are banned (V2)" },
  { id: "pill", scope: "classes", re: /(?<![\w-])rounded-full(?![\w-])/g, msg: "pills are banned (V5)" },
  { id: "pill", scope: "css", re: /border-radius\s*:\s*(?:999|9999)px/gi, msg: "pills are banned (V5)" },
  { id: "bloom", scope: "code", re: /\b(?:UnrealBloomPass|EffectComposer|RoomEnvironment|ACESFilmicToneMapping|AgXToneMapping|ReinhardToneMapping|CineonToneMapping|NeutralToneMapping)\b/g, msg: "no bloom, post-processing or tone mapping on the model (M4, 7.4 item 5)" },
  { id: "bloom", scope: "code", re: /new\s+(?:THREE\.)?Fog(?:Exp2)?\(/g, msg: "no fog on the model (7.4 item 4)" },

  // Motion and interaction
  { id: "motion-lib", scope: "file", re: /(?:from\s+|import\s*\(\s*|require\(\s*)["'](?:lucide-react|lenis|@studio-freight\/lenis|framer-motion|motion\/react|motion|gsap(?:\/[\w-]+)?|@gsap\/react|locomotive-scroll|react-icons(?:\/\w+)?|@heroicons\/[\w/-]+|@phosphor-icons\/[\w-]+|@tabler\/icons-react|@radix-ui\/react-icons)["']/g, msg: "motion, smooth-scroll and icon libraries are removed (N1, N2, I1)" },
  { id: "loop", scope: "css", re: /\binfinite\b/g, msg: "no infinite animation (N4)" },
  { id: "loop", scope: "classes", re: /(?<![\w-])animate-(?:spin|ping|pulse|bounce|\[)/g, msg: "animation classes are banned (N1, N4)" },
  { id: "transition-all", scope: "file", re: /(?<![\w-])transition(?:-property)?\s*:\s*["'`]?all\b|(?<![\w-])transition-all(?![\w-])/g, msg: "never transition all (X3)" },
  { id: "cursor", scope: "file", re: /cursor\s*:\s*["'`]?none/g, msg: "no custom cursors (X1)" },
  { id: "z-index", scope: "file", re: /(?<![\w-])(?:z-index|zIndex)\s*:\s*["'`]?(\d+)/g, check: (m) => Number(m[1]) >= 100, msg: "use the named z-index scale, never 9999 (H4)" },
  { id: "vw", scope: "file", re: /(?<![\w.])100vw\b/g, msg: "use width: 100%, never 100vw (H4)" },

  // Copy and facts
  { id: "banned-word", scope: "text", re: BANNED_RE, msg: "banned word or phrase (DESIGN.md copy rules)" },
  { id: "range", scope: "text", re: /\bfrom\s+(?:the\s+)?[A-Za-z][\w-]*\s+to\s+(?:the\s+)?[A-Za-z][\w-]*/gi, msg: "no 'from X to Y' ranges (W8)" },
  { id: "est", scope: "text", re: /(?<![\w])est\.(?=\s|$)/gi, msg: "no 'est.' stamps (I4)" },
  { id: "fact", scope: "file", re: /Class of 2026|\u201926\b|team2554\.org/gi, msg: "stale or dead fact: class of 2028, no team2554.org (section 5)" },
  { id: "domain", scope: "file", re: /aryavora\.com/gi, check: (m, src) => !/AryaVora621\/$/i.test(src.slice(Math.max(0, m.index - 12), m.index)), msg: "aryavora.com has no DNS; use arya-vora.org (section 5)" },
];

function lineOf(src, index) {
  const start = src.lastIndexOf("\n", index) + 1;
  const end = src.indexOf("\n", index);
  return src.slice(start, end === -1 ? src.length : end);
}

function trackingCheck(m) {
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value === 0) return false;
  if (value > 0) return true;
  return (m[2] ?? "em").toLowerCase() === "em" ? value < -0.02 : false;
}

function minSizeCheck(m) {
  const value = Number(m[1]);
  return m[2].toLowerCase() === "px" ? value < 14 : value < 0.875;
}

function monoSelectorCheck(m, src) {
  const before = src.slice(0, m.index);
  const brace = before.lastIndexOf("{");
  if (brace < 0) return true;
  const start = Math.max(before.lastIndexOf("}", brace), before.lastIndexOf(";", brace), before.lastIndexOf("{", brace - 1)) + 1;
  const selector = before.slice(start, brace).replace(/\/\*[\s\S]*?\*\//g, "");
  return !/(?:^|[\s,>+~(])(?:code|pre|kbd|samp|time)\b|\.mono\b|\.measure\b|status/.test(selector);
}

function walk(path, out) {
  const stat = statSync(path, { throwIfNoEntry: false });
  if (!stat) return;
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(join(path, name), out);
    }
  } else if (SCAN_EXT.has(extname(path))) {
    out.push(path);
  }
}

function defaultTargets() {
  const files = [];
  walk(join(ROOT, "src"), files);
  for (const name of readdirSync(join(ROOT, "public"))) {
    if (name.endsWith(".svg")) files.push(join(ROOT, "public", name));
  }
  return files;
}

function isModuleSpecifier(node) {
  const p = node.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
  if (ts.isCallExpression(p) && (p.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(p.expression) && p.expression.text === "require"))) return true;
  if (ts.isLiteralTypeNode(p) && p.parent && ts.isImportTypeNode(p.parent)) return true;
  return false;
}

function isClassNameValue(node) {
  let n = node.parent;
  while (n && !ts.isJsxAttribute(n)) {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isSourceFile(n)) return false;
    n = n.parent;
  }
  return Boolean(n && ts.isJsxAttribute(n) && n.name.getText() === "className");
}

// Collects string, template and JSX text ranges with the TypeScript parser, so
// identifiers like `highlight` in code never trip a copy rule.
function codeSegments(file, src) {
  const kind = /\.(tsx|jsx)$/.test(file) ? ts.ScriptKind.TSX : /\.ts$/.test(file) ? ts.ScriptKind.TS : ts.ScriptKind.JSX;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind);
  const text = [];
  const classes = [];
  const visit = (node) => {
    const isString = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
    const isTemplatePart = ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node);
    if ((isString || isTemplatePart) && !isModuleSpecifier(node)) {
      const range = [node.getStart(sf), node.end];
      classes.push(range);
      if (!isClassNameValue(node)) text.push(range);
    } else if (ts.isJsxText(node)) {
      text.push([node.pos, node.end]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { text, classes };
}

function cssSegments(src) {
  const text = [];
  const classes = [];
  for (const m of src.matchAll(/content\s*:\s*(["'])(.*?)\1/g)) text.push([m.index, m.index + m[0].length]);
  for (const m of src.matchAll(/@apply\s[^;]+;/g)) classes.push([m.index, m.index + m[0].length]);
  return { text, classes };
}

function lineCol(src, index) {
  let line = 1;
  let last = -1;
  for (let i = src.indexOf("\n"); i !== -1 && i < index; i = src.indexOf("\n", i + 1)) {
    line += 1;
    last = i;
  }
  return { line, col: index - last };
}

function scanRanges(rule, src, ranges, hits) {
  for (const [start, end] of ranges) {
    const slice = src.slice(start, end);
    rule.re.lastIndex = 0;
    for (let m; (m = rule.re.exec(slice)); ) {
      if (m[0] === "") {
        rule.re.lastIndex += 1;
        continue;
      }
      const absolute = Object.assign([...m], { index: start + m.index });
      if (rule.check && !rule.check(absolute, src)) continue;
      hits.push({ index: start + m.index, match: m[0] });
    }
  }
}

function checkFile(abs) {
  const rel = relative(ROOT, abs).split(sep).join("/");
  if (EXCLUDE.has(rel)) return { violations: [], echoes: 0 };
  const src = readFileSync(abs, "utf8");
  const ext = extname(abs);
  const isCode = CODE_EXT.has(ext);
  const isCss = ext === ".css";
  const isSvg = ext === ".svg";
  const whole = [[0, src.length]];
  const segs = isCode ? codeSegments(rel, src) : isCss ? cssSegments(src) : { text: whole, classes: whole };

  const violations = [];
  for (const rule of RULES) {
    if (rule.allow && ALLOW[rule.allow].files.includes(rel)) continue;
    let ranges;
    switch (rule.scope) {
      case "file": ranges = whole; break;
      case "code": ranges = isCode ? whole : []; break;
      case "css": ranges = isCss ? whole : []; break;
      case "svg": ranges = isSvg ? whole : []; break;
      case "text": ranges = segs.text; break;
      case "classes": ranges = segs.classes; break;
      default: ranges = [];
    }
    const hits = [];
    scanRanges(rule, src, ranges, hits);
    for (const hit of hits) {
      const { line, col } = lineCol(src, hit.index);
      violations.push({ rel, line, col, id: rule.id, msg: rule.msg, match: hit.match.trim().slice(0, 60) });
    }
  }

  let echoes = 0;
  for (const [start, end] of segs.text) echoes += (src.slice(start, end).match(ECHO_WORDS) ?? []).length;
  return { violations, echoes, rel };
}

const args = process.argv.slice(2);
const targets = [];
if (args.length) {
  for (const arg of args) walk(resolve(process.cwd(), arg), targets);
} else {
  targets.push(...defaultTargets());
}

const all = [];
const echoByFile = [];
for (const file of targets.sort()) {
  const { violations, echoes, rel } = checkFile(file);
  all.push(...violations);
  if (echoes) echoByFile.push(`${rel} (${echoes})`);
}

// Dedupe hits that two overlapping rules report at the same spot.
const seen = new Set();
const unique = all.filter((v) => {
  const key = `${v.rel}:${v.line}:${v.col}:${v.id}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

if (echoByFile.length) {
  console.log(`Read-through only (not failing): small, little, actual or real in ${echoByFile.join(", ")}.`);
}

if (unique.length) {
  for (const v of unique) console.error(`${v.rel}:${v.line}:${v.col}  ${v.id}  ${v.msg}  [${v.match}]`);
  console.error(`\ncheck-design-rules: ${unique.length} violation${unique.length === 1 ? "" : "s"} in ${new Set(unique.map((v) => v.rel)).size} of ${targets.length} files. See DESIGN.md.`);
  process.exit(1);
}

console.log(`check-design-rules: ${targets.length} files clean.`);
