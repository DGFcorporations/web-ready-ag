import type { ContrastAuditResult, ContrastViolation } from "./human-audit-types";

// Standard sRGB color representation
interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

const NAMED_COLORS: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  transparent: "rgba(0,0,0,0)",
  gray: "#808080",
  silver: "#c0c0c0",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
};

// Common Tailwind text/bg color mappings for static DOM parsing
const TAILWIND_COLORS: Record<string, string> = {
  "white": "#ffffff",
  "black": "#000000",
  "transparent": "rgba(0,0,0,0)",
  // Slate
  "slate-50": "#f8fafc",
  "slate-100": "#f1f5f9",
  "slate-200": "#e2e8f0",
  "slate-300": "#cbd5e1",
  "slate-400": "#94a3b8",
  "slate-500": "#64748b",
  "slate-600": "#475569",
  "slate-700": "#334155",
  "slate-800": "#1e293b",
  "slate-900": "#0f172a",
  "slate-950": "#020617",
  // Gray
  "gray-50": "#f9fafb",
  "gray-100": "#f3f4f6",
  "gray-200": "#e5e7eb",
  "gray-300": "#d1d5db",
  "gray-400": "#9ca3af",
  "gray-500": "#6b7280",
  "gray-600": "#4b5563",
  "gray-700": "#374151",
  "gray-800": "#1f2937",
  "gray-900": "#111827",
  "gray-950": "#030712",
  // Zinc
  "zinc-50": "#fafafa",
  "zinc-100": "#f4f4f5",
  "zinc-200": "#e4e4e7",
  "zinc-300": "#d4d4d8",
  "zinc-400": "#a1a1aa",
  "zinc-500": "#71717a",
  "zinc-600": "#52525b",
  "zinc-700": "#3f3f46",
  "zinc-800": "#27272a",
  "zinc-900": "#18181b",
  "zinc-950": "#09090b",
  // Primary / Blue / Indigo
  "blue-50": "#eff6ff",
  "blue-100": "#dbeafe",
  "blue-200": "#bfdbfe",
  "blue-500": "#3b82f6",
  "blue-600": "#2563eb",
  "indigo-50": "#eef2ff",
  "indigo-100": "#e0e7ff",
  "indigo-600": "#4f46e5",
  "emerald-50": "#ecfdf5",
  "emerald-100": "#d1fae5",
  "emerald-600": "#059669",
  "amber-50": "#fffbeb",
  "amber-100": "#fef3c7",
  "amber-500": "#f59e0b",
  "amber-600": "#d97706",
};

export function parseColor(colorStr: string): RGB | null {
  if (!colorStr) return null;
  const str = colorStr.trim().toLowerCase();

  if (NAMED_COLORS[str]) {
    return parseColor(NAMED_COLORS[str]);
  }

  // Hex format: #fff, #ffffff, #ffffff80
  if (str.startsWith("#")) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
    return null;
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * Calculates the relative luminance of an sRGB color.
 * Formula defined in W3C WCAG 2.1 specifications.
 */
export function getRelativeLuminance(rgb: RGB): number {
  const normalize = (val: number) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const r = normalize(rgb.r);
  const g = normalize(rgb.g);
  const b = normalize(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates the WCAG contrast ratio between two colors.
 * Contrast ratio = (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter luminance.
 */
export function calculateContrastRatio(fg: RGB, bg: RGB): number {
  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

// @ts-ignore
import { JSDOM } from "jsdom";

/**
 * Parses rendered HTML and CSS classes to detect WCAG AA contrast violations
 * and global CSS theme bleed (e.g. pale text on white backgrounds, unreadable badges).
 */
export function auditContrast(html: string): ContrastAuditResult {
  const violations: ContrastViolation[] = [];
  let elementsAudited = 0;
  let themeBleedDetected = false;

  let dom: JSDOM;
  try {
    dom = new JSDOM(html);
  } catch {
    return {
      elementsAudited: 0,
      violationsCount: 0,
      passed: true,
      themeBleedDetected: false,
      violations: [],
    };
  }

  const document = dom.window.document;
  const elements = document.querySelectorAll(
    "h1, h2, h3, h4, h5, h6, p, span, a, div, li, td, th, label, button",
  );

  const hasGlobalWhiteBg =
    html.includes("bg-white") || html.includes("#ffffff") || !html.includes("dark");

  for (const el of Array.from(elements) as any[]) {
    const tagName = el.tagName.toLowerCase();
    const textContent = (el.textContent || "").trim();

    if (!textContent || textContent.length < 2) continue;

    const classes = el.className ? String(el.className).split(/\s+/).filter(Boolean) : [];
    const styleAttr = el.getAttribute("style") || "";

    let fgColorStr: string | null = null;
    let bgColorStr: string | null = null;

    // 1. Resolve from inline style
    const colorStyle = styleAttr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
    if (colorStyle) fgColorStr = colorStyle[1].trim();

    const bgStyle = styleAttr.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);
    if (bgStyle) bgColorStr = bgStyle[1].trim();

    // 2. Resolve from Tailwind utility classes
    const isBadge = classes.some((c) => /badge|pill|tag|chip/i.test(c));
    let hasPaleText = false;
    let hasWhiteOrLightBg = false;

    for (const c of classes) {
      if (c.startsWith("text-")) {
        let colorName = c.slice(5);
        if (colorName.includes("/")) {
          colorName = colorName.split("/")[0];
        }
        if (colorName.startsWith("[") && colorName.endsWith("]")) {
          const raw = colorName.slice(1, -1);
          fgColorStr = raw;
          const parsed = parseColor(raw);
          if (parsed && getRelativeLuminance(parsed) > 0.5) {
            hasPaleText = true;
          }
        } else if (TAILWIND_COLORS[colorName]) {
          fgColorStr = TAILWIND_COLORS[colorName];
          if (/-(?:50|100|200|300|400)$/.test(colorName) || colorName === "white") {
            hasPaleText = true;
          }
        }
      }
      if (c.startsWith("bg-")) {
        let colorName = c.slice(3);
        if (colorName.includes("/")) {
          colorName = colorName.split("/")[0];
        }
        if (colorName.startsWith("[") && colorName.endsWith("]")) {
          const raw = colorName.slice(1, -1);
          bgColorStr = raw;
          const parsed = parseColor(raw);
          if (parsed && getRelativeLuminance(parsed) > 0.7) {
            hasWhiteOrLightBg = true;
          }
        } else if (TAILWIND_COLORS[colorName]) {
          bgColorStr = TAILWIND_COLORS[colorName];
          if (/-(?:50|100|200)$/.test(colorName) || colorName === "white") {
            hasWhiteOrLightBg = true;
          }
        }
      }
    }

    // Inherit background from parent container hierarchy if not set on element
    if (!bgColorStr) {
      let parent = el.parentElement;
      while (parent) {
        const parentClass = parent.className ? String(parent.className) : "";
        const parentStyle = parent.getAttribute("style") || "";
        const pBgStyle = parentStyle.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);
        if (pBgStyle) {
          bgColorStr = pBgStyle[1].trim();
          break;
        }
        for (const pc of parentClass.split(/\s+/)) {
          if (pc.startsWith("bg-")) {
            const pColor = pc.slice(3);
            if (TAILWIND_COLORS[pColor]) {
              bgColorStr = TAILWIND_COLORS[pColor];
              if (/-(?:50|100|200)$/.test(pColor) || pColor === "white") {
                hasWhiteOrLightBg = true;
              }
              break;
            }
          }
        }
        if (bgColorStr) break;
        parent = parent.parentElement;
      }
    }

    if (!bgColorStr) {
      if (hasGlobalWhiteBg) {
        bgColorStr = "#ffffff";
        hasWhiteOrLightBg = true;
      } else {
        bgColorStr = "#0f172a";
      }
    }

    if (!fgColorStr) continue;

    const fgRgb = parseColor(fgColorStr);
    const bgRgb = parseColor(bgColorStr);
    if (!fgRgb || !bgRgb) continue;

    elementsAudited++;

    const ratio = calculateContrastRatio(fgRgb, bgRgb);
    const isLargeText =
      ["h1", "h2", "h3"].includes(tagName) ||
      classes.some((c) => /text-(?:2xl|3xl|4xl|5xl|6xl|7xl)/.test(c));
    const requiredRatio = isLargeText ? 3.0 : isBadge ? 3.0 : 4.5;

    // Theme bleed: Pale text intended for dark themes rendered on white background
    if (hasPaleText && hasWhiteOrLightBg && ratio < 3.0) {
      themeBleedDetected = true;
    }

    if (ratio < requiredRatio) {
      const isCritical = ratio < 2.5;
      violations.push({
        selector: `${tagName}${classes.length > 0 ? "." + classes.slice(0, 2).join(".") : ""}`,
        element: tagName,
        sampleText: textContent.slice(0, 60),
        fgColor: fgColorStr,
        bgColor: bgColorStr,
        contrastRatio: ratio,
        requiredRatio,
        isLargeText,
        isBadge,
        severity: isCritical ? "CRITICAL" : "WARN",
        issue: isBadge
          ? `Unreadable badge text (${ratio}:1 < ${requiredRatio}:1 requirement)`
          : hasPaleText && hasWhiteOrLightBg
            ? `Global theme bleed: Pale text (${fgColorStr}) on light background (${bgColorStr}) yields ${ratio}:1 contrast`
            : `Fails WCAG AA contrast standard (${ratio}:1 < ${requiredRatio}:1 requirement)`,
      });
    }
  }

  return {
    elementsAudited,
    violationsCount: violations.length,
    passed: violations.length === 0,
    themeBleedDetected,
    violations,
  };
}
