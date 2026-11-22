import { MENU_LIMIT, categoryFor, fingerprint, groupIssues, materializeProduct, productIssues, validPrice } from './menu-model.js';
import { offerIssues } from './operations-model.js';

export const MAX_IMPORT_BYTES = 512 * 1024;
export const MAX_IMPORT_WRITES = 400;
export const importCollections = ['categories', 'modifierGroups', 'menuItems', 'promotions'];
export const importName = name => String(name ?? '').trim().normalize('NFC').toLowerCase();

export class MenuImportError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MenuImportError';
    }
}

function requireValue(ok, path, message) {
    if (!ok) throw new MenuImportError(`${path} — ${message}`);
}

function fields(value, keys, path) {
    const expected = keys.split(' ');
    requireValue(value && typeof value === 'object' && !Array.isArray(value), path, 'Objet JSON attendu.');
    requireValue(expected.every(key => Object.hasOwn(value, key)) && Object.keys(value).length === expected.length, path,
        `Champs attendus : ${expected.join(', ')}.`);
}

function text(value, path, max, allowEmpty = false) {
    requireValue(typeof value === 'string' && (allowEmpty || value.trim().length > 0) && value.trim().length <= max,
        path, `Texte ${allowEmpty ? '' : 'non vide '}(maximum ${max} caractères).`);
    return value.trim();
}

function id(value, path) {
    requireValue(typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value), path, 'Identifiant en minuscules, chiffres ou tirets attendu.');
    return value;
}

function price(value, path) {
    requireValue(typeof value === 'number' && validPrice(value), path, 'Prix en DH positif ou nul, avec deux décimales maximum.');
    return value;
}

function flag(value, path) {
    requireValue(typeof value === 'boolean', path, 'Indiquez true ou false.');
    return value;
}

function list(value, path, limit, convert) {
    requireValue(Array.isArray(value) && value.length <= limit, path, `Liste de ${limit} éléments maximum attendue.`);
    return value.map((row, index) => convert(row, `${path}[${index + 1}]`));
}

function unique(values, path, message = 'Chaque identifiant doit être unique dans sa liste.') {
    requireValue(new Set(values).size === values.length, path, message);
}

function option(row, path) {
    fields(row, 'name price isAvailable', path);
    return {
        name: text(row.name, `${path}.name`, 120),
        price: price(row.price, `${path}.price`),
        isAvailable: flag(row.isAvailable, `${path}.isAvailable`)
    };
}

function group(row, path, shared = false) {
    fields(row, `${shared ? 'id kind ' : ''}title type min max options`, path);
    requireValue(!shared || ['choice', 'supplements'].includes(row.kind), path, 'Le type de groupe partagé doit être choice ou supplements.');
    requireValue(Number.isInteger(row.min) && Number.isInteger(row.max), path, 'Les limites de sélection doivent être des nombres entiers.');
    const options = list(row.options, `${path}.options`, 60, option);
    const value = {
        ...(shared ? { id: id(row.id, `${path}.id`), kind: row.kind } : {}),
        title: text(row.title, `${path}.title`, 120), type: row.type, min: row.min, max: row.max, options
    };
    const issues = groupIssues(value);
    requireValue(!issues.length, path, issues.join(' '));
    return value;
}

function schedule(value, path) {
    if (value === null) return null;
    const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(value);
    const date = match && new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
    requireValue(match && date.getUTCDate() === Number(match[3]) && Number.isFinite(Date.parse(value)), path,
        'Date ISO 8601 valide avec fuseau horaire attendue.');
    return new Date(value).toISOString();
}

function item(row, path, promotion = false) {
    const sharedFields = 'id name description price mandatoryChoices supplements';
    fields(row, `${sharedFields} ${promotion ? 'startsAt endsAt' : 'categoryId isAvailable isPopular modifierGroupIds'}`, path);
    const name = text(row.name, `${path}.name`, 160);
    const label = `${path} (${name})`;
    const value = {
        id: id(row.id, `${label}.id`), name,
        description: text(row.description, `${label}.description`, 3000, true),
        price: price(row.price, `${label}.price`),
        mandatoryChoices: list(row.mandatoryChoices, `${label}.mandatoryChoices`, 20, group),
        supplements: list(row.supplements, `${label}.supplements`, 60, option)
    };
    if (promotion) {
        value.startsAt = schedule(row.startsAt, `${label}.startsAt`);
        value.endsAt = schedule(row.endsAt, `${label}.endsAt`);
        const issues = offerIssues(value);
        requireValue(!issues.length, label, issues.join(' '));
        return value;
    }
    const modifierGroupIds = list(row.modifierGroupIds, `${label}.modifierGroupIds`, 12, id);
    unique(modifierGroupIds, `${label}.modifierGroupIds`);
    return {
        ...value, modifierGroupIds,
        categoryId: id(row.categoryId, `${label}.categoryId`),
        isAvailable: flag(row.isAvailable, `${label}.isAvailable`),
        isPopular: flag(row.isPopular, `${label}.isPopular`)
    };
}

const productKey = (name, categoryName) => JSON.stringify([importName(categoryName), importName(name)]);

export function parseMenuImport(source) {
    requireValue(new TextEncoder().encode(source).length <= MAX_IMPORT_BYTES, 'Fichier', 'Utilisez un fichier JSON de 512 Ko maximum.');
    let input;
    try {
        input = JSON.parse(source.replace(/^\uFEFF/, ''));
    } catch {
        throw new MenuImportError('Le fichier ne contient pas de JSON valide. Copiez le JSON brut ou sélectionnez le fichier .json.');
    }
    fields(input, 'version currency categories modifierGroups products promotions', 'Menu');
    requireValue(input.version === 1, 'version', 'La version du format doit être 1.');
    requireValue(input.currency === 'MAD', 'currency', 'La devise doit être MAD (DH).');
    const categories = list(input.categories, 'categories', MENU_LIMIT, (row, path) => {
        fields(row, 'id name', path);
        return { id: id(row.id, `${path}.id`), name: text(row.name, `${path}.name`, 120) };
    });
    const modifierGroups = list(input.modifierGroups, 'modifierGroups', MENU_LIMIT, (row, path) => group(row, path, true));
    const menuItems = list(input.products, 'products', MENU_LIMIT, item);
    const promotions = list(input.promotions, 'promotions', MENU_LIMIT, (row, path) => item(row, path, true));
    const menu = { categories, modifierGroups, menuItems, promotions };
    for (const name of importCollections) unique(menu[name].map(row => row.id), name === 'menuItems' ? 'products' : name);
    unique(categories.map(row => importName(row.name)), 'categories', 'Chaque catégorie doit avoir un nom unique.');
    unique(modifierGroups.map(groupKey), 'modifierGroups', 'Utilisez un seul identifiant pour chaque groupe identique.');
    unique(promotions.map(row => importName(row.name)), 'promotions', 'Chaque promotion doit avoir un nom unique.');
    const localCategories = new Map(categories.map(row => [row.id, row.name]));
    const groupIds = new Set(modifierGroups.map(row => row.id));
    for (const row of menuItems) {
        requireValue(row.modifierGroupIds.every(key => groupIds.has(key)), row.name, 'Un groupe partagé référencé est introuvable.');
        const resolved = materializeProduct(row, modifierGroups);
        const issues = productIssues(resolved, categories);
        requireValue(!issues.length, row.name, issues.map(([, message]) => message).join(' '));
    }
    unique(menuItems.map(row => productKey(row.name, localCategories.get(row.categoryId))), 'products', 'Chaque produit doit avoir un nom unique dans sa catégorie.');
    requireValue(Object.values(menu).some(rows => rows.length), 'Menu', 'Le fichier ne contient aucun élément à importer.');
    return menu;
}

const groupKey = ({ title, kind, type, min, max, options }) => !Array.isArray(options) ? null : fingerprint({
    title: importName(title), kind: kind || 'choice', type, min: Number(min ?? (type === 'radio' ? 1 : 0)), max: Number(max ?? (type === 'radio' ? 1 : 0)),
    options: options.map(({ name, price, isAvailable }) => ({ name: importName(name), price: Number(price), isAvailable: isAvailable !== false }))
});

export function planMenuImport(menu, current) {
    const categoryNames = new Map(menu.categories.map(row => [row.id, row.name]));
    const keys = {
        categories: row => importName(row.name),
        modifierGroups: groupKey,
        menuItems: row => productKey(row.name, categoryNames.get(row.categoryId)),
        promotions: row => importName(row.name)
    };
    return Object.fromEntries(importCollections.map(name => {
        const matches = new Map();
        for (const row of current[name]) {
            const key = name === 'menuItems' ? productKey(row.name, categoryFor(row, current.categories)?.name || row.category) : keys[name](row);
            if (!matches.has(key)) matches.set(key, []);
            matches.get(key).push(row);
        }
        return [name, menu[name].map(row => {
            const existing = matches.get(keys[name](row));
            if (name === 'categories' || name === 'modifierGroups') {
                requireValue((existing?.length ?? 0) <= 1, row.name || row.title, 'Plusieurs éléments existants correspondent. Corrigez le catalogue avant de reprendre.');
            }
            return { row, existingId: existing?.[0]?.id ?? null };
        })];
    }));
}

export function checkImportCapacity(plan, current) {
    let writes = 1;
    for (const name of importCollections) {
        const additions = plan[name].filter(entry => !entry.existingId).length;
        requireValue(current[name].length + additions <= MENU_LIMIT, name, `Le catalogue peut contenir jusqu’à ${MENU_LIMIT} éléments de ce type.`);
        writes += additions;
    }
    const used = new Set(plan.menuItems.filter(entry => !entry.existingId).flatMap(entry => entry.row.modifierGroupIds));
    writes += plan.modifierGroups.filter(entry => entry.existingId && used.has(entry.row.id)).length;
    requireValue(writes <= MAX_IMPORT_WRITES, 'Menu', 'Cet import dépasse 400 écritures. Divisez le menu en plusieurs fichiers.');
}
