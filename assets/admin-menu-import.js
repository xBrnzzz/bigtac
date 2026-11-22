import { icon } from './admin-icons.js';
import { materializeProduct, selectionSummary } from './menu-model.js';
import { MenuImportError, MAX_IMPORT_BYTES } from './menu-import.js';
import { menuImportPrompt } from './menu-import-guide.js';

const html = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const money = value => `${new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 2 }).format(value)} DH`;

function optionsList(options) {
    return `<ul>${options.map(option => `<li>${html(option.name)} · ${option.price ? '+' + money(option.price) : 'Inclus'}${option.isAvailable ? '' : ' · Indisponible'}</li>`).join('')}</ul>`;
}

function groupDetails(group) {
    const rule = group.kind === 'supplements' ? 'Suppléments facultatifs' : selectionSummary(group);
    return `<div class="menu-import-group"><strong>${html(group.title)}</strong><span> · ${html(rule)}</span>${optionsList(group.options)}</div>`;
}

function itemDetails(row, groups) {
    const item = row.modifierGroupIds ? materializeProduct(row, row.modifierGroupIds.map(id => groups.get(id))) : row;
    return `${row.description ? `<p>${html(row.description)}</p>` : ''}
        ${row.startsAt ? `<p>Début (UTC) · ${html(row.startsAt)}</p>` : ''}
        ${row.endsAt ? `<p>Fin (UTC) · ${html(row.endsAt)}</p>` : ''}
        ${item.mandatoryChoices.map(groupDetails).join('')}
        ${item.supplements.length ? `<div class="menu-import-group"><strong>Suppléments facultatifs</strong>${optionsList(item.supplements)}</div>` : ''}`;
}

function section(title, entries, details, duplicateLabel) {
    if (!entries.length) return '';
    const additions = entries.filter(entry => !entry.existingId).length;
    return `<section class="menu-import-section"><h3>${title} <span>${additions} à créer · ${entries.length - additions} ${duplicateLabel}</span></h3>
        <ul>${entries.map(({row, existingId}) => `<li>${details(row, existingId)}</li>`).join('')}</ul></section>`;
}

function previewHtml(plan) {
    const groups = new Map(plan.modifierGroups.map(({row}) => [row.id, row]));
    const categories = new Map(plan.categories.map(({row}) => [row.id, row.name]));
    const detail = (row, existingId) => {
        const label = row.categoryId ? categories.get(row.categoryId) : '';
        const notes = [label, row.isPopular ? 'Best Seller' : '', row.isAvailable === false ? 'En rupture' : ''].filter(Boolean);
        return `<details><summary><span>${html(row.name)}${notes.length ? `<small>${html(notes.join(' · '))}</small>` : ''}</span>
            <span class="menu-import-meta">${money(row.price)} <small>${existingId ? 'Ignoré' : 'À créer'}</small></span></summary>${itemDetails(row, groups) || '<p>Aucun choix ni supplément.</p>'}</details>`;
    };
    return section('Catégories', plan.categories, (row, existingId) =>
        `<div class="menu-import-row"><strong>${html(row.name)}</strong><small>${existingId ? 'Réutilisée' : 'À créer'}</small></div>`, 'à réutiliser') +
        section('Groupes réutilisables', plan.modifierGroups, (row, existingId) =>
            `<details><summary><span>${html(row.title)}</span><small>${existingId ? 'Réutilisé' : 'À créer'}</small></summary>${groupDetails(row)}</details>`, 'à réutiliser') +
        section('Produits', plan.menuItems, detail, 'à ignorer') +
        section('Promotions', plan.promotions, detail, 'à ignorer');
}

export function setupMenuImport(dialog, {service, operation}) {
    const body = dialog.querySelector('.menu-dialog-body');
    body.innerHTML = `<section class="menu-import-guide" data-ui="form">
        <h3>Préparer votre fichier</h3>
        <ol><li>Copiez le prompt et joignez les photos de toutes les pages de votre carte dans ChatGPT.</li>
            <li>Répondez aux questions sur les prix, les choix et les offres.</li>
            <li>Importez le fichier JSON obtenu ou collez son contenu ci-dessous.</li></ol>
        <button type="button" class="admin-button" id="menu-import-copy">${icon('copy')} Copier le prompt</button>
        <p role="status" class="menu-import-copy-status"></p>
        <details class="menu-import-prompt"><summary>Voir le prompt complet</summary>
            <label for="menu-import-prompt-text">Prompt à joindre aux photos</label>
            <textarea id="menu-import-prompt-text" dir="auto" rows="8" readonly spellcheck="false"></textarea></details>
        </section>
        <section class="menu-import-source">
            <h3>Votre menu JSON</h3>
            <label for="menu-import-file">Fichier JSON <span>· 512 Ko maximum</span></label>
            <input id="menu-import-file" type="file" accept=".json,application/json">
            <details class="menu-import-paste"><summary>Coller le JSON</summary>
                <label for="menu-import-text">Contenu du fichier</label>
                <textarea id="menu-import-text" dir="ltr" rows="6" spellcheck="false" placeholder='{ "version": 1, ... }'></textarea>
            </details>
            <button type="button" class="admin-button primary" id="menu-import-check">${icon('check')} Vérifier le menu</button>
        </section>
        <p id="menu-import-feedback" aria-live="polite" tabindex="-1" hidden></p>
        <section id="menu-import-preview" aria-labelledby="menu-import-preview-title" hidden>
            <h3 id="menu-import-preview-title" tabindex="-1">Aperçu de l’import</h3>
            <p class="menu-import-total"></p>
            <p>Les nouveaux produits, catégories et promotions seront masqués. Les produits et promotions déjà présents seront ignorés.</p>
            <div class="menu-import-results" aria-label="Éléments à importer"></div>
        </section>`;
    dialog.querySelector('footer').innerHTML = `<p data-save-state role="status"></p><div>
        <button type="button" class="admin-button" data-menu-action="close" data-dialog="${dialog.id}">Fermer</button>
        <button type="button" class="admin-button primary" id="menu-import-confirm" hidden>${icon('check')} Importer les éléments</button>
        </div>`;
    const find = selector => dialog.querySelector(selector);
    const file = find('#menu-import-file');
    const text = find('#menu-import-text');
    const prompt = find('#menu-import-prompt-text');
    const check = find('#menu-import-check');
    const confirm = find('#menu-import-confirm');
    const feedback = find('#menu-import-feedback');
    const preview = find('#menu-import-preview');
    prompt.value = menuImportPrompt;
    let source = '';
    let plan = null;
    let epoch = 0;
    let busy = false;

    function report(message, error = false) {
        feedback.textContent = message;
        feedback.classList.toggle('menu-inline-error', error);
        feedback.hidden = !message;
    }

    function resetPreview() {
        plan = null;
        preview.hidden = true;
        confirm.hidden = true;
        find('[data-save-state]').textContent = '';
    }

    function controls() {
        file.disabled = text.disabled = busy;
        check.disabled = busy || !source.trim();
        confirm.disabled = busy || !plan;
    }

    find('#menu-import-copy').addEventListener('click', async () => {
        const status = find('.menu-import-copy-status');
        try {
            await navigator.clipboard.writeText(menuImportPrompt);
            status.textContent = 'Prompt copié.';
        } catch {
            find('.menu-import-prompt').open = true;
            prompt.focus();
            prompt.select();
            status.textContent = 'Prompt sélectionné. Copiez-le avec votre clavier ou le menu de votre appareil.';
        }
    });

    file.addEventListener('change', async () => {
        const selected = file.files[0];
        if (!selected) return;
        const version = ++epoch;
        resetPreview();
        source = text.value = '';
        busy = true;
        report('Lecture du fichier…');
        controls();
        try {
            if (selected.size > MAX_IMPORT_BYTES) throw new MenuImportError('Utilisez un fichier JSON de 512 Ko maximum.');
            const content = await selected.text();
            if (epoch === version && dialog.open) {
                source = text.value = content;
                report('Fichier prêt à vérifier.');
            }
        } catch (error) {
            if (epoch === version) report(error instanceof MenuImportError ? error.message : 'Impossible de lire ce fichier.', true);
        } finally {
            if (epoch === version) {
                busy = false;
                controls();
            }
        }
    });

    text.addEventListener('input', () => {
        source = text.value;
        file.value = '';
        resetPreview();
        report('');
        controls();
    });

    check.addEventListener('click', async () => {
        if (busy) return;
        const version = ++epoch;
        resetPreview();
        busy = true;
        report('Vérification du fichier et du catalogue…');
        controls();
        try {
            const result = await service.previewImport(source);
            if (epoch !== version || !dialog.open) return;
            const additions = Object.values(result).flat().filter(entry => !entry.existingId).length;
            find('.menu-import-results').innerHTML = previewHtml(result);
            preview.hidden = false;
            confirm.hidden = !additions;
            plan = additions ? result : null;
            report('');
            find('.menu-import-total').textContent = additions
                ? `${additions} élément${additions > 1 ? 's' : ''} à créer.`
                : 'Tous les éléments de ce fichier existent déjà.';
            preview.scrollIntoView({block: 'start', behavior: 'instant'});
            find('#menu-import-preview-title').focus({preventScroll: true});
        } catch (error) {
            if (epoch === version) {
                report(error instanceof MenuImportError ? error.message : 'Catalogue indisponible. Vérifiez votre connexion ou vos autorisations.', true);
                feedback.focus();
            }
        } finally {
            if (epoch === version) {
                busy = false;
                controls();
            }
        }
    });

    confirm.addEventListener('click', async () => {
        if (!plan || busy) return;
        const version = epoch;
        busy = true;
        controls();
        const saved = await operation(() => service.importMenu(source, plan));
        if (epoch !== version || !dialog.open) return;
        busy = false;
        if (saved) {
            resetPreview();
            source = text.value = file.value = '';
            report('Import terminé. Affichez les nouvelles catégories avant de publier leurs produits. Les offres sont désactivées dans Promotions.');
            feedback.focus();
        } else {
            confirm.hidden = preview.hidden = true;
            plan = null;
            report('Vérifiez à nouveau le fichier avant de reprendre.');
        }
        controls();
    });

    dialog.addEventListener('close', () => {
        epoch++;
        busy = false;
        source = text.value = file.value = '';
        find('.menu-import-copy-status').textContent = '';
        resetPreview();
        report('');
        controls();
    });
    controls();
}
