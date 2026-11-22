import { mayView, roleViews } from './admin-model.js';
import { icon } from './admin-icons.js';
import { i18n, t, setUiText } from './i18n.js';
import { safeURL } from './operations-model.js';

const defaultLogo = 'assets/logo.png';

const destinations = [
    ['overview', 'Vue d’ensemble', 'home', 'Opérations', 'admin.overview'],
    ['orders', 'Commandes', 'shopping-bag', 'Opérations', 'admin.orders'],
    ['menu', 'Menu', 'book', 'Catalogue', 'admin.menu'],
    ['promotions', 'Promotions', 'tag', 'Catalogue', 'admin.promotions'],
    ['drivers', 'Équipe', 'users', 'Gestion', 'admin.team'],
    ['settings', 'Paramètres', 'sliders', 'Gestion', 'admin.settings']
];
const groupKeys = { 'Opérations':'admin.nav_operations', 'Catalogue':'admin.nav_catalog', 'Gestion':'admin.nav_management' };
const labels = { admin: 'Administrateur', manager: 'Manager', caissier: 'Caissier', livreur: 'Livreur' };
const navLink = ([id, label, glyph, , i18nKey]) => `<a class="admin-nav-link" data-view="${id}" href="#${id}">${icon(glyph)}<span data-i18n="${i18nKey || ''}">${label}</span></a>`;

export function mountAdminShell() {
    document.querySelector('body > header')?.remove();
    document.getElementById('mobile-menu')?.remove();
    document.querySelector('body > aside')?.remove();
    const views = document.getElementById('views-container');
    const shell = document.createElement('div');
    shell.id = 'admin-app'; shell.className = 'admin-app'; shell.hidden = true; shell.inert = true;
    shell.innerHTML = `
        <a class="admin-skip" href="#views-container" data-ui-copy="Aller au contenu">Aller au contenu</a>
        <aside class="admin-sidebar" aria-label="Navigation principale" data-ui-aria-label="Navigation principale">
            <a class="admin-brand" href="index.html" target="_blank" rel="noopener"><img src="${defaultLogo}" width="44" height="44" alt="" data-restaurant-logo><span><strong data-restaurant-name>BIGTAC</strong><small data-i18n="admin.workspace">Espace équipe</small></span></a>
            <nav id="admin-desktop-nav"></nav>
            <div class="admin-account"><span class="admin-avatar" aria-hidden="true">E</span><span><strong data-staff-name></strong><small data-staff-role></small></span></div>
            <button id="logout-btn" class="admin-text-button">${icon('log-out')}<span data-i18n="admin.logout">Déconnexion</span></button>
        </aside>
        <div class="admin-workspace">
            <header class="admin-topbar"><div class="admin-location"><span class="location-restaurant" data-restaurant-name>BIGTAC</span><span class="location-separator" aria-hidden="true">/</span><h1 id="admin-page-name" data-ui-copy="Vue d’ensemble">Vue d’ensemble</h1></div><div class="admin-top-actions"><div class="lang-selector relative" id="adminLangSelector"><button type="button" id="btnAdminLang" class="lang-toggle-btn" onclick="toggleLangMenu('adminLangDropdown')" aria-expanded="false" aria-haspopup="true" aria-label="Langue / Language / اللغة" data-ui-aria-label="Langue / Language / اللغة">${icon('globe')}<span class="lang-current current-lang-code">FR</span></button><div id="adminLangDropdown" class="lang-menu hidden" role="menu"><button type="button" class="lang-option" data-lang-btn="fr" onclick="setAppLanguage('fr')" role="menuitem"><span lang="fr">Français</span></button><button type="button" class="lang-option" data-lang-btn="en" onclick="setAppLanguage('en')" role="menuitem"><span lang="en">English</span></button><button type="button" class="lang-option" data-lang-btn="ar" onclick="setAppLanguage('ar')" role="menuitem"><span lang="ar">العربية</span></button></div></div><button id="admin-mode-toggle" class="admin-icon-button" type="button" hidden aria-label="Mode sombre" data-ui-aria-label="Mode sombre"><span class="mode-moon">${icon('moon')}</span><span class="mode-sun">${icon('sun')}</span></button><span id="admin-store-status" class="admin-store-status" hidden></span><span id="admin-connection" role="status" data-ui-copy="Connexion…">Connexion…</span><a class="admin-preview" href="index.html" target="_blank" rel="noopener"><span data-i18n="admin.view_site">Voir le site</span> ${icon('external-link')}</a><button id="admin-profile-button" class="admin-profile-button" aria-label="Ouvrir votre espace équipe" aria-expanded="false" data-ui-aria-label="Ouvrir votre espace équipe"><span class="admin-avatar" aria-hidden="true">E</span><span class="admin-profile-copy"><strong data-staff-name></strong><small data-staff-role></small></span>${icon('chevron-down')}</button><button id="admin-more-button" class="admin-icon-button" aria-label="Ouvrir le menu" aria-expanded="false" data-ui-aria-label="Ouvrir le menu">${icon('menu')}</button></div></header>
            <div id="admin-content-slot"></div>
        </div>
        <nav id="admin-bottom-nav" class="admin-bottom-nav" aria-label="Navigation mobile" data-ui-aria-label="Navigation mobile"></nav>
        <dialog id="admin-more" class="admin-more" aria-labelledby="admin-more-title"><header><h2 id="admin-more-title" data-ui-copy="Votre espace">Votre espace</h2><button id="admin-more-close" class="admin-icon-button" aria-label="Fermer le menu" data-ui-aria-label="Fermer le menu">${icon('x')}</button></header><div class="admin-more-identity"><span class="admin-avatar" aria-hidden="true">E</span><span><strong data-staff-name></strong><small data-staff-role></small></span></div><nav id="admin-more-nav"></nav><a class="admin-button" href="index.html" target="_blank" rel="noopener" data-i18n="admin.view_site">Voir le site client</a><button id="admin-more-logout" class="admin-button" data-i18n="admin.logout">Déconnexion</button></dialog>`;
    document.body.append(shell);
    shell.querySelector('#admin-content-slot').replaceWith(views);
    const logos = shell.querySelectorAll('[data-restaurant-logo]');
    const favicon = document.getElementById('admin-favicon');
    let configuredLogo = defaultLogo;
    for (const logo of logos) {
        logo.addEventListener('error', () => {
            if (logo.getAttribute('src') === defaultLogo) return;
            logo.src = defaultLogo;
            favicon.href = defaultLogo;
        });
    }
    function updateLogo(url) {
        const src = safeURL(url) ? url : defaultLogo;
        if (src === configuredLogo) return;
        configuredLogo = src;
        for (const logo of logos) logo.src = src;
        favicon.href = src;
    }
    views.setAttribute('role', 'main'); views.tabIndex = -1;
    document.body.className = 'admin-body';
    const settings = document.createElement('section'); settings.id = 'view-settings'; settings.className = 'admin-page hidden';
    settings.innerHTML = `<div class="admin-page-heading"><div><h2 data-i18n="admin.settings">Paramètres</h2><p data-ui-copy="Horaires, coordonnées et modes de commande.">Horaires, coordonnées et modes de commande.</p></div></div><div class="admin-panel admin-settings-panel"><div class="admin-setting-row"><div><label for="toggle-store" data-ui-copy="Restaurant ouvert">Restaurant ouvert</label><p data-ui-copy="Après confirmation, la fermeture annule les commandes en attente.">Après confirmation, la fermeture annule les commandes en attente.</p></div><input id="toggle-store" type="checkbox" disabled></div><div class="admin-setting-row"><div><label for="toggle-whatsapp" data-ui-copy="Commandes WhatsApp">Commandes WhatsApp</label><p data-ui-copy="Utiliser le parcours WhatsApp existant.">Utiliser le parcours WhatsApp existant.</p></div><input id="toggle-whatsapp" type="checkbox" disabled></div><p id="admin-settings-feedback" role="status" data-ui-copy="Chargement des réglages…">Chargement des réglages…</p><button class="admin-button" id="admin-settings-retry" hidden data-ui-copy="Réessayer">Réessayer</button></div>`;
    views.append(settings);
    // Reuse the shared visual system without replacing legacy business handlers.
    for(const [id,glyph] of [['view-promotions','tag'],['view-drivers','users'],['view-driver','truck'],['view-settings','sliders']]) {
        const heading=document.querySelector(`#${id} h2`);
        if(heading)heading.insertAdjacentHTML('afterbegin',icon(glyph));
    }
    const teamTable=document.querySelector('#view-drivers table');
    teamTable.setAttribute('role','table');
    const teamLabels=()=>[...teamTable.querySelectorAll('th')].map(cell=>cell.textContent.trim());
    new MutationObserver(()=>teamTable.querySelectorAll('tbody tr').forEach(row=>{
        row.setAttribute('role','row');
        [...row.cells].forEach((cell,index)=>{cell.dataset.label=teamLabels()[index];cell.setAttribute('role','cell');});
        row.querySelectorAll('button:not([aria-label])').forEach(button=>button.setAttribute('aria-label',button.title||button.textContent.trim()||'Action'));
    })).observe(teamTable.querySelector('tbody'),{childList:true});
    const gate = document.createElement('section'); gate.id = 'admin-access'; gate.className = 'admin-access'; gate.hidden = true;
    gate.innerHTML = `<div class="admin-panel"><img src="assets/logo.png" width="48" height="48" alt="BIGTAC"><h1 data-ui-copy="Accès au restaurant indisponible">Accès au restaurant indisponible</h1><p id="admin-access-message" role="alert"></p><button id="admin-access-retry" class="admin-button primary" data-ui-copy="Réessayer">Réessayer</button><button id="admin-access-logout" class="admin-button" data-ui-copy="Se déconnecter">Se déconnecter</button></div>`;
    document.body.append(gate);
    // "Plus" sits raised in the middle of the bottom nav in every theme, like the storefront cart.
    // It moves in the DOM, not with CSS order, so keyboard and screen-reader order match what is shown.
    function arrangeBottomNav() {
        const nav = document.getElementById('admin-bottom-nav');
        const moreButton = nav.querySelector('[data-more]');
        if (!moreButton) return;
        const links = [...nav.querySelectorAll('.admin-nav-link:not([data-more])')];
        const before = links[Math.ceil(links.length / 2)] || null;
        if (moreButton.nextElementSibling !== before) nav.insertBefore(moreButton, before);
    }
    const more = document.getElementById('admin-more');
    const expanded = value => ['admin-more-button','admin-profile-button'].forEach(id=>document.getElementById(id).setAttribute('aria-expanded',String(value)));
    const closeMore = () => { more.close(); expanded(false); };
    const openMore = () => { more.showModal(); expanded(true); };
    document.getElementById('admin-more-button').onclick = openMore;
    document.getElementById('admin-profile-button').onclick = openMore;
    document.getElementById('admin-more-close').onclick = closeMore;
    more.addEventListener('close', () => expanded(false));
    more.addEventListener('cancel', () => expanded(false));
    document.getElementById('admin-more-logout').onclick = () => { closeMore(); document.getElementById('logout-btn').click(); };
    shell.addEventListener('click', event => {
        const moreButton = event.target.closest('[data-more]');
        if (moreButton) return openMore();
        const link = event.target.closest('[data-view]');
        if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); window.switchView(link.dataset.view); if (more.open) closeMore(); }
    });
    const login = document.getElementById('login-section');
    setUiText(login.querySelector('h2'), 'Gestion du restaurant');
    setUiText(login.querySelector('p'), 'Connectez-vous avec votre compte équipe');
    document.getElementById('email').name = 'email'; document.getElementById('password').name = 'password';
    document.getElementById('login-error').setAttribute('role', 'alert');
    // Shared focus containment for the preserved legacy editors.
    const editors = ['promo-editor'].map(id=>document.getElementById(id));
    let activeEditor = null, returnFocus = null;
    const focusables = root => [...root.querySelectorAll('button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(element=>element.getClientRects().length);
    for (const editor of editors) {
        editor.querySelectorAll('label:not([for])').forEach(label=>{
            const field = label.parentElement.querySelector('input:not([type="hidden"]),select,textarea');
            if (field?.id) label.htmlFor=field.id;
        });
        editor.querySelectorAll('button').forEach(button=>{
            if (!button.textContent.trim() && !button.getAttribute('aria-label')) button.setAttribute('aria-label', button.querySelector('[data-feather="x"]') ? 'Fermer' : 'Action');
        });
        new MutationObserver(()=>{
            const open = !editor.classList.contains('hidden');
            if (open && activeEditor!==editor) {
                returnFocus=document.activeElement; activeEditor=editor; shell.inert=true;
                queueMicrotask(()=>focusables(editor)[0]?.focus({preventScroll:true}));
            } else if (!open && activeEditor===editor) {
                activeEditor=null; shell.inert=shell.hidden;
                if (!shell.hidden) (returnFocus?.isConnected ? returnFocus : views).focus({preventScroll:true});
            }
        }).observe(editor,{attributes:true,attributeFilter:['class']});
    }
    document.addEventListener('keydown',event=>{
        if (!activeEditor || event.key!=='Tab') return;
        const elements=focusables(activeEditor), first=elements[0], last=elements.at(-1);
        if (event.shiftKey && document.activeElement===first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first?.focus(); }
    });
    window.addEventListener('offline', () => connection()); window.addEventListener('online', () => connection());
    function connection() { const status=document.getElementById('admin-connection');status.dataset.i18n = navigator.onLine ? 'admin.online' : 'admin.offline'; status.textContent=t(status.dataset.i18n);status.dataset.offline=String(!navigator.onLine); }
    connection();
    return {
        showSession(profile, role) {
            gate.hidden = true; login.classList.add('hidden'); shell.hidden = false; shell.inert = false;
            shell.dataset.role = role;
            shell.querySelectorAll('[data-staff-name]').forEach(node => node.textContent = profile.name || profile.email || 'Équipe');
            shell.querySelectorAll('[data-staff-role]').forEach(node => setUiText(node, labels[role]));
            shell.querySelectorAll('.admin-avatar').forEach(node=>node.textContent=(profile.name || 'E').slice(0,1).toUpperCase());
            const allowed = destinations.filter(([view]) => mayView(role, view));
            const nav = document.getElementById('admin-desktop-nav'); nav.replaceChildren();
            for (const group of ['Opérations', 'Catalogue', 'Gestion']) {
                const entries = allowed.filter(entry => entry[3] === group);
                if (entries.length) { const section = document.createElement('div'); section.innerHTML = `<p class="admin-nav-group" data-i18n="${groupKeys[group]}">${group}</p>${entries.map(navLink).join('')}`; nav.append(section); }
            }
            document.getElementById('admin-more-nav').innerHTML = allowed.map(navLink).join('');
            const primary = allowed.filter(([id]) => ['overview', 'orders', 'menu', 'promotions'].includes(id));
            document.getElementById('admin-bottom-nav').innerHTML = primary.map(navLink).join('') + `<button class="admin-nav-link" data-more>${icon('menu')}<span data-i18n="admin.more">Plus</span></button>`;
            arrangeBottomNav();
            if (window.feather) window.feather.replace();
            i18n.setLang(i18n.getLang());
        },
        hideSession() {
            updateLogo();
            shell.hidden = true; shell.inert = true; gate.hidden = true;
            if (more.open) closeMore();
            views.querySelectorAll(':scope > [id^="view-"]').forEach(view => view.classList.add('hidden'));
            for (const id of ['promo-editor']) document.getElementById(id)?.classList.add('hidden');
        },
        deny(message) { this.hideSession(); login.classList.add('hidden'); gate.hidden = false; setUiText(document.getElementById('admin-access-message'), message); },
        route(view, replace = false) {
            shell.dataset.screen=view;
            document.getElementById('overview-window').hidden=view!=='overview';
            views.querySelectorAll(':scope > [id^="view-"]').forEach(node => node.classList.toggle('hidden', node.id !== `view-${view}`));
            const title = document.getElementById('admin-page-name');
            const destination = destinations.find(entry => entry[0] === view);
            title.dataset.i18n = destination?.[4] || 'driver.tab_deliveries';
            title.textContent = t(title.dataset.i18n, destination?.[1] || 'Livraisons');
            shell.querySelectorAll('[data-view]').forEach(link => { if (link.dataset.view === view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
            if (location.hash !== `#${view}`) history[replace || view === 'driver' ? 'replaceState' : 'pushState'](null, '', `#${view}`);
            views.focus({ preventScroll: true });
        },
        restaurant(config = {}, cached = false) {
            if (!cached) updateLogo(config.logoUrl);
            shell.querySelectorAll('[data-restaurant-name]').forEach(node => node.textContent = config.restaurantName || 'BIGTAC');
            const status=document.getElementById('admin-store-status');status.hidden=!!config._unavailable;
            status.dataset.i18n = config.isOpen===false ? 'admin.closed' : 'admin.open'; status.textContent=t(status.dataset.i18n);status.dataset.open=String(config.isOpen!==false);
        },
        allowed: roleViews
    };
}
