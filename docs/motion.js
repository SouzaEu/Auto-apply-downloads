/* Cross-dissolves adapted from cinematic-scroll-landing, MIT (vendor license).
 * Responsive GSAP cleanup follows the inspected n7-site LandingMotion pattern.
 */
import { t } from './i18n.js';

export function initMotion() {
  const system = matchMedia('(prefers-reduced-motion: reduce)');
  const button = document.querySelector('#motion');
  const projects = [...document.querySelectorAll('[data-project]')];
  let paused = system.matches;
  let context;
  let hasEntered = false;

  function setScene(index) {
    document.querySelector('#scene-number').textContent = String(index + 1).padStart(2, '0');
    document
      .querySelectorAll('.stage-progress span')
      .forEach((item, n) => item.classList.toggle('active', n === index));
    projects.forEach((project, n) => {
      project.inert = n !== index;
    });
  }

  function wrapWords() {
    const manifesto = document.querySelector('.manifesto');
    if (manifesto.querySelector('.word')) return;
    const walker = document.createTreeWalker(manifesto, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((word) => {
        if (!word.trim()) fragment.append(document.createTextNode(word));
        else {
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = word;
          fragment.append(span);
        }
      });
      node.replaceWith(fragment);
    });
  }

  function rebuild() {
    context?.revert();
    context = undefined;
    projects.forEach((project) => {
      project.inert = false;
    });
    document.body.classList.toggle('motion-off', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', t(paused ? 'motion.resume' : 'motion.pause'));
    button.querySelector('span').textContent = t(paused ? 'motion.resume' : 'motion.pause');
    window.dispatchEvent(new CustomEvent('forma-motion', { detail: { paused } }));
    wrapWords();
    if (!window.gsap || !window.ScrollTrigger || paused) return;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    context = gsap.matchMedia();
    context.add('(min-width: 801px) and (prefers-reduced-motion: no-preference)', () => {
      document.body.classList.add('enhanced');
      if (!hasEntered && scrollY < 50) {
        gsap.from('.hero-type .line>span', {
          yPercent: 110,
          duration: 1.05,
          stagger: 0.1,
          ease: 'power4.out',
        });
        hasEntered = true;
      }
      gsap.set(projects.slice(1), { autoAlpha: 0, yPercent: 8, scale: 0.98 });
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: '.showcase',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.45,
        },
        // Match accessible/tappable project to the rendered timeline, including scrub lag.
        onUpdate: () => setScene(timeline.time() < 0.85 ? 0 : timeline.time() < 2 ? 1 : 2),
      });
      timeline
        .to(projects[0], { scale: 0.96, yPercent: -7, autoAlpha: 0, duration: 0.7 }, 0.5)
        .to(projects[1], { scale: 1, yPercent: 0, autoAlpha: 1, duration: 0.7 }, 0.5)
        .to(projects[1], { scale: 0.96, yPercent: -7, autoAlpha: 0, duration: 0.7 }, 1.65)
        .to(projects[2], { scale: 1, yPercent: 0, autoAlpha: 1, duration: 0.7 }, 1.65)
        .to({}, { duration: 0.35 });
      setScene(0);
      return () => {
        document.body.classList.remove('enhanced');
        projects.forEach((project) => {
          project.inert = false;
        });
      };
    });
    context.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '.manifesto .word',
        { opacity: 0.72 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: 'none',
          scrollTrigger: { trigger: '.manifesto', start: 'top 88%', end: 'bottom 65%', scrub: 0.3 },
        },
      );
      document.querySelectorAll('.approach-rows article').forEach((row) => {
        gsap.from(row, {
          y: 18,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: row, start: 'top 96%', once: true },
        });
      });
    });
    ScrollTrigger.refresh();
  }
  const toggle = () => {
    paused = !paused;
    rebuild();
  };
  const systemChange = () => {
    paused = system.matches;
    rebuild();
  };
  button.addEventListener('click', toggle);
  system.addEventListener('change', systemChange);
  window.addEventListener('forma-language', rebuild);
  rebuild();
  document.fonts.ready.then(() => window.ScrollTrigger?.refresh());
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    context?.revert();
    button.removeEventListener('click', toggle);
    system.removeEventListener('change', systemChange);
    window.removeEventListener('forma-language', rebuild);
  });
  return () => paused || system.matches;
}
