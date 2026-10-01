// Controlled labels, not a second assignment source. Assignments live in Drive.
export const domains = {
  'architecture-space': '建築與空間 / Architecture & Space',
  'film-animation': '影片與動畫 / Film & Animation',
  'character-design': '角色設計 / Character Design',
  'image-style': '圖像與風格 / Image & Style',
  'engineering-science': '工程與科學 / Engineering & Science',
  'education': '教學與知識 / Education & Knowledge'
};
export const families = {
  'painting-illustration': '繪畫與插畫 / Painting & Illustration',
  'paper-fiber': '紙藝與纖維 / Paper & Fiber',
  'photography-realism': '攝影與寫實 / Photography & Realism'
};

export function readTaxonomy(raw, warn) {
  const section = raw.split(/^## Skill Taxonomy v1\s*$/m)[1]?.split(/^## /m)[0] || '';
  const map = new Map();
  for (const line of section.split('\n')) {
    const cells = line.split('|').slice(1, -1).map(v => v.trim());
    if (!/^YSU-(SKILL|PENDING)-\d{3}$/.test(cells[0] || '')) continue;
    const [id, domain, area, family, medium, tags] = cells;
    if (!domains[domain] || (family !== '—' && !families[family])) {
      warn(id, 'Unknown taxonomy domain or style family; assignment ignored'); continue;
    }
    if (map.has(id)) { warn(id, 'Duplicate taxonomy assignment; first row retained'); continue; }
    map.set(id, {
      version: '1.0', domain_id: domain, domain: domains[domain],
      area: area === '—' ? null : area,
      style_family_id: family === '—' ? null : family,
      style_family: families[family] || null,
      medium: medium === '—' ? null : medium,
      tags: !tags || tags === '—' ? [] : tags.split(';').map(v => v.trim()).filter(Boolean),
      source: 'explicit registry taxonomy'
    });
  }
  return map;
}
