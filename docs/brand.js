/**
 * Brand presets. The check sheet is intentionally brand-agnostic so the same
 * deployment can be relabeled without touching app code — pick a brand in
 * Admin -> Settings and it is stored server-side in app_settings.
 *
 * Colours mirror the original Base44 build: cream page, gold accent, near-black
 * primary. Swap `accent`/`primary` per brand; everything else is shared.
 */
export const BRANDS = {
  noodles: {
    id: 'noodles',
    name: 'Noodles <span class="brand-amp">&</span> Company',
    plainName: 'Noodles & Company',
    tagline: '30-Day Check Sheet',
    accent: '#c9a96e',
    accentDark: '#b98860',
    primary: '#1a1a1a',
    surface: '#faf8f5',
    surfaceAlt: '#f0ede6',
  },
  perkins: {
    id: 'perkins',
    name: 'Perkins',
    plainName: 'Perkins',
    tagline: '30-Day Check Sheet',
    accent: '#1f7a4c',
    accentDark: '#17603c',
    primary: '#1a1a1a',
    surface: '#f7faf8',
    surfaceAlt: '#eaf2ed',
  },
  generic: {
    id: 'generic',
    name: 'New Hire Training',
    plainName: 'New Hire Training',
    tagline: '30-Day Check Sheet',
    accent: '#c9a96e',
    accentDark: '#b98860',
    primary: '#1a1a1a',
    surface: '#faf8f5',
    surfaceAlt: '#f0ede6',
  },
};

export const DEFAULT_BRAND = 'noodles';

export function applyBrand(brandId) {
  const brand = BRANDS[brandId] || BRANDS[DEFAULT_BRAND];
  const root = document.documentElement;
  root.style.setProperty('--accent', brand.accent);
  root.style.setProperty('--accent-dark', brand.accentDark);
  root.style.setProperty('--primary', brand.primary);
  root.style.setProperty('--surface', brand.surface);
  root.style.setProperty('--surface-alt', brand.surfaceAlt);
  document.title = `${brand.plainName} — ${brand.tagline}`;
  document.querySelectorAll('[data-brand-name]').forEach((node) => {
    node.innerHTML = brand.name;
  });
  document.querySelectorAll('[data-brand-tagline]').forEach((node) => {
    node.textContent = brand.tagline;
  });
  return brand;
}
