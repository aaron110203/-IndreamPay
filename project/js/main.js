document.addEventListener("DOMContentLoaded", () => {
  Promise.resolve(window.PUBLIC_CONFIG_READY).then(initializeSite);
});

function initializeSite() {
  if (window.PUBLIC_CONFIG && typeof CONFIG !== "undefined") {
    Object.assign(CONFIG, window.PUBLIC_CONFIG);
    CONFIG.siteName = CONFIG.settings?.websiteName || CONFIG.siteName;
    CONFIG.logoText = CONFIG.settings?.websiteName || CONFIG.branding?.logoText || CONFIG.siteName;
    CONFIG.logoMark = CONFIG.branding?.logoMark || CONFIG.logoMark;
    CONFIG.logoFont = CONFIG.branding?.logoFont || CONFIG.logoFont || "modern";
    CONFIG.pageTitle = CONFIG.settings?.browserTitle || CONFIG.pageTitle;
    CONFIG.pageDescription = CONFIG.settings?.metaDescription || CONFIG.pageDescription;
    CONFIG.telegramUrl = CONFIG.links?.telegramUrl || CONFIG.telegramUrl;
    CONFIG.liveChatUrl = CONFIG.links?.liveChatUrl || CONFIG.liveChatUrl;
    CONFIG.supportUrl = CONFIG.links?.supportUrl || CONFIG.supportUrl;
  }

  const applyBranding = () => {
    if (typeof CONFIG === "undefined") return;

    const siteName = CONFIG.siteName || "NovaPay";
    const logoMark = CONFIG.logoMark || siteName.charAt(0).toUpperCase();
    const titleText = CONFIG.pageTitle || "Smarter money. Simpler everyday.";
    const descriptionText = CONFIG.pageDescription || "Everything you need to manage your money in one simple and powerful experience.";

    document.title = titleText.toLowerCase().startsWith(`${siteName.toLowerCase()} |`)
      ? titleText
      : `${siteName} | ${titleText}`;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute("content", descriptionText);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", titleText);

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute("content", descriptionText);

    document.querySelectorAll("[data-brand-name]").forEach((el) => {
      el.textContent = CONFIG.logoText || siteName;
      const fonts = {
        modern: "Manrope, sans-serif",
        elegant: "'Playfair Display', serif",
        bold: "Montserrat, sans-serif",
        geometric: "'Space Grotesk', sans-serif",
        friendly: "Manrope, sans-serif",
        classic: "'DM Serif Display', serif",
        clean: "Montserrat, sans-serif",
        tech: "'Space Grotesk', sans-serif",
        luxury: "'Playfair Display', serif",
        playful: "Syne, sans-serif"
      };
      el.style.fontFamily = fonts[CONFIG.logoFont] || fonts.modern;
    });

    document.querySelectorAll("[data-brand-mark]").forEach((el) => {
      el.textContent = logoMark;
    });

    if (CONFIG.branding?.logoMarkUrl) {
      document.querySelectorAll("[data-brand-mark]").forEach((el) => {
        const image = document.createElement("img");
        image.src = CONFIG.branding.logoMarkUrl;
        image.alt = `${CONFIG.logoText || siteName} logo`;
        image.style.cssText = "width:100%;height:100%;object-fit:contain;border-radius:inherit";
        el.textContent = "";
        el.appendChild(image);
      });
    }

    const root = document.documentElement;
    const palette = CONFIG.theme || {};

    const vars = {
      "--primary": palette.primary || palette.button,
      "--primary-dark": palette.primaryDark || palette.secondary,
      "--orange": palette.orange,
      "--blue": palette.blue,
      "--green": palette.green || palette.accent,
      "--background": palette.background,
      "--surface": palette.surface,
      "--text": palette.text,
      "--muted": palette.muted,
      "--border": palette.border
    };

    Object.entries(vars).forEach(([key, value]) => {
      if (value) root.style.setProperty(key, value);
    });

    if (palette.background) {
      document.body.style.background = palette.background;
    }

    if (CONFIG.branding?.logoUrl) {
      document.querySelectorAll("[data-brand-mark]").forEach((el) => {
        const image = document.createElement("img");
        image.src = CONFIG.branding.logoUrl;
        image.alt = CONFIG.logoText;
        image.style.cssText = "width:100%;height:100%;object-fit:contain;border-radius:inherit";
        el.textContent = "";
        el.appendChild(image);
      });
    }

    applyExperience(CONFIG.experience || {});

    if (Array.isArray(CONFIG.nav)) {
      const defaultNavUrls = ["#features", "#wallet", "#rewards", "#security", "#support"];
      document.querySelectorAll(".desktop-nav a, .mobile-menu nav a").forEach((link, index) => {
        const item = CONFIG.nav[index];
        if (!item) return;
        link.textContent = item.label || link.textContent;
        link.href = item.url || defaultNavUrls[index] || link.href;
        link.hidden = item.enabled === false;
      });
    }

    const hero = CONFIG.hero || {};
    document.querySelectorAll("[data-hero-badge]").forEach((el) => { el.textContent = hero.badge || el.textContent; });
    document.querySelectorAll("[data-hero-title]").forEach((el) => { el.textContent = hero.title || el.textContent; });
    document.querySelectorAll("[data-hero-subtitle]").forEach((el) => { el.textContent = hero.subtitle || el.textContent; });
    document.querySelectorAll("[data-hero-primary]").forEach((el) => { el.textContent = hero.primaryButtonText || el.textContent; });
    document.querySelectorAll("[data-hero-secondary]").forEach((el) => { el.textContent = hero.secondaryButtonText || el.textContent; });
    document.querySelectorAll("[data-hero-primary]").forEach((el) => { if (hero.primaryButtonLink) el.dataset.cta = hero.primaryButtonLink; });
    document.querySelectorAll("[data-hero-secondary]").forEach((el) => { if (hero.secondaryButtonLink) el.dataset.cta = hero.secondaryButtonLink; });

    const sectionMap = { hero: ".hero", features: ".features", wallet: ".wallet-showcase", market: ".market", transactions: ".transaction-section", team: ".team-section", rewards: ".rewards", security: ".security", testimonials: ".testimonials", faq: ".faq", finalCta: ".final-cta" };
    Object.entries(CONFIG.sections || {}).forEach(([key, enabled]) => {
      if (sectionMap[key] && enabled === false) document.querySelectorAll(sectionMap[key]).forEach((el) => { el.hidden = true; });
    });

    renderConfiguredLinks();
    applyConfiguredImages();
  };

  applyBranding();
  startLiveHeroUpdates();
  startBalanceGrowth();
  startScrollStory();
  startTestimonialMarquee();
  startTeamDashboard();
  startTransactionStream();
  startLogoMarquee();

  const currentYear = document.querySelector(".year");
  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  const ctas = document.querySelectorAll("[data-cta]");

  ctas.forEach((button) => {
    const action = button.dataset.cta;
    const urlMap = {
      telegram: CONFIG.telegramUrl,
      "live-chat": CONFIG.liveChatUrl,
      support: CONFIG.supportUrl,
      app: CONFIG.appUrl,
      facebook: CONFIG.links?.facebookUrl,
      instagram: CONFIG.links?.instagramUrl,
      youtube: CONFIG.links?.youtubeUrl,
      linkedin: CONFIG.links?.linkedinUrl,
      x: CONFIG.links?.xUrl,
      ...(CONFIG.ctas || []).reduce((map, cta) => { if (cta.enabled && CONFIG.links?.[cta.target]) map[cta.id] = CONFIG.links[cta.target]; return map; }, {})
    };
    const configuredUrl = urlMap[action];
    button.addEventListener("click", () => {
      if (!isUsableUrl(configuredUrl)) return;
      window.open(configuredUrl, "_blank", "noopener,noreferrer");
    });
    if (!isUsableUrl(configuredUrl)) button.hidden = true;
  });

  const supportTrigger = document.querySelector(".support-trigger");
  const floatingSupport = document.querySelector(".floating-support");

  if (supportTrigger && floatingSupport) {
    supportTrigger.addEventListener("click", () => {
      const isOpen = floatingSupport.classList.toggle("open");
      supportTrigger.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
      if (!floatingSupport.contains(event.target)) {
        floatingSupport.classList.remove("open");
        supportTrigger.setAttribute("aria-expanded", "false");
      }
    });
  }
}

function applyExperience(experience) {
  const root = document.documentElement;
  const body = document.body;
  const speed = Math.min(2, Math.max(0.5, Number(experience.marqueeSpeed) || 1));
  root.style.setProperty("--marquee-speed", String(speed));
  body.classList.toggle("effects-disabled", experience.animationsEnabled === false);
  body.classList.toggle("marquees-disabled", experience.marqueesEnabled === false);
  body.classList.toggle("parallax-disabled", experience.parallaxEnabled === false);
  body.classList.toggle("reveal-disabled", experience.revealEnabled === false);
  body.classList.toggle("live-data-disabled", experience.liveDataEnabled === false);
}

function isUsableUrl(url) {
  if (!url || url === "#") return false;
  return !/(your[-_]|YOUR_|example\.com|placeholder)/i.test(url);
}

function startLogoMarquee() {
  const track = document.querySelector(".logo-track");
  if (!track || track.dataset.normalized === "true") return;

  const originalBanks = Array.from(track.children).filter((bank) => !bank.hasAttribute("aria-hidden"));
  track.replaceChildren(...originalBanks, ...originalBanks.map((bank) => {
    const duplicate = bank.cloneNode(true);
    duplicate.setAttribute("aria-hidden", "true");
    return duplicate;
  }));
  track.dataset.normalized = "true";
}

function startTestimonialMarquee() {
  const track = document.querySelector(".testimonial-track");
  if (!track || track.dataset.duplicated === "true") return;

  Array.from(track.children).forEach((card) => {
    const duplicate = card.cloneNode(true);
    duplicate.setAttribute("aria-hidden", "true");
    track.appendChild(duplicate);
  });
  track.dataset.duplicated = "true";
}

function startTeamDashboard() {
  const dashboard = document.querySelector(".team-dashboard");
  const track = dashboard?.querySelector(".referral-track");
  const chartBars = dashboard?.querySelectorAll(".team-chart-bar");
  if (!dashboard || !track) return;

  const people = [
    ["A", "Alex", "new"], ["M", "Mila", "navy"], ["J", "John", "gold"],
    ["S", "Sofia", "accent"], ["R", "Ryan", "new"], ["N", "Nia", "navy"],
    ["L", "Liam", "gold"], ["E", "Emma", "accent"]
  ];
  const renderRow = ([initial, name, tone]) => `<div class="referral-row"><div class="avatar ${tone}">${initial}</div><span>${name}</span><em>+₹${(520 + Math.floor(Math.random() * 1480)).toLocaleString("en-IN")}</em></div>`;
  track.innerHTML = people.map(renderRow).join("");
  Array.from(track.children).forEach((row) => track.appendChild(row.cloneNode(true)));

  let total = 24850;
  let active = 18240;
  let volume = 2.4;
  let rewards = 360;
  const update = () => {
    if (document.body.classList.contains("live-data-disabled")) return;
    total += 18 + Math.floor(Math.random() * 72);
    active += 10 + Math.floor(Math.random() * 42);
    volume = Math.max(1.95, volume + (Math.random() - 0.48) * 0.14);
    rewards = Math.max(315, rewards + (Math.random() - 0.46) * 9);
    dashboard.querySelector("[data-team-total]").textContent = total.toLocaleString("en-IN");
    dashboard.querySelector("[data-team-active]").textContent = active.toLocaleString("en-IN");
    dashboard.querySelector("[data-team-volume]").textContent = `₹${volume.toFixed(2)}M`;
    dashboard.querySelector("[data-team-rewards]").textContent = `₹${Math.round(rewards)}K`;
    chartBars?.forEach((bar) => {
      const current = Number.parseFloat(bar.style.getPropertyValue("--bar")) || 50;
      const next = Math.min(94, Math.max(28, current + (Math.random() - 0.5) * 24));
      bar.style.setProperty("--bar", `${next}%`);
    });
    track.querySelectorAll(".referral-row em").forEach((amount) => {
      amount.textContent = `+₹${(520 + Math.floor(Math.random() * 1480)).toLocaleString("en-IN")}`;
    });
  };
  window.setInterval(update, 2600);
}

function startTransactionStream() {
  const board = document.querySelector(".transaction-board");
  const track = board?.querySelector(".transaction-track");
  if (!board || !track) return;

  const transactions = [
    ["Received from Aisha", "Matched", "income", "positive"],
    ["Paid to Daniel", "Completed", "expense", "negative"],
    ["Received from Sofia", "Confirmed", "confirm", "positive"],
    ["Transfer to Liam", "In review", "pending", "warning"],
    ["Received from Nia", "Matched", "income", "positive"],
    ["Paid to Emma", "Completed", "expense", "negative"],
    ["Received from Ryan", "Confirmed", "confirm", "positive"],
    ["Transfer to Mila", "In review", "pending", "warning"]
  ];
  const render = ([person, status, tone, amountTone]) => {
    const amount = 650 + Math.floor(Math.random() * 5350);
    const signedAmount = amountTone === "negative" ? `-₹${amount.toLocaleString("en-IN")}` : `+₹${amount.toLocaleString("en-IN")}`;
    return `<div class="transaction-item ${tone}"><div class="line-marker ${tone === "income" ? "green" : tone === "expense" ? "red" : tone === "confirm" ? "blue" : "orange"}"></div><div class="transaction-copy"><div class="transaction-title">${person}</div><div class="transaction-meta">${status}</div></div><div class="transaction-amount ${amountTone}">${signedAmount}</div></div>`;
  };
  track.innerHTML = transactions.map(render).join("");
  Array.from(track.children).forEach((item) => track.appendChild(item.cloneNode(true)));

  window.setInterval(() => {
    if (document.body.classList.contains("live-data-disabled")) return;
    track.querySelectorAll(".transaction-amount").forEach((amountElement) => {
      const amount = 650 + Math.floor(Math.random() * 5350);
      const sign = amountElement.classList.contains("negative") ? "-" : "+";
      amountElement.textContent = `${sign}₹${amount.toLocaleString("en-IN")}`;
    });
  }, 2400);
}

function startLiveHeroUpdates() {
  const liveElements = document.querySelectorAll("[data-live-card]");
  if (!liveElements.length) return;

  const states = [
    {
      balanceLabel: "Balance", balanceValue: "+₹5,000", balanceNote: "Received successfully",
      paymentLabel: "Payment", paymentValue: "Successful", paymentNote: "Card • 09:42 AM",
      rewardValue: "+₹250 Reward", rewardNote: "Added successfully",
      securityValue: "Account Protected", securityNote: "Transfer verified",
      incomeValue: "Salary Deposit", incomeAmount: "+₹3,200.00 • Success",
      expenseValue: "UPI Payment", expenseAmount: "-₹15.99 • Success",
      rewardValue: "Reward Added", rewardAmount: "+₹250.00 • Success",
      transferValue: "UPI Transfer", transferAmount: "Completed • Success"
    },
    {
      balanceLabel: "Team Earnings", balanceValue: "+₹24,560", balanceNote: "This month",
      paymentLabel: "Transfer", paymentValue: "Completed", paymentNote: "Ramesh Kumar",
      rewardValue: "+₹420 Bonus", rewardNote: "Referral reward",
      securityValue: "Secure Transfer", securityNote: "Verified just now",
      incomeValue: "Referral Bonus", incomeAmount: "+₹920.00 • Success",
      expenseValue: "UPI Payment", expenseAmount: "-₹640.00 • Success",
      rewardValue: "Team Reward", rewardAmount: "+₹420.00 • Success",
      transferValue: "Bank Transfer", transferAmount: "Completed • Success"
    },
    {
      balanceLabel: "Available", balanceValue: "+₹12,450", balanceNote: "Ready to use",
      paymentLabel: "New Member", paymentValue: "Joined Team", paymentNote: "Priya Sharma",
      rewardValue: "+₹1,250 Reward", rewardNote: "Growth milestone",
      securityValue: "Bank-Level Secure", securityNote: "Protected now",
      incomeValue: "Commission", incomeAmount: "+₹1,850.00 • Success",
      expenseValue: "Card Payment", expenseAmount: "-₹89.50 • Success",
      rewardValue: "Growth Bonus", rewardAmount: "+₹1,250.00 • Success",
      transferValue: "Card Settlement", transferAmount: "Completed • Success"
    }
  ];

  let stateIndex = 0;
  const update = () => {
    if (document.body.classList.contains("live-data-disabled")) return;
    const state = states[stateIndex];
    const values = {
      "balance-label": state.balanceLabel,
      "balance-value": state.balanceValue,
      "balance-note": state.balanceNote,
      "payment-label": state.paymentLabel,
      "payment-value": state.paymentValue,
      "payment-note": state.paymentNote,
      "reward-value": state.rewardValue,
      "reward-note": state.rewardNote,
      "security-value": state.securityValue,
      "security-note": state.securityNote
    };

    Object.entries(values).forEach(([key, value]) => {
      document.querySelectorAll(`[data-live-card="${key}"]`).forEach((element) => {
        element.textContent = value;
      });
    });

    const income = document.querySelector('[data-live-card="income"]');
    const expense = document.querySelector('[data-live-card="expense"]');
    if (income) income.querySelector("strong").textContent = state.incomeValue;
    if (income) income.querySelector("small").textContent = state.incomeAmount;
    if (expense) expense.querySelector("strong").textContent = state.expenseValue;
    if (expense) expense.querySelector("small").textContent = state.expenseAmount;
    const reward = document.querySelector('[data-live-card="reward"]');
    const transfer = document.querySelector('[data-live-card="transfer"]');
    if (reward) reward.querySelector("strong").textContent = state.rewardValue;
    if (reward) reward.querySelector("small").textContent = state.rewardAmount;
    if (transfer) transfer.querySelector("strong").textContent = state.transferValue;
    if (transfer) transfer.querySelector("small").textContent = state.transferAmount;

    stateIndex = (stateIndex + 1) % states.length;
  };

  window.setInterval(update, 3000);
}

function startBalanceGrowth() {
  const balanceElement = document.querySelector("[data-money-balance]");
  const notificationValue = document.querySelector("[data-money-notification-value]");
  const notificationNote = document.querySelector("[data-money-notification-note]");
  const notificationCard = document.querySelector(".card-balance");
  if (!balanceElement || !notificationValue || !notificationNote) return;

  let balance = 40000;

  const addMoney = () => {
    if (document.body.classList.contains("live-data-disabled")) return;
    const received = Math.floor(60 + Math.random() * 141);
    balance += received;
    balanceElement.textContent = `₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    notificationValue.textContent = `+₹${received.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    notificationNote.textContent = "Received just now • Success";

    if (notificationCard) {
      notificationCard.classList.remove("money-received-pulse");
      window.requestAnimationFrame(() => notificationCard.classList.add("money-received-pulse"));
    }
  };

  window.setInterval(addMoney, 5000);
}

function startScrollStory() {
  const story = document.querySelector("[data-scroll-story]");
  if (!story) return;
  const slides = [...story.querySelectorAll(".story-slide")];
  const progress = [...story.querySelectorAll(".story-progress span")];
  let current = 0;
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const updateFromScroll = () => {
    const rect = story.getBoundingClientRect();
    const maxScroll = Math.max(1, story.offsetHeight - window.innerHeight);
    const scrollProgress = Math.max(0, Math.min(1, -rect.top / maxScroll));
    const next = Math.min(slides.length - 1, Math.floor(scrollProgress * slides.length));
    if (next === current && slides[current]?.classList.contains("active")) return;
    slides.forEach((slide, index) => slide.classList.toggle("active", index === next));
    progress.forEach((item, index) => item.classList.toggle("active", index === next));
    current = next;
    updateSceneTilt();
  };

  const updateSceneTilt = () => {
    pointerFrame = 0;
    const rotateX = pointerY * -7;
    const rotateY = pointerX * 9;
    story.querySelectorAll(".story-art").forEach((art, index) => {
      const depth = index === current ? 1 : 0.25;
      art.style.transform = `rotate(5deg) rotateX(${rotateX * depth}deg) rotateY(${rotateY * depth}deg) translateZ(${index === current ? 28 : 0}px)`;
    });
  };

  window.addEventListener("scroll", updateFromScroll, { passive: true });
  updateFromScroll();

  const scene = document.querySelector("[data-story-scene]");
  if (!scene) return;
  scene.addEventListener("pointermove", (event) => {
    const rect = scene.getBoundingClientRect();
    pointerX = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    pointerY = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(updateSceneTilt);
  }, { passive: true });
  scene.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    if (!pointerFrame) pointerFrame = window.requestAnimationFrame(updateSceneTilt);
  }, { passive: true });
}

function renderConfiguredLinks() {
  const config = typeof CONFIG !== "undefined" ? CONFIG : {};
  const links = config.links || {};
  const icons = {
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.5 3.5-3.2 15.1c-.2 1.1-.8 1.4-1.6.9l-4.4-3.2-2.1 2c-.2.2-.4.4-.8.4l.3-4.5 8.2-7.4c.4-.3-.1-.5-.6-.2L7.2 12.8l-4.3-1.3c-.9-.3-.9-.9.2-1.3L20 3.1c.8-.3 1.5.2 1.5.4Z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 21v-7h2.8l.4-3h-3.2V9.1c0-.9.3-1.5 1.6-1.5h1.8V4.9c-.3 0-1.4-.1-2.6-.1-2.6 0-4.3 1.6-4.3 4.4V11H8.2v3H11v7h3.5Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.8" r="1.1"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2C1.9 8.9 1.9 12 1.9 12s0 3.1.5 4.8a2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2c.5-1.7.5-4.8.5-4.8s0-3.1-.5-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8.5H3V21h3.5V8.5ZM4.8 3A2.1 2.1 0 1 0 4.8 7.2 2.1 2.1 0 0 0 4.8 3ZM21 13.8c0-3.8-2-5.6-4.7-5.6-2.2 0-3.1 1.2-3.6 2v-1.7H9.2V21h3.5v-6.2c0-1.6.3-3.2 2.3-3.2 1.9 0 1.9 1.8 1.9 3.3V21H21v-7.2Z"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 3H22l-6.8 7.8L23 21h-6.1l-4.8-6.2L6.7 21H3.6l7.2-8.3L3 3h6.2l4.3 5.7L18.9 3Zm-1.1 15.6h1.7L8.3 5.3H6.5l11.3 13.3Z"/></svg>'
  };
  const definitions = [
    { id: "telegram", label: "Telegram", icon: icons.telegram, url: links.telegramUrl || config.telegramUrl, color: "#229ed9" },
    { id: "live-chat", label: "Live Chat", icon: "💬", url: links.liveChatUrl || config.liveChatUrl, color: "#1769e0" },
    { id: "support", label: "Support", icon: "?", url: links.supportUrl || config.supportUrl, color: "#0f766e" },
    { id: "facebook", label: "Facebook", icon: icons.facebook, url: links.facebookUrl, color: "#1877f2" },
    { id: "instagram", label: "Instagram", icon: icons.instagram, url: links.instagramUrl, color: "#d946ef" },
    { id: "youtube", label: "YouTube", icon: icons.youtube, url: links.youtubeUrl, color: "#ef4444" },
    { id: "linkedin", label: "LinkedIn", icon: icons.linkedin, url: links.linkedinUrl, color: "#0a66c2" },
    { id: "x", label: "X", icon: icons.x, url: links.xUrl, color: "#111827" }
  ];
  const visible = definitions.filter((item) => item.url && item.url !== "#" && !item.url.includes("YOUR_") && !item.url.includes("your-"));
  const supportMenu = document.querySelector(".support-menu");
  if (supportMenu) {
    supportMenu.innerHTML = visible.length ? visible.map((item) => `<a class="support-menu-link" href="${item.url}" target="_blank" rel="noopener noreferrer"><span>${item.icon}</span>${item.label}</a>`).join("") : '<span class="support-menu-empty">No support channels configured</span>';
  }
  let container = document.querySelector(".configured-links");
  if (!container) {
    container = document.createElement("div");
    container.className = "configured-links";
    const footer = document.querySelector(".site-footer");
    if (footer) footer.appendChild(container);
  }
  container.innerHTML = visible.length ? `<div class="configured-links-inner"><strong>Connect with us</strong><div class="configured-links-list">${visible.map((item) => `<a class="configured-link" href="${item.url}" target="_blank" rel="noopener noreferrer"><span class="configured-link-icon" style="background:${item.color}">${item.icon}</span><span>${item.label}</span></a>`).join("")}</div></div>` : "";
}

function applyConfiguredImages() {
  const images = (typeof CONFIG !== "undefined" && CONFIG.images) || {};
  const targets = {
    heroImage: ".phone-shell",
    backgroundImage: ".atm-photo.large",
    securityImage: ".security-visual",
    rewardsImage: ".rewards",
    storyImage1: '[data-image-slot="storyImage1"]',
    storyImage2: '[data-image-slot="storyImage2"]',
    storyImage3: '[data-image-slot="storyImage3"]',
    storyImage4: '[data-image-slot="storyImage4"]',
    storyImage5: '[data-image-slot="storyImage5"]',
    storyImage6: '[data-image-slot="storyImage6"]'
  };
  Object.entries(targets).forEach(([slot, selector]) => {
    const url = images[slot];
    if (!url) return;
    document.querySelectorAll(selector).forEach((element) => {
      element.style.backgroundImage = `url("${url}")`;
      element.style.backgroundSize = "cover";
      element.style.backgroundPosition = "center";
    });
  });
}
