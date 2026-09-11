async function initializeImageManager() {
  const content = document.querySelector(".admin-content");
  if (!content) return;

  const style = document.createElement("style");
  style.textContent = ".image-manager{margin-top:18px}.image-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.image-item{border:1px solid var(--admin-line);border-radius:12px;padding:14px;background:#fbfcfe}.image-item img{width:100%;height:150px;object-fit:contain;border-radius:8px;background:#eef3f8}.image-item h3{font:600 1rem 'Space Grotesk';margin:10px 0}.image-actions{display:flex;gap:8px;margin-top:10px}.image-actions button{flex:1}.upload-preview{display:none;margin-top:14px;padding:10px;border:1px dashed var(--admin-blue);border-radius:12px}.upload-preview.visible{display:block}.upload-preview img{width:100%;height:180px;object-fit:contain;border-radius:8px;background:#eef3f8}@media(max-width:650px){.image-list{grid-template-columns:1fr}}";
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.className = "admin-card image-manager";
  panel.innerHTML = "<h2>Ảnh đã tải</h2><p class=\"stat-label\">Ảnh sẽ thay đúng vị trí sau khi bấm đăng lên website.</p><div id=\"imageList\" class=\"image-list\"></div>";
  content.appendChild(panel);

  const list = panel.querySelector("#imageList");
  let initialImages = null;
  const restoreImages = document.createElement("button");
  restoreImages.type = "button";
  restoreImages.className = "admin-btn secondary";
  restoreImages.textContent = "Khôi phục ảnh ban đầu";
  panel.querySelector("h2")?.after(restoreImages);
  const labels = {
    heroImage: "Hero / Dashboard",
    backgroundImage: "Nền ATM",
    securityImage: "Security",
    rewardsImage: "Rewards",
    storyImage1: "Story 1 / Loans & Credit",
    storyImage2: "Story 2 / Invest",
    storyImage3: "Story 3 / Cards",
    storyImage4: "Story 4 / Payments",
    storyImage5: "Story 5 / Early Payday",
    storyImage6: "Story 6 / Support"
  };

  const notify = (message, error = false) => {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = error ? "#a33b3b" : "#13243b";
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2600);
  };

  async function api(url, options) {
    const response = await fetch(url, { credentials: "same-origin", ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Yêu cầu thất bại");
    return body;
  }

  async function render() {
    const result = await api("/api/admin/config");
    const images = result.draft.images || {};
    if (!initialImages) initialImages = JSON.parse(JSON.stringify(images));
    list.innerHTML = Object.keys(labels).map((slot) => images[slot]
      ? `<article class="image-item"><img src="${images[slot]}" alt="${labels[slot]}"><h3>${labels[slot]}</h3><div class="image-actions"><button class="admin-btn danger" data-delete="${slot}" type="button">Xóa ảnh</button><button class="admin-btn" data-publish="${slot}" type="button">Đăng lên web</button></div></article>`
      : `<article class="image-item"><h3>${labels[slot]}</h3><p class="stat-label">Chưa có ảnh</p></article>`
    ).join("");

    list.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const slot = button.dataset.delete;
        if (!confirm(`Xóa ảnh ${labels[slot]}?`)) return;
        try {
          await api(`/api/admin/images/${slot}`, { method: "DELETE" });
          notify("Đã xóa ảnh khỏi bản nháp. Hãy xem trước rồi xuất bản.");
          await render();
        } catch (error) {
          notify(error.message, true);
        }
      });
    });

    list.querySelectorAll("[data-publish]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Xác nhận đăng ảnh này lên website?")) return;
        try {
          await api("/api/admin/publish", { method: "POST" });
          notify("Ảnh đã được cập nhật lên website");
        } catch (error) {
          notify(error.message, true);
        }
      });
    });
  }

  restoreImages.addEventListener("click", async () => { if (!confirm("Khôi phục danh sách ảnh ban đầu?")) return; try { await api("/api/admin/images", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: initialImages || {} }) }); notify("Đã khôi phục ảnh ban đầu vào bản nháp"); await render(); } catch (error) { notify(error.message, true); } });

  const oldForm = document.querySelector("#imageForm");
  const form = oldForm ? oldForm.cloneNode(true) : null;
  if (oldForm && form) oldForm.replaceWith(form);

  const slotSelect = form?.querySelector('select[name="slot"]');
  const imagePreviewLink = document.createElement("button");
  imagePreviewLink.className = "admin-btn secondary";
  imagePreviewLink.type = "button";
  imagePreviewLink.textContent = "Xem trước vị trí ảnh";
  form?.querySelector(".admin-actions")?.appendChild(imagePreviewLink);
  const imageSections = { heroImage: "top", backgroundImage: "market", securityImage: "security", rewardsImage: "rewards", storyImage1: "story", storyImage2: "story", storyImage3: "story", storyImage4: "story", storyImage5: "story", storyImage6: "story" };
  const updateImagePreviewLink = () => { imagePreviewLink.onclick = () => window.openInlineDraftPreview?.(imageSections[slotSelect?.value] || "top"); };
  slotSelect?.addEventListener("change", updateImagePreviewLink);
  updateImagePreviewLink();
  const fileInput = form?.querySelector('input[type="file"]');
  const uploadPreview = document.createElement("div");
  uploadPreview.className = "upload-preview";
  uploadPreview.innerHTML = "<strong>Xem trước ảnh mới</strong><img alt=\"Xem trước ảnh\">";
  form?.appendChild(uploadPreview);
  fileInput?.addEventListener("change", () => { const file = fileInput.files?.[0]; if (!file) { uploadPreview.classList.remove("visible"); return; } uploadPreview.querySelector("img").src = URL.createObjectURL(file); uploadPreview.classList.add("visible"); });
  const storySlots = [
    ["storyImage1", "Story 1 / Loans & Credit"],
    ["storyImage2", "Story 2 / Invest"],
    ["storyImage3", "Story 3 / Cards"],
    ["storyImage4", "Story 4 / Payments"],
    ["storyImage5", "Story 5 / Early Payday"],
    ["storyImage6", "Story 6 / Support"]
  ];
  storySlots.forEach(([value, label]) => {
    if (!slotSelect || slotSelect.querySelector(`option[value="${value}"]`)) return;
    slotSelect.appendChild(new Option(label, value));
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/images", { method: "POST", credentials: "same-origin", body: new FormData(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Tải ảnh thất bại");
      notify("Ảnh đã tải lên bản nháp. Hãy xem trước rồi xuất bản.");
      await render();
    } catch (error) {
      notify(error.message, true);
    }
  });

  try {
    await render();
  } catch {
    notify("Không thể tải danh sách ảnh", true);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeImageManager);
} else {
  initializeImageManager();
}
