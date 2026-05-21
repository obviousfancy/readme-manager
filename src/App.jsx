import { useState, useEffect, useRef } from "react";
import {
  Plus, Edit3, Trash2, Zap, Copy, Download, Upload,
  ArrowLeft, Check, ChevronDown, ChevronUp, X,
  FileCode, RotateCcw, MoreVertical, Table, PlusCircle, MinusCircle, Image,
  AlignLeft, Code2, AlertCircle, ChevronRight, Minus, Quote, MoveUp, MoveDown, Video
} from "lucide-react";

/* ─────────────────────── UTILS ──────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const deepClone = o => JSON.parse(JSON.stringify(o));

/* ─────────────── TEMPLATE MANIFEST ─────────────────────────── */
// Para agregar un nuevo template: añade el archivo JSON a public/templates/
// y agrega su nombre aquí.
const TEMPLATE_FILES = ['hw.json', 'api.json', 'mobile.json', 'lib.json', 'uni.json'];

/* ─────────────────── MARKDOWN RENDERER ─────────────────────── */
function inl(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, a, s) =>
      `<img src="${s}" alt="${a}" style="height:22px;vertical-align:middle;display:inline" onerror="this.style.display='none'">`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

function mdToHtml(md) {
  const lines = md.split('\n');
  let out = '', ul = false, pre = false, pb = '', tbl = false, skip = false;
  const eu = () => { if (ul) { out += '</ul>'; ul = false; } };
  const et = () => { if (tbl) { out += '</tbody></table>'; tbl = false; } };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (skip) { skip = false; continue; }
    if (pre) {
      if (l.startsWith('```')) { out += `<pre><code>${esc(pb)}</code></pre>`; pb = ''; pre = false; }
      else pb += l + '\n';
      continue;
    }
    if (l.startsWith('```')) { eu(); et(); pre = true; continue; }
    if (l.match(/^\|.+\|$/)) {
      eu();
      const cells = l.slice(1, -1).split('|').map(c => c.trim());
      if (!tbl) {
        if ((lines[i + 1] || '').match(/^\|[\s\-:|]+\|$/)) skip = true;
        out += `<table><thead><tr>${cells.map(c => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>`;
        tbl = true;
      } else {
        out += `<tr>${cells.map(c => `<td>${inl(c)}</td>`).join('')}</tr>`;
      }
      continue;
    }
    et();
    if (l.startsWith('<div') || l.startsWith('</div') || l.startsWith('<img')) { out += l; continue; }
    if (l.startsWith('- [ ] ') || l.startsWith('- [x] ') || l.startsWith('- [X] ')) {
      const checked = l.startsWith('- [x]') || l.startsWith('- [X]');
      if (!ul) { out += '<ul class="task-list">'; ul = true; }
      out += `<li class="task-item"><input type="checkbox" disabled ${checked ? 'checked' : ''} style="margin-right:6px;accent-color:#fb923c"> ${inl(l.slice(6))}</li>`;
      continue;
    }
    if (l.startsWith('- ')) { if (!ul) { out += '<ul>'; ul = true; } out += `<li>${inl(l.slice(2))}</li>`; continue; }
    if (l.match(/^\d+\. /)) { eu(); out += `<p class="ni">${inl(l)}</p>`; continue; }
    eu();
    if (l.startsWith('# '))        out += `<h1>${inl(l.slice(2))}</h1>`;
    else if (l.startsWith('## '))  out += `<h2>${inl(l.slice(3))}</h2>`;
    else if (l.startsWith('### ')) out += `<h3>${inl(l.slice(4))}</h3>`;
    else if (l.startsWith('> '))   out += `<blockquote>${inl(l.slice(2))}</blockquote>`;
    else if (l.trim() === '')      out += '<div class="gap"></div>';
    else                           out += `<p>${inl(l)}</p>`;
  }
  eu(); et();
  return out;
}

/* ──────────────────── MARKDOWN BUILDER ──────────────────────── */
function buildMd(tpl, data) {
  const g = k => (typeof data[k] === 'string' ? data[k] : '').trim();
  const lines = [];
  const SEC_EMOJIS = { desc: '📝', features: '🚀', tech: '🛠️', install: '⚙️', endpoints: '📡', usage: '💡', api: '📋', results: '📊', pinout: '🔌', screens: '📲', team: '👥' };

  for (const sec of tpl.sections) {
    const hasData = sec.fields.some(fld => {
      if (fld.type === 'table') {
        const d = data[fld.key];
        if (!d) return false;
        const rows = Array.isArray(d) ? d : (d.rows || []);
        return rows.some(r => r.some(c => c.trim()));
      }
      if (fld.type === 'image')       return !!(data[fld.key]?.url);
      if (fld.type === 'collapsible') return !!(data[fld.key+'_summary'] || data[fld.key]);
      if (fld.type === 'alert')       return !!(data[fld.key]);
      if (fld.type === 'video')       return !!(data[fld.key]);
      if (fld.type === 'code')        return !!(data[fld.key]);
      if (fld.type === 'badges')      return !!(data[fld.key]);
      if (fld.type === 'blocks') {
        const blocks = data[fld.key];
        return Array.isArray(blocks) && blocks.some(b => b && (b.content?.trim() || b.url?.trim() || b.type === 'divider'));
      }
      return !!(typeof data[fld.key] === 'string' ? data[fld.key] : '').trim();
    });
    if (!hasData) continue;

    if (sec.id === 'header') {
      const pn = g('projectName');
      lines.push(`# ${pn || tpl.name}`, '');
      const status = g('status');
      if (status) {
        const e = encodeURIComponent(status.replace(/\s+/g, '_'));
        lines.push(`![Status](https://img.shields.io/badge/Status-${e}-success) ![License](https://img.shields.io/badge/License-MIT-blue)`, '');
      }
      const tagline = g('tagline');
      if (tagline) lines.push(`> ${tagline}`, '');
      const course = g('course');
      const university = g('university');
      if (course) lines.push(`**Materia:** ${course}  `);
      if (university) lines.push(`**Universidad:** ${university}  `);
      if (course || university) lines.push('');
    } else {
      const em = SEC_EMOJIS[sec.id] || '📌';
      lines.push(`## ${em} ${sec.title}`, '');
      let acc = [];

      for (const fld of sec.fields) {
        // Blocks type (rich content)
        if (fld.type === 'blocks') {
          const blocks = data[fld.key];
          if (!Array.isArray(blocks) || blocks.length === 0) continue;
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          for (const blk of blocks) {
            if (!blk || !blk.type) continue;
            switch (blk.type) {
              case 'text':
                if (blk.content?.trim()) { lines.push(blk.content.trim()); lines.push(''); }
                break;
              case 'code': {
                const lang = blk.lang || '';
                if (blk.content?.trim()) { lines.push('```' + lang, blk.content, '```', ''); }
                break;
              }
              case 'image': {
                if (!blk.url?.trim()) break;
                const alt = blk.alt || 'imagen';
                const cap = blk.caption || '';
                const w   = blk.width ? ` width="${blk.width}"` : '';
                if (blk.center) {
                  lines.push('<div align="center">','');
                  lines.push(w ? `<img src="${blk.url}" alt="${alt}"${w}>` : `![${alt}](${blk.url})`);
                  if (cap) { lines.push(''); lines.push(`*${cap}*`); }
                  lines.push('','</div>','');
                } else {
                  lines.push(w ? `<img src="${blk.url}" alt="${alt}"${w}>` : `![${alt}](${blk.url})`);
                  if (cap) lines.push(`*${cap}*`);
                  lines.push('');
                }
                break;
              }
              case 'alert':
                if (blk.content?.trim()) { lines.push(`> [!${blk.level || 'NOTE'}]`, `> ${blk.content.trim()}`, ''); }
                break;
              case 'collapsible':
                if (blk.summary?.trim()) {
                  lines.push('<details>');
                  lines.push(`<summary>${blk.summary.trim()}</summary>`);
                  lines.push('');
                  if (blk.content?.trim()) lines.push(blk.content.trim());
                  lines.push('');
                  lines.push('</details>','');
                }
                break;
              case 'quote':
                if (blk.content?.trim()) {
                  blk.content.trim().split('\n').forEach(l => lines.push(`> ${l}`));
                  lines.push('');
                }
                break;
              case 'divider':
                lines.push('---','');
                break;
              case 'video':
                if (blk.url?.trim()) {
                  const thumb = blk.thumb?.trim() || '';
                  const label = blk.label || 'Ver video';
                  if (thumb) {
                    lines.push(`[![${label}](${thumb})](${blk.url})`);
                  } else {
                    lines.push(`🎬 [${label}](${blk.url})`);
                  }
                  lines.push('');
                }
                break;
              default: break;
            }
          }
          continue;
        }

        // Code field type
        if (fld.type === 'code') {
          const val = g(fld.key);
          if (!val) continue;
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          lines.push('```' + (fld.lang || ''), val, '```', '');
          continue;
        }

        // Alert field type
        if (fld.type === 'alert') {
          const val = g(fld.key + '_content') || g(fld.key);
          const level = (data[fld.key + '_level'] || fld.alertLevel || 'NOTE').toUpperCase();
          if (!val) continue;
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          lines.push(`> [!${level}]`);
          val.trim().split('\n').forEach(l => lines.push(`> ${l}`));
          lines.push('');
          continue;
        }

        // Collapsible field type
        if (fld.type === 'collapsible') {
          const summary = g(fld.key + '_summary');
          const content = g(fld.key + '_content') || g(fld.key);
          if (!summary && !content) continue;
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          lines.push('<details>');
          lines.push(`<summary>${summary || 'Ver más'}</summary>`, '');
          if (content) lines.push(content.trim());
          lines.push('', '</details>', '');
          continue;
        }

        // Badges field type
        if (fld.type === 'badges') {
          const raw = g(fld.key);
          if (!raw) continue;
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          const badges = raw.split('\n').filter(x => x.trim()).map(b => {
            // format: "Label:value:color" or just URL
            if (b.startsWith('http') || b.startsWith('![')) return b.trim();
            const parts = b.split(':');
            const label = encodeURIComponent(parts[0] || 'badge');
            const val2  = encodeURIComponent(parts[1] || '');
            const color = (parts[2] || 'blue').trim();
            return `![${parts[0]}](https://img.shields.io/badge/${label}-${val2}-${color})`;
          });
          lines.push(badges.join(' '), '');
          continue;
        }

        // Video field type
        if (fld.type === 'video') {
          const url   = g(fld.key + '_url') || g(fld.key);
          const thumb = g(fld.key + '_thumb');
          const label = g(fld.key + '_label') || 'Ver video';
          if (!url) continue;
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          if (thumb) lines.push(`[![${label}](${thumb})](${url})`);
          else       lines.push(`🎬 [${label}](${url})`);
          lines.push('');
          continue;
        }

        // Image type
        if (fld.type === 'image') {
          const img = data[fld.key];
          if (!img || !img.url) continue;
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          const alt = img.alt || fld.label || 'imagen';
          const caption = img.caption || '';
          if (img.center) {
            lines.push('<div align="center">');
            lines.push('');
            lines.push(`![${alt}](${img.url})`);
            if (caption) lines.push('');
            if (caption) lines.push(`*${caption}*`);
            lines.push('');
            lines.push('</div>');
          } else {
            lines.push(`![${alt}](${img.url})`);
            if (caption) lines.push(`*${caption}*`);
          }
          lines.push('');
          continue;
        }

        // Table type
        if (fld.type === 'table') {
          const d = data[fld.key];
          if (!d) continue;
          // Supports both old format (array) and new format ({cols, rows})
          const rows = Array.isArray(d) ? d : (d.rows || []);
          const cols = (Array.isArray(d) ? fld.columns : (d.cols || fld.columns)) || [];
          if (!rows.some(r => r.some(c => c.trim()))) continue;
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          lines.push(`| ${cols.join(' | ')} |`);
          lines.push(`| ${cols.map(() => '---').join(' | ')} |`);
          rows.forEach(row => {
            if (row.some(c => c.trim())) {
              // Pad or trim row to match cols length
              const padded = cols.map((_, i) => (row[i] || '').trim() || '—');
              lines.push(`| ${padded.join(' | ')} |`);
            }
          });
          lines.push('');
          continue;
        }

        const val = g(fld.key);
        if (!val) continue;

        if (fld.type === 'list') {
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          const items = val.split('\n').filter(x => x.trim());
          if (fld.key === 'envVars') {
            lines.push('```env', ...items, '```');
          } else {
            const style = fld.listStyle || 'bullet';
            items.forEach((item, idx) => {
              if (style === 'numbered') {
                lines.push(`${idx + 1}. ${item}`);
              } else if (style === 'task') {
                lines.push(`- [ ] ${item}`);
              } else {
                const ci = item.indexOf(':');
                lines.push((ci > 0 && ci < 40) ? `- **${item.slice(0, ci).trim()}:** ${item.slice(ci + 1).trim()}` : `- ${item}`);
              }
            });
          }
          lines.push('');
        } else if (fld.type === 'textarea') {
          if (acc.length) { lines.push(...acc, ''); acc = []; }
          if (fld.key === 'codeExample') lines.push('```', val, '```');
          else lines.push(val);
          lines.push('');
        } else if (fld.type === 'text') {
          if (fld.key === 'repoUrl') {
            if (acc.length) { lines.push(...acc, ''); acc = []; }
            lines.push('```bash', `git clone ${val}`, '```', '');
          } else if (fld.key === 'installCmd') {
            if (acc.length) { lines.push(...acc, ''); acc = []; }
            lines.push('```bash', val, '```', '');
          } else if (fld.key === 'ide') {
            if (acc.length) { lines.push(...acc, ''); acc = []; }
            lines.push(`1. Clonar el repositorio`, `2. Abrir en **${val}**`, `3. Compilar y cargar al dispositivo`, '');
          } else {
            acc.push(`**${fld.label}:** ${val}  `);
          }
        }
      }
      if (acc.length) lines.push(...acc, '');
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ──────────────────── LOCAL STORAGE ────────────────────────── */
const LS_KEY = 'readme_mgr_v3';

function loadLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function saveLS(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (_) { /* storage unavailable */ }
}

/* ─────────────────── GLOBAL STYLES ─────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Manrope:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  .rma *{box-sizing:border-box;}
  .rma ::-webkit-scrollbar{width:5px;height:5px;}
  .rma ::-webkit-scrollbar-track{background:transparent;}
  .rma ::-webkit-scrollbar-thumb{background:#27272a;border-radius:3px;}
  .rma input,.rma textarea,.rma select{outline:none;transition:border-color 0.15s;}
  .rma input:focus,.rma textarea:focus,.rma select:focus{border-color:#52525b!important;}
  .rma input::placeholder,.rma textarea::placeholder{color:#3f3f46;}
  .rma textarea{resize:vertical;}
  .tc{transition:all 0.18s ease;}
  .tc:hover{transform:translateY(-3px);}
  .btn-ani{transition:all 0.12s ease;cursor:pointer;}
  .btn-ani:hover{opacity:0.85;}
  .btn-ani:active{transform:scale(0.96);}
  .mdp h1{font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:800;color:#f4f4f5;margin:0 0 8px;}
  .mdp h2{font-family:'Syne',sans-serif;font-size:0.95rem;font-weight:700;color:#fb923c;margin:18px 0 8px;padding-bottom:6px;border-bottom:1px solid #27272a;}
  .mdp h3{font-size:0.88rem;font-weight:600;color:#e4e4e7;margin:10px 0 5px;}
  .mdp p,.mdp li{color:#a1a1aa;font-size:0.8rem;line-height:1.7;margin:2px 0;}
  .mdp ul{list-style:none;padding:0;margin:4px 0 10px;}
  .mdp li{padding:2px 0 2px 14px;position:relative;}
  .mdp li::before{content:'▸';position:absolute;left:0;color:#fb923c;font-size:0.7rem;top:3px;}
  .mdp code{font-family:'JetBrains Mono',monospace;font-size:0.74rem;background:#27272a;color:#fb923c;padding:1px 5px;border-radius:3px;}
  .mdp pre{font-family:'JetBrains Mono',monospace;font-size:0.74rem;background:#18181b;border:1px solid #27272a;color:#a1a1aa;padding:12px 14px;border-radius:7px;overflow-x:auto;margin:8px 0;}
  .mdp pre code{background:none;padding:0;color:#a1a1aa;}
  .mdp blockquote{border-left:3px solid #fb923c;padding:4px 12px;color:#71717a;font-style:italic;font-size:0.82rem;margin:6px 0;background:#18181b;border-radius:0 6px 6px 0;}
  .mdp strong{color:#e4e4e7;font-weight:600;}
  .mdp table{width:100%;border-collapse:collapse;font-size:0.76rem;margin:8px 0;}
  .mdp th{background:#27272a;color:#fb923c;padding:7px 10px;text-align:left;font-weight:600;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;}
  .mdp td{padding:6px 10px;border-bottom:1px solid #1e1e21;color:#a1a1aa;}
  .mdp a{color:#fb923c;text-decoration:none;}
  .mdp .gap{height:6px;}
  .mdp .ni{color:#a1a1aa;font-size:0.8rem;padding-left:4px;}
  .mdp img{max-width:100%;border-radius:8px;margin:6px 0;}
  .mdp div[align="center"]{text-align:center;}
  .mdp div[align="center"] img{display:inline-block;}
  .blk-wrap{display:flex;flex-direction:column;gap:8px;}
  .blk-card{background:#0d0d0f;border:1px solid #1e2024;border-radius:9px;overflow:hidden;transition:border-color 0.12s;}
  .blk-card:focus-within{border-color:#27272a;}
  .blk-header{display:flex;align-items:center;gap:8px;padding:7px 10px;background:#111113;border-bottom:1px solid #1e2024;}
  .blk-type-badge{font-size:0.62rem;font-family:'Syne',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;padding:2px 8px;border-radius:20px;}
  .blk-body{padding:10px 12px;display:flex;flex-direction:column;gap:8px;}
  .blk-move{background:none;border:none;color:#3f3f46;cursor:pointer;padding:2px;display:flex;}
  .blk-move:hover{color:#a1a1aa;}
  .blk-del{background:none;border:none;color:#3f3f46;cursor:pointer;padding:2px;display:flex;margin-left:auto;}
  .blk-del:hover{color:#ef4444;}
  .add-blk-menu{display:flex;flex-wrap:wrap;gap:6px;padding:10px;background:#111113;border:1px dashed #27272a;border-radius:9px;margin-top:4px;}
  .add-blk-btn{display:flex;align-items:center;gap:5px;padding:6px 11px;background:#18181b;border:1px solid #27272a;border-radius:6px;color:#71717a;cursor:pointer;font-size:0.72rem;font-family:'Manrope',sans-serif;font-weight:600;transition:all 0.1s;}
  .add-blk-btn:hover{border-color:#52525b;color:#e4e4e7;background:#1e1e21;}
  .lang-sel{background:#18181b;border:1px solid #27272a;border-radius:5px;color:#fb923c;font-family:'JetBrains Mono',monospace;font-size:0.72rem;padding:3px 7px;outline:none;cursor:pointer;}
  .alert-sel{background:#18181b;border:1px solid #27272a;border-radius:5px;color:#e4e4e7;font-family:'Syne',sans-serif;font-size:0.72rem;font-weight:700;padding:3px 7px;outline:none;cursor:pointer;}
  .tbl-editor th{font-size:0.65rem;color:#71717a;font-family:'Syne',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:5px 6px;text-align:left;background:#0d0d0f;border:1px solid #27272a;}
  .tbl-editor td{padding:2px;border:1px solid #1e2024;}
  .tbl-editor input{background:#18181b;border:none;color:#e4e4e7;font-size:0.76rem;font-family:'Manrope',sans-serif;width:100%;padding:5px 7px;outline:none;}
  .tbl-editor input:focus{background:#27272a;}
  .tbl-editor .del-row{background:none;border:none;color:#3f3f46;cursor:pointer;padding:4px;display:flex;align-items:center;}
  .tbl-editor .del-row:hover{color:#ef4444;}
  .fade-in{animation:fadeIn 0.2s ease;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}
`;

/* ─────────────────────── MAIN APP ───────────────────────────── */
export default function App() {
  const [templates, setTemplates] = useState([]);
  const [defaultTemplates, setDefaultTemplates] = useState([]);
  const [userTemplates, setUserTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dash'); // 'dash' | 'edit' | 'gen'
  const [editing, setEditing] = useState(null);
  const [generating, setGenerating] = useState(null);

  // Load default templates from public/templates/*.json + user templates from localStorage
  useEffect(() => {
    async function init() {
      const ls = loadLS();
      const overrides = ls.overrides || {};
      const userTpls = ls.userTemplates || [];

      const fetched = await Promise.all(
        TEMPLATE_FILES.map(async (file) => {
          try {
            const r = await fetch(`${import.meta.env.BASE_URL}templates/${file}`);
            const tpl = await r.json();
            // Apply user overrides if they exist
            return overrides[tpl.id] ? { ...tpl, ...overrides[tpl.id], isDefault: true } : tpl;
          } catch {
            return null;
          }
        })
      );

      const defaults = fetched.filter(Boolean);
      setDefaultTemplates(defaults);
      setUserTemplates(userTpls);
      setTemplates([...defaults, ...userTpls]);
      setLoading(false);
    }
    init();
  }, []);

  const persistTemplates = (defaults, users) => {
    const ls = loadLS();
    const overrides = {};
    defaults.forEach(t => {
      const original = defaultTemplates.find(d => d.id === t.id);
      if (original && JSON.stringify(t) !== JSON.stringify(original)) {
        overrides[t.id] = t;
      }
    });
    saveLS({ ...ls, overrides, userTemplates: users });
    setDefaultTemplates(defaults);
    setUserTemplates(users);
    setTemplates([...defaults, ...users]);
  };

  const handleNew = () => {
    const ns = {
      id: uid(), name: 'Nuevo Template', emoji: '📝', color: '#6366f1', isDefault: false,
      sections: [
        { id: 'header', title: 'Encabezado', required: true, fields: [{ id: uid(), label: 'Nombre del proyecto', key: 'projectName', type: 'text', placeholder: 'Mi Proyecto', required: true }] },
        { id: uid(), title: 'Descripción', required: false, fields: [{ id: uid(), label: 'Descripción', key: 'description', type: 'textarea', placeholder: 'Describe tu proyecto...' }] },
      ]
    };
    setEditing(ns);
    setView('edit');
  };

  const handleSave = (t) => {
    if (t.isDefault) {
      const newDefaults = defaultTemplates.map(d => d.id === t.id ? t : d);
      persistTemplates(newDefaults, userTemplates);
    } else {
      const idx = userTemplates.findIndex(u => u.id === t.id);
      const newUsers = idx >= 0 ? userTemplates.map(u => u.id === t.id ? t : u) : [...userTemplates, t];
      persistTemplates(defaultTemplates, newUsers);
    }
    setView('dash');
  };

  const handleDelete = (id) => {
    const isDefault = defaultTemplates.some(d => d.id === id);
    if (isDefault) return; // No se pueden borrar los defaults
    const newUsers = userTemplates.filter(u => u.id !== id);
    persistTemplates(defaultTemplates, newUsers);
  };

  const handleReset = (id) => {
    // Re-fetch from file to reset
    const file = TEMPLATE_FILES.find(f => f.startsWith(id));
    if (!file) return;
    fetch(`/templates/${file}`)
      .then(r => r.json())
      .then(tpl => {
        const newDefaults = defaultTemplates.map(d => d.id === id ? tpl : d);
        const ls = loadLS();
        const overrides = ls.overrides || {};
        delete overrides[id];
        saveLS({ ...ls, overrides });
        setDefaultTemplates(newDefaults);
        setTemplates([...newDefaults, ...userTemplates]);
      });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const tpl = JSON.parse(ev.target.result);
          if (!tpl.name || !tpl.sections) { alert('JSON inválido'); return; }
          tpl.id = uid();
          tpl.isDefault = false;
          const newUsers = [...userTemplates, tpl];
          persistTemplates(defaultTemplates, newUsers);
        } catch { alert('Error al leer el archivo'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px', fontFamily: "'Manrope',sans-serif" }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⚙️</div>
        <div style={{ color: '#52525b', fontSize: '0.82rem' }}>Cargando templates...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (view === 'edit') return <TemplateEditor template={editing} onSave={handleSave} onCancel={() => setView('dash')} onReset={handleReset} />;
  if (view === 'gen') return <Generator template={generating} onBack={() => setView('dash')} />;

  return (
    <Dashboard
      templates={templates}
      defaultIds={defaultTemplates.map(d => d.id)}
      onNew={handleNew}
      onEdit={t => { setEditing(deepClone(t)); setView('edit'); }}
      onGen={t => { setGenerating(t); setView('gen'); }}
      onDelete={handleDelete}
      onReset={handleReset}
      onImport={handleImport}
    />
  );
}

/* ─────────────────── DASHBOARD ─────────────────────────────── */
function Dashboard({ templates, defaultIds, onNew, onEdit, onGen, onDelete, onReset, onImport }) {
  return (
    <div className="rma" style={{ minHeight: '100vh', background: '#09090b', color: '#e4e4e7', fontFamily: "'Manrope',sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ borderBottom: '1px solid #1e2024', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0d0d0f', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.4rem', color: '#f4f4f5', letterSpacing: '-0.025em' }}>
            README Manager
          </div>
          <div style={{ fontSize: '0.72rem', color: '#52525b', marginTop: '2px' }}>
            {templates.length} template{templates.length !== 1 ? 's' : ''} · genera READMEs profesionales al instante
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-ani" onClick={onImport} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 15px', background: '#18181b', color: '#a1a1aa', border: '1px solid #27272a', borderRadius: '8px', fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            <Upload size={14} /> Importar JSON
          </button>
          <button className="btn-ani" onClick={onNew} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 17px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
            <Plus size={15} /> Nuevo Template
          </button>
        </div>
      </div>

      {defaultIds.length > 0 && (
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ fontSize: '0.65rem', color: '#3f3f46', fontFamily: "'Syne',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '14px' }}>
            Templates del repositorio
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '12px' }}>
            {templates.filter(t => defaultIds.includes(t.id)).map(t => (
              <TemplateCard key={t.id} template={t} isDefault onEdit={() => onEdit(t)} onGen={() => onGen(t)} onReset={() => onReset(t.id)} />
            ))}
          </div>
        </div>
      )}

      {templates.filter(t => !defaultIds.includes(t.id)).length > 0 && (
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ fontSize: '0.65rem', color: '#3f3f46', fontFamily: "'Syne',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '14px' }}>
            Mis templates personalizados
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '12px' }}>
            {templates.filter(t => !defaultIds.includes(t.id)).map(t => (
              <TemplateCard key={t.id} template={t} isDefault={false} onEdit={() => onEdit(t)} onGen={() => onGen(t)} onDelete={() => onDelete(t.id)} />
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#3f3f46' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📄</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: '#52525b', fontSize: '1.1rem' }}>Sin templates cargados</div>
          <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>Verifica que los archivos JSON estén en public/templates/</div>
        </div>
      )}
      <div style={{ height: '40px' }} />
    </div>
  );
}

function TemplateCard({ template: t, isDefault, onEdit, onGen, onDelete, onReset }) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const fc = t.sections.reduce((a, s) => a + s.fields.length, 0);
  const hasTables = t.sections.some(s => s.fields.some(f => f.type === 'table'));

  return (
    <div className="tc fade-in" style={{ background: '#111113', border: '1px solid #1e2024', borderRadius: '11px', overflow: 'hidden' }}>
      <div style={{ height: '2px', background: t.color }} />
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>{t.emoji}</span>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7' }}>{t.name}</div>
              <div style={{ fontSize: '0.67rem', color: '#52525b', marginTop: '1px' }}>
                {t.sections.length} secc · {fc} campos{hasTables ? ' · tablas' : ''}
                {isDefault && <span style={{ marginLeft: '6px', color: '#3f3f46' }}>· repo</span>}
              </div>
            </div>
          </div>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button onClick={() => setMenu(p => !p)} style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', padding: '4px', borderRadius: '5px', display: 'flex' }}>
              <MoreVertical size={14} />
            </button>
            {menu && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '4px', zIndex: 50, minWidth: '150px', boxShadow: '0 8px 24px #0008' }}>
                <MenuItem icon={<Edit3 size={12} />} label="Editar template" onClick={() => { onEdit(); setMenu(false); }} />
                <MenuItem icon={<Download size={12} />} label="Exportar JSON" onClick={() => {
                  const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                  a.download = t.id + '.json'; a.click(); setMenu(false);
                }} />
                {isDefault && <MenuItem icon={<RotateCcw size={12} />} label="Resetear a default" onClick={() => { onReset(); setMenu(false); }} danger />}
                {!isDefault && <MenuItem icon={<Trash2 size={12} />} label="Eliminar" onClick={() => { onDelete(); setMenu(false); }} danger />}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
          {t.sections.map(sec => (
            <span key={sec.id} style={{ fontSize: '0.62rem', padding: '2px 8px', background: '#18181b', border: '1px solid #27272a', borderRadius: '20px', color: '#71717a' }}>
              {sec.title}
            </span>
          ))}
        </div>

        <button className="btn-ani" onClick={onGen} style={{ width: '100%', padding: '9px', background: t.color, color: '#fff', border: 'none', borderRadius: '7px', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Zap size={13} /> Generar README
        </button>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '7px 10px', background: 'none', border: 'none', borderRadius: '5px', color: danger ? '#ef4444' : '#a1a1aa', cursor: 'pointer', fontSize: '0.76rem', fontFamily: "'Manrope',sans-serif", textAlign: 'left' }}
      onMouseEnter={e => e.currentTarget.style.background = '#27272a'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {icon} {label}
    </button>
  );
}

/* ─────────────────── TEMPLATE EDITOR ───────────────────────── */
const EMOJIS = ['⚙️','🌐','📱','📦','🎓','🔧','🤖','📡','💻','🔬','📊','🎮','🚀','💡','🛠️','📝','🔷','⭐','🔌','📲'];
const COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#f59e0b','#ec4899','#06b6d4','#ef4444','#84cc16','#6366f1'];
const FT = [
  { v: 'text',        l: 'Texto corto' },
  { v: 'textarea',    l: 'Texto largo' },
  { v: 'list',        l: 'Lista (una por línea)' },
  { v: 'table',       l: 'Tabla con columnas' },
  { v: 'image',       l: 'Imagen (URL)' },
  { v: 'code',        l: 'Bloque de código' },
  { v: 'alert',       l: 'Alerta / Nota (GFM)' },
  { v: 'collapsible', l: 'Toggle colapsible' },
  { v: 'badges',      l: 'Badges / Shields' },
  { v: 'video',       l: 'Video (link clickeable)' },
  { v: 'blocks',      l: 'Bloques rich content ✦' },
];

function TemplateEditor({ template, onSave, onCancel }) {
  const [t, setT] = useState(() => deepClone(template));
  const [open, setOpen] = useState(new Set(template.sections.map(s => s.id)));

  const upT = ch => setT(p => ({ ...p, ...ch }));
  const upSec = (sid, ch) => setT(p => ({ ...p, sections: p.sections.map(s => s.id === sid ? { ...s, ...ch } : s) }));
  const delSec = sid => setT(p => ({ ...p, sections: p.sections.filter(s => s.id !== sid) }));
  const addSec = () => {
    const ns = { id: uid(), title: 'Nueva Sección', required: false, fields: [] };
    setT(p => ({ ...p, sections: [...p.sections, ns] }));
    setOpen(p => new Set([...p, ns.id]));
  };
  const addFld = sid => {
    const nf = { id: uid(), label: 'Nuevo Campo', key: 'field_' + uid(), type: 'text', placeholder: '', required: false };
    setT(p => ({ ...p, sections: p.sections.map(s => s.id === sid ? { ...s, fields: [...s.fields, nf] } : s) }));
  };
  const upFld = (sid, fid, ch) => setT(p => ({ ...p, sections: p.sections.map(s => s.id === sid ? { ...s, fields: s.fields.map(f => f.id === fid ? { ...f, ...ch } : f) } : s) }));
  const delFld = (sid, fid) => setT(p => ({ ...p, sections: p.sections.map(s => s.id === sid ? { ...s, fields: s.fields.filter(f => f.id !== fid) } : s) }));

  const addCol = (sid, fid) => upFld(sid, fid, { columns: [...(t.sections.find(s=>s.id===sid)?.fields.find(f=>f.id===fid)?.columns||[]), 'Columna'] });
  const delCol = (sid, fid, ci) => {
    const f = t.sections.find(s=>s.id===sid)?.fields.find(f=>f.id===fid);
    if (!f || f.columns.length <= 1) return;
    upFld(sid, fid, { columns: f.columns.filter((_,i)=>i!==ci) });
  };
  const upCol = (sid, fid, ci, val) => {
    const f = t.sections.find(s=>s.id===sid)?.fields.find(f=>f.id===fid);
    if (!f) return;
    const cols = [...f.columns]; cols[ci] = val;
    upFld(sid, fid, { columns: cols });
  };

  const inp = { background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#e4e4e7', padding: '7px 10px', fontSize: '0.8rem', fontFamily: "'Manrope',sans-serif', outline: 'none'", width: '100%' };

  return (
    <div className="rma" style={{ minHeight: '100vh', background: '#09090b', color: '#e4e4e7', fontFamily: "'Manrope',sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ borderBottom: '1px solid #1e2024', padding: '13px 22px', display: 'flex', alignItems: 'center', gap: '12px', background: '#0d0d0f', position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={onCancel} className="btn-ani" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '0.8rem', fontFamily: "'Manrope',sans-serif", padding: '5px 7px', borderRadius: '5px' }}>
          <ArrowLeft size={14} /> Volver
        </button>
        <span style={{ color: '#27272a' }}>|</span>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7' }}>
          {t.isDefault ? 'Editando template del repositorio' : 'Editor de template'}
        </span>
        {t.isDefault && (
          <span style={{ fontSize: '0.65rem', padding: '2px 8px', background: '#18181b', border: '1px solid #27272a', borderRadius: '20px', color: '#71717a' }}>
            Los cambios se guardan en localStorage
          </span>
        )}
        <button onClick={() => onSave(t)} className="btn-ani" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '7px', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
          <Check size={13} /> Guardar Template
        </button>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '28px 22px' }}>
        {/* Meta */}
        <div style={{ background: '#111113', border: '1px solid #1e2024', borderRadius: '11px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.68rem', color: '#52525b', fontFamily: "'Syne',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>Identidad del template</div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.73rem', color: '#71717a', display: 'block', marginBottom: '5px' }}>Nombre</label>
              <input style={inp} value={t.name} onChange={e => upT({ name: e.target.value })} placeholder="Nombre del template" />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.73rem', color: '#71717a', display: 'block', marginBottom: '8px' }}>Emoji</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {EMOJIS.map(em => (
                <button key={em} onClick={() => upT({ emoji: em })} style={{ background: t.emoji === em ? '#27272a' : '#18181b', border: `1px solid ${t.emoji === em ? '#f97316' : '#27272a'}`, borderRadius: '7px', padding: '5px 8px', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.1s' }}>
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.73rem', color: '#71717a', display: 'block', marginBottom: '8px' }}>Color de acento</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => upT({ color: c })} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, border: t.color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', outline: t.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        {t.sections.map((sec, si) => (
          <div key={sec.id} style={{ background: '#111113', border: '1px solid #1e2024', borderRadius: '11px', marginBottom: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: open.has(sec.id) ? '1px solid #1e2024' : 'none', cursor: 'pointer' }} onClick={() => setOpen(p => { const n = new Set(p); n.has(sec.id) ? n.delete(sec.id) : n.add(sec.id); return n; })}>
              <div style={{ width: '2px', height: '14px', background: t.color, borderRadius: '1px', flexShrink: 0 }} />
              <input
                value={sec.title}
                onClick={e => e.stopPropagation()}
                onChange={e => upSec(sec.id, { title: e.target.value })}
                style={{ background: 'none', border: 'none', color: '#e4e4e7', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '0.87rem', outline: 'none', flex: 1 }}
                placeholder="Nombre de sección"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#71717a', cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={sec.required} onChange={e => upSec(sec.id, { required: e.target.checked })} style={{ accentColor: t.color }} />
                  Requerida
                </label>
                {si > 0 && (
                  <button onClick={e => { e.stopPropagation(); delSec(sec.id); }} style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', display: 'flex', padding: '2px' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}
                  ><Trash2 size={13} /></button>
                )}
                {open.has(sec.id) ? <ChevronUp size={14} color="#52525b" /> : <ChevronDown size={14} color="#52525b" />}
              </div>
            </div>

            {open.has(sec.id) && (
              <div style={{ padding: '14px 16px' }}>
                {sec.fields.map(fld => (
                  <div key={fld.id} style={{ background: '#0d0d0f', border: '1px solid #1e2024', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <input value={fld.label} onChange={e => upFld(sec.id, fld.id, { label: e.target.value })} placeholder="Etiqueta del campo" style={{ ...inp, flex: '1', minWidth: '120px' }} />
                      <select value={fld.type} onChange={e => upFld(sec.id, fld.id, { type: e.target.value, ...(e.target.value === 'table' ? { columns: fld.columns || ['Columna 1', 'Columna 2'] } : {}) })} style={{ ...inp, width: 'auto', cursor: 'pointer' }}>
                        {FT.map(ft => <option key={ft.v} value={ft.v}>{ft.l}</option>)}
                      </select>
                      <button onClick={() => delFld(sec.id, fld.id)} style={{ background: 'none', border: '1px solid #27272a', borderRadius: '6px', color: '#3f3f46', cursor: 'pointer', padding: '6px 9px', display: 'flex' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}
                      ><X size={13} /></button>
                    </div>

                    {/* Placeholder — input o textarea según tipo */}
                    {fld.type === 'text' && (
                      <input
                        value={fld.placeholder || ''}
                        onChange={e => upFld(sec.id, fld.id, { placeholder: e.target.value })}
                        placeholder="Texto de ejemplo (placeholder)..."
                        style={{ ...inp, marginBottom: '6px' }}
                      />
                    )}

                    {(fld.type === 'textarea') && (
                      <textarea
                        value={fld.placeholder || ''}
                        onChange={e => upFld(sec.id, fld.id, { placeholder: e.target.value })}
                        placeholder="Texto de ejemplo para el área larga..."
                        rows={3}
                        style={{ ...inp, marginBottom: '6px', lineHeight: '1.55', resize: 'vertical' }}
                      />
                    )}

                    {fld.type === 'list' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                        {/* Sub-tipo de lista */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {[
                            { v: 'bullet',   l: '• Puntos',     ex: '- item' },
                            { v: 'numbered', l: '1. Numerada',  ex: '1. item' },
                            { v: 'task',     l: '☑ Tareas',    ex: '- [ ] item' },
                          ].map(opt => (
                            <button
                              key={opt.v}
                              onClick={() => upFld(sec.id, fld.id, { listStyle: opt.v })}
                              style={{
                                padding: '5px 11px', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '0.72rem', fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                                background: (fld.listStyle || 'bullet') === opt.v ? t.color : '#18181b',
                                color: (fld.listStyle || 'bullet') === opt.v ? '#fff' : '#71717a',
                                border: `1px solid ${(fld.listStyle || 'bullet') === opt.v ? t.color : '#27272a'}`,
                                transition: 'all 0.12s',
                              }}
                            >
                              {opt.l}
                              <code style={{ marginLeft: '6px', fontSize: '0.65rem', opacity: 0.7 }}>{opt.ex}</code>
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={fld.placeholder || ''}
                          onChange={e => upFld(sec.id, fld.id, { placeholder: e.target.value })}
                          placeholder={"Una entrada por línea:\nEntrada uno\nEntrada dos\nEntrada tres"}
                          rows={3}
                          style={{ ...inp, lineHeight: '1.55', resize: 'vertical' }}
                        />
                        <div style={{ fontSize: '0.66rem', color: '#3f3f46' }}>↵ Cada línea se convierte en un elemento de la lista</div>
                      </div>
                    )}

                    {fld.type === 'image' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                        <input value={fld.placeholder || ''} onChange={e => upFld(sec.id, fld.id, { placeholder: e.target.value })} placeholder="URL de ejemplo (https://... o ./assets/foto.png)" style={inp} />
                        <div style={{ fontSize: '0.66rem', color: '#3f3f46' }}>🖼 Al generar, el usuario podrá poner URL, alt text, caption y elegir si centrar</div>
                      </div>
                    )}

                    {fld.type === 'code' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.72rem', color: '#71717a', flexShrink: 0 }}>Lenguaje por defecto:</label>
                          <select value={fld.lang || 'cpp'} onChange={e => upFld(sec.id, fld.id, { lang: e.target.value })} className="lang-sel" style={{ flex: 1 }}>
                            {CODE_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                        <div style={{ fontSize: '0.66rem', color: '#3f3f46' }}>💡 El usuario puede cambiar el lenguaje al generar</div>
                      </div>
                    )}

                    {fld.type === 'alert' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.72rem', color: '#71717a', flexShrink: 0 }}>Nivel por defecto:</label>
                          <select value={fld.alertLevel || 'NOTE'} onChange={e => upFld(sec.id, fld.id, { alertLevel: e.target.value })} className="alert-sel" style={{ color: ALERT_COLORS[fld.alertLevel || 'NOTE'] }}>
                            {ALERT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                        <input value={fld.placeholder || ''} onChange={e => upFld(sec.id, fld.id, { placeholder: e.target.value })} placeholder="Texto de ejemplo de la alerta..." style={inp} />
                        <div style={{ fontSize: '0.66rem', color: '#3f3f46' }}>
                          Genera <code style={{ fontSize: '0.65rem', background: '#18181b', padding: '1px 4px', borderRadius: '3px', color: '#fb923c' }}>{`> [!${fld.alertLevel || 'NOTE'}]`}</code> — compatible con GitHub GFM
                        </div>
                      </div>
                    )}

                    {fld.type === 'collapsible' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                        <input value={fld.summaryPlaceholder || ''} onChange={e => upFld(sec.id, fld.id, { summaryPlaceholder: e.target.value })} placeholder="Placeholder del título (summary)..." style={inp} />
                        <input value={fld.placeholder || ''} onChange={e => upFld(sec.id, fld.id, { placeholder: e.target.value })} placeholder="Placeholder del contenido interior..." style={inp} />
                        <div style={{ fontSize: '0.66rem', color: '#3f3f46' }}>
                          Genera <code style={{ fontSize: '0.65rem', background: '#18181b', padding: '1px 4px', borderRadius: '3px', color: '#fb923c' }}>{'<details><summary>'}</code>
                        </div>
                      </div>
                    )}

                    {fld.type === 'badges' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#71717a', marginBottom: '2px' }}>Badges predefinidos del template (el usuario agrega los suyos al generar):</div>
                        {(fld.defaultBadges || []).map((b, bi) => (
                          <div key={bi} style={{ display: 'flex', gap: '6px' }}>
                            <input value={b.label || ''} onChange={e => { const nb=[...fld.defaultBadges]; nb[bi]={...nb[bi],label:e.target.value}; upFld(sec.id,fld.id,{defaultBadges:nb}); }} placeholder="Label" style={{ ...inp, flex: 1 }} />
                            <input value={b.color || 'blue'} onChange={e => { const nb=[...fld.defaultBadges]; nb[bi]={...nb[bi],color:e.target.value}; upFld(sec.id,fld.id,{defaultBadges:nb}); }} placeholder="Color" style={{ ...inp, width: '80px', flex: 'none' }} />
                            <button onClick={() => upFld(sec.id,fld.id,{defaultBadges:fld.defaultBadges.filter((_,i)=>i!==bi)})} style={{ background:'none',border:'1px solid #27272a',borderRadius:'6px',color:'#3f3f46',cursor:'pointer',padding:'5px 8px',display:'flex' }}><X size={12}/></button>
                          </div>
                        ))}
                        <button onClick={() => upFld(sec.id,fld.id,{defaultBadges:[...(fld.defaultBadges||[]),{label:'',color:'blue'}]})} style={{ display:'flex',alignItems:'center',gap:'5px',background:'none',border:'1px dashed #27272a',borderRadius:'6px',color:'#52525b',cursor:'pointer',padding:'5px 12px',fontSize:'0.72rem',fontFamily:"'Manrope',sans-serif" }}>
                          <Plus size={11}/> Agregar badge
                        </button>
                      </div>
                    )}

                    {fld.type === 'video' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                        <input value={fld.placeholder || ''} onChange={e => upFld(sec.id, fld.id, { placeholder: e.target.value })} placeholder="URL de ejemplo del video..." style={inp} />
                        <div style={{ fontSize: '0.66rem', color: '#3f3f46' }}>🎬 El usuario puede poner thumbnail y texto. GitHub no soporta embed real.</div>
                      </div>
                    )}

                    {fld.type === 'blocks' && (
                      <div style={{ fontSize: '0.72rem', color: '#71717a', padding: '8px 0', display:'flex', alignItems:'center', gap:'6px' }}>
                        <AlignLeft size={12} color="#52525b"/> Editor de bloques rich content — el usuario agrega texto, código, imágenes, alertas, toggles y más en cualquier orden.
                      </div>
                    )}

                    {/* Table column editor */}
                    {fld.type === 'table' && (
                      <div style={{ marginTop: '6px' }}>
                        <div style={{ fontSize: '0.67rem', color: '#52525b', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Table size={11} /> Columnas de la tabla
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                          {(fld.columns || []).map((col, ci) => (
                            <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', padding: '3px 3px 3px 8px' }}>
                              <input
                                value={col}
                                onChange={e => upCol(sec.id, fld.id, ci, e.target.value)}
                                style={{ background: 'none', border: 'none', color: '#e4e4e7', fontSize: '0.76rem', fontFamily: "'Manrope',sans-serif", outline: 'none', width: `${Math.max(col.length, 4)}ch` }}
                              />
                              <button onClick={() => delCol(sec.id, fld.id, ci)} style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', display: 'flex', padding: '2px' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}
                              ><X size={11} /></button>
                            </div>
                          ))}
                          <button onClick={() => addCol(sec.id, fld.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#18181b', border: '1px dashed #27272a', borderRadius: '6px', padding: '4px 10px', color: '#52525b', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'Manrope',sans-serif" }}>
                            <Plus size={11} /> Columna
                          </button>
                        </div>
                      </div>
                    )}

                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.69rem', color: '#52525b', cursor: 'pointer', marginTop: '4px' }}>
                      <input type="checkbox" checked={fld.required || false} onChange={e => upFld(sec.id, fld.id, { required: e.target.checked })} style={{ accentColor: t.color }} />
                      Campo requerido
                    </label>
                  </div>
                ))}
                <button onClick={() => addFld(sec.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px dashed #27272a', borderRadius: '7px', color: '#52525b', cursor: 'pointer', padding: '8px 14px', fontSize: '0.76rem', fontFamily: "'Manrope',sans-serif", width: '100%', justifyContent: 'center', marginTop: '4px' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.color = t.color; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#52525b'; }}
                >
                  <Plus size={13} /> Agregar campo
                </button>
              </div>
            )}
          </div>
        ))}

        <button onClick={addSec} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '1px dashed #27272a', borderRadius: '9px', color: '#52525b', cursor: 'pointer', padding: '12px 20px', fontSize: '0.8rem', fontFamily: "'Syne',sans-serif", fontWeight: 700, width: '100%', justifyContent: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.color = t.color; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#52525b'; }}
        >
          <Plus size={14} /> Añadir Sección
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── BLOCKS EDITOR ─────────────────────────── */
const BLOCK_TYPES = [
  { type: 'text',        icon: <AlignLeft size={12}/>,      label: 'Texto',       color: '#a1a1aa' },
  { type: 'code',        icon: <Code2 size={12}/>,          label: 'Código',      color: '#fb923c' },
  { type: 'image',       icon: <Image size={12}/>,          label: 'Imagen',      color: '#3b82f6' },
  { type: 'video',       icon: <Video size={12}/>,          label: 'Video',       color: '#8b5cf6' },
  { type: 'alert',       icon: <AlertCircle size={12}/>,    label: 'Alerta',      color: '#f59e0b' },
  { type: 'quote',       icon: <Quote size={12}/>,          label: 'Cita',        color: '#10b981' },
  { type: 'collapsible', icon: <ChevronRight size={12}/>,   label: 'Toggle',      color: '#06b6d4' },
  { type: 'divider',     icon: <Minus size={12}/>,          label: 'Separador',   color: '#52525b' },
];

const CODE_LANGS = ['c','cpp','python','bash','json','kotlin','javascript','typescript','rust','go','java','yaml','toml','asm','vhdl','makefile','plaintext'];
const ALERT_LEVELS = ['NOTE','TIP','WARNING','IMPORTANT','CAUTION'];
const ALERT_COLORS = { NOTE:'#3b82f6', TIP:'#10b981', WARNING:'#f59e0b', IMPORTANT:'#fb923c', CAUTION:'#ef4444' };

function newBlock(type) {
  const base = { id: uid(), type };
  switch (type) {
    case 'text':        return { ...base, content: '' };
    case 'code':        return { ...base, lang: 'cpp', content: '' };
    case 'image':       return { ...base, url: '', alt: '', caption: '', center: true, width: '' };
    case 'video':       return { ...base, url: '', thumb: '', label: 'Ver video' };
    case 'alert':       return { ...base, level: 'NOTE', content: '' };
    case 'quote':       return { ...base, content: '' };
    case 'collapsible': return { ...base, summary: '', content: '' };
    case 'divider':     return { ...base };
    default:            return base;
  }
}

function BlocksEditor({ value, onChange }) {
  const blocks = Array.isArray(value) ? value : [];
  const [showMenu, setShowMenu] = useState(false);

  const upd  = (id, ch) => onChange(blocks.map(b => b.id === id ? { ...b, ...ch } : b));
  const del  = (id)     => onChange(blocks.filter(b => b.id !== id));
  const add  = (type)   => { onChange([...blocks, newBlock(type)]); setShowMenu(false); };
  const move = (id, dir) => {
    const i = blocks.findIndex(b => b.id === id);
    if ((dir === -1 && i === 0) || (dir === 1 && i === blocks.length - 1)) return;
    const next = [...blocks];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  const inp  = { background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#e4e4e7', padding: '7px 10px', fontSize: '0.79rem', fontFamily: "'Manrope',sans-serif", outline: 'none', width: '100%' };
  const inpSm = { ...inp, padding: '5px 8px', fontSize: '0.74rem' };
  const ta   = { ...inp, resize: 'vertical', lineHeight: '1.6' };

  return (
    <div className="blk-wrap">
      {blocks.map((blk, idx) => {
        const meta = BLOCK_TYPES.find(b => b.type === blk.type) || BLOCK_TYPES[0];
        return (
          <div key={blk.id} className="blk-card fade-in">
            {/* Header */}
            <div className="blk-header">
              <button className="blk-move" onClick={() => move(blk.id, -1)} title="Subir" disabled={idx===0} style={{opacity:idx===0?0.3:1}}><MoveUp size={12}/></button>
              <button className="blk-move" onClick={() => move(blk.id, 1)}  title="Bajar" disabled={idx===blocks.length-1} style={{opacity:idx===blocks.length-1?0.3:1}}><MoveDown size={12}/></button>
              <span className="blk-type-badge" style={{ background: meta.color+'22', color: meta.color }}>
                {meta.icon} <span style={{marginLeft:'4px'}}>{meta.label}</span>
              </span>

              {/* Controles extra en el header según tipo */}
              {blk.type === 'code' && (
                <select className="lang-sel" value={blk.lang} onChange={e => upd(blk.id, { lang: e.target.value })}>
                  {CODE_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              )}
              {blk.type === 'alert' && (
                <select className="alert-sel" value={blk.level} onChange={e => upd(blk.id, { level: e.target.value })}
                  style={{ color: ALERT_COLORS[blk.level] || '#e4e4e7' }}>
                  {ALERT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              )}

              <button className="blk-del" onClick={() => del(blk.id)} title="Eliminar bloque"><X size={12}/></button>
            </div>

            {/* Body */}
            {blk.type !== 'divider' && (
              <div className="blk-body">
                {blk.type === 'text' && (
                  <textarea rows={3} value={blk.content} onChange={e => upd(blk.id, { content: e.target.value })}
                    placeholder="Escribe aquí... (soporta **negrita**, `código`, [links](url))" style={ta} />
                )}

                {blk.type === 'code' && (
                  <textarea rows={5} value={blk.content} onChange={e => upd(blk.id, { content: e.target.value })}
                    placeholder={`// Código ${blk.lang}`}
                    style={{ ...ta, fontFamily: "'JetBrains Mono',monospace", fontSize: '0.76rem', background: '#0a0a0c', color: '#a1a1aa' }} />
                )}

                {blk.type === 'image' && (
                  <>
                    <input value={blk.url} onChange={e => upd(blk.id, { url: e.target.value })}
                      placeholder="URL de imagen (https://... o ./assets/foto.png)" style={inp} />
                    {blk.url && (
                      <div style={{ background:'#0a0a0c', borderRadius:'6px', padding:'8px', textAlign: blk.center ? 'center':'left' }}>
                        <img src={blk.url} alt={blk.alt||'preview'} style={{ maxWidth:'100%', maxHeight:'120px', borderRadius:'5px', objectFit:'contain' }}
                          onError={e => e.target.style.display='none'} />
                      </div>
                    )}
                    <div style={{ display:'flex', gap:'7px' }}>
                      <input value={blk.alt} onChange={e => upd(blk.id,{alt:e.target.value})} placeholder="Alt text" style={{...inpSm,flex:1}} />
                      <input value={blk.caption} onChange={e => upd(blk.id,{caption:e.target.value})} placeholder="Caption (opcional)" style={{...inpSm,flex:1}} />
                      <input value={blk.width} onChange={e => upd(blk.id,{width:e.target.value})} placeholder="Ancho px" style={{...inpSm,width:'80px',flex:'none'}} />
                    </div>
                    <label style={{display:'flex',alignItems:'center',gap:'7px',fontSize:'0.73rem',color:'#71717a',cursor:'pointer'}}>
                      <input type="checkbox" checked={blk.center} onChange={e => upd(blk.id,{center:e.target.checked})} style={{accentColor:'#3b82f6'}} />
                      Centrar imagen <code style={{fontSize:'0.68rem',background:'#18181b',padding:'1px 5px',borderRadius:'3px',color:'#fb923c'}}>{'<div align="center">'}</code>
                    </label>
                  </>
                )}

                {blk.type === 'video' && (
                  <>
                    <input value={blk.url} onChange={e => upd(blk.id,{url:e.target.value})}
                      placeholder="URL del video (YouTube, etc.)" style={inp} />
                    <input value={blk.thumb} onChange={e => upd(blk.id,{thumb:e.target.value})}
                      placeholder="URL del thumbnail (opcional — convierte en imagen clickeable)" style={inpSm} />
                    <input value={blk.label} onChange={e => upd(blk.id,{label:e.target.value})}
                      placeholder="Texto del link" style={inpSm} />
                    <div style={{fontSize:'0.66rem',color:'#3f3f46'}}>
                      💡 GitHub no soporta video embed. Se genera una imagen clickeable o un link con 🎬
                    </div>
                  </>
                )}

                {blk.type === 'alert' && (
                  <textarea rows={2} value={blk.content} onChange={e => upd(blk.id,{content:e.target.value})}
                    placeholder={`Mensaje de ${blk.level}...`}
                    style={{ ...ta, borderColor: ALERT_COLORS[blk.level]+'44' }} />
                )}

                {blk.type === 'quote' && (
                  <textarea rows={2} value={blk.content} onChange={e => upd(blk.id,{content:e.target.value})}
                    placeholder="Texto de la cita..." style={{ ...ta, borderLeft:`3px solid #10b981`, borderRadius:'0 6px 6px 0', paddingLeft:'12px' }} />
                )}

                {blk.type === 'collapsible' && (
                  <>
                    <input value={blk.summary} onChange={e => upd(blk.id,{summary:e.target.value})}
                      placeholder="Título del toggle (lo que ve el usuario antes de abrir)" style={inp} />
                    <textarea rows={3} value={blk.content} onChange={e => upd(blk.id,{content:e.target.value})}
                      placeholder="Contenido interior (se muestra al expandir)..." style={ta} />
                  </>
                )}
              </div>
            )}

            {blk.type === 'divider' && (
              <div style={{padding:'8px 12px'}}>
                <div style={{height:'1px',background:'#27272a',borderRadius:'1px'}} />
              </div>
            )}
          </div>
        );
      })}

      {/* Add block menu */}
      {showMenu ? (
        <div className="add-blk-menu">
          <div style={{width:'100%',fontSize:'0.65rem',color:'#3f3f46',fontFamily:"'Syne',sans-serif",fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'2px'}}>
            Agregar bloque
          </div>
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} className="add-blk-btn" onClick={() => add(bt.type)}
              style={{'--hover-color': bt.color}}>
              <span style={{color:bt.color}}>{bt.icon}</span> {bt.label}
            </button>
          ))}
          <button className="add-blk-btn" onClick={() => setShowMenu(false)} style={{marginLeft:'auto',color:'#52525b'}}>
            <X size={11}/> Cancelar
          </button>
        </div>
      ) : (
        <button onClick={() => setShowMenu(true)}
          style={{display:'flex',alignItems:'center',gap:'7px',background:'none',border:'1px dashed #27272a',borderRadius:'8px',color:'#52525b',cursor:'pointer',padding:'9px 16px',fontSize:'0.76rem',fontFamily:"'Syne',sans-serif",fontWeight:700,width:'100%',justifyContent:'center',transition:'all 0.12s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#52525b';e.currentTarget.style.color='#a1a1aa';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#27272a';e.currentTarget.style.color='#52525b';}}
        >
          <Plus size={13}/> Agregar bloque
        </button>
      )}
    </div>
  );
}

/* ─────────────────── IMAGE FIELD EDITOR (Generator) ─────────── */
function ImageFieldEditor({ value, onChange }) {
  const img = value && typeof value === 'object' ? value : { url: '', alt: '', caption: '', center: true };
  const set = (k, v) => onChange({ ...img, [k]: v });

  const inp = { background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#e4e4e7', padding: '8px 11px', fontSize: '0.8rem', fontFamily: "'Manrope',sans-serif", outline: 'none', width: '100%' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <input
        value={img.url}
        onChange={e => set('url', e.target.value)}
        placeholder="URL de la imagen (https://... o ruta relativa ./assets/foto.png)"
        style={inp}
      />
      {img.url && (
        <div style={{ background: '#0d0d0f', border: '1px solid #27272a', borderRadius: '7px', padding: '10px', textAlign: img.center ? 'center' : 'left' }}>
          <img src={img.url} alt={img.alt || 'preview'} style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '6px', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
        </div>
      )}
      <div style={{ display: 'flex', gap: '7px' }}>
        <input
          value={img.alt}
          onChange={e => set('alt', e.target.value)}
          placeholder="Texto alternativo (alt)"
          style={{ ...inp, flex: 1 }}
        />
        <input
          value={img.caption}
          onChange={e => set('caption', e.target.value)}
          placeholder="Caption (opcional)"
          style={{ ...inp, flex: 1 }}
        />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.75rem', color: '#71717a', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={img.center}
          onChange={e => set('center', e.target.checked)}
          style={{ accentColor: '#06b6d4', width: '14px', height: '14px' }}
        />
        Centrar imagen con HTML (<code style={{ fontSize: '0.7rem', background: '#18181b', padding: '1px 5px', borderRadius: '3px', color: '#fb923c' }}>{'<div align="center">'}</code>)
      </label>
    </div>
  );
}

/* ─────────────────── TABLE FIELD EDITOR (Generator) ─────────── */
function TableFieldEditor({ field, value, onChange }) {
  const initCols = () => {
    if (value && !Array.isArray(value) && value.cols?.length) return [...value.cols];
    return field.columns?.length ? [...field.columns] : ['Columna 1'];
  };
  const initRows = (c) => {
    if (value && !Array.isArray(value) && value.rows?.length) return value.rows;
    if (Array.isArray(value) && value.length > 0) return value;
    return [c.map(() => '')];
  };

  const [cols, setCols] = useState(initCols);
  const [rows, setRows] = useState(() => { const c = initCols(); return initRows(c); });

  // Siempre sube {cols, rows} — buildMd usa los cols del dato, no del template
  const sync = (nc, nr) => { setCols(nc); setRows(nr); onChange({ cols: nc, rows: nr }); };

  const setCell  = (ri, ci, val) => { const n = rows.map(r=>[...r]); n[ri][ci]=val; sync(cols, n); };
  const setColName = (ci, val)   => { const n=[...cols]; n[ci]=val; sync(n, rows); };
  const addRow   = ()            => sync(cols, [...rows, cols.map(()=>'')]);
  const delRow   = (ri)          => { if(rows.length<=1)return; sync(cols, rows.filter((_,i)=>i!==ri)); };
  const addCol   = ()            => sync([...cols,`Col ${cols.length+1}`], rows.map(r=>[...r,'']));
  const delCol   = (ci)          => { if(cols.length<=1)return; sync(cols.filter((_,i)=>i!==ci), rows.map(r=>r.filter((_,i)=>i!==ci))); };

  return (
    <div style={{ marginBottom: '2px' }}>
      <div style={{ overflowX: 'auto', borderRadius: '7px', border: '1px solid #27272a' }}>
        <table className="tbl-editor" style={{ minWidth: '100%' }}>
          <thead>
            <tr>
              {cols.map((col, ci) => (
                <th key={ci} style={{ padding: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '5px 6px', gap: '4px' }}>
                    <input
                      value={col}
                      onChange={e => setColName(ci, e.target.value)}
                      style={{ background: 'none', border: 'none', color: '#fb923c', fontSize: '0.65rem', fontFamily: "'Syne',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', outline: 'none', width: `${Math.max(col.length, 4)}ch`, minWidth: '40px' }}
                    />
                    {cols.length > 1 && (
                      <button onClick={() => delCol(ci)} style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', padding: '1px', display: 'flex', flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}
                      ><X size={10} /></button>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ width: '36px', background: '#0d0d0f' }}>
                <button onClick={addCol} title="Agregar columna"
                  style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#10b981'}
                  onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}
                ><PlusCircle size={13} /></button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {cols.map((_, ci) => (
                  <td key={ci}><input value={row[ci] || ''} onChange={e => setCell(ri, ci, e.target.value)} placeholder="—" /></td>
                ))}
                <td style={{ textAlign: 'center', background: '#0d0d0f' }}>
                  <button className="del-row" onClick={() => delRow(ri)} title="Eliminar fila"><MinusCircle size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', background: 'none', border: '1px dashed #27272a', borderRadius: '6px', color: '#52525b', cursor: 'pointer', padding: '5px 12px', fontSize: '0.72rem', fontFamily: "'Manrope',sans-serif", width: '100%', justifyContent: 'center' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#52525b'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#27272a'}
      >
        <PlusCircle size={12} /> Agregar fila
      </button>
    </div>
  );
}

/* ─────────────────── GENERATOR ─────────────────────────────── */
function Generator({ template, onBack }) {
  const [tpl, setTpl]       = useState(() => deepClone(template)); // copia local editable
  const [fd, setFd]         = useState({});
  const [panel, setPanel]   = useState('preview');
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const setVal = (k, v) => setFd(p => ({ ...p, [k]: v }));
  const md  = buildMd(tpl, fd);
  const html = mdToHtml(md);

  // ── edición en vivo del template ──────────────────────────────
  const addSec = () => {
    const ns = { id: uid(), title: 'Nueva Sección', required: false, fields: [] };
    setTpl(p => ({ ...p, sections: [...p.sections, ns] }));
  };
  const delSec = (sid) => setTpl(p => ({ ...p, sections: p.sections.filter(s => s.id !== sid) }));
  const upSec  = (sid, ch) => setTpl(p => ({ ...p, sections: p.sections.map(s => s.id===sid ? {...s,...ch} : s) }));
  const addFld = (sid) => {
    const nf = { id: uid(), label: 'Nuevo Campo', key: 'fld_'+uid(), type: 'text', placeholder: '', required: false };
    setTpl(p => ({ ...p, sections: p.sections.map(s => s.id===sid ? {...s, fields:[...s.fields,nf]} : s) }));
  };
  const delFld = (sid, fid) => setTpl(p => ({ ...p, sections: p.sections.map(s => s.id===sid ? {...s, fields:s.fields.filter(f=>f.id!==fid)} : s) }));
  const upFld  = (sid, fid, ch) => setTpl(p => ({ ...p, sections: p.sections.map(s => s.id===sid ? {...s, fields:s.fields.map(f=>f.id===fid?{...f,...ch}:f)} : s) }));

  const copy = async () => {
    try { await navigator.clipboard.writeText(md); } catch (_) { /* clipboard unavailable */ }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const dl = () => {
    const name = (typeof fd.projectName === 'string' ? fd.projectName : tpl.name).replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const a = document.createElement('a');
    a.href = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
    a.download = name + '.md'; a.click();
  };

  const inp = { background: '#18181b', border: '1px solid #27272a', borderRadius: '6px', color: '#e4e4e7', padding: '8px 11px', fontSize: '0.8rem', fontFamily: "'Manrope',sans-serif", outline: 'none', width: '100%' };
  const inpSm = { ...inp, padding: '5px 8px', fontSize: '0.75rem' };

  return (
    <div className="rma" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#09090b', color: '#e4e4e7', fontFamily: "'Manrope',sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid #1e2024', padding: '11px 18px', display: 'flex', alignItems: 'center', gap: '10px', background: '#0d0d0f', flexShrink: 0, flexWrap: 'wrap', rowGap: '8px' }}>
        <button onClick={onBack} className="btn-ani" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '0.8rem', fontFamily: "'Manrope',sans-serif", padding: '4px 6px', borderRadius: '5px' }}>
          <ArrowLeft size={14} /> Volver
        </button>
        <span style={{ color: '#27272a' }}>|</span>
        <span style={{ fontSize: '1rem' }}>{tpl.emoji}</span>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#e4e4e7' }}>{tpl.name}</span>

        {/* Toggle edición en vivo */}
        <button
          onClick={() => setEditMode(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: editMode ? '#18181b' : 'none', color: editMode ? tpl.color : '#52525b', border: `1px solid ${editMode ? tpl.color : '#27272a'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'Syne',sans-serif", fontWeight: 700, transition: 'all 0.12s' }}
        >
          <Edit3 size={12} /> {editMode ? 'Editar ON' : 'Editar estructura'}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '3px', background: '#18181b', border: '1px solid #27272a', borderRadius: '7px', padding: '3px' }}>
          {[['preview','👁 Preview'],['raw','</> Markdown']].map(([v,l]) => (
            <button key={v} onClick={() => setPanel(v)} style={{ padding: '5px 11px', background: panel===v ? '#27272a' : 'none', color: panel===v ? '#e4e4e7' : '#71717a', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: "'Syne',sans-serif", fontWeight: 600, transition: 'all 0.1s' }}>
              {l}
            </button>
          ))}
        </div>
        <button className="btn-ani" onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: '#18181b', color: copied ? '#10b981' : '#a1a1aa', border: `1px solid ${copied ? '#10b981' : '#27272a'}`, borderRadius: '7px', cursor: 'pointer', fontSize: '0.76rem', fontFamily: "'Manrope',sans-serif", transition: 'all 0.15s' }}>
          {copied ? <><Check size={12}/> Copiado!</> : <><Copy size={12}/> Copiar</>}
        </button>
        <button className="btn-ani" onClick={dl} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: tpl.color, color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.76rem', fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>
          <Download size={12}/> Descargar .md
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* ── Form panel ── */}
        <div style={{ width: '420px', flexShrink: 0, borderRight: '1px solid #1e2024', overflowY: 'auto', padding: '20px' }}>
          <div style={{ fontSize: '0.68rem', color: '#52525b', fontFamily: "'Syne',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📋 Formulario</span>
            {editMode && <span style={{ color: tpl.color, fontSize: '0.62rem' }}>✏ Modo edición activo</span>}
          </div>

          {tpl.sections.map((sec, si) => (
            <div key={sec.id} style={{ marginBottom: '22px' }}>

              {/* Cabecera de sección */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                <div style={{ width: '2px', height: '14px', background: tpl.color, borderRadius: '1px', flexShrink: 0 }} />
                {editMode ? (
                  <input
                    value={sec.title}
                    onChange={e => upSec(sec.id, { title: e.target.value })}
                    style={{ ...inpSm, flex: 1, fontFamily: "'Syne',sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 7px' }}
                  />
                ) : (
                  <span style={{ fontSize: '0.76rem', fontFamily: "'Syne',sans-serif", fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
                    {sec.title}
                  </span>
                )}
                {sec.required && !editMode && <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>*</span>}
                {editMode && si > 0 && (
                  <button onClick={() => delSec(sec.id)} title="Eliminar sección"
                    style={{ background: 'none', border: 'none', color: '#3f3f46', cursor: 'pointer', padding: '2px', display: 'flex' }}
                    onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color='#3f3f46'}
                  ><Trash2 size={12}/></button>
                )}
              </div>

              {/* Campos */}
              {sec.fields.map(fld => (
                <div key={fld.id} style={{ marginBottom: '12px', position: 'relative' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: '#a1a1aa', marginBottom: '5px' }}>
                    {fld.type === 'table' && <Table size={11} color="#52525b"/>}
                    {fld.type === 'image' && <Image size={11} color="#52525b"/>}
                    {fld.type === 'blocks' && <AlignLeft size={11} color="#52525b"/>}
                    {editMode ? (
                      <input value={fld.label} onChange={e => upFld(sec.id, fld.id, {label:e.target.value})}
                        style={{ ...inpSm, flex:1, padding:'2px 6px', color:'#e4e4e7' }} />
                    ) : (
                      <span>{fld.label}{fld.required && <span style={{color:'#ef4444',marginLeft:'3px'}}>*</span>}</span>
                    )}
                    {editMode && (
                      <>
                        <select value={fld.type} onChange={e => upFld(sec.id, fld.id, {type:e.target.value, ...(e.target.value==='table'?{columns:fld.columns||['Col 1','Col 2']}:{})})}
                          style={{ ...inpSm, width:'auto', cursor:'pointer', marginLeft:'4px', padding:'2px 5px' }}>
                          {FT.map(ft => <option key={ft.v} value={ft.v}>{ft.l}</option>)}
                        </select>
                        <button onClick={() => delFld(sec.id, fld.id)} title="Eliminar campo"
                          style={{ background:'none', border:'none', color:'#3f3f46', cursor:'pointer', padding:'2px', display:'flex', flexShrink:0 }}
                          onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color='#3f3f46'}
                        ><X size={11}/></button>
                      </>
                    )}
                  </label>

                  {/* Input según tipo */}
                  {fld.type === 'blocks' ? (
                    <BlocksEditor value={fd[fld.key]} onChange={v => setVal(fld.key, v)} />
                  ) : fld.type === 'image' ? (
                    <ImageFieldEditor field={fld} value={fd[fld.key]} onChange={v => setVal(fld.key, v)} />
                  ) : fld.type === 'table' ? (
                    <TableFieldEditor field={fld} value={fd[fld.key]} onChange={v => setVal(fld.key, v)} />
                  ) : fld.type === 'code' ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                        <select className="lang-sel"
                          value={fd[fld.key+'_lang'] || fld.lang || 'cpp'}
                          onChange={e => setVal(fld.key+'_lang', e.target.value)}>
                          {CODE_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <span style={{ fontSize:'0.68rem', color:'#3f3f46' }}>Lenguaje del bloque</span>
                      </div>
                      <textarea rows={5} value={fd[fld.key]||''} onChange={e => setVal(fld.key, e.target.value)}
                        placeholder={fld.placeholder || `// Código ${fld.lang||'cpp'}`}
                        style={{ ...inp, fontFamily:"'JetBrains Mono',monospace", fontSize:'0.76rem', background:'#0a0a0c', color:'#a1a1aa', lineHeight:'1.6', resize:'vertical' }} />
                    </div>
                  ) : fld.type === 'alert' ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                        <select className="alert-sel"
                          value={fd[fld.key+'_level'] || fld.alertLevel || 'NOTE'}
                          onChange={e => setVal(fld.key+'_level', e.target.value)}
                          style={{ color: ALERT_COLORS[fd[fld.key+'_level'] || fld.alertLevel || 'NOTE'] }}>
                          {ALERT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <span style={{ fontSize:'0.68rem', color:'#3f3f46' }}>Nivel de la alerta</span>
                      </div>
                      <textarea rows={2} value={fd[fld.key]||''} onChange={e => setVal(fld.key, e.target.value)}
                        placeholder={fld.placeholder || 'Mensaje de la alerta...'}
                        style={{ ...inp, borderColor: ALERT_COLORS[fd[fld.key+'_level'] || fld.alertLevel || 'NOTE']+'44', lineHeight:'1.6' }} />
                    </div>
                  ) : fld.type === 'collapsible' ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      <input value={fd[fld.key+'_summary']||''} onChange={e => setVal(fld.key+'_summary', e.target.value)}
                        placeholder={fld.summaryPlaceholder || 'Título del toggle (summary)...'}
                        style={{ ...inp, borderColor:'#06b6d4'+'44' }} />
                      <textarea rows={3} value={fd[fld.key]||''} onChange={e => setVal(fld.key, e.target.value)}
                        placeholder={fld.placeholder || 'Contenido interior (se muestra al expandir)...'}
                        style={{ ...inp, lineHeight:'1.6', resize:'vertical' }} />
                      <div style={{ fontSize:'0.67rem', color:'#3f3f46' }}>Genera <code style={{fontSize:'0.65rem',background:'#18181b',padding:'1px 4px',borderRadius:'3px',color:'#fb923c'}}>{'<details><summary>'}</code></div>
                    </div>
                  ) : fld.type === 'badges' ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      <textarea rows={3} value={fd[fld.key]||''} onChange={e => setVal(fld.key, e.target.value)}
                        placeholder={"Una por línea. Formato: Label:valor:color\nEj: Estado:Completado:success\nEj: Licencia:MIT:blue"}
                        style={{ ...inp, lineHeight:'1.6', resize:'vertical', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.74rem' }} />
                      <div style={{ fontSize:'0.67rem', color:'#3f3f46' }}>
                        Formato: <code style={{fontSize:'0.65rem',background:'#18181b',padding:'1px 4px',borderRadius:'3px',color:'#fb923c'}}>Label:valor:color</code> — colores: blue, green, red, orange, yellow, success, critical
                      </div>
                      {fd[fld.key] && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', padding:'8px', background:'#0d0d0f', borderRadius:'6px' }}>
                          {fd[fld.key].split('\n').filter(x=>x.trim()).map((b,i) => {
                            if (b.startsWith('http') || b.startsWith('![')) return <img key={i} src={b.replace(/^!\[.*?\]\(/,'').replace(/\)$/,'')} alt="badge" style={{height:'20px'}} onError={e=>e.target.style.display='none'}/>;
                            const parts = b.split(':');
                            const label = encodeURIComponent(parts[0]||'');
                            const val2  = encodeURIComponent(parts[1]||'');
                            const color = (parts[2]||'blue').trim();
                            return <img key={i} src={`https://img.shields.io/badge/${label}-${val2}-${color}`} alt={parts[0]} style={{height:'20px'}} onError={e=>e.target.style.display='none'}/>;
                          })}
                        </div>
                      )}
                    </div>
                  ) : fld.type === 'video' ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                      <input value={fd[fld.key]||''} onChange={e => setVal(fld.key, e.target.value)}
                        placeholder={fld.placeholder || 'URL del video (YouTube, etc.)'}
                        style={inp} />
                      <input value={fd[fld.key+'_thumb']||''} onChange={e => setVal(fld.key+'_thumb', e.target.value)}
                        placeholder="URL del thumbnail (opcional)" style={{ ...inp, fontSize:'0.76rem' }} />
                      <input value={fd[fld.key+'_label']||''} onChange={e => setVal(fld.key+'_label', e.target.value)}
                        placeholder="Texto del link (ej: Ver demo)" style={{ ...inp, fontSize:'0.76rem' }} />
                      {fd[fld.key+'_thumb'] && (
                        <div style={{ background:'#0d0d0f', borderRadius:'6px', padding:'8px', textAlign:'center' }}>
                          <img src={fd[fld.key+'_thumb']} alt="thumb" style={{ maxHeight:'80px', borderRadius:'5px', objectFit:'contain' }} onError={e=>e.target.style.display='none'} />
                        </div>
                      )}
                      <div style={{ fontSize:'0.67rem', color:'#3f3f46' }}>💡 GitHub no soporta embed. Se genera imagen clickeable o link 🎬</div>
                    </div>
                  ) : fld.type === 'textarea' || fld.type === 'list' ? (
                    <>
                      <textarea
                        value={fd[fld.key] || ''}
                        onChange={e => setVal(fld.key, e.target.value)}
                        placeholder={fld.placeholder}
                        style={{ ...inp, minHeight: fld.type==='list' ? '88px' : '70px', lineHeight:'1.55' }}
                      />
                      {fld.type === 'list' && <div style={{ fontSize:'0.67rem', color:'#3f3f46', marginTop:'3px' }}>↵ Una entrada por línea</div>}
                    </>
                  ) : (
                    <input type="text" value={fd[fld.key]||''} onChange={e => setVal(fld.key, e.target.value)} placeholder={fld.placeholder} style={inp} />
                  )}
                </div>
              ))}

              {/* Botones de edición de sección */}
              {editMode && (
                <button onClick={() => addFld(sec.id)}
                  style={{ display:'flex', alignItems:'center', gap:'5px', background:'none', border:`1px dashed ${tpl.color}44`, borderRadius:'6px', color: tpl.color+'99', cursor:'pointer', padding:'6px 12px', fontSize:'0.72rem', fontFamily:"'Manrope',sans-serif", width:'100%', justifyContent:'center', marginTop:'6px' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=tpl.color;e.currentTarget.style.color=tpl.color;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=tpl.color+'44';e.currentTarget.style.color=tpl.color+'99';}}
                >
                  <Plus size={12}/> Agregar campo
                </button>
              )}
            </div>
          ))}

          {/* Botón agregar sección */}
          {editMode && (
            <button onClick={addSec}
              style={{ display:'flex', alignItems:'center', gap:'7px', background:'none', border:`1px dashed #27272a`, borderRadius:'8px', color:'#52525b', cursor:'pointer', padding:'10px 16px', fontSize:'0.78rem', fontFamily:"'Syne',sans-serif", fontWeight:700, width:'100%', justifyContent:'center', marginTop:'4px' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=tpl.color;e.currentTarget.style.color=tpl.color;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#27272a';e.currentTarget.style.color='#52525b';}}
            >
              <Plus size={13}/> Nueva Sección
            </button>
          )}
        </div>

        {/* ── Preview panel ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'22px 28px' }}>
          {panel === 'preview' ? (
            <>
              <div style={{ fontSize:'0.68rem', color:'#52525b', fontFamily:"'Syne',sans-serif", fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'18px' }}>
                👁 Vista previa renderizada
              </div>
              {md ? (
                <div className="mdp" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', color:'#3f3f46', textAlign:'center', gap:'12px' }}>
                  <div style={{ fontSize:'2.5rem' }}>✍️</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:'#52525b' }}>Completa el formulario</div>
                  <div style={{ fontSize:'0.8rem' }}>El preview se actualizará en tiempo real</div>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ fontSize:'0.68rem', color:'#52525b', fontFamily:"'Syne',sans-serif", fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'18px', display:'flex', justifyContent:'space-between' }}>
                <span><FileCode size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:'5px' }}/>Markdown generado</span>
                <span style={{ color:'#3f3f46', fontFamily:"'Manrope',sans-serif", fontWeight:400, textTransform:'none', letterSpacing:0 }}>{md.split('\n').length} líneas</span>
              </div>
              <pre style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.78rem', color:'#a1a1aa', lineHeight:1.75, whiteSpace:'pre-wrap', wordBreak:'break-word', margin:0 }}>
                {md || '# Completa el formulario para ver el Markdown generado...'}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
