/**
 * Pàgina d'alta d'estacions: perfils de placa, comprovador de canal i formulari.
 */
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- 1. Perfils
function renderProfiles() {
    const box = document.getElementById('profiles');
    box.innerHTML = Object.entries(PROFILES).map(([id, p]) => {
        let table = '<p style="color:var(--gray-500);margin:0.25rem 0 0;">Els camps es detecten pels noms que posis a ThingSpeak.</p>';
        if (p.fields) {
            const rows = Object.entries(p.fields).map(([k, f]) => {
                const t = expandField(f);
                const note = t.scale !== 1 ? ` <small>(el valor s'envia en cm/h; el web el converteix a km/h)</small>` : '';
                return `<tr><td><code>${k}</code></td><td>${t.icon} ${esc(t.name)}</td><td>${esc(t.unit)}${note}</td></tr>`;
            }).join('');
            table = `<table style="width:100%;border-collapse:collapse;margin-top:0.5rem;font-size:0.95rem;">
                <thead><tr style="text-align:left;"><th>Camp</th><th>Magnitud</th><th>Unitat</th></tr></thead><tbody>${rows}</tbody></table>`;
        }
        return `<details style="margin:0.5rem 0;"><summary style="cursor:pointer;font-weight:600;">${esc(p.label)}</summary>
            <p style="margin:0.5rem 0 0;">${esc(p.description)}</p>${table}</details>`;
    }).join('');
}

// ---- 3. Comprovador de canal
function ageText(date) {
    const min = Math.round((Date.now() - date.getTime()) / 60000);
    if (min < 2) return 'fa un moment';
    if (min < 120) return `fa ${min} minuts`;
    if (min < 2880) return `fa ${Math.round(min / 60)} hores`;
    return `fa ${Math.round(min / 1440)} dies`;
}

async function checkChannel() {
    const out = document.getElementById('chResult');
    const id = document.getElementById('chId').value.trim();
    const key = document.getElementById('chKey').value.trim();
    if (!/^\d+$/.test(id)) { out.innerHTML = '<p>⚠️ El Channel ID són només xifres.</p>'; return; }
    out.innerHTML = '<p>Comprovant…</p>';
    const q = key ? `?api_key=${encodeURIComponent(key)}` : '';
    const lines = [];
    try {
        const infoRes = await fetch(`https://api.thingspeak.com/channels/${id}.json${q}`);
        if (!infoRes.ok) {
            out.innerHTML = `<p>❌ No es pot llegir el canal (HTTP ${infoRes.status}). Comprova l'ID i que el canal sigui <strong>públic</strong> (o posa la Read API Key).</p>`;
            return;
        }
        const info = await infoRes.json();
        lines.push(`✅ Canal trobat: <strong>${esc(info.name || id)}</strong>`);
        lines.push(key ? '⚠️ Canal privat: la Read API Key quedarà visible a la web. És millor fer el canal públic.' : '✅ Canal públic (no cal cap clau).');

        const fields = [];
        for (let i = 1; i <= 8; i++) if (info[`field${i}`]) fields.push([`field${i}`, info[`field${i}`]]);
        if (!fields.length) lines.push('❌ El canal no té camps amb nom. Posa nom a cada camp (Temperatura, Humitat…).');
        else {
            const items = fields.map(([k, label]) => {
                const t = FIELD_TYPES[detectFieldType(label)];
                const generic = detectFieldType(label) === 'generic';
                return `<li><code>${k}</code> «${esc(label)}» → ${generic ? '❓ no reconegut' : `${t.icon} ${t.name}`}</li>`;
            }).join('');
            lines.push(`Camps detectats:<ul style="margin:0.25rem 0 0.5rem 1.2rem;">${items}</ul>`);
            if (fields.some(([, l]) => detectFieldType(l) === 'generic')) {
                lines.push('ℹ️ Els camps «no reconeguts» es mostraran com a valor genèric. Canvia-ne el nom si vols que surtin amb la seva icona.');
            }
        }

        const lastRes = await fetch(`https://api.thingspeak.com/channels/${id}/feeds/last.json${q}`);
        const last = lastRes.ok ? await lastRes.json() : null;
        if (!last || !last.created_at) lines.push('⚠️ El canal encara no té dades. Encén la placa i torna a comprovar.');
        else {
            const d = new Date(last.created_at);
            const fresh = Date.now() - d.getTime() < 3600 * 1000;
            lines.push(`${fresh ? '✅' : '⚠️'} Última lectura ${ageText(d)} (${d.toLocaleString('ca-ES')}).`);
            const windKey = fields.find(([, l]) => detectFieldType(l) === 'wind');
            if (windKey && Number(last[windKey[0]]) > 250) {
                lines.push('ℹ️ El vent té valors molt alts: si ve del kit micro:bit (cm/h), tria el perfil «micro:bit amb kit IoT» perquè el web el converteixi a km/h.');
            }
        }
    } catch (e) {
        lines.push(`❌ Error de xarxa: ${esc(e.message)}`);
    }
    out.innerHTML = lines.map(l => `<p style="margin:0.35rem 0;">${l}</p>`).join('');
}

// ---- 4. Formulari
function renderForm() {
    const box = document.getElementById('formBox');
    if (CONFIG.api.formUrl) {
        box.innerHTML = `<iframe src="${esc(CONFIG.api.formUrl)}" title="Formulari d'alta d'estació" style="width:100%;height:1200px;border:0;" loading="lazy">Carregant…</iframe>
            <p><a href="${esc(CONFIG.api.formUrl.replace('?embedded=true', ''))}" target="_blank" rel="noopener">Obre el formulari en una pestanya nova</a></p>`;
    } else {
        box.innerHTML = `<p>⚠️ El formulari encara no està configurat. Cal posar la seva URL a <code>CONFIG.api.formUrl</code> (<code>js/config.js</code>); vegeu <code>apps-script/README.md</code>.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderProfiles();
    renderForm();
    document.getElementById('chCheck').addEventListener('click', checkChannel);
    document.getElementById('chId').addEventListener('keydown', e => { if (e.key === 'Enter') checkChannel(); });
});
