/** Native scrolling supplies touch gestures and a usable carousel even without JavaScript. */
export function initResearchCarousels() {
  document.querySelectorAll<HTMLElement>('[data-research-carousel]').forEach(carousel => {
    const track = carousel.querySelector<HTMLOListElement>('.carousel-track')!;
    const slides = [...carousel.querySelectorAll<HTMLElement>('[data-carousel-slide]')];
    const previous = carousel.querySelector<HTMLButtonElement>('[data-carousel-prev]')!;
    const next = carousel.querySelector<HTMLButtonElement>('[data-carousel-next]')!;
    const dots = [...carousel.querySelectorAll<HTMLButtonElement>('[data-carousel-index]')];
    const count = carousel.querySelector<HTMLElement>('[data-carousel-count]')!;
    const status = carousel.querySelector<HTMLElement>('[data-carousel-status]')!;
    if (!slides.length) return;

    let active = 0;
    let scrollTimer = 0;
    const leftOf = (index: number) => slides[index].offsetLeft - slides[0].offsetLeft;
    const select = (index: number, announce = true) => {
      active = index;
      slides.forEach((slide, i) => { slide.inert = i !== active; });
      dots.forEach((dot, i) => {
        if (i === active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      previous.disabled = active === 0;
      next.disabled = active === slides.length - 1;
      count.textContent = String(active + 1).padStart(2, '0');
      if (announce) {
        status.textContent = `${slides[active].dataset.title}, project ${active + 1} of ${slides.length}`;
        carousel.dispatchEvent(new CustomEvent('research:select', {
          bubbles: true,
          detail: { scene: slides[active].querySelector<HTMLElement>('[data-plate]')!.dataset.plate },
        }));
      }
    };
    const go = (index: number) => {
      const target = Math.max(0, Math.min(slides.length - 1, index));
      if (target === active) return;
      const moveFocus = slides[active].contains(document.activeElement);
      select(target);
      track.scrollTo({ left: leftOf(target), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      if (moveFocus) slides[target].querySelector<HTMLAnchorElement>('a')!.focus({ preventScroll: true });
    };
    const settle = () => {
      clearTimeout(scrollTimer);
      const nearest = slides.reduce((best, _, i) =>
        Math.abs(leftOf(i) - track.scrollLeft) < Math.abs(leftOf(best) - track.scrollLeft) ? i : best, 0);
      if (nearest !== active) select(nearest);
    };

    previous.addEventListener('click', () => go(active - 1));
    next.addEventListener('click', () => go(active + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
    carousel.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const index = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1 }[event.key];
      if (index === undefined) return;
      event.preventDefault();
      go(index);
    });
    // scrollend handles swipes; the debounce also supports browsers without scrollend.
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(settle, 160);
    }, { passive: true });
    track.addEventListener('scrollend', settle);
    new ResizeObserver(() => track.scrollTo({ left: leftOf(active), behavior: 'instant' })).observe(track);
    select(0, false);
    carousel.querySelectorAll<HTMLElement>('.carousel-controls, .carousel-dots').forEach(element => { element.hidden = false; });
  });
}
