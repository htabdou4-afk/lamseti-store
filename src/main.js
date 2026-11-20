import "./tailwind.css";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

async function bootSmoothScroll() {
  if (reducedMotion.matches) return;
  try {
    const { default: Lenis } = await import("lenis");
    if (reducedMotion.matches) return;
    const lenis = new Lenis({
      autoRaf: true, anchors: true, smoothWheel: true, syncTouch: false,
      lerp: 0.085, respectReducedMotion: true
    });
    window.__lamsetiLenis = lenis;
    reducedMotion.addEventListener?.("change", event => {
      if (event.matches) lenis.destroy();
    }, { once: true });
  } catch (error) {
    console.warn("Lenis could not be initialized; native scrolling remains available.", error);
  }
}

async function bootScrollAnimations() {
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
  const hero = document.querySelector(".hero");
  const steps = document.querySelector("#how .steps");
  const targets = [hero, steps].filter(Boolean);
  if (!targets.length) return;

  const observer = new IntersectionObserver(async entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (reducedMotion.matches) return;
    try {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"), import("gsap/ScrollTrigger")
      ]);
      gsap.registerPlugin(ScrollTrigger);
      const lenis = window.__lamsetiLenis;
      if (lenis) lenis.on("scroll", ScrollTrigger.update);

      const stopMotion = event => {
        if (!event.matches) return;
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        gsap.globalTimeline.clear();
        gsap.set([hero, steps].filter(Boolean), { clearProps: "all" });
      };
      reducedMotion.addEventListener?.("change", stopMotion);

      if (hero) {
        const copy = hero.querySelector(".hero-copy");
        const visual = hero.querySelector(".hero-visual");
        const timeline = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: { trigger: hero, start: "top 82%", once: true }
        });
        if (copy) timeline.fromTo(copy, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.85 });
        if (visual) timeline.fromTo(visual, { autoAlpha: 0, y: 24, scale: 0.975 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.95 }, "-=0.58");
      }
      if (steps) {
        const cards = steps.querySelectorAll("article");
        if (cards.length) gsap.fromTo(cards, { autoAlpha: 0, y: 28 }, {
          autoAlpha: 1, y: 0, duration: 0.72, stagger: 0.13, ease: "power2.out",
          scrollTrigger: { trigger: steps, start: "top 82%", once: true }
        });
      }
      ScrollTrigger.refresh();
    } catch (error) {
      console.warn("Scroll animations failed; content remains visible.", error);
    }
  }, { rootMargin: "120px 0px" });
  targets.forEach(target => observer.observe(target));
}

async function mountEnhancements() {
  const root = document.getElementById("lamseti-enhancements");
  if (!root) return;
  try {
    const [{ createRoot }, { createElement }] = await Promise.all([
      import("react-dom/client"), import("react")
    ]);
    const { default: Enhancements } = await import("./Enhancements.jsx");
    createRoot(root).render(createElement(Enhancements));
  } catch (error) {
    console.warn("Optional motion UI could not be loaded.", error);
  }
}

function scheduleEnhancements() {
  const run = () => {
    void bootSmoothScroll();
    void bootScrollAnimations();
    void mountEnhancements();
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1800 });
  else window.setTimeout(run, 450);
}

if (document.readyState === "complete") scheduleEnhancements();
else window.addEventListener("load", scheduleEnhancements, { once: true });
