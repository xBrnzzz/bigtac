import { uiText } from './i18n.js';
import { safeURL } from './operations-model.js';

export const GLOVO_LISTING = 'https://glovoapp.com/fr/ma/fes/stores/big-tac-fes';
export const languages = [['fr', 'Français'], ['en', 'English'], ['ar', 'العربية']];
const glovoLabels = {fr: 'Commander sur Glovo', en: 'Order on Glovo', ar: 'اطلب عبر Glovo'};

export const paletteFields = [
    ['accent', 'Boutons et accents', '#c84a13'],
    ['background', 'Fond de page', '#fbf8f3'],
    ['surface', 'Cartes et navigation', '#fffdfa'],
    ['hero', 'Fond du bandeau', '#ff762e'],
    ['footer', 'Fond du pied de page', '#221d19'],
    ['glovo', 'Fond du bouton Glovo', '#ffc244']
];
export const copyFields = [
    ['heroLead', 'Accroche du bandeau', 'hero.title_lead', 48, '.hero-lead'],
    ['heroName', 'Grand titre du bandeau', '', 48, '#hero-brand'],
    ['heroSubtitle', 'Texte sous le titre', 'hero.subtitle', 160, '#hero-description'],
    ['heroCta', 'Bouton de commande', 'hero.cta', 38, '.intro-cta span:first-child'],
    ['heroClosedCta', 'Bouton pendant la fermeture', 'hero.cta_closed', 38, '.intro-cta span:first-child'],
    ['heroAlt', 'Description de la photo', 'hero.photo', 160, '#hero-photo'],
    ['tagline', 'Sous-titre sous le logo', '', 42, '#store-brand-tagline'],
    ['menuTitle', 'Titre de la carte', 'sections.menu', 56, '#menu-title'],
    ['menuSubtitle', 'Introduction de la carte', 'sections.menu_sub', 120, '#menu-description'],
    ['offersTitle', 'Titre des promotions', 'sections.promotions', 56, '#promotions-title'],
    ['popularTitle', 'Titre des best sellers', 'sections.bestseller', 56, '#popular-title'],
    ['footerTitle', 'Titre des infos pratiques', 'location.title', 56, '#info-title'],
    ['footerContact', 'Titre du bloc contact', 'location.question', 80, '#footer-contact-title'],
    ['glovoLabel', 'Libellé du bouton Glovo', '', 38, '[data-glovo-label]']
];
const placements = ['hero', 'footer', 'both'];
const imagePositions = ['', 'left', 'center', 'right'];
const hex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const string = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export function glovoURL(value) {
    if (!safeURL(value)) return '';
    const url = new URL(value);
    const host = url.hostname;
    return !url.port && (host === 'glovoapp.com' || host.endsWith('.glovoapp.com')) ? url.href : '';
}

export function storefrontAppearance(config = {}) {
    const value = config.storefront || {};
    const glovo = value.glovo ?? {};
    const name = string(config.restaurantName, 120);
    const defaultListing = !name || /^big\s*tac$/i.test(name) ? GLOVO_LISTING : '';
    return {
        palette: Object.fromEntries(paletteFields.map(([key]) => [key, hex(value.palette?.[key]) ? value.palette[key] : ''])),
        heroImage: safeURL(value.heroImage) ? value.heroImage : '',
        heroPosition: imagePositions.includes(value.heroPosition) ? value.heroPosition : '',
        copy: Object.fromEntries(languages.map(([locale]) => [locale, Object.fromEntries(copyFields.map(([key, , , max]) => [
            key, string(value.copy?.[locale]?.[key], max)
        ]))])),
        showOffers: value.showOffers !== false,
        showPopular: value.showPopular !== false,
        glovo: {
            enabled: typeof glovo.enabled === 'boolean' ? glovo.enabled : !!defaultListing,
            url: glovo.url === undefined ? defaultListing : glovoURL(glovo.url),
            placement: placements.includes(glovo.placement) ? glovo.placement : 'hero'
        }
    };
}

export function storefrontAppearanceIssue(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Configuration de vitrine invalide.';
    if (!['showOffers', 'showPopular'].every(key => typeof value[key] === 'boolean')) return 'Visibilité des sections invalide.';
    if (!imagePositions.includes(value.heroPosition) || typeof value.heroImage !== 'string'
        || (value.heroImage && (value.heroImage.length > 2048 || !safeURL(value.heroImage)))) return 'Utilisez une adresse HTTPS valide pour la photo.';
    if (!paletteFields.every(([key]) => value.palette?.[key] === '' || hex(value.palette?.[key]))) return 'Saisissez des couleurs hexadécimales au format #RRGGBB.';
    if (!languages.every(([locale]) => copyFields.every(([key, , , max]) =>
        typeof value.copy?.[locale]?.[key] === 'string' && value.copy[locale][key].length <= max))) return 'Vérifiez la longueur des textes.';
    if (typeof value.glovo?.enabled !== 'boolean' || !placements.includes(value.glovo.placement)
        || typeof value.glovo.url !== 'string' || value.glovo.url.length > 2048
        || ((value.glovo.enabled || value.glovo.url) && !glovoURL(value.glovo.url))) return 'Saisissez un lien HTTPS vers votre établissement sur glovoapp.com.';
    return '';
}

function luminance(background) {
    const linear = background.slice(1).match(/../g).map(pair => {
        const channel = parseInt(pair, 16) / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}

export function foreground(background) {
    return luminance(background) >= .179 ? '#000000' : '#ffffff';
}

function applyPalette(styles, palette) {
    for (const [key] of paletteFields) {
        const color = palette[key];
        if (color) {
            styles.setProperty('--site-' + key, color);
            styles.setProperty('--site-' + key + '-ink', foreground(color));
        } else {
            styles.removeProperty('--site-' + key);
            styles.removeProperty('--site-' + key + '-ink');
        }
    }
    if (palette.accent) {
        const tone = foreground(palette.accent) === '#000000' ? '#ffffff' : '#000000';
        styles.setProperty('--site-accent-hover', `color-mix(in srgb,${palette.accent} 90%,${tone})`);
    } else styles.removeProperty('--site-accent-hover');
}

export function applyAdminPalette(doc, config = {}) {
    const {accent, background, surface} = storefrontAppearance(config).palette;
    const styles = doc.documentElement.style;
    applyPalette(styles, {accent, background, surface});
    // The POS remains a light workspace with dark labels. Dark colours tint its paper.
    for (const [key, color] of [['background', background], ['surface', surface]]) {
        const variable = '--site-admin-' + key;
        if (color) styles.setProperty(variable, luminance(color) >= .75 ? color : `color-mix(in srgb,${color} 12%,white)`);
        else styles.removeProperty(variable);
    }
}

export function appearanceText(config, key, language, translate) {
    const field = copyFields.find(([name]) => name === key);
    const value = string(config.storefront?.copy?.[language]?.[key], field[3]);
    if (value) return value;
    const fallback = {
        heroName: config.restaurantName || 'BIGTAC',
        heroSubtitle: config.description || translate('hero.subtitle'),
        heroAlt: config.storefront?.heroImage ? '' : translate('hero.photo'),
        tagline: uiText('Tacos & grill · Fès', {}, language),
        glovoLabel: glovoLabels[language] || glovoLabels.fr
    };
    return Object.hasOwn(fallback, key) ? fallback[key] : translate(field[2]);
}

export function renderStorefrontHours(doc, hours, language, translate) {
    const weekly = doc.getElementById('footer-week');
    const summary = doc.getElementById('restaurant-hours');
    const scheduled = Array.isArray(hours) && hours.length === 7
        && hours.every(day => day && (day.closed || (day.start && day.end)));
    summary.hidden = scheduled;
    weekly.hidden = !scheduled;
    weekly.replaceChildren();
    if (!scheduled) {
        summary.textContent = translate('location.hours_val');
        return;
    }
    const weekdays = new Intl.DateTimeFormat(language, {weekday:'short', timeZone:'UTC'});
    hours.forEach((hours, index) => {
        const day = doc.createElement('dt');
        const time = doc.createElement('dd');
        day.textContent = weekdays.format(new Date(Date.UTC(2026, 0, 5 + index)));
        time.textContent = hours.closed ? translate('location.closed') : hours.start + '–' + hours.end;
        time.dir = hours.closed ? 'auto' : 'ltr';
        weekly.append(day, time);
    });
}

export function renderStorefrontAppearance(doc, config, {language, translate, open, table = false, localImage = ''}) {
    const settings = storefrontAppearance(config);
    const styles = doc.documentElement.style;
    applyPalette(styles, settings.palette);
    const getText = key => appearanceText(config, key, language, translate);
    const name = config.restaurantName || 'BIGTAC';
    doc.getElementById('store-brand-name').textContent = name;
    doc.getElementById('footer-brand').textContent = name;
    doc.querySelector('.store-brand').setAttribute('aria-label', `${name}, ${translate('common.home')}`);
    const logo = doc.querySelector('.store-brand img');
    const logoSrc = safeURL(config.logoUrl) ? config.logoUrl : 'assets/logo.png';
    if (logo.getAttribute('src') !== logoSrc) logo.setAttribute('src', logoSrc);
    if (!doc.documentElement.hasAttribute('data-storefront-preview')) {
        doc.title = name + ' · ' + translate('sections.menu');
        doc.querySelectorAll('[data-storefront-icon]').forEach(icon => {
            if (icon.getAttribute('href') !== logoSrc) icon.href = logoSrc;
        });
    }
    for (const [key, , , , selector] of copyFields) {
        if (key === 'heroAlt' || key === (open ? 'heroClosedCta' : 'heroCta')) continue;
        doc.querySelectorAll(selector).forEach(node => { node.textContent = getText(key); });
    }
    const heading = doc.getElementById('hero-brand');
    heading.toggleAttribute('data-custom', heading.textContent.toUpperCase() !== 'BIGTAC');
    const image = doc.getElementById('hero-photo');
    const src = localImage || settings.heroImage || 'assets/tacos-campaign.jpg';
    if (image.dataset.requested !== src) {
        image.dataset.requested = src;
        image.onerror = () => {
            image.classList.add('hidden');
        };
        image.classList.remove('hidden');
        image.setAttribute('src', src);
    }
    image.alt = image.getAttribute('src') === src
        ? localImage || settings.heroImage ? string(settings.copy[language]?.heroAlt, 160) : getText('heroAlt')
        : translate('hero.photo');
    if (settings.heroPosition) styles.setProperty('--site-photo-x', settings.heroPosition);
    else styles.removeProperty('--site-photo-x');
    doc.querySelectorAll('[data-glovo-placement]').forEach(link => {
        const location = link.dataset.glovoPlacement;
        const show = !table && settings.glovo.enabled && settings.glovo.url && (settings.glovo.placement === 'both' || settings.glovo.placement === location);
        link.hidden = !show;
        if (show && !doc.documentElement.hasAttribute('data-storefront-preview')) link.href = settings.glovo.url;
        else link.removeAttribute('href');
    });
}
