/**
 * Capçalera i peu de pàgina compartits per totes les pàgines.
 * Cada pàgina posa <div id="site-header"></div> i <div id="site-footer"></div>
 * i indica la secció activa amb <body data-page="inici|recursos|alta|contacte">.
 */
const SITE = {
    title: 'Estacions Meteorològiques en Xarxa',
    tagline: 'Projecte mentoria 4.0',
    subtitle: 'Convertim-nos en científics i científiques de dades!',
    nav: [
        { id: 'inici',    label: 'Inici',                 href: 'index.html' },
        { id: 'recursos', label: 'Recursos didàctics',    href: 'recursos.html' },
        { id: 'alta',     label: 'Afegeix la teva placa', href: 'alta.html' },
        { id: 'contacte', label: 'Contacte',              href: 'contacte.html' },
    ],
};

function toggleMenu() {
    document.getElementById('mainNav').classList.toggle('open');
}

(function renderLayout() {
    const page = document.body.dataset.page || '';

    const header = document.getElementById('site-header');
    if (header) {
        header.outerHTML = `
    <header class="header">
        <div class="container">
            <div class="header-content">
                <a href="index.html" class="logo">
                    <div class="logo-icon">🌦️</div>
                    <div class="logo-text">
                        ${SITE.title}
                        <span>${SITE.tagline}</span>
                    </div>
                </a>
                <button class="mobile-menu-btn" onclick="toggleMenu()" aria-label="Menú">☰</button>
                <nav class="nav" id="mainNav">
                    ${SITE.nav.map(n => `<a href="${n.href}" class="nav-link${n.id === page ? ' active' : ''}">${n.label}</a>`).join('\n                    ')}
                </nav>
            </div>
        </div>
    </header>`;
    }

    const footer = document.getElementById('site-footer');
    if (footer) {
        footer.outerHTML = `
    <footer class="site-footer">
        <div class="footer-logos">
            <img class="footer-logos-financament" src="assets/logos/Logos-4.0.png" alt="Programa finançat pel Ministeri d’Educació, Formació Professional i Esports, amb el suport de la Generalitat de Catalunya">
            <img class="footer-logo-mentories" src="assets/logos/Logo-Mentories-4.0-1.png" alt="Logo Mentories 4.0">
        </div>
        <p>${SITE.title} és un projecte de les Mentories 4.0. </p>
        <p>Programat pels mentors/es Anton Nin Nin i Paula Pacho, publicada sota llicència
        <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.ca" target="_blank" rel="noopener">CC BY-NC-ND 4.0</a>.</p>
    </footer>`;
    }
})();
