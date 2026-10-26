// Native scrolling, original cards only: ordering handlers are never cloned.
const instances = new WeakMap();

export function setupCarousel(track) {
    instances.get(track)?.destroy();
    const section = track.closest('[data-carousel]');
    const abort = new AbortController();
    const listen = (target, event, callback, options = {}) => target.addEventListener(event, callback, { ...options, signal: abort.signal });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, resumeTimer = 0, lastTime = 0, direction = 1, position = 0;
    let visible = false, hovered = false, focused = section.contains(document.activeElement);
    let userPaused = false, manualUntil = 0;
    let pointer = null, suppressClick = false, clickTimer = 0;
    const limit = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const canScroll = () => track.children.length > 1 && limit() > 2;
    const eligible = () => canScroll() && visible && !document.hidden && !reduced.matches && !userPaused && !hovered && !focused && !pointer && performance.now() >= manualUntil && !document.body.classList.contains('modal-open');

    function stop() {
        cancelAnimationFrame(frame);
        frame = lastTime = 0;
    }
    function tick(time) {
        frame = 0;
        if (!eligible()) { lastTime = 0; return; }
        const elapsed = lastTime ? Math.min(time - lastTime, 64) : 0;
        lastTime = time;
        const maximum = limit();
        if (position >= maximum - .5) direction = -1;
        if (position <= .5) direction = 1;
        // Gentle bidirectional loop; no teleport, duplicate cards or duplicate actions.
        position = Math.max(0, Math.min(maximum, position + direction * elapsed * .018));
        track.scrollLeft = position;
        frame = requestAnimationFrame(tick);
    }
    function update() {
        const scrollable = canScroll();
        track.tabIndex = scrollable ? 0 : -1;
        if (!eligible()) stop();
        else if (!frame) { position = track.scrollLeft; frame = requestAnimationFrame(tick); }
    }
    function manualPause() {
        manualUntil = performance.now() + 6000;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(update, 6020);
        stop();
    }
    function move(amount) {
        manualPause();
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        const step = (track.firstElementChild?.getBoundingClientRect().width || track.clientWidth) + gap;
        const maximum = limit();
        const index = amount > 0 ? Math.floor((track.scrollLeft + 1) / step) + 1 : Math.ceil((track.scrollLeft - 1) / step) - 1;
        const target = amount > 0 && track.scrollLeft >= maximum - 1 ? 0
            : amount < 0 && track.scrollLeft <= 1 ? maximum
            : Math.max(0, Math.min(maximum, index * step));
        track.scrollTo({ left: target, behavior: reduced.matches ? 'instant' : 'smooth' });
    }
    listen(section, 'pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; update(); } });
    listen(section, 'pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; update(); } });
    listen(section, 'focusin', () => { focused = true; update(); });
    listen(section, 'focusout', event => { focused = section.contains(event.relatedTarget); update(); });
    listen(track, 'wheel', manualPause, { passive: true });
    listen(track, 'scroll', () => {
        // Distinguish our own subpixel drift from an actual user scroll, even
        // when the user takes over immediately after an animation frame.
        if (Math.abs(track.scrollLeft - position) > 1) manualPause();
    }, { passive: true });
    listen(track, 'keydown', event => {
        if (event.target !== track) return;
        if (event.key === ' ') {
            event.preventDefault(); userPaused = !userPaused; update();
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault(); manualPause();
            track.scrollTo({ left: event.key === 'Home' ? 0 : limit(), behavior: 'instant' });
        }
    });
    listen(track, 'dragstart', event => event.preventDefault());
    listen(track, 'pointerdown', event => {
        if (event.button !== 0) return;
        pointer = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, mouse: event.pointerType === 'mouse', dragged: false };
        manualPause();
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
        manualPause();
    };
    listen(window, 'pointerup', endPointer);
    listen(window, 'pointercancel', endPointer);
    listen(track, 'click', event => {
        if (suppressClick && event.detail !== 0) {
            event.preventDefault(); event.stopImmediatePropagation();
        }
    }, { capture: true });
    listen(reduced, 'change', update);
    listen(document, 'visibilitychange', update);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }, { threshold: .05 });
    intersection.observe(track);
    const resize = new ResizeObserver(update);
    resize.observe(track);
    const modal = new MutationObserver(update);
    modal.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    track.setAttribute('role', 'region');
    track.setAttribute('aria-roledescription', 'carrousel');
    track.setAttribute('aria-labelledby', section.getAttribute('aria-labelledby'));
    track.setAttribute('aria-describedby', 'carouselHelp');
    const instance = { destroy() {
        stop(); clearTimeout(resumeTimer); clearTimeout(clickTimer);
        abort.abort(); intersection.disconnect(); resize.disconnect(); modal.disconnect();
        track.classList.remove('is-dragging');
    } };
    instances.set(track, instance);
    update();
    return instance;
}
