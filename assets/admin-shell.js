import { mayView, roleViews } from './admin-model.js';
import { icon } from './admin-icons.js';

const destinations = [
    ['overview', 'Vue d’ensemble', 'home', 'Opérations'], ['orders', 'Commandes', 'shopping-bag', 'Opérations'],
    ['menu', 'Menu & produits', 'grid', 'Catalogue'], ['promotions', 'Promotions', 'tag', 'Catalogue'],
    ['drivers', 'Équipe', 'users', 'Gestion'], ['settings', 'Paramètres', 'sliders', 'Gestion']
];
const labels = { admin: 'Administrateur', manager: 'Manager', caissier: 'Caissier', livreur: 'Livreur' };
const navLink = ([id, label, glyph]) => `<a class="admin-nav-link" data-view="${id}" href="#${id}">${icon(glyph)}<span>${label}</span></a>`;

export function mountAdminShell() {
    document.querySelector('body > header')?.remove();
    document.getElementById('mobile-menu')?.remove();
    document.querySelector('body > aside')?.remove();
    const views = document.getElementById('views-container');
    const shell = document.createElement('div');
    shell.id = 'admin-app'; shell.className = 'admin-app'; shell.hidden = true; shell.inert = true;
    shell.innerHTML = `
        <a class="admin-skip" href="#views-container">Aller au contenu</a>
        <aside class="admin-sidebar" aria-label="Navigation principale">
            <a class="admin-brand" href="index.html" target="_blank" rel="noopener"><img src="assets/logo.png" width="40" height="40" alt=""><span><strong data-restaurant-name>BIGTAC</strong><small>Gestion du restaurant</small></span></a>
            <nav id="admin-desktop-nav"></nav>
            <div class="admin-account"><span class="admin-avatar" aria-hidden="true">E</span><span><strong data-staff-name></strong><small data-staff-role></small></span></div>
            <button id="logout-btn" class="admin-text-button">${icon('log-out')}Déconnexion</button>
        </aside>
        <div class="admin-workspace">
            <header class="admin-topbar"><div class="admin-location"><span data-restaurant-name>BIGTAC</span><span aria-hidden="true">/</span><h1 id="admin-page-name">Vue d’ensemble</h1></div><div class="admin-top-actions"><span id="admin-connection" role="status">Connexion…</span><button id="admin-more-button" class="admin-icon-button" aria-label="Ouvrir le menu" aria-expanded="false">${icon('menu')}</button><a class="admin-preview" href="index.html" target="_blank" rel="noopener">Voir le site ${icon('external-link')}</a></div></header>
            <div id="admin-content-slot"></div>
        </div>
        <nav id="admin-bottom-nav" class="admin-bottom-nav" aria-label="Navigation mobile"></nav>
        <dialog id="admin-more" class="admin-more" aria-labelledby="admin-more-title"><header><h2 id="admin-more-title">Votre espace</h2><button id="admin-more-close" class="admin-icon-button" aria-label="Fermer le menu">${icon('x')}</button></header><nav id="admin-more-nav"></nav><a class="admin-button" href="index.html" target="_blank" rel="noopener">Voir le site client</a><button id="admin-more-logout" class="admin-button">Déconnexion</button></dialog>`;
    document.body.append(shell);
    shell.querySelector('#admin-content-slot').replaceWith(views);
    views.setAttribute('role', 'main'); views.tabIndex = -1;
    document.body.className = 'admin-body';
    const settings = document.createElement('section'); settings.id = 'view-settings'; settings.className = 'admin-page hidden';
    settings.innerHTML = `<div class="admin-page-heading"><h2>Paramètres opérationnels</h2><p>Les contrôles existants du restaurant. Les réglages de marque arrivent dans une phase ultérieure.</p></div><div class="admin-panel admin-settings-panel"><div class="admin-setting-row"><div><label for="toggle-store">Restaurant ouvert</label><p>La fermeture annule aussi les commandes en attente. Une confirmation est demandée avant toute fermeture.</p></div><input id="toggle-store" type="checkbox" disabled></div><div class="admin-setting-row"><div><label for="toggle-whatsapp">Commandes WhatsApp</label><p>Utiliser le parcours WhatsApp existant.</p></div><input id="toggle-whatsapp" type="checkbox" disabled></div><p id="admin-settings-feedback" role="status">Chargement des réglages…</p><button class="admin-button" id="admin-settings-retry" hidden>Réessayer</button></div>`;
    views.append(settings);
    const gate = document.createElement('section'); gate.id = 'admin-access'; gate.className = 'admin-access'; gate.hidden = true;
    gate.innerHTML = `<div class="admin-panel"><img src="assets/logo.png" width="48" height="48" alt="BIGTAC"><h1>Accès au restaurant indisponible</h1><p id="admin-access-message" role="alert"></p><button id="admin-access-retry" class="admin-button primary">Réessayer</button><button id="admin-access-logout" class="admin-button">Se déconnecter</button></div>`;
    document.body.append(gate);
    const more = document.getElementById('admin-more');
    const closeMore = () => { more.close(); document.getElementById('admin-more-button').setAttribute('aria-expanded', 'false'); };
    const openMore = () => { more.showModal(); document.getElementById('admin-more-button').setAttribute('aria-expanded', 'true'); };
    document.getElementById('admin-more-button').onclick = openMore;
    document.getElementById('admin-more-close').onclick = closeMore;
    more.addEventListener('close', () => document.getElementById('admin-more-button').setAttribute('aria-expanded', 'false'));
    document.getElementById('admin-more-logout').onclick = () => { closeMore(); document.getElementById('logout-btn').click(); };
    shell.addEventListener('click', event => {
        const moreButton = event.target.closest('[data-more]');
        if (moreButton) return openMore();
        const link = event.target.closest('[data-view]');
        if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); window.switchView(link.dataset.view); if (more.open) closeMore(); }
    });
    const login = document.getElementById('login-section');
    login.querySelector('h2').textContent = 'Gestion du restaurant';
    login.querySelector('p').textContent = 'Connectez-vous avec votre compte équipe';
    document.getElementById('email').name = 'email'; document.getElementById('password').name = 'password';
    document.getElementById('login-error').setAttribute('role', 'alert');
    // Shared focus containment for the preserved legacy editors.
    const editors = ['item-editor','promo-editor','category-editor-modal'].map(id=>document.getElementById(id));
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
    function connection() { document.getElementById('admin-connection').textContent = navigator.onLine ? 'Connecté' : 'Hors connexion'; }
    connection();
    return {
        showSession(profile, role) {
            gate.hidden = true; login.classList.add('hidden'); shell.hidden = false; shell.inert = false;
            shell.dataset.role = role;
            shell.querySelectorAll('[data-staff-name]').forEach(node => node.textContent = profile.name || profile.email || 'Équipe');
            shell.querySelectorAll('[data-staff-role]').forEach(node => node.textContent = labels[role]);
            shell.querySelector('.admin-avatar').textContent = (profile.name || 'E').slice(0, 1).toUpperCase();
            const allowed = destinations.filter(([view]) => mayView(role, view));
            const nav = document.getElementById('admin-desktop-nav'); nav.replaceChildren();
            for (const group of ['Opérations', 'Catalogue', 'Gestion']) {
                const entries = allowed.filter(entry => entry[3] === group);
                if (entries.length) { const section = document.createElement('div'); section.innerHTML = `<p class="admin-nav-group">${group}</p>${entries.map(navLink).join('')}`; nav.append(section); }
            }
            document.getElementById('admin-more-nav').innerHTML = allowed.map(navLink).join('');
            const primary = allowed.filter(([id]) => ['overview', 'orders', 'menu'].includes(id));
            document.getElementById('admin-bottom-nav').innerHTML = primary.map(navLink).join('') + `<button class="admin-nav-link" data-more>${icon('menu')}<span>Plus</span></button>`;
            if (window.feather) window.feather.replace();
        },
        hideSession() {
            shell.hidden = true; shell.inert = true; gate.hidden = true;
            if (more.open) closeMore();
            views.querySelectorAll(':scope > [id^="view-"]').forEach(view => view.classList.add('hidden'));
            for (const id of ['item-editor', 'promo-editor', 'category-editor-modal']) document.getElementById(id)?.classList.add('hidden');
        },
        deny(message) { this.hideSession(); login.classList.add('hidden'); gate.hidden = false; document.getElementById('admin-access-message').textContent = message; },
        route(view) {
            views.querySelectorAll(':scope > [id^="view-"]').forEach(node => node.classList.toggle('hidden', node.id !== `view-${view}`));
            document.getElementById('admin-page-name').textContent = destinations.find(entry => entry[0] === view)?.[1] || 'Livraisons';
            shell.querySelectorAll('[data-view]').forEach(link => { if (link.dataset.view === view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
            if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
            views.focus({ preventScroll: true });
        },
        restaurant(config = {}) { shell.querySelectorAll('[data-restaurant-name]').forEach(node => node.textContent = config.restaurantName || 'BIGTAC'); },
        allowed: roleViews
    };
}
