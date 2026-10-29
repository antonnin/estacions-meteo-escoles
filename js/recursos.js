/**
 * Recursos didàctics addicionals: es llegeixen de data/recursos.json.
 * Per afegir-ne un, afegeix una entrada a "resources" (category, title, description, url, type).
 */
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

document.addEventListener('DOMContentLoaded', async () => {
    const box = document.getElementById('recursosExtra');
    try {
        const res = await fetch('data/recursos.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { categories, resources } = await res.json();

        const icon = { web: '🔗', pdf: '📄', video: '🎬', document: '📝' };
        const html = categories.map(cat => {
            const items = resources.filter(r => r.category === cat.id);
            if (!items.length) return '';
            return `<h4 style="margin:1rem 0 0.25rem;">${esc(cat.title)}</h4>
                <ul style="line-height:1.8;margin:0 0 0.5rem 1.2rem;">${items.map(r => {
                    const external = /^https?:/.test(r.url);
                    return `<li>${icon[r.type] || '🔗'} <a href="${esc(r.url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(r.title)}</a>
                        ${r.description ? `<span style="color:var(--gray-500);"> — ${esc(r.description)}</span>` : ''}</li>`;
                }).join('')}</ul>`;
        }).join('');

        box.innerHTML = `<div class="chart-card"><h3>Més recursos</h3>${html}</div>`;
    } catch (e) {
        box.innerHTML = '';
        console.warn('No s\'han pogut carregar els recursos addicionals', e);
    }
});
