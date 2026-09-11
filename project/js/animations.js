document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion) {
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    document.body.appendChild(glow);

    document.addEventListener("pointermove", (event) => {
      glow.style.opacity = "1";
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    });

    document.addEventListener("pointerleave", () => {
      glow.style.opacity = "0";
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => observer.observe(item));

  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active");
      faqItems.forEach((faq) => {
        faq.classList.remove("active");
        faq.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
      });

      if (!isActive) {
        item.classList.add("active");
        question.setAttribute("aria-expanded", "true");
      }
    });
  });

  const counters = document.querySelectorAll("[data-counter]");
  counters.forEach((counter) => {
    const endValue = Number(counter.dataset.counter) || 0;
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    const tick = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const value = Math.floor(progress * endValue);
      counter.textContent = value.toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });

  const parallaxItems = document.querySelectorAll(".floating-card, .shield-scene, .phone-shell");
  if (!reduceMotion) {
    document.addEventListener("pointermove", (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 20;
      const y = (event.clientY / window.innerHeight - 0.5) * 18;
      parallaxItems.forEach((item, index) => {
        const depth = (index + 1) * 0.6;
        item.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
      });
    });
  }

  document.querySelectorAll(".btn, .support-menu button, .text-link, .footer-link").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      if (reduceMotion) return;
      const ripple = document.createElement("span");
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      ripple.className = "ripple";
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 450);
    });
  });

  const style = document.createElement("style");
  style.textContent = `
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.45);
      transform: scale(0);
      animation: rippleEffect 0.55s ease-out;
      pointer-events: none;
    }

    @keyframes rippleEffect {
      to {
        transform: scale(2.5);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
});
