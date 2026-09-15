const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(dataDir, "uploads"));
const dbFile = path.join(dataDir, "site.json");
const bundledDbFile = path.join(__dirname, "data", "site.json");

const defaults = {
  settings: {
    websiteName: "NovaPay",
    websiteDescription: "A smarter financial experience for everyday money.",
    browserTitle: "NovaPay | Smarter money. Simpler everyday.",
    metaDescription: "Everything you need to manage your money in one simple experience.",
    contactEmail: "hello@example.com",
    supportEmail: "support@example.com"
  },
  branding: { logoUrl: "", faviconUrl: "", logoMark: "N", logoMarkUrl: "", logoText: "NovaPay", logoFont: "modern" },
  links: {
    telegramUrl: "https://t.me/YOUR_TELEGRAM",
    liveChatUrl: "https://your-live-chat.com",
    supportUrl: "https://your-support.com",
    facebookUrl: "", instagramUrl: "", youtubeUrl: "", linkedinUrl: "", xUrl: ""
  },
  hero: {
    badge: "Smart money, made simple",
    title: "Smarter money. Simpler everyday.",
    subtitle: "Everything you need to manage your money in one simple and powerful experience.",
    primaryButtonText: "Get Started",
    primaryButtonLink: "telegram",
    secondaryButtonText: "Live Chat",
    secondaryButtonLink: "live-chat",
    imageUrl: "",
    backgroundUrl: ""
  },
  theme: {
    primary: "#1c73ff", secondary: "#123b9b", accent: "#2ecf9d",
    background: "#f6f8ff", text: "#101828", button: "#1c73ff"
  },
  sections: {
    hero: true, features: true, wallet: true, market: true, transactions: true,
    team: true, rewards: true, security: true, testimonials: true, faq: true, finalCta: true
  },
  socials: [
    { id: "telegram", label: "Telegram", key: "telegramUrl", enabled: true, url: "" },
    { id: "facebook", label: "Facebook", key: "facebookUrl", enabled: false, url: "" },
    { id: "instagram", label: "Instagram", key: "instagramUrl", enabled: false, url: "" },
    { id: "x", label: "X", key: "xUrl", enabled: false, url: "" },
    { id: "youtube", label: "YouTube", key: "youtubeUrl", enabled: false, url: "" },
    { id: "linkedin", label: "LinkedIn", key: "linkedinUrl", enabled: false, url: "" }
  ],
  faq: [
    { id: "faq-1", question: "How quickly can I get started?", answer: "Create your account, connect your preferred support channel, and start exploring in minutes.", enabled: true, order: 1 },
    { id: "faq-2", question: "Is support available when I need it?", answer: "Yes. Our support channels are designed to be available around the clock.", enabled: true, order: 2 }
  ],
  footer: { description: "A clearer, more confident way to manage everyday money.", copyright: "All rights reserved.", links: [] },
  nav: [
    { label: "Features", url: "#features", enabled: true }, { label: "Wallet", url: "#wallet", enabled: true },
    { label: "Rewards", url: "#rewards", enabled: true }, { label: "Security", url: "#security", enabled: true },
    { label: "Support", url: "#support", enabled: true }
  ],
  ctas: [
    { id: "telegram", text: "Telegram", type: "external", target: "telegramUrl", enabled: true },
    { id: "live-chat", text: "Live Chat", type: "external", target: "liveChatUrl", enabled: true },
    { id: "support", text: "Help Center", type: "external", target: "supportUrl", enabled: true }
  ],
  experience: {
    animationsEnabled: true,
    marqueesEnabled: true,
    parallaxEnabled: true,
    revealEnabled: true,
    liveDataEnabled: true,
    marqueeSpeed: 1
  }
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function ensureData() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, "logos"), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, "images"), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, "favicon"), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, "tmp"), { recursive: true });
  if (!fs.existsSync(dbFile)) {
    if (dbFile !== bundledDbFile && fs.existsSync(bundledDbFile)) {
      fs.copyFileSync(bundledDbFile, dbFile);
      return;
    }
    const adminEmail = process.env.ADMIN_EMAIL || "admin1";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";
    const now = new Date().toISOString();
    fs.writeFileSync(dbFile, JSON.stringify({
      published: clone(defaults), draft: clone(defaults), admin: { id: "admin-1", email: adminEmail, passwordHash: bcrypt.hashSync(adminPassword, 12), role: "ADMIN", status: "ACTIVE", createdAt: now, updatedAt: now }, activity: []
    }, null, 2));
  }
}
function read() {
  ensureData();
  const data = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  data.published = merge(clone(defaults), data.published || {});
  data.draft = merge(clone(defaults), data.draft || {});
  const defaultNav = defaults.nav;
  [data.published, data.draft].forEach((config) => {
    if (Array.isArray(config.nav) && config.nav.length === defaultNav.length && config.nav[0]?.label === "Home") {
      config.nav = defaultNav.map((item, index) => ({ ...item, enabled: config.nav[index]?.enabled !== false }));
    }
  });
  data.activity = Array.isArray(data.activity) ? data.activity : [];
  return data;
}
function write(data) { fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)); }
function updateDraft(patch, adminEmail, action = "Updated configuration") {
  const data = read();
  data.draft = merge(data.draft, patch);
  data.activity.unshift({ id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: new Date().toISOString(), action, admin: adminEmail, status: "Success" });
  write(data);
  return data.draft;
}
function merge(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object") base[key] = merge(base[key], value);
    else base[key] = value;
  }
  return base;
}
module.exports = { defaults, read, write, updateDraft, uploadsDir, clone };
