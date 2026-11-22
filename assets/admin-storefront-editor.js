import { operationsService } from './operations-service.js';
import { watchDishImages } from './dish-images.js';
import { copy, fingerprint, imageIssue } from './menu-model.js';
import { orderingAvailable } from './operations-model.js';
import { translations, uiMarkup, uiText, setUiText, translateDOM } from './i18n.js';
import {
    appearanceText, copyFields, languages, paletteFields, renderStorefrontAppearance, renderStorefrontHours,
    storefrontAppearance, storefrontAppearanceIssue, themeIds, themePresets
} from './storefront-appearance.js';

const field = (label, input) => `<label class="settings-field">${uiMarkup(label)}${input}</label>`;
const translate = (locale, key) => translations[locale]?.[key] || translations.fr[key] || '';
const defaultColor = Object.fromEntries(paletteFields.map(([key, , color]) => [key, color]));
const themeColor = (theme, key) => themePresets[theme].palette[key] || defaultColor[key];
const themeOption = id => {
    const {label, description} = themePresets[id];
    const swatch = ['background', 'surface', 'accent'].map(key => `--theme-${key}:${themeColor(id, key)}`).join(';');
    return `<label class="storefront-theme-option"><input type="radio" name="theme" value="${id}">
        <span class="storefront-theme-swatch" style="${swatch}" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="storefront-theme-text"><strong data-ui-copy="${label}">${label}</strong><small data-ui-copy="${description}">${description}</small></span></label>`;
};
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
    panel.innerHTML = `<div><h3 data-ui-copy="Vitrine en ligne">Vitrine en ligne</h3><p data-ui-copy="Palette, photo, textes et bouton Glovo.">Palette, photo, textes et bouton Glovo.</p></div>
        <button type="button" class="admin-button" id="edit-storefront" disabled data-ui-copy="Personnaliser la vitrine">Personnaliser la vitrine</button>`;
    document.getElementById('settings-service').after(panel);
    const trigger = panel.querySelector('button');
    const jumpOption = new Option('Vitrine en ligne', panel.id);
    jumpOption.dataset.uiCopy = 'Vitrine en ligne';
    document.querySelector('.settings-jump select').add(jumpOption, 1);

    const dialog = document.createElement('dialog');
    dialog.id = 'storefront-editor';
    dialog.className = 'storefront-editor';
    dialog.setAttribute('aria-labelledby', 'storefront-editor-title');
    const copyInputs = keys => copyFields.filter(([key]) => keys.includes(key)).map(([key, label, , max]) =>
        field(label, key.endsWith('Subtitle')
            ? `<textarea name="${key}" maxlength="${max}" rows="2" dir="auto"></textarea>`
            : `<input name="${key}" maxlength="${max}" dir="auto">`)).join('');
    dialog.innerHTML = `<header class="storefront-editor-header"><h2 id="storefront-editor-title" data-ui-copy="Personnaliser la vitrine">Personnaliser la vitrine</h2>
        <div><button type="button" class="admin-button" id="jump-storefront-preview" data-ui-copy="Aperçu">Aperçu</button>
        <button type="button" class="admin-button" id="close-storefront-editor" data-ui-copy="Fermer">Fermer</button></div></header>
        <div class="storefront-editor-layout">
            <form id="storefront-form" novalidate>
                <div class="storefront-editor-language">${field('Langue des textes et de l’aperçu',
                    `<select name="locale">${languages.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select>`)}
                    <p data-ui-copy="Un champ de texte vide utilise le texte par défaut de la langue.">Un champ de texte vide utilise le texte par défaut de la langue.</p>
                </div>
                <fieldset class="storefront-editor-group storefront-theme-group"><legend data-ui-copy="Thème">Thème</legend>
                    <p class="storefront-palette-help" data-ui-copy="Choisissez le thème par défaut de la vitrine et de l’Admin. Avec Charbon, chacun peut alterner entre clair et sombre.">Choisissez le thème par défaut de la vitrine et de l’Admin. Avec Charbon, chacun peut alterner entre clair et sombre.</p>
                    <div class="storefront-theme-list">${themeIds.map(themeOption).join('')}</div>
                </fieldset>
                <details open class="storefront-editor-group"><summary data-ui-copy="Palette">Palette</summary>
                    <p class="storefront-palette-help" data-ui-copy="Chaque couleur remplace celle du thème. Un champ vide garde la couleur du thème. Les accents, le fond de page et les surfaces s’appliquent aussi à l’interface Admin.">Chaque couleur remplace celle du thème. Un champ vide garde la couleur du thème. Les accents, le fond de page et les surfaces s’appliquent aussi à l’interface Admin.</p>
                    <div class="storefront-color-list">${paletteFields.map(([key, label, color]) =>
                        `<div class="storefront-color-row"><label for="site-color-${key}">${uiMarkup(label)}</label>
                        <input data-swatch="${key}" type="color" aria-label="${uiText('Choisir : {label}', {label:uiText(label)})}" value="${color}">
                        <input name="color-${key}" id="site-color-${key}" placeholder="${color}" maxlength="7" spellcheck="false" dir="ltr"></div>`).join('')}</div>
                    <button type="button" class="admin-button" id="reset-storefront-palette" data-ui-copy="Rétablir les couleurs du thème">Rétablir les couleurs du thème</button>
                </details>
                <details class="storefront-editor-group"><summary data-ui-copy="Photo et texte du bandeau">Photo et texte du bandeau</summary>
                    ${field('Adresse HTTPS de la photo', '<input type="url" name="heroImage" placeholder="https://…" maxlength="2048" dir="ltr">')}
                    ${field('Importer une photo', '<input type="file" name="heroFile" accept="image/jpeg,image/png,image/webp">')}
                    ${field('Cadrage horizontal', "<select name=\"heroPosition\"><option value=\"\" data-ui-copy=\"Automatique\">Automatique</option><option value=\"left\" data-ui-copy=\"Gauche\">Gauche</option><option value=\"center\" data-ui-copy=\"Centre\">Centre</option><option value=\"right\" data-ui-copy=\"Droite\">Droite</option></select>")}
                    ${copyInputs(['heroLead','heroName','heroSubtitle','heroCta','heroClosedCta','heroAlt'])}
                </details>
                <details class="storefront-editor-group"><summary>Glovo</summary>
                    <label class="storefront-editor-check" data-ui-copy="Afficher le bouton Glovo"><input type="checkbox" name="glovoEnabled"> Afficher le bouton Glovo</label>
                    ${field('Lien Glovo de votre restaurant', '<input type="url" name="glovoUrl" placeholder="https://glovoapp.com/…" maxlength="2048" dir="ltr">')}
                    ${field('Emplacement du bouton', "<select name=\"glovoPlacement\"><option value=\"hero\" data-ui-copy=\"Bandeau d’accueil\">Bandeau d’accueil</option><option value=\"footer\" data-ui-copy=\"Pied de page\">Pied de page</option><option value=\"both\" data-ui-copy=\"Les deux\">Les deux</option></select>")}
                    ${copyInputs(['glovoLabel'])}
                </details>
                <details class="storefront-editor-group"><summary data-ui-copy="Navigation, carte et pied de page">Navigation, carte et pied de page</summary>
                    ${copyInputs(['tagline','menuTitle','menuSubtitle'])}
                    <label class="storefront-editor-check" data-ui-copy="Afficher les promotions actives"><input type="checkbox" name="showOffers"> Afficher les promotions actives</label>
                    ${copyInputs(['offersTitle'])}
                    <label class="storefront-editor-check" data-ui-copy="Afficher les best sellers"><input type="checkbox" name="showPopular"> Afficher les best sellers</label>
                    ${copyInputs(['popularTitle','footerTitle','footerContact'])}
                </details>
            </form>
            <section class="storefront-preview" aria-labelledby="storefront-preview-title">
                <div class="storefront-preview-heading"><h3 id="storefront-preview-title" tabindex="-1" data-ui-copy="Aperçu du brouillon">Aperçu du brouillon</h3><p data-ui-copy="Les produits et prix affichés sont des exemples.">Les produits et prix affichés sont des exemples.</p></div>
                <div class="storefront-preview-controls">
                    ${field('Écran', "<select id=\"storefront-preview-device\"><option value=\"mobile\" data-ui-copy=\"Téléphone\">Téléphone</option><option value=\"desktop\" data-ui-copy=\"Ordinateur\">Ordinateur</option></select>")}
                    ${field('Section', "<select id=\"storefront-preview-section\"><option value=\"hero\" data-ui-copy=\"Accueil\">Accueil</option><option value=\"promotions\" data-ui-copy=\"Promotions\">Promotions</option><option value=\"popular\" data-ui-copy=\"Best sellers\">Best sellers</option><option value=\"menu-unified\" data-ui-copy=\"Carte\">Carte</option><option value=\"locations\" data-ui-copy=\"Pied de page\">Pied de page</option></select>")}
                    <label class="storefront-editor-check" data-ui-copy="Mode sombre"><input type="checkbox" id="storefront-preview-dark"> Mode sombre</label>
                    <label class="storefront-editor-check" data-ui-copy="Restaurant fermé"><input type="checkbox" id="storefront-preview-closed"> Restaurant fermé</label>
                </div>
                <div class="storefront-preview-window"><iframe title="Aperçu de la vitrine" sandbox="allow-same-origin" data-ui-title="Aperçu de la vitrine"></iframe></div>
            </section>
        </div>
        <footer class="storefront-editor-footer"><p id="storefront-editor-status" role="status"></p>
            <button type="submit" form="storefront-form" class="admin-button primary" data-ui-copy="Enregistrer la vitrine">Enregistrer la vitrine</button>
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

    const say = (message, error = false) => { setUiText(status, message); status.classList.toggle('is-error', error); };
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
        for (const [key] of paletteFields) {
            const input = controls.namedItem('color-' + key);
            input.value = draft.palette[key];
            input.placeholder = themeColor(draft.theme, key);
            form.querySelector(`[data-swatch="${key}"]`).value = draft.palette[key] || themeColor(draft.theme, key);
        }
    }
    function syncThemeMode() {
        dark.checked = themePresets[draft.theme].mode === 'dark';
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
        translateDOM(doc, locale);
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
        renderStorefrontAppearance(doc, config, {language:locale, translate:t, open, localImage, preferredMode:dark.checked ? 'dark' : 'light'});
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
        controls.theme.value = draft.theme;
        syncThemeMode();
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
        if (!changed() || confirm(uiText('Fermer sans enregistrer la vitrine ?'))) dialog.close();
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
    frame.addEventListener('load', () => { watchDishImages(frame.contentDocument); preview(); goToSection(); });
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
        else if (key === 'theme') {
            // A new theme starts from its own colours; the previous theme's overrides would clash with it.
            draft.theme = input.value;
            for (const [color] of paletteFields) draft.palette[color] = '';
            syncThemeMode();
            fillPalette();
        } else if (input.dataset.swatch) {
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
