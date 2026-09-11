const initNavigation = () => {
  const header = document.querySelector(".site-header");
  const mobileToggle = document.querySelector(".mobile-menu-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  const brandLinks = document.querySelectorAll(".brand");
  const navLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-menu a')];
  const sectionLinks = navLinks.filter((link) => link.hash && document.querySelector(link.hash));
  let hashLock = Boolean(window.location.hash);

  const setActiveLink = (id) => {
    navLinks.forEach((link) => link.classList.toggle("active", link.hash === `#${id}`));
  };

  sectionLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (link.hash === "#support") {
        const supportTrigger = document.querySelector(".support-trigger");
        const floatingSupport = document.querySelector(".floating-support");
        if (supportTrigger && floatingSupport) {
          event.preventDefault();
          event.stopPropagation();
          setActiveLink("support");
          history.replaceState(null, "", "#support");
          if (!floatingSupport.classList.contains("open")) supportTrigger.click();
          return;
        }
      }
      const target = document.querySelector(link.hash);
      if (!target) return;
      event.preventDefault();
      setActiveLink(link.hash.slice(1));
      hashLock = true;
      history.replaceState(null, "", link.hash);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => { hashLock = false; }, 900);
    });
  });

  const observedSections = [...new Set(sectionLinks.map((link) => document.querySelector(link.hash)))];
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id && !hashLock) setActiveLink(visible.target.id);
    }, { rootMargin: "-28% 0px -58%", threshold: [0.1, 0.35, 0.65] });
    observedSections.forEach((section) => observer.observe(section));
  }
  const initialHash = window.location.hash.slice(1);
  if (initialHash) {
    setActiveLink(initialHash);
    window.setTimeout(() => { const target = document.getElementById(initialHash); if (target) target.scrollIntoView({ block: "start" }); }, 120);
    window.setTimeout(() => { hashLock = false; }, 1000);
  }
  else setActiveLink("top");
  if (initialHash === "support") window.setTimeout(() => { const trigger = document.querySelector(".support-trigger"); if (trigger && !document.querySelector(".floating-support")?.classList.contains("open")) trigger.click(); }, 250);

  brandLinks.forEach((brandLink) => {
    brandLink.addEventListener("click", (event) => {
      const isHomePage = window.location.pathname === "/" || window.location.pathname.endsWith("/index.html");
      if (!isHomePage) {
        window.location.assign("/#top");
        return;
      }

      event.preventDefault();
      window.history.replaceState(null, "", "/#top");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const updateHeaderState = () => {
    if (!header) return;
    const scrolled = window.scrollY > 15;
    header.classList.toggle("scrolled", scrolled);
  };

  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.toggle("open");
      mobileToggle.setAttribute("aria-expanded", String(isOpen));
      mobileToggle.querySelectorAll("span").forEach((line, index) => {
        if (isOpen) {
          if (index === 0) line.style.transform = "translateY(7px) rotate(45deg)";
          if (index === 1) line.style.opacity = "0";
          if (index === 2) line.style.transform = "translateY(-7px) rotate(-45deg)";
        } else {
          line.style.transform = "none";
          line.style.opacity = "1";
        }
      });
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
        mobileToggle.setAttribute("aria-expanded", "false");
        mobileToggle.querySelectorAll("span").forEach((line) => {
          line.style.transform = "none";
          line.style.opacity = "1";
        });
      });
    });
  }
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNavigation, { once: true });
else initNavigation();
