export type ThemeChoice = "system" | "light" | "dark";
const KEY = "evolink-theme";

export function getThemeChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function applyTheme(choice: ThemeChoice = getThemeChoice()) {
  const dark = choice === "dark" || (choice === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0c1411" : "#087a50");
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Private windows can block storage; the choice still applies to this visit.
  }
  applyTheme(choice);
}

/** Follows the OS setting while the choice is "system". */
export function watchSystemTheme() {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => { if (getThemeChoice() === "system") applyTheme("system"); };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// Runs before the first paint (inlined in the root layout) to avoid a white flash.
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
