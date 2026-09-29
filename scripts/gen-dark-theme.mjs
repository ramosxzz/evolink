#!/usr/bin/env node
// Generates src/app/theme-dark.css: dark-mode versions of every hard-coded
// color utility used in src (bg-[#…], text-[#…], border-white/70, hover:…).
// Light surfaces become dark surfaces, dark text becomes light text, light
// borders darken, and brand/mid-tone fills are kept. Run after adding colors:
//   node scripts/gen-dark-theme.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx|ts)$/.test(name)) files.push(path);
  }
})(join(root, "src"));

const token = /(?<![\w-])((?:(?:hover|focus|focus-visible|active|disabled|group-hover|placeholder):)*)(bg|text|border|border-t|border-b|border-l|border-r|from|via|to|ring|fill|stroke|divide|outline|placeholder|accent|caret)-(\[#[0-9a-fA-F]{3,8}\]|white|black)(?:\/(\d{1,3}))?(?![\w\]-])/g;
const found = new Map();
for (const file of files) {
  for (const match of readFileSync(file, "utf8").matchAll(token)) found.set(match[0], match);
}

const hexToRgb = hex => {
  let value = hex.replace("#", "");
  if (value.length === 3) value = [...value].map(char => char + char).join("");
  return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16) / 255);
};
const rgbToHsl = ([r, g, b]) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const hsl = (h, s, l) => `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const CARD = "var(--card)";
const PAGE = "var(--surface)";

/** Returns the dark value for a color in a given role, or null to keep it. */
function darkValue(role, color, alpha) {
  const isBg = ["bg", "from", "via", "to"].includes(role);
  const isText = ["text", "fill", "stroke", "placeholder", "caret", "accent"].includes(role);
  const isBorder = role.startsWith("border") || ["divide", "ring", "outline"].includes(role);
  if (color === "black") return null;
  if (color === "white") {
    if (isText || role === "fill" || role === "stroke") return null; // white text sits on colored fills
    if (isBg) return alpha !== undefined && alpha < 50 ? null : alpha !== undefined ? `color-mix(in srgb, ${CARD} ${alpha}%, transparent)` : CARD;
    if (isBorder) return alpha !== undefined && alpha < 50 ? null : "var(--line)";
    return null;
  }
  const [h, s, l] = rgbToHsl(hexToRgb(color.slice(2, -1)));
  const withAlpha = value => (alpha !== undefined ? `color-mix(in srgb, ${value} ${alpha}%, transparent)` : value);
  if (isBg) {
    if (l > 0.93 && s < 0.3) return withAlpha(l > 0.97 ? CARD : PAGE);
    if (l > 0.8) return withAlpha(hsl(h, Math.min(s, 0.32), 0.14 + (l - 0.8) * 0.2));
    // Translucent bright glows (decorative blobs) would flood a dark page: dim them.
    if (alpha !== undefined && l > 0.55 && s > 0.3) return `color-mix(in srgb, ${color.slice(1, -1)} ${Math.round(alpha * 0.35)}%, transparent)`;
    return null; // brand and mid-tone fills keep their color
  }
  if (isText) {
    if (l >= 0.55 && s > 0.45) return null; // bright accents already used on dark fills
    // Saturated colors (brand green, red, amber) stay vivid; neutrals flip toward white.
    const saturated = s > 0.3 && l >= 0.2; // near-black greens read as ink, not as accent
    const target = l < 0.55 ? (saturated ? 0.78 - l * 0.35 : 0.93 - l * 0.55) : 0.95 - l * 0.75;
    return withAlpha(hsl(h, saturated ? clamp(s, 0.45, 0.8) : s, clamp(target, 0.38, 0.9)));
  }
  if (isBorder) {
    if (l > 0.75) return withAlpha(hsl(h, Math.min(s, 0.25), 0.2 + (l - 0.75) * 0.1));
    return null;
  }
  return null;
}

const property = {
  bg: "background-color", text: "color", border: "border-color", "border-t": "border-top-color", "border-b": "border-bottom-color",
  "border-l": "border-left-color", "border-r": "border-right-color", ring: "--tw-ring-color", fill: "fill", stroke: "stroke",
  outline: "outline-color", accent: "accent-color", caret: "caret-color",
  from: "--tw-gradient-from", via: "--tw-gradient-via", to: "--tw-gradient-to",
};
const escape = className => className.replace(/([^a-zA-Z0-9_-])/g, "\\$1");

// Text on light fills that stay light in dark mode (lime buttons, yellow chips) must not flip.
const keptLightBgs = [...found.values()]
  .filter(([, variants, role, color]) => !variants && role === "bg" && color.startsWith("[#"))
  .filter(([, , , color]) => { const [, s, l] = rgbToHsl(hexToRgb(color.slice(2, -1))); return l > 0.55 && l <= 0.8 && s > 0.3; })
  .map(([full]) => full);

const rules = [];
for (const [full, match] of [...found.entries()].sort()) {
  const [, variants, role, rawColor, alphaText] = match;
  const alpha = alphaText === undefined ? undefined : Number(alphaText);
  const value = darkValue(role, rawColor, alpha);
  if (!value) continue;
  const parts = variants ? variants.split(":").filter(Boolean) : [];
  let selector = `.${escape(full)}`;
  let pseudoElement = "";
  let prefix = "html.dark ";
  for (const variant of parts) {
    if (variant === "hover") selector += ":hover";
    else if (variant === "focus") selector += ":focus";
    else if (variant === "focus-visible") selector += ":focus-visible";
    else if (variant === "active") selector += ":active";
    else if (variant === "disabled") selector += ":disabled";
    else if (variant === "placeholder") pseudoElement = "::placeholder";
    else if (variant === "group-hover") prefix = "html.dark .group:hover ";
  }
  if (role === "placeholder") pseudoElement = "::placeholder";
  if (role === "text" && keptLightBgs.length) selector += keptLightBgs.map(bg => `:not(.${escape(bg)})`).join("");
  selector += pseudoElement; // pseudo-elements must come last
  if (role === "divide") {
    rules.push(`${prefix}${selector} > :not(:last-child) { border-color: ${value}; }`);
    continue;
  }
  const declarations = [`${property[role]}: ${value}`];
  if (role === "from") declarations.push("--tw-gradient-stops: var(--tw-gradient-via-stops, var(--tw-gradient-position), var(--tw-gradient-from) var(--tw-gradient-from-position), var(--tw-gradient-to) var(--tw-gradient-to-position))");
  rules.push(`${prefix}${selector} { ${declarations.join("; ")}; }`);
}

const header = "/* Generated by scripts/gen-dark-theme.mjs. Do not edit by hand. */\n";
writeFileSync(join(root, "src/app/theme-dark.css"), header + rules.join("\n") + "\n");
console.log(`${found.size} classes scanned, ${rules.length} dark rules written`);
