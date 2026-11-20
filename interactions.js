/* LAMSETI interactions: live customization previews and subtle motion. */
(() => {
  const $ = (id) => document.getElementById(id);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const notebookForm = $("notebookForm");
  const businessForm = $("businessForm");

  // Live notebook cover preview
  const coverName = $("liveCoverName");
  const coverCard = document.querySelector(".live-cover");
  if (notebookForm && coverName && coverCard) {
    const nameInput = notebookForm.elements.cover_name;
    const colorInput = notebookForm.elements.cover_color;
    const colors = {
      "كحلي": "#1d3445", "أزرق": "#315f86", "أزرق فاتح": "#6f9bb5",
      "أسود": "#252b30", "أخضر": "#456e5a", "زيتي": "#68734d",
      "وردي": "#b97883", "زهري": "#b97883", "بيج": "#b69b78",
      "أبيض": "#dedbd1", "بنفسجي": "#685a82", "بني": "#765844"
    };
    const updateNotebook = () => {
      coverName.textContent = nameInput?.value.trim() || "اسمك هنا";
      const raw = colorInput?.value.trim() || "";
      const color = colors[raw] || (CSS.supports("color", raw) ? raw : "");
      if (color) coverCard.style.setProperty("--cover-color", color);
      else coverCard.style.removeProperty("--cover-color");
    };
    notebookForm.addEventListener("input", updateNotebook);
    notebookForm.addEventListener("change", updateNotebook);
    updateNotebook();
  }

  // Business-card proof preview follows the actual print fields.
  if (businessForm) {
    const fields = {
      name: businessForm.elements.business_name,
      person: businessForm.elements.display_name,
      activity: businessForm.elements.activity,
      phone: businessForm.elements.printed_phone,
      email: businessForm.elements.email,
      address: businessForm.elements.printed_address,
      sides: businessForm.elements.sides,
      finish: businessForm.elements.finish
    };
    const set = (id, value, fallback) => { const node=$(id); if(node) node.textContent=value || fallback; };
    const updateBusiness = () => {
      const val = key => fields[key]?.value.trim() || "";
      const business=val("name") || "اسم نشاطك التجاري";
      const person=val("person");
      const activity=val("activity");
      const phone=val("phone");
      const email=val("email");
      const address=val("address");
      set("liveBusinessName",business,"اسم نشاطك التجاري");
      set("liveBusinessBackName",business,"اسم نشاطك");
      set("liveBusinessRole",person,"الاسم والصفة المهنية");
      set("liveBusinessActivity",activity,"نشاطك التجاري");
      set("liveBusinessPhone",phone,"+213 XX XX XX XX");
      set("liveBusinessContact",[phone,email,address].filter(Boolean).join(" • "),"الهاتف • البريد • العنوان");
      const stage=document.querySelector(".business-preview-stage");
      if(stage) {
        stage.classList.toggle("single-sided",fields.sides?.value==="وجه واحد");
        stage.dataset.finish=fields.finish?.value || "مطفي";
      }
    };
    businessForm.addEventListener("input",updateBusiness);
    businessForm.addEventListener("change",updateBusiness);
    updateBusiness();
  }

  // Scroll progress and reveal transitions
  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.appendChild(progress);
  let ticking = false;
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? window.scrollY / max * 100 : 0;
    progress.style.transform = `scaleX(${value / 100})`;
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { window.requestAnimationFrame(updateProgress); ticking = true; }
  }, { passive: true });
  updateProgress();

  const revealTargets = () => document.querySelectorAll(
    ".trust-strip article, .section-heading, .product-card, .form-card, .business-card-preview, .steps article, footer"
  ).forEach((el, index) => {
    if (el.dataset.revealReady) return;
    el.dataset.revealReady = "1";
    el.classList.add("reveal-item");
    el.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 75}ms`);
    if (reduced || !("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    revealObserver.observe(el);
  });
  const revealObserver = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" }) : null;

  revealTargets();
  if ("MutationObserver" in window) {
    const productObserver = new MutationObserver(revealTargets);
    const grid = $("productGrid");
    if (grid) productObserver.observe(grid, { childList: true });
  }

  // Gentle depth effect on the hero artwork and product tiles
  if (!reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const hero = document.querySelector(".hero-visual");
    if (hero) {
      hero.addEventListener("pointermove", event => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        hero.style.setProperty("--pointer-x", `${x * 10}px`);
        hero.style.setProperty("--pointer-y", `${y * 10}px`);
      });
      hero.addEventListener("pointerleave", () => {
        hero.style.setProperty("--pointer-x", "0px");
        hero.style.setProperty("--pointer-y", "0px");
      });
    }
    document.addEventListener("pointerover", event => {
      const card = event.target.closest(".product-card");
      if (card) card.classList.add("is-hovered");
    });
    document.addEventListener("pointerout", event => {
      const card = event.target.closest(".product-card");
      if (card && !card.contains(event.relatedTarget)) card.classList.remove("is-hovered");
    });
  }

  // Keyboard-friendly section navigation closes the mobile menu after navigation
  document.querySelectorAll('.main-nav a[href^="#"]').forEach(link => {
    link.addEventListener("click", () => {
      const nav = $("mainNav");
      const toggle = $("menuToggle");
      nav?.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });
})();
