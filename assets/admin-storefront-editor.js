import { operationsService } from './operations-service.js';
import { copy, fingerprint, imageIssue } from './menu-model.js';
import { orderingAvailable } from './operations-model.js';
import { translations } from './i18n.js';
import {
    appearanceText, copyFields, languages, paletteFields, renderStorefrontAppearance, renderStorefrontHours,
    storefrontAppearance, storefrontAppearanceIssue
} from './storefront-appearance.js';

const field = (label, input) => `<label class="settings-field"><span>${label}</span>${input}</label>`;
const translate = (locale, key) => translations[locale]?.[key] || translations.fr[key] || '';
const sample = {
    fr: {offer:'Exemple de promotion', product:'Exemple de produit'},
    en: {offer:'Sample promotion', product:'Sample product'},
    ar: {offer:'مثال على عرض', product:'مثال على منتج'}
};

export function createStorefrontEditor({session, upload, toast}) {
    const service = operationsService(session);
    const panel = document.createElement('section');
    panel.id = 'settings-appearance';
    panel.className = 'admin-panel storefront-settings-panel';
    panel.innerHTML = `<div><h3>Vitrine en ligne</h3><p>Palette, photo, textes et bouton Glovo.</p></div>
        <button type="button" class="admin-button" id="edit-storefront" disabled>Personnaliser la vitrine</button>`;
    document.getElementById('settings-service').after(panel);
    const trigger = panel.querySelector('button');
    document.querySelector('.settings-jump select').add(new Option('Vitrine en ligne', panel.id), 1);

    const dialog = document.createElement('dialog');
    dialog.id = 'storefront-editor';
    dialog.className = 'storefront-editor';
    dialog.setAttribute('aria-labelledby', 'storefront-editor-title');
    const copyInputs = keys => copyFields.filter(([key]) => keys.includes(key)).map(([key, label, , max]) =>
        field(label, key.endsWith('Subtitle')
            ? `<textarea name="${key}" maxlength="${max}" rows="2" dir="auto"></textarea>`
            : `<input name="${key}" maxlength="${max}" dir="auto">`)).join('');
    dialog.innerHTML = `<header class="storefront-editor-header"><h2 id="storefront-editor-title">Personnaliser la vitrine</h2>
        <div><button type="button" class="admin-button" id="jump-storefront-preview">Aperçu</button>
        <button type="button" class="admin-button" id="close-storefront-editor">Fermer</button></div></header>
        <div class="storefront-editor-layout">
            <form id="storefront-form" novalidate>
                <div class="storefront-editor-language">${field('Langue des textes et de l’aperçu',
                    `<select name="locale">${languages.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select>`)}
                    <p>Un champ de texte vide utilise le texte par défaut de la langue.</p>
                </div>
                <details open class="storefront-editor-group"><summary>Palette</summary>
                    <div class="storefront-color-list">${paletteFields.map(([key, label, color]) =>
                        `<div class="storefront-color-row"><label for="site-color-${key}">${label}</label>
                        <input data-swatch="${key}" type="color" aria-label="Choisir : ${label}" value="${color}">
                        <input name="color-${key}" id="site-color-${key}" placeholder="${color}" maxlength="7" spellcheck="false" dir="ltr"></div>`).join('')}</div>
                    <button type="button" class="admin-button" id="reset-storefront-palette">Rétablir la palette BIGTAC</button>
                </details>
                <details class="storefront-editor-group"><summary>Photo et texte du bandeau</summary>
                    ${field('Adresse HTTPS de la photo', '<input type="url" name="heroImage" placeholder="https://…" maxlength="2048" dir="ltr">')}
                    ${field('Importer une photo', '<input type="file" name="heroFile" accept="image/jpeg,image/png,image/webp">')}
                    ${field('Cadrage horizontal', '<select name="heroPosition"><option value="">Automatique</option><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select>')}
                    ${copyInputs(['heroLead','heroName','heroSubtitle','heroCta','heroClosedCta','heroAlt'])}
                </details>
                <details class="storefront-editor-group"><summary>Glovo</summary>
                    <label class="storefront-editor-check"><input type="checkbox" name="glovoEnabled"> Afficher le bouton Glovo</label>
                    ${field('Lien Glovo de votre restaurant', '<input type="url" name="glovoUrl" placeholder="https://glovoapp.com/…" maxlength="2048" dir="ltr">')}
                    ${field('Emplacement du bouton', '<select name="glovoPlacement"><option value="hero">Bandeau d’accueil</option><option value="footer">Pied de page</option><option value="both">Les deux</option></select>')}
                    ${copyInputs(['glovoLabel'])}
                </details>
                <details class="storefront-editor-group"><summary>Navigation, carte et pied de page</summary>
                    ${copyInputs(['tagline','menuTitle','menuSubtitle'])}
                    <label class="storefront-editor-check"><input type="checkbox" name="showOffers"> Afficher les promotions actives</label>
                    ${copyInputs(['offersTitle'])}
                    <label class="storefront-editor-check"><input type="checkbox" name="showPopular"> Afficher les best sellers</label>
                    ${copyInputs(['popularTitle','footerTitle','footerContact'])}
                </details>
            </form>
            <section class="storefront-preview" aria-labelledby="storefront-preview-title">
                <div class="storefront-preview-heading"><h3 id="storefront-preview-title" tabindex="-1">Aperçu du brouillon</h3><p>Les produits et prix affichés sont des exemples.</p></div>
                <div class="storefront-preview-controls">
                    ${field('Écran', '<select id="storefront-preview-device"><option value="mobile">Téléphone</option><option value="desktop">Ordinateur</option></select>')}
                    ${field('Section', '<select id="storefront-preview-section"><option value="hero">Accueil</option><option value="promotions">Promotions</option><option value="popular">Best sellers</option><option value="menu-unified">Carte</option><option value="locations">Pied de page</option></select>')}
                    <label class="storefront-editor-check"><input type="checkbox" id="storefront-preview-dark"> Mode sombre</label>
                    <label class="storefront-editor-check"><input type="checkbox" id="storefront-preview-closed"> Restaurant fermé</label>
                </div>
                <div class="storefront-preview-window"><iframe title="Aperçu de la vitrine" sandbox="allow-same-origin"></iframe></div>
            </section>
        </div>
        <footer class="storefront-editor-footer"><p id="storefront-editor-status" role="status"></p>
            <button type="submit" form="storefront-form" class="admin-button primary">Enregistrer la vitrine</button>
        </footer>`;
    document.body.append(dialog);
    const form = dialog.querySelector('form');
    const controls = form.elements;
    const frame = dialog.querySelector('iframe');
    const previewPanel = dialog.querySelector('.storefront-preview');
    const viewport = dialog.querySelector('.storefront-preview-window');
    const status = dialog.querySelector('#storefront-editor-status');
    const save = dialog.querySelector('button[type="submit"]');
    const close = dialog.querySelector('#close-storefront-editor');
    const jump = dialog.querySelector('#jump-storefront-preview');
    const device = dialog.querySelector('#storefront-preview-device');
    const section = dialog.querySelector('#storefront-preview-section');
    const dark = dialog.querySelector('#storefront-preview-dark');
    const closed = dialog.querySelector('#storefront-preview-closed');
    let latest = null, expected = null, draft = null, baseline = '';
    let confirmed = false, busy = false, localImage = '', file = null, epoch = 0;

    const say = (message, error = false) => { status.textContent = message; status.classList.toggle('is-error', error); };
    const changed = () => draft && (fingerprint(draft) !== baseline || file);
    const stale = () => expected && fingerprint({...latest, id:'config'}) !== fingerprint(expected);
    function enableSave() {
        save.disabled = !confirmed || busy || !!stale() || !changed();
        close.disabled = busy;
        form.inert = busy;
    }
    function clearImage() {
        if (localImage) URL.revokeObjectURL(localImage);
        localImage = '';
        file = null;
        controls.heroFile.value = '';
    }
    function fillCopy() {
        const locale = controls.locale.value;
        for (const [key] of copyFields) {
            const input = controls.namedItem(key);
            input.value = draft.copy[locale][key];
            input.placeholder = appearanceText({...latest, storefront:{...draft, copy:{}}}, key, locale, token => translate(locale, token));
        }
    }
    function fillPalette() {
        for (const [key, , fallback] of paletteFields) {
            controls.namedItem('color-' + key).value = draft.palette[key];
            form.querySelector(`[data-swatch="${key}"]`).value = draft.palette[key] || fallback;
        }
    }
    function resize() {
        if (!dialog.open) return;
        const full = device.value === 'desktop';
        const width = full ? 1200 : 390;
        const height = full ? 840 : 760;
        const heightBudget = dialog.clientHeight - dialog.querySelector('header').offsetHeight
            - dialog.querySelector('footer').offsetHeight - previewPanel.querySelector('.storefront-preview-heading').offsetHeight
            - previewPanel.querySelector('.storefront-preview-controls').offsetHeight - 62;
        const scale = Math.min(1, viewport.clientWidth / width, Math.max(220, heightBudget) / height);
        if (!scale) return;
        Object.assign(frame.style, {width:width + 'px', height:height + 'px', transform:`translateX(-50%) scale(${scale})`});
        const scaledHeight = Math.ceil(height * scale) + 2;
        if (viewport.style.height !== scaledHeight + 'px') viewport.style.height = scaledHeight + 'px';
    }
    function goToSection() {
        const doc = frame.contentDocument;
        const target = doc?.getElementById(section.value);
        if (!target) return;
        const child = frame.contentWindow;
        const headerHeight = doc.querySelector('.store-header').offsetHeight;
        const top = section.value === 'hero' ? 0 : child.scrollY + target.getBoundingClientRect().top - headerHeight;
        child.scrollTo({top, behavior:'instant'});
    }
    function preview() {
        const doc = frame.contentDocument;
        if (!draft || !dialog.open || !doc?.getElementById('hero-photo')) return;
        const locale = controls.locale.value;
        const t = key => translate(locale, key);
        const config = {...latest, storefront:draft};
        const open = !closed.checked;
        doc.documentElement.lang = locale;
        doc.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
        doc.documentElement.classList.toggle('dark', dark.checked);
        doc.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
        doc.querySelectorAll('[data-preview-copy]').forEach(node => { node.textContent = sample[locale][node.dataset.previewCopy]; });
        doc.querySelectorAll('[data-mode]').forEach(node => { node.hidden = config.orderingModes?.[node.dataset.mode] === false; });
        const state = doc.getElementById('storeStatus');
        state.textContent = t(open ? 'hero.status_open' : 'hero.unavailable');
        state.classList.toggle('is-open', open);
        state.classList.toggle('is-closed', !open);
        doc.getElementById('footer-address').textContent = config.address || '2XQV+VJ5, Rue Abdelkrim Benjelloun, Fès 30050, Maroc';
        for (const [id, visible] of [['promotions', draft.showOffers], ['popular', draft.showPopular]]) {
            doc.getElementById(id).classList.toggle('hidden', !visible);
            const option = [...section.options].find(row => row.value === id);
            option.disabled = !visible;
            if (!visible && section.value === id) section.value = 'hero';
        }
        doc.querySelector('[data-i18n="nav.offers"]').hidden = !draft.showOffers;
        renderStorefrontAppearance(doc, config, {language:locale, translate:t, open, localImage});
        renderStorefrontHours(doc, config.openingHours, locale, t);
    }
    function openEditor() {
        if (!confirmed || !latest) return;
        expected = copy({...latest, id:'config'});
        draft = storefrontAppearance(latest);
        baseline = fingerprint(draft);
        controls.locale.value = 'fr';
        controls.heroImage.value = draft.heroImage;
        controls.heroPosition.value = draft.heroPosition;
        controls.glovoEnabled.checked = draft.glovo.enabled;
        controls.glovoUrl.value = draft.glovo.url;
        controls.glovoPlacement.value = draft.glovo.placement;
        controls.showOffers.checked = draft.showOffers;
        controls.showPopular.checked = draft.showPopular;
        closed.checked = !['livraison','emporter','sur_place'].some(mode => orderingAvailable(latest, mode));
        device.value = matchMedia('(max-width:800px)').matches ? 'mobile' : 'desktop';
        section.value = 'hero';
        fillPalette();
        fillCopy();
        say('');
        dialog.showModal();
        dialog.querySelector('.storefront-editor-layout').scrollTop = 0;
        form.scrollTop = 0;
        if (!frame.hasAttribute('src')) frame.src = 'assets/storefront-preview.html';
        resize();
        preview();
        goToSection();
        enableSave();
    }
    function dismiss() {
        if (busy) return;
        if (!changed() || confirm('Fermer sans enregistrer la vitrine ?')) dialog.close();
    }

    trigger.addEventListener('click', openEditor);
    jump.addEventListener('click', () => {
        const title = dialog.querySelector('#storefront-preview-title');
        title.focus({preventScroll:true});
        title.scrollIntoView({block:'start'});
    });
    close.addEventListener('click', dismiss);
    dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
    dialog.addEventListener('close', () => {
        epoch++;
        clearImage();
        draft = expected = null;
        if (trigger.getClientRects().length) trigger.focus({preventScroll:true});
    });
    window.addEventListener('beforeunload', event => {
        if (dialog.open && (busy || changed())) event.preventDefault();
    });
    new ResizeObserver(resize).observe(viewport);
    frame.addEventListener('load', () => { preview(); goToSection(); });
    device.addEventListener('change', () => { resize(); goToSection(); });
    section.addEventListener('change', goToSection);
    dark.addEventListener('change', preview);
    closed.addEventListener('change', preview);
    dialog.querySelector('#reset-storefront-palette').addEventListener('click', () => {
        for (const [key] of paletteFields) draft.palette[key] = '';
        fillPalette();
        preview();
        enableSave();
    });

    form.addEventListener('input', event => {
        const input = event.target;
        const key = input.name;
        if (!draft || input.type === 'file') return;
        if (key === 'locale') fillCopy();
        else if (input.dataset.swatch) {
            draft.palette[input.dataset.swatch] = input.value;
            controls.namedItem('color-' + input.dataset.swatch).value = input.value;
        } else if (key.startsWith('color-')) {
            draft.palette[key.slice(6)] = input.value.trim();
            if (/^#[a-f\d]{6}$/i.test(input.value)) form.querySelector(`[data-swatch="${key.slice(6)}"]`).value = input.value;
        } else if (key === 'heroImage') {
            clearImage();
            draft.heroImage = input.value.trim();
        } else if (key === 'heroPosition') draft.heroPosition = input.value;
        else if (key === 'glovoEnabled') draft.glovo.enabled = input.checked;
        else if (key === 'glovoUrl') draft.glovo.url = input.value.trim();
        else if (key === 'glovoPlacement') draft.glovo.placement = input.value;
        else if (key === 'showOffers' || key === 'showPopular') draft[key] = input.checked;
        else if (Object.hasOwn(draft.copy[controls.locale.value], key)) draft.copy[controls.locale.value][key] = input.value.trim();
        if (!stale()) say('');
        enableSave();
        preview();
    });
    controls.heroFile.addEventListener('change', () => {
        const selected = controls.heroFile.files[0];
        if (!selected) return;
        const issue = imageIssue(selected);
        if (issue) { clearImage(); say(issue, true); }
        else {
            if (localImage) URL.revokeObjectURL(localImage);
            file = selected;
            localImage = URL.createObjectURL(file);
            say('');
        }
        enableSave();
        preview();
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (save.disabled || !session()) return;
        const issue = storefrontAppearanceIssue(draft);
        if (issue) { say(issue, true); return; }
        const actor = session();
        const version = epoch;
        busy = true;
        enableSave();
        say('Enregistrement…');
        try {
            const value = copy(draft);
            if (file) value.heroImage = await upload(file);
            if (version !== epoch || actor.uid !== session()?.uid || actor.epoch !== session()?.epoch) throw Error('Votre session a changé.');
            const stored = await service.appearance(value, expected);
            if (version === epoch && dialog.open) {
                expected = {...expected, storefront:stored};
                draft = storefrontAppearance({...latest, storefront:stored});
                clearImage();
                baseline = fingerprint(draft);
                controls.heroImage.value = draft.heroImage;
                controls.glovoUrl.value = draft.glovo.url;
                preview();
                say('Vitrine enregistrée.');
                toast('Vitrine enregistrée.');
            }
        } catch (error) {
            if (version === epoch) say(error.message, true);
        } finally {
            if (version === epoch) { busy = false; enableSave(); }
        }
    });
    return {
        update(config, cached) {
            latest = config;
            confirmed = !config._unavailable && !cached;
            trigger.disabled = !confirmed;
            if (dialog.open) {
                if (!busy && stale()) {
                    say('Les réglages ont changé. Rouvrez la vitrine avant d’enregistrer.', true);
                }
                enableSave();
            }
        },
        clear() {
            epoch++;
            latest = null;
            confirmed = busy = false;
            trigger.disabled = true;
            if (dialog.open) dialog.close();
            clearImage();
        }
    };
}
