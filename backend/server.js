const express = require("express");
const path = require("node:path");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("node:fs");
const sharp = require("sharp");
const db = require("./db");

const app = express();
const port = Number(process.env.PORT || 8000);
const sessions = new Map();
const sessionsFile = path.join(__dirname, "data", "admin-sessions.json");
const projectDir = path.join(__dirname, "..", "project");
const upload = multer({
  dest: path.join(db.uploadsDir, "tmp"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, /^(image\/(png|jpeg|webp|svg\+xml))$/.test(file.mimetype))
});
const logoUpload = multer({
  dest: path.join(db.uploadsDir, "tmp"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, /^(image\/(png|jpeg|webp|svg\+xml))$/.test(file.mimetype))
});

function sessionKey(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function loadSessions() {
  try {
    const saved = JSON.parse(fs.readFileSync(sessionsFile, "utf8"));
    for (const [key, session] of Object.entries(saved)) {
      if (session?.expires > Date.now()) sessions.set(key, session);
    }
  } catch {
    // The session file is optional on first start.
  }
}
function saveSessions() {
  fs.mkdirSync(path.dirname(sessionsFile), { recursive: true });
  const saved = Object.fromEntries([...sessions].filter(([, session]) => session.expires > Date.now()));
  fs.writeFileSync(sessionsFile, JSON.stringify(saved, null, 2));
}
loadSessions();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(db.uploadsDir));
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "IndreamPay" }));

function safePublicConfig(config) {
  const result = db.clone(config);
  delete result.ctas;
  return result;
}
function removeLogoAsset(url, keepUrl = "") {
  if (!url || url === keepUrl || !url.startsWith("/uploads/logos/")) return;
  const target = path.join(db.uploadsDir, "logos", path.basename(url));
  if (fs.existsSync(target)) fs.unlinkSync(target);
}
function requireAdmin(req, res, next) {
  const token = req.headers.cookie?.match(/admin_session=([^;]+)/)?.[1];
  const session = token && sessions.get(sessionKey(token));
  if (!session || session.expires < Date.now()) {
    if (req.accepts("html") && !req.originalUrl.startsWith("/api/")) return res.redirect("/admin/login.html");
    return res.status(401).json({ error: "Authentication required" });
  }
  req.admin = session;
  next();
}
function patchRoute(name, action) {
  return (req, res) => {
    const data = db.updateDraft({ [name]: req.body }, req.admin.email, action);
    res.json({ data });
  };
}

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  const data = db.read();
  if (!email || !password || data.admin.status !== "ACTIVE" || data.admin.email.toLowerCase() !== String(email).toLowerCase() || !bcrypt.compareSync(password, data.admin.passwordHash)) return res.status(401).json({ error: "Invalid email or password" });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionKey(token), { email: data.admin.email, role: data.admin.role, expires: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  saveSessions();
  res.setHeader("Set-Cookie", `admin_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
  res.json({ ok: true, admin: { email: data.admin.email, role: data.admin.role } });
});
app.post("/api/admin/logout", requireAdmin, (req, res) => { const token = req.headers.cookie.match(/admin_session=([^;]+)/)?.[1]; sessions.delete(sessionKey(token)); saveSessions(); res.setHeader("Set-Cookie", "admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"); res.json({ ok: true }); });
app.get("/api/admin/me", requireAdmin, (req, res) => res.json({ admin: req.admin }));
app.get("/api/admin/config", requireAdmin, (req, res) => { const data = db.read(); res.json({ draft: data.draft, published: data.published }); });
for (const key of ["settings", "branding", "links", "hero", "theme", "sections", "socials", "faq", "footer", "nav", "ctas", "experience"]) {
  app.get(`/api/admin/${key}`, requireAdmin, (req, res) => res.json({ data: db.read().draft[key] }));
  app.put(`/api/admin/${key}`, requireAdmin, patchRoute(key, `Updated ${key}`));
}
app.post("/api/admin/publish", requireAdmin, (req, res) => { const data = db.read(); data.published = db.clone(data.draft); data.activity.unshift({ id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: new Date().toISOString(), action: "Published website configuration", admin: req.admin.email, status: "Success", snapshot: db.clone(data.published) }); db.write(data); res.json({ ok: true, published: data.published }); });
app.post("/api/admin/reset", requireAdmin, (req, res) => { const data = db.read(); data.draft = db.clone(data.published); data.activity.unshift({ id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: new Date().toISOString(), action: "Reset draft to published", admin: req.admin.email, status: "Success" }); db.write(data); res.json({ ok: true, draft: data.draft }); });
app.get("/api/admin/activity", requireAdmin, (req, res) => res.json({ data: db.read().activity.map((entry, index) => ({ ...entry, id: entry.id || `legacy-${index}` })) }));
app.delete("/api/admin/activity/:id", requireAdmin, (req, res) => { const data = db.read(); const index = data.activity.findIndex((entry, position) => (entry.id || `legacy-${position}`) === req.params.id); if (index < 0) return res.status(404).json({ error: "Activity entry not found" }); data.activity.splice(index, 1); db.write(data); res.json({ ok: true }); });
app.post("/api/admin/activity/:id/restore", requireAdmin, (req, res) => { const data = db.read(); const entry = data.activity.find((item, index) => (item.id || `legacy-${index}`) === req.params.id); if (!entry?.snapshot) return res.status(400).json({ error: "This activity entry has no website snapshot" }); data.published = db.clone(entry.snapshot); data.draft = db.clone(entry.snapshot); data.activity.unshift({ id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: new Date().toISOString(), action: `Restored website from ${entry.action}`, admin: req.admin.email, status: "Success", snapshot: db.clone(data.published) }); db.write(data); res.json({ ok: true, published: data.published }); });
app.post("/api/admin/logo/suggestions", requireAdmin, async (req, res) => {
  const { logoText, logoMark, style } = req.body || {};
  if (!logoText && !logoMark) return res.status(400).json({ error: "Nhập tên hoặc ký hiệu logo trước" });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Chưa cấu hình GEMINI_API_KEY trên server" });
  const models = [process.env.GEMINI_MODEL || "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"].filter((model, index, list) => list.indexOf(model) === index);
  const prompt = `Bạn là chuyên gia thiết kế thương hiệu. Hãy đề xuất 4 ý tưởng logo hiện đại cho tên ${logoText || "thương hiệu"}, ký hiệu ${logoMark || "chưa có"}. Phong cách: ${style || "premium, rõ nét, dễ nhận diện"}. Trả về JSON hợp lệ dạng [{"name":"...","concept":"...","prompt":"...","colors":["#000000"]}] và không thêm markdown.`;
  try {
    let lastError = "Gemini không khả dụng";
    for (const model of models) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      if (!response.ok) { lastError = `Gemini ${model}: ${response.status}`; continue; }
      const payload = await response.json();
      const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || "[]";
      const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const jsonStart = jsonText.indexOf("[");
      const jsonEnd = jsonText.lastIndexOf("]");
      const suggestions = JSON.parse(jsonStart >= 0 && jsonEnd > jsonStart ? jsonText.slice(jsonStart, jsonEnd + 1) : jsonText);
      return res.json({ model, suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 4) : [] });
    }
    return res.json({ source: "fallback", warning: lastError, suggestions: [
      { name: "Nova Gradient", concept: "Ký hiệu chữ lồng trong khối gradient xanh ngọc, rõ nét trên mọi kích thước.", colors: ["#1769e0", "#22c7a0"] },
      { name: "Monogram Premium", concept: "Monogram tối giản với khoảng trắng rộng, phù hợp thương hiệu tài chính cao cấp.", colors: ["#122033", "#d7a84b"] },
      { name: "Orbit Mark", concept: "Biểu tượng vòng quỹ đạo tạo cảm giác công nghệ, chuyển động và tin cậy.", colors: ["#5038d8", "#ec4899"] },
      { name: "Clear Shield", concept: "Ký hiệu khiên mềm kết hợp chữ cái đầu, nhấn mạnh bảo mật và an tâm.", colors: ["#0f766e", "#84cc16"] }
    ] });
  } catch (error) {
    res.status(502).json({ error: "Gemini không trả về được gợi ý logo", detail: error.message });
  }
});
app.post("/api/admin/logo/generate", requireAdmin, (req, res) => {
  const { logoText = "Brand", logoMark = "B", colors = [] } = req.body || {};
  const safeText = String(logoText).replace(/[&<>\"']/g, "");
  const safeMark = String(logoMark).replace(/[&<>\"']/g, "").slice(0, 3) || "B";
  const primary = /^#[0-9a-f]{6}$/i.test(colors[0]) ? colors[0] : "#1769e0";
  const secondary = /^#[0-9a-f]{6}$/i.test(colors[1]) ? colors[1] : "#22c7a0";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420" viewBox="0 0 1200 420"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs><rect width="420" height="420" rx="96" fill="url(#g)"/><text x="210" y="270" text-anchor="middle" font-family="Arial,sans-serif" font-size="190" font-weight="800" fill="white">${safeMark}</text><text x="500" y="250" font-family="Arial,sans-serif" font-size="96" font-weight="700" fill="#122033">${safeText}</text></svg>`;
  const fileName = `${Date.now()}-ai-logo.svg`;
  fs.writeFileSync(path.join(db.uploadsDir, "logos", fileName), svg, "utf8");
  const url = `/uploads/logos/${fileName}`;
  db.updateDraft({ branding: { ...(db.read().draft.branding || {}), logoUrl: url, logoMark: safeMark, logoText: safeText } }, req.admin.email, "Generated logo from selected idea");
  res.json({ url, logoMark: safeMark, logoText: safeText });
});
app.post("/api/admin/logo/upload", requireAdmin, logoUpload.single("logo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Hãy chọn file logo PNG, JPG, WEBP hoặc SVG" });
  try {
    if (req.file.mimetype === "image/svg+xml") {
      const svgName = `${Date.now()}-logo.svg`;
      const svgTarget = path.join(db.uploadsDir, "logos", svgName);
      fs.renameSync(req.file.path, svgTarget);
      const url = `/uploads/logos/${svgName}`;
      const currentData = db.read();
      const oldUrl = currentData.draft.branding?.logoUrl;
      db.updateDraft({ branding: { ...(db.read().draft.branding || {}), logoUrl: url } }, req.admin.email, "Uploaded logo");
      removeLogoAsset(oldUrl, currentData.published.branding?.logoUrl);
      return res.json({ url, sharpened: false });
    }
    const safeName = `${Date.now()}-logo.webp`;
    const target = path.join(db.uploadsDir, "logos", safeName);
    await sharp(req.file.path).resize({ width: 1200, height: 1200, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).sharpen({ sigma: 1.2 }).webp({ quality: 96 }).toFile(target);
    fs.unlinkSync(req.file.path);
    const url = `/uploads/logos/${safeName}`;
    const currentData = db.read();
    const oldUrl = currentData.draft.branding?.logoUrl;
    db.updateDraft({ branding: { ...(db.read().draft.branding || {}), logoUrl: url } }, req.admin.email, "Uploaded and sharpened logo");
    removeLogoAsset(oldUrl, currentData.published.branding?.logoUrl);
    res.json({ url, sharpened: true });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(422).json({ error: "Không thể xử lý file logo", detail: error.message });
  }
});
app.post("/api/admin/logo/mark-upload", requireAdmin, logoUpload.single("mark"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Hãy chọn file ký hiệu logo PNG, JPG, WEBP hoặc SVG" });
  try {
    const extension = req.file.mimetype === "image/svg+xml" ? "svg" : "webp";
    const fileName = `${Date.now()}-logo-mark.${extension}`;
    const target = path.join(db.uploadsDir, "logos", fileName);
    if (extension === "svg") fs.renameSync(req.file.path, target);
    else await sharp(req.file.path).resize({ width: 600, height: 600, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).sharpen({ sigma: 1.3 }).webp({ quality: 96 }).toFile(target);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    const url = `/uploads/logos/${fileName}`;
    const currentData = db.read();
    const oldUrl = currentData.draft.branding?.logoMarkUrl;
    db.updateDraft({ branding: { ...(db.read().draft.branding || {}), logoMarkUrl: url } }, req.admin.email, "Uploaded and sharpened logo mark");
    removeLogoAsset(oldUrl, currentData.published.branding?.logoMarkUrl);
    res.json({ url, sharpened: extension !== "svg" });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(422).json({ error: "Không thể xử lý file ký hiệu logo", detail: error.message });
  }
});
app.delete("/api/admin/logo/:kind", requireAdmin, (req, res) => { const field = req.params.kind === "mark" ? "logoMarkUrl" : req.params.kind === "logo" ? "logoUrl" : null; if (!field) return res.status(400).json({ error: "Invalid logo asset" }); const data = db.read(); const urls = new Set([data.draft.branding?.[field], data.published.branding?.[field]].filter(Boolean)); urls.forEach((url) => removeLogoAsset(url)); data.draft.branding = { ...(data.draft.branding || {}) }; data.published.branding = { ...(data.published.branding || {}) }; delete data.draft.branding[field]; delete data.published.branding[field]; data.activity.unshift({ id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: new Date().toISOString(), action: `Deleted ${field} from draft and published website`, admin: req.admin.email, status: "Success" }); db.write(data); res.json({ ok: true, field }); });
app.put("/api/admin/images", requireAdmin, (req, res) => { const images = req.body?.images; if (!images || typeof images !== "object") return res.status(400).json({ error: "Images object required" }); const data = db.updateDraft({ images }, req.admin.email, "Restored initial images"); res.json({ data: data.images || {} }); });
app.post("/api/admin/images", requireAdmin, upload.single("image"), (req, res) => { if (!req.file) return res.status(400).json({ error: "Valid image required" }); const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "")}`; const target = path.join(db.uploadsDir, "images", safeName); require("node:fs").renameSync(req.file.path, target); const url = `/uploads/images/${safeName}`; db.updateDraft({ images: { ...(db.read().draft.images || {}), [req.body.slot || "heroImage"]: url } }, req.admin.email, "Uploaded image"); res.json({ url }); });
app.delete("/api/admin/images/:slot", requireAdmin, (req, res) => { const data = db.read(); const images = { ...(data.draft.images || {}) }; const oldUrl = images[req.params.slot]; if (oldUrl) { const filePath = path.join(__dirname, oldUrl.replace(/^\/uploads\//, "uploads\\")); if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } delete images[req.params.slot]; db.updateDraft({ images }, req.admin.email, `Deleted image ${req.params.slot}`); res.json({ ok: true, slot: req.params.slot }); });

app.get("/api/public/config", (req, res) => { const data = db.read(); if (req.query.preview === "draft") { const token = req.headers.cookie?.match(/admin_session=([^;]+)/)?.[1]; const session = token && sessions.get(token); if (!session || session.expires < Date.now()) return res.status(401).json({ error: "Authentication required" }); return res.json(safePublicConfig(data.draft)); } res.json(safePublicConfig(data.published)); });
app.get("/api/public/:key", (req, res) => { const data = db.read().published[req.params.key]; if (data === undefined) return res.status(404).json({ error: "Not found" }); res.json({ data }); });
app.use(["/admin/dashboard.html", "/admin/settings.html", "/admin/branding.html", "/admin/links.html", "/admin/hero.html", "/admin/images.html", "/admin/experience.html", "/admin/socials.html", "/admin/theme.html", "/admin/sections.html", "/admin/faq.html", "/admin/activity.html", "/admin/preview.html"], requireAdmin);
app.use("/admin", express.static(path.join(projectDir, "admin")));
app.use("/project", express.static(projectDir));
app.use(express.static(projectDir));
app.get("/admin/*splat", (_req, res) => res.sendFile(path.join(projectDir, "admin", "dashboard.html")));
app.listen(port, () => console.log(`NovaPay server running at http://localhost:${port}`));
