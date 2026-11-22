// Tells themes whether a dish image is a cut-out (transparent background) or an ordinary photo.
// Cut-outs can float over the page with a drop shadow; photos keep a frame so their own background
// never shows as a halo. Each image, its media box and its card get data-cutout="true" or "false".
// JPEG cannot be transparent, so it is a photo without a download. Other formats are probed once per URL
// through a separate CORS request; a host that refuses CORS is treated as a photo, the safe default.

const SELECTOR = '.product-card__media img, #hero-photo, #modalItemImage, .menu-product-image, .promo-art img';
const OPAQUE = /\.jpe?g(?:[?#]|$)/i;
const SIZE = 24;
const cache = new Map();

function probe(src) {
    if (cache.has(src)) return cache.get(src);
    const result = new Promise(resolve => {
        if (OPAQUE.test(src)) return resolve(false);
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.decoding = 'async';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = SIZE;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                context.drawImage(image, 0, 0, SIZE, SIZE);
                const data = context.getImageData(0, 0, SIZE, SIZE).data;
                const alpha = (x, y) => data[(y * SIZE + x) * 4 + 3];
                const edge = SIZE - 1, middle = SIZE >> 1;
                // Corners and edge midpoints: a cut-out leaves most of its border transparent.
                const border = [alpha(0, 0), alpha(edge, 0), alpha(0, edge), alpha(edge, edge),
                    alpha(middle, 0), alpha(0, middle), alpha(edge, middle), alpha(middle, edge)];
                resolve(border.filter(value => value < 24).length >= 5);
            } catch {
                resolve(false);
            }
        };
        image.onerror = () => resolve(false);
        image.src = src;
    });
    cache.set(src, result);
    return result;
}

function targets(image) {
    return [image, image.parentElement, image.closest('.product-card, .menu-product, .promo-entry'), image.id === 'hero-photo' ? image.closest('#hero') : null]
        .filter((node, index, list) => node && list.indexOf(node) === index);
}

function mark(image) {
    const attribute = image.getAttribute('src');
    if (!attribute) return;
    const src = new URL(attribute, image.ownerDocument.baseURI).href;
    if (image.dataset.cutoutFor === src) return;
    image.dataset.cutoutFor = src;
    probe(src).then(cutout => {
        if (image.dataset.cutoutFor !== src) return;
        for (const node of targets(image)) node.dataset.cutout = String(cutout);
    });
}

export function watchDishImages(doc = document) {
    let queued = false;
    const scan = () => {
        queued = false;
        doc.querySelectorAll(SELECTOR).forEach(mark);
    };
    const schedule = () => {
        if (queued) return;
        queued = true;
        // The caller's frame schedules the scan: a sandboxed preview document cannot run its own callbacks.
        requestAnimationFrame(scan);
    };
    new MutationObserver(schedule).observe(doc.body || doc.documentElement, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['src']
    });
    scan();
}
