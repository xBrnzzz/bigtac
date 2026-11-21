import { t } from './i18n.js';

const instances = new WeakMap();

export function setupCarousel(track) {
    instances.get(track)?.destroy();
    const section = track.closest('[data-carousel]');
    const abort = new AbortController();
    const listen = (target, event, callback, options = {}) =>
        target.addEventListener(event, callback, { ...options, signal: abort.signal });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let pointer = null, suppressClick = false, clickTimer = 0;
    const limit = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const sign = () => getComputedStyle(track).direction === 'rtl' ? -1 : 1;
    const controls = document.createElement('div');
    controls.className = 'browse-arrows';
    for (const [label, arrow, amount] of [['discovery.prev', '←', -1], ['discovery.next', '→', 1]]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-controls', track.id);
        button.setAttribute('data-i18n-aria', label);
        button.setAttribute('aria-label', t(label));
        const icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = arrow;
        button.append(icon);
        listen(button, 'click', () => move(amount));
        controls.append(button);
    }
    section.querySelector('.section-heading').append(controls);
    function update() {
        const scrollable = track.children.length > 1 && limit() > 2;
        track.tabIndex = scrollable ? 0 : -1;
        controls.hidden = !scrollable;
    }
    function move(amount) {
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        const step = track.firstElementChild.getBoundingClientRect().width + gap;
        const maximum = limit();
        const position = sign() * track.scrollLeft;
        const index = amount > 0 ? Math.floor((position + 1) / step) + 1 : Math.ceil((position - 1) / step) - 1;
        const target = amount > 0 && position >= maximum - 1 ? 0
            : amount < 0 && position <= 1 ? maximum
            : Math.max(0, Math.min(maximum, index * step));
        track.scrollTo({ left: sign() * target, behavior: reduced.matches ? 'instant' : 'smooth' });
    }
    listen(track, 'keydown', event => {
        if (event.target !== track || controls.hidden) return;
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            move((event.key === 'ArrowRight' ? 1 : -1) * sign());
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            track.scrollTo({ left: event.key === 'Home' ? 0 : sign() * limit(), behavior: 'instant' });
        }
    });
    listen(track, 'dragstart', event => event.preventDefault());
    listen(track, 'pointerdown', event => {
        if (event.button !== 0) return;
        pointer = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, mouse: event.pointerType === 'mouse', dragged: false };
    });
    listen(track, 'pointermove', event => {
        if (!pointer?.mouse || pointer.id !== event.pointerId) return;
        const distance = event.clientX - pointer.x;
        if (Math.abs(distance) > 7) {
            pointer.dragged = true;
            track.setPointerCapture(event.pointerId);
            track.classList.add('is-dragging');
        }
        if (pointer.dragged) {
            event.preventDefault();
            track.scrollLeft = pointer.left - distance;
        }
    });
    const endPointer = event => {
        if (!pointer || pointer.id !== event.pointerId) return;
        suppressClick = pointer.dragged;
        pointer = null;
        track.classList.remove('is-dragging');
        if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => { suppressClick = false; }, 0);
    };
    listen(window, 'pointerup', endPointer);
    listen(window, 'pointercancel', endPointer);
    listen(track, 'click', event => {
        if (suppressClick && event.detail !== 0) {
            event.preventDefault(); event.stopImmediatePropagation();
        }
    }, { capture: true });
    const resize = new ResizeObserver(update);
    resize.observe(track);
    track.setAttribute('role', 'region');
    track.setAttribute('aria-labelledby', section.getAttribute('aria-labelledby'));
    track.setAttribute('aria-describedby', 'carouselHelp');
    const instance = { destroy() {
        clearTimeout(clickTimer);
        abort.abort();
        resize.disconnect();
        controls.remove();
        track.classList.remove('is-dragging');
    } };
    instances.set(track, instance);
    update();
    return instance;
}
