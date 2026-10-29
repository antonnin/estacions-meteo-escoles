/**
 * Formulari de contacte: envia el missatge a l'Apps Script (fulla "contactes").
 * Fa un POST "no-cors" (la resposta d'Apps Script no es pot llegir des d'un altre domini),
 * així que només podem saber si l'enviament s'ha pogut fer, no si s'ha desat.
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('cStatus');
    const send = document.getElementById('cSend');
    const say = (msg, ok) => { status.textContent = msg; status.style.color = ok ? '#15803d' : '#b91c1c'; };

    if (!CONFIG.api.url) {
        say('El formulari encara no està configurat (cal CONFIG.api.url a js/config.js).', false);
        send.disabled = true;
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            action: 'contact',
            name: document.getElementById('cName').value.trim(),
            email: document.getElementById('cEmail').value.trim(),
            topic: document.getElementById('cTopic').value,
            message: document.getElementById('cMessage').value.trim(),
            website: document.getElementById('cWebsite').value,   // parany per a robots
        };
        if (!payload.name || !payload.message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) {
            say('Omple el nom, un correu vàlid i el missatge.', false);
            return;
        }
        if (!document.getElementById('cConsent').checked) {
            say('Cal que acceptis l\'ús de les dades per poder respondre.', false);
            return;
        }
        send.disabled = true;
        say('Enviant…', true);
        try {
            await fetch(CONFIG.api.url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload),
            });
            form.reset();
            say('✅ Missatge enviat. Gràcies! Et respondrem al correu indicat.', true);
        } catch (err) {
            say('No s\'ha pogut enviar el missatge. Torna-ho a provar més tard.', false);
        } finally {
            send.disabled = false;
        }
    });
});
