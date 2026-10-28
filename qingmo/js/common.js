const STORAGE_KEY = 'qingmo_extra_posts';

function topNav(active) {
  const links = [
    { href: 'write.html', id: 'write', label: '写文章' },
    { href: 'about.html', id: 'about', label: '关于' },
  ];
  return `<header class="topnav">
    <a class="brand" href="index.html">轻墨</a>
    <nav>${links.map(l => `<a href="${l.href}" class="${active===l.id?'active':''}">${l.label}</a>`).join('')}</nav>
  </header>`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function loadExtra() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveExtra(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

async function loadAllPosts() {
  const res = await fetch('api/posts.json');
  if (!res.ok) throw new Error('无法加载文章');
  const data = await res.json();
  const seed = Array.isArray(data.posts) ? data.posts : [];
  const extra = loadExtra();
  const map = new Map();
  for (const p of seed) map.set(p.id, p);
  for (const p of extra) map.set(p.id, p);
  const merged = [...extra.filter(p => !seed.find(s => s.id === p.id)), ...seed];
  // extras on top (already written first), then seed; avoid dupes
  const seen = new Set();
  const out = [];
  for (const p of [...extra, ...seed]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

function getPostById(posts, id) {
  return posts.find(p => p.id === id) || null;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
