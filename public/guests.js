document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================================================
     1. ĐỌC CẤU HÌNH CÁ NHÂN HÓA & GIÁ TRỊ DỰ PHÒNG AN TOÀN
     ========================================================= */
  const DEFAULT_CONFIG = {
    couple: {
      groomName: "Ngọc Long",
      groomFullName: "Nguyễn Ngọc Long",
      brideName: "Bùi Loan",
      brideFullName: "Bùi Thị Loan",
      shortTitle: "Long & Loan",
      monogram: "L & L",
      crestSubtitle: "Wedding Invitation",
      heroKicker: "Trân Trọng Báo Tin Lễ Thành Hôn",
      weddingDayOfWeek: "THỨ HAI",
      weddingDateDisplay: "18 . 10 . 2027",
      weddingDateCompact: "18.10.2027",
      weddingIso: "2027-10-18T10:30:00+07:00",
      rsvpDeadline: "10/10/2027",
      heroLocationTagline: "Cùng nhau viết tiếp chương hạnh phúc trọn vẹn nhất",
      heroBgImage: "/photo-placeholder.svg",
      heroFallbackImage: "/photo-placeholder.svg",
      inviteQuote:
        "“Tình yêu đẹp nhất không phải là điểm đến hoàn hảo, mà là hành trình ta chọn nắm tay nhau đi qua mọi mùa nắng mưa.”",
      footerSub: "18 . 10 . 2027 — Forever Begins Here"
    },
    music: {
      youtubeUrl: "",
      src: "/music/asset.d99013564d0c.mp3",
      enableWebAudioFallback: true,
      melodyNotes: [
        523.25, 659.25, 783.99, 659.25,
        493.88, 587.33, 783.99, 587.33,
        440.00, 523.25, 659.25, 523.25,
        349.23, 440.00, 523.25, 440.00,
        392.00, 493.88, 587.33, 493.88,
        523.25, 659.25, 783.99, 1046.50
      ]
    },
    timeline: [],
    events: [],
    gallery: [
      {
        src: "/photo-placeholder.svg",
        caption: "Khoảnh khắc hạnh phúc",
        rotStart: "-5deg",
        rotEnd: "-1.5deg",
        delay: "0.05s",
        fallbackTitle: "Long & Loan",
        fallbackSubtitle: "18.10.2027",
        fallbackColors: ["#722F37", "#C5A880"]
      }
    ],
    bankAccounts: [],
    defaultWishes: []
  };

  const rawConfig = (typeof window !== "undefined" && window.WEDDING_CONFIG) || {};
  const CONFIG = {
    couple: { ...DEFAULT_CONFIG.couple, ...(rawConfig.couple || {}) },
    music: { ...DEFAULT_CONFIG.music, ...(rawConfig.music || {}) },
    timeline: Array.isArray(rawConfig.timeline) && rawConfig.timeline.length ? rawConfig.timeline : DEFAULT_CONFIG.timeline,
    events: Array.isArray(rawConfig.events) && rawConfig.events.length ? rawConfig.events : DEFAULT_CONFIG.events,
    gallery: Array.isArray(rawConfig.gallery) && rawConfig.gallery.length ? rawConfig.gallery : DEFAULT_CONFIG.gallery,
    bankAccounts: Array.isArray(rawConfig.bankAccounts) && rawConfig.bankAccounts.length ? rawConfig.bankAccounts : DEFAULT_CONFIG.bankAccounts,
    defaultWishes: []
  };

  const LOCAL_WISHES_KEY = "wedding_editorial_wishes_v2";
  const LOCAL_RSVP_KEY = "wedding_editorial_rsvp_v2";

  const prefersReducedMotion = () =>
    Boolean(typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function escapeHTML(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeStorageGet(key) {
    try {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, val) {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(key, val);
    } catch {
      // Bỏ qua nếu chế độ ẩn danh chặn localStorage
    }
  }

  /* =========================================================
     2. THAM CHIẾU DOM & TIỆN ÍCH TOAST
     ========================================================= */
  const toastBox = document.getElementById("toastBox");
  let toastTimer = null;

  function showToast(msg) {
    if (!toastBox) return;
    toastBox.textContent = msg;
    toastBox.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastBox.classList.remove("is-visible");
    }, 3200);
  }

  const introOverlay = document.getElementById("introDoorsOverlay");
  const openDoorsTrigger = document.getElementById("openDoorsTrigger");
  const weddingMain = document.getElementById("weddingMain");
  const guestGreeting = document.getElementById("guestGreeting");
  const invitationGuestName = document.getElementById("invitationGuestName");

  const musicEl = document.getElementById("wedding-music");
  const musicToggleBtn = document.getElementById("musicToggleBtn");
  const musicStatusBadge = document.getElementById("musicStatusBadge");

  const timelineContainer = document.getElementById("timelineContainer");
  const timelineAxisFill = document.getElementById("timelineAxisFill");
  const timelineList = document.getElementById("timelineList");

  const eventsGrid = document.getElementById("eventsGrid");
  const polaroidGrid = document.getElementById("polaroidGrid");
  const qrGrid = document.getElementById("qrGrid");

  const mapModal = document.getElementById("mapModal");
  const lightboxModal = document.getElementById("lightboxModal");
  const lightboxStage = document.getElementById("lightboxStage");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxCounter = document.getElementById("lightboxCounter");

  const wishesRefreshBtn = document.getElementById("wishesRefreshBtn");
  const wishesMoreBtn = document.getElementById("wishesMoreBtn");
  const rsvpForm = document.getElementById("rsvpForm");
  const guestWishInput = document.getElementById("guestWish");
  const wishCharCount = document.getElementById("wishCharCount");
  const wishFormFeedback = document.getElementById("wishFormFeedback");
  const btnSubmitWish = document.getElementById("btnSubmitWish");
  const attendanceYesBtn = document.getElementById("attendanceYesBtn");
  const attendanceNoBtn = document.getElementById("attendanceNoBtn");

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el && text !== undefined) el.textContent = text;
  }

  function showFormFeedback(msg) {
    if (!wishFormFeedback) return;
    if (!msg) {
      wishFormFeedback.hidden = true;
      wishFormFeedback.textContent = "";
      return;
    }
    wishFormFeedback.textContent = msg;
    wishFormFeedback.hidden = false;
  }

  /* =========================================================
     3. ÁP DỤNG DỮ LIỆU TỪ WEDDING_CONFIG VÀO GIAO DIỆN
     ========================================================= */
  const c = CONFIG.couple;
  if (typeof document.title === "string") {
    document.title = `${c.groomName} & ${c.brideName} — Thiệp Cưới ${c.weddingDateCompact}`;
  }

  setText("crestSub", c.crestSubtitle);
  setText("crestMonogram", c.monogram);
  setText("crestDate", c.weddingDateDisplay);
  if (introOverlay && introOverlay.setAttribute) {
    introOverlay.setAttribute("aria-label", `Chạm để mở thiệp cưới ${c.groomName} và ${c.brideName}`);
  }

  const heroBgImg = document.getElementById("heroBgImg");
  if (heroBgImg) {
    heroBgImg.src = c.heroBgImage || c.heroFallbackImage;
    heroBgImg.alt = `Ảnh cưới ${c.groomName} và ${c.brideName}`;
    heroBgImg.onerror = function () {
      this.onerror = null;
      if (c.heroFallbackImage && this.src !== c.heroFallbackImage) {
        this.src = c.heroFallbackImage;
      } else {
        this.style.display = "none";
      }
    };
  }

  setText("heroKicker", c.heroKicker);
  setText("heroGroomName", c.groomName);
  setText("heroBrideName", c.brideName);
  setText("heroDayOfWeek", c.weddingDayOfWeek);
  setText("heroDateDisplay", c.weddingDateDisplay);
  setText("heroLocation", c.heroLocationTagline);
  setText("inviteQuote", c.inviteQuote);
  setText(
    "timelineSectionDesc",
    `Bốn cột mốc đáng nhớ trên hành trình của ${c.groomName} & ${c.brideName} — trục vàng đồng tự vẽ dần theo nhịp cuộn trang.`
  );
  setText(
    "gallerySectionDesc",
    `Những khoảnh khắc ngọt ngào lưu giữ tình yêu của ${c.groomName} & ${c.brideName}. Bấm vào từng bức ảnh để xem phóng to.`
  );
  setText(
    "guestbookSectionDesc",
    `Hãy lật từng trang lưu bút và gửi lời chúc phúc kèm pháo giấy tới ${c.groomName} & ${c.brideName}.`
  );
  if (c.rsvpDeadline) {
    setText(
      "rsvpFormSub",
      `Quý vị vui lòng xác nhận tham dự trước ngày ${c.rsvpDeadline} để gia đình chuẩn bị chu đáo nhất.`
    );
  }
  setText("footerNames", `${c.groomName} & ${c.brideName}`);
  setText("footerSub", c.footerSub);

  if (musicEl && CONFIG.music.src && musicEl.getAttribute?.("src") !== CONFIG.music.src) {
    musicEl.src = CONFIG.music.src;
  }

  /* --- Render Ô 03: Timeline 4 mốc --- */
  if (timelineList && CONFIG.timeline.length) {
    timelineList.innerHTML = CONFIG.timeline
      .map((item, idx) => {
        const animNum = item.anim || ((idx % 4) + 1);
        const sideClass = item.side === "right" ? "side-right" : "side-left";
        const heartHTML =
          animNum === 2
            ? `<span class="tl-heart-pop" aria-hidden="true">${escapeHTML(item.heartIcon || "♥")}</span>`
            : "";
        const shimmerHTML =
          animNum === 3 || item.shimmer ? `<div class="tl-shimmer" aria-hidden="true"></div>` : "";
        const titleClass = item.highlightTitle ? "tl-title is-highlight" : "tl-title";
        return (
          `<div class="timeline-row ${sideClass} tl-anim-${animNum}" data-tl-item="${idx + 1}">` +
          `<span class="tl-node"></span>` +
          `<article class="tl-card">` +
          heartHTML +
          shimmerHTML +
          `<span class="tl-date">${escapeHTML(item.date)}</span>` +
          `<h3 class="${titleClass}">${escapeHTML(item.title)}</h3>` +
          `<p class="tl-text">${escapeHTML(item.text)}</p>` +
          `</article>` +
          `</div>`
        );
      })
      .join("");
  }

  /* --- Render Ô 04: Tiệc Cưới & Bản Đồ --- */
  function openMapModal(info) {
    if (!mapModal) return;
    setText("mapModalTitle", info.mapTitle || `${info.tag} — ${info.venue}`);
    setText("mapModalAddress", info.address || "");
    setText("mapModalTime", info.time || "");
    const linkEl = document.getElementById("mapModalLink");
    if (linkEl) linkEl.href = info.mapUrl || "https://maps.google.com";
    mapModal.classList.add("is-open");
    document.body.classList.add("modal-locked");
  }

  function closeMapModal() {
    if (!mapModal) return;
    mapModal.classList.remove("is-open");
    document.body.classList.remove("modal-locked");
  }

  if (eventsGrid && CONFIG.events.length) {
    eventsGrid.innerHTML = "";
    CONFIG.events.forEach((ev) => {
      const box = document.createElement("div");
      box.className = "event-box";
      box.innerHTML =
        `<span class="event-tag">${escapeHTML(ev.tag)}</span>` +
        `<h3 class="event-name">${escapeHTML(ev.name)}</h3>` +
        `<span class="event-time">${escapeHTML(ev.time)}</span>` +
        `<p class="event-venue">${escapeHTML(ev.venue)}</p>` +
        `<p class="event-address">${escapeHTML(ev.address)}</p>`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-outline-gold";
      btn.textContent = "📍 Xem Bản Đồ";
      btn.addEventListener("click", () => openMapModal(ev));
      box.appendChild(btn);
      eventsGrid.appendChild(box);
    });
  }

  const closeMapBtn = document.getElementById("closeMapModal");
  if (closeMapBtn) closeMapBtn.addEventListener("click", closeMapModal);
  if (mapModal) {
    mapModal.addEventListener("click", (e) => {
      if (e.target === mapModal) closeMapModal();
    });
  }

  /* --- Render Ô 05: Album Ảnh Polaroid & Lightbox --- */
  function buildArtFallbackSVG(title, subtitle, colors) {
    const c1 = (colors && colors[0]) || "#722F37";
    const c2 = (colors && colors[1]) || "#C5A880";
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>` +
      `</linearGradient></defs>` +
      `<rect width="400" height="500" fill="url(#g)"/>` +
      `<rect x="20" y="20" width="360" height="460" rx="12" fill="none" stroke="#FAF7F2" stroke-opacity="0.55" stroke-width="1.5"/>` +
      `<circle cx="200" cy="210" r="64" fill="none" stroke="#FAF7F2" stroke-opacity="0.45" stroke-width="1.2"/>` +
      `<text x="200" y="220" text-anchor="middle" fill="#FAF7F2" font-family="Georgia,serif" font-size="32">${escapeHTML(c.monogram)}</text>` +
      `<text x="200" y="330" text-anchor="middle" fill="#FAF7F2" font-family="Georgia,serif" font-style="italic" font-size="22">${escapeHTML(title)}</text>` +
      `<text x="200" y="362" text-anchor="middle" fill="#FAF7F2" fill-opacity="0.82" font-family="sans-serif" font-size="12" letter-spacing="3">${escapeHTML(subtitle)}</text>` +
      `</svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  let currentLightboxIdx = 0;
  const galleryItems = CONFIG.gallery.map((item) => ({
    ...item,
    resolvedSrc: item.src,
    fallbackSvg: buildArtFallbackSVG(
      item.fallbackTitle || item.caption || c.shortTitle,
      item.fallbackSubtitle || c.weddingDateCompact,
      item.fallbackColors
    )
  }));

  function updateLightboxView() {
    if (!galleryItems.length) return;
    const total = galleryItems.length;
    currentLightboxIdx = ((currentLightboxIdx % total) + total) % total;
    const item = galleryItems[currentLightboxIdx];
    if (lightboxImg) {
      lightboxImg.src = item.resolvedSrc || item.src;
      lightboxImg.alt = item.caption || "Ảnh cưới phóng to";
      lightboxImg.onerror = function () {
        this.onerror = null;
        this.src = item.fallbackSvg;
      };
    }
    if (lightboxCaption) lightboxCaption.textContent = item.caption || "";
    if (lightboxCounter) lightboxCounter.textContent = `${currentLightboxIdx + 1} / ${total}`;
  }

  function openLightbox(idx = 0) {
    if (!lightboxModal) return;
    currentLightboxIdx = idx;
    updateLightboxView();
    lightboxModal.classList.add("is-open");
    document.body.classList.add("modal-locked");
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove("is-open");
    document.body.classList.remove("modal-locked");
  }

  function stepLightbox(delta) {
    if (!galleryItems.length) return;
    currentLightboxIdx = (currentLightboxIdx + delta + galleryItems.length) % galleryItems.length;
    updateLightboxView();
  }

  if (polaroidGrid && galleryItems.length) {
    polaroidGrid.innerHTML = "";
    galleryItems.forEach((item, idx) => {
      const fig = document.createElement("figure");
      fig.className = "polaroid-item";
      if (fig.setAttribute) {
        fig.setAttribute("role", "button");
        fig.setAttribute("tabindex", "0");
        fig.setAttribute("aria-label", `Xem ảnh: ${item.caption}`);
      }
      if (fig.style?.setProperty) {
        fig.style.setProperty("--rot-start", item.rotStart || "-5deg");
        fig.style.setProperty("--rot-end", item.rotEnd || "-1.5deg");
        fig.style.setProperty("--delay", item.delay || "0s");
      }

      const wrap = document.createElement("div");
      wrap.className = "polaroid-photo-wrap";

      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.caption;
      img.loading = "lazy";
      img.onerror = function () {
        this.onerror = null;
        item.resolvedSrc = item.fallbackSvg;
        this.src = item.fallbackSvg;
      };
      img.onload = function () {
        item.resolvedSrc = img.currentSrc || img.src;
      };

      const cap = document.createElement("figcaption");
      cap.className = "polaroid-caption";
      cap.textContent = item.caption;

      wrap.appendChild(img);
      fig.appendChild(wrap);
      fig.appendChild(cap);

      fig.addEventListener("click", () => openLightbox(idx));
      fig.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(idx);
        }
      });

      polaroidGrid.appendChild(fig);
    });
  }

  const closeLightboxBtn = document.getElementById("closeLightbox");
  const lightboxPrevBtn = document.getElementById("lightboxPrev");
  const lightboxNextBtn = document.getElementById("lightboxNext");
  if (closeLightboxBtn) closeLightboxBtn.addEventListener("click", closeLightbox);
  if (lightboxPrevBtn) lightboxPrevBtn.addEventListener("click", () => stepLightbox(-1));
  if (lightboxNextBtn) lightboxNextBtn.addEventListener("click", () => stepLightbox(1));
  if (lightboxModal) {
    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }
  if (lightboxStage) {
    let lbTouchX = 0;
    lightboxStage.addEventListener(
      "touchstart",
      (e) => {
        lbTouchX = e.changedTouches?.[0]?.clientX || 0;
      },
      { passive: true }
    );
    lightboxStage.addEventListener(
      "touchend",
      (e) => {
        const dx = (e.changedTouches?.[0]?.clientX || 0) - lbTouchX;
        if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1);
      },
      { passive: true }
    );
  }

  /* --- Render Ô 06: Hộp Mừng Cưới QR & Sao Chép STK --- */
  function buildStylizedQrSVG(accentCorner, label) {
    const tlFill = accentCorner === "top-left" ? "#722F37" : "#2C3639";
    const trFill = accentCorner === "top-right" ? "#722F37" : "#2C3639";
    return (
      `<svg width="152" height="152" viewBox="0 0 120 120" fill="#2C3639" aria-label="${escapeHTML(label)}">` +
      `<rect x="6" y="6" width="32" height="32" rx="4" fill="none" stroke="#2C3639" stroke-width="6"/>` +
      `<rect x="15" y="15" width="14" height="14" rx="2" fill="${tlFill}"/>` +
      `<rect x="82" y="6" width="32" height="32" rx="4" fill="none" stroke="#2C3639" stroke-width="6"/>` +
      `<rect x="91" y="15" width="14" height="14" rx="2" fill="${trFill}"/>` +
      `<rect x="6" y="82" width="32" height="32" rx="4" fill="none" stroke="#2C3639" stroke-width="6"/>` +
      `<rect x="15" y="91" width="14" height="14" rx="2" fill="#2C3639"/>` +
      `<rect x="48" y="10" width="8" height="8"/><rect x="64" y="10" width="8" height="8"/>` +
      `<rect x="56" y="22" width="8" height="8"/><rect x="48" y="34" width="8" height="8"/>` +
      `<rect x="64" y="34" width="8" height="8"/><rect x="10" y="48" width="8" height="8"/>` +
      `<rect x="24" y="48" width="8" height="8"/><rect x="40" y="48" width="8" height="8"/>` +
      `<rect x="55" y="49" width="12" height="12" rx="3" fill="#722F37"/>` +
      `<rect x="76" y="48" width="8" height="8"/><rect x="92" y="48" width="8" height="8"/>` +
      `<rect x="106" y="48" width="8" height="8"/><rect x="16" y="64" width="8" height="8"/>` +
      `<rect x="36" y="64" width="8" height="8"/><rect x="52" y="68" width="8" height="8"/>` +
      `<rect x="68" y="64" width="8" height="8"/><rect x="84" y="64" width="12" height="8"/>` +
      `<rect x="104" y="66" width="8" height="8"/><rect x="48" y="84" width="8" height="12"/>` +
      `<rect x="64" y="82" width="12" height="8"/><rect x="84" y="82" width="8" height="8"/>` +
      `<rect x="98" y="84" width="12" height="12"/><rect x="64" y="100" width="8" height="12"/>` +
      `<rect x="80" y="102" width="12" height="10"/><rect x="100" y="104" width="10" height="8"/>` +
      `</svg>`
    );
  }

  async function copyAccountNumber(text, successMsg) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        showToast(successMsg);
        return;
      } catch {
        // Fallback bên dưới cho trình duyệt nhúng Zalo/Messenger
      }
    }
    try {
      const tempInput = document.createElement("textarea");
      tempInput.value = text;
      tempInput.setAttribute?.("readonly", "");
      tempInput.style.position = "fixed";
      tempInput.style.opacity = "0";
      document.body.appendChild(tempInput);
      tempInput.select?.();
      document.execCommand?.("copy");
      tempInput.remove?.();
      showToast(successMsg);
    } catch {
      showToast("Số tài khoản: " + text);
    }
  }

  if (qrGrid && CONFIG.bankAccounts.length) {
    qrGrid.innerHTML = "";
    CONFIG.bankAccounts.forEach((acc, idx) => {
      const splitClass = acc.side === "right" || idx === 1 ? "qr-split-right" : "qr-split-left";
      const card = document.createElement("div");
      card.className = `qr-card ${splitClass}`;

      const qrMediaHTML = acc.qrImageUrl
        ? `<img src="${escapeHTML(acc.qrImageUrl)}" alt="Mã QR ${escapeHTML(acc.roleTitle)}" loading="lazy" />`
        : buildStylizedQrSVG(acc.qrAccentCorner || (idx === 0 ? "top-left" : "top-right"), `Mã QR ${acc.roleTitle}`);

      card.innerHTML =
        `<span class="event-tag">${escapeHTML(acc.tag)}</span>` +
        `<h3 class="event-name" style="margin-bottom:4px;">${escapeHTML(acc.roleTitle)}</h3>` +
        `<div class="qr-svg-frame">${qrMediaHTML}</div>` +
        `<p class="qr-bank">${escapeHTML(acc.bankName)}</p>` +
        `<p class="qr-acc">${escapeHTML(acc.accountDisplay || acc.accountNumber)}</p>` +
        `<p class="qr-owner">${escapeHTML(acc.accountHolder)}</p>`;

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn-outline-gold";
      copyBtn.textContent = "Sao Chép STK";
      copyBtn.addEventListener("click", () => {
        copyAccountNumber(acc.accountNumber, acc.copySuccessMsg || "Đã sao chép số tài khoản!");
      });
      card.appendChild(copyBtn);
      qrGrid.appendChild(card);
    });
  }

  /* =========================================================
     4. ĐĨA THAN NHẠC NỀN (YOUTUBE LINK / MP3 THẬT / WEB AUDIO FALLBACK)
     ========================================================= */
  let audioCtx = null;
  let isMusicPlaying = false;
  let usingSynthFallback = false;
  let synthInterval = null;
  let noteStep = 0;
  let mp3Failed = false;

  // Hỗ trợ phát nhạc từ link YouTube ẩn (youtube.com/watch?v=..., youtu.be/..., shorts/..., hoặc ID 11 ký tự)
  function extractYouTubeId(input) {
    if (typeof input !== "string") return "";
    const trimmed = input.trim();
    if (!trimmed) return "";
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
    );
    return match ? match[1] : "";
  }

  const youtubeVideoId = extractYouTubeId(CONFIG.music.youtubeUrl);
  let ytPlayer = null;
  let ytReady = false;
  let ytFailed = false;
  let ytPendingPlay = false;

  function initYouTubeMusicPlayer() {
    if (!youtubeVideoId || !document.body || ytPlayer) return;

    const wrap = document.createElement("div");
    wrap.id = "ytMusicPlayerWrap";
    wrap.style.position = "fixed";
    wrap.style.left = "-9999px";
    wrap.style.top = "-9999px";
    wrap.style.width = "1px";
    wrap.style.height = "1px";
    wrap.style.opacity = "0.01";
    wrap.style.pointerEvents = "none";
    wrap.setAttribute?.("aria-hidden", "true");

    const playerHost = document.createElement("div");
    playerHost.id = "ytMusicPlayer";
    wrap.appendChild(playerHost);
    document.body.appendChild(wrap);

    const createPlayer = () => {
      if (ytPlayer || !window.YT || typeof window.YT.Player !== "function") return;
      try {
        ytPlayer = new window.YT.Player("ytMusicPlayer", {
          width: "1",
          height: "1",
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            loop: 1,
            playlist: youtubeVideoId,
            playsinline: 1,
            modestbranding: 1,
            rel: 0
          },
          events: {
            onReady: () => {
              ytReady = true;
              if (ytPendingPlay && typeof ytPlayer.playVideo === "function") {
                try {
                  ytPlayer.unMute?.();
                  ytPlayer.setVolume?.(100);
                  ytPlayer.playVideo();
                } catch {
                  // ignore
                }
              }
            },
            onStateChange: (event) => {
              const states = window.YT?.PlayerState;
              if (!states) return;
              if (event.data === states.PLAYING) {
                updateMusicUI(true);
              } else if (event.data === states.PAUSED) {
                if (!ytPendingPlay) updateMusicUI(false);
              } else if (event.data === states.ENDED) {
                ytPlayer.playVideo?.();
              }
            },
            onError: () => {
              ytFailed = true;
              const shouldFallback = ytPendingPlay || isMusicPlaying;
              ytPendingPlay = false;
              updateMusicUI(false);
              if (shouldFallback) {
                startLocalOrSynthMusic(false);
              }
            }
          }
        });
      } catch {
        ytFailed = true;
      }
    };

    if (window.YT && typeof window.YT.Player === "function") {
      createPlayer();
      return;
    }

    const prevReadyCb = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReadyCb === "function") prevReadyCb();
      createPlayer();
    };

    if (document.createElement && document.head?.appendChild) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        ytFailed = true;
        if (ytPendingPlay) {
          ytPendingPlay = false;
          startLocalOrSynthMusic(false);
        }
      };
      document.head.appendChild(script);
    }
  }

  initYouTubeMusicPlayer();

  if (musicEl) {
    musicEl.addEventListener("error", () => {
      mp3Failed = true;
    });
  }

  function updateMusicUI(playing) {
    isMusicPlaying = playing;
    if (musicToggleBtn) musicToggleBtn.classList.toggle("is-playing", playing);
    if (musicStatusBadge) musicStatusBadge.textContent = playing ? "♪" : "×";
  }

  function playMusicBoxNote(freq) {
    try {
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const overtone = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const overtoneGain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(freq * 2, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

      overtoneGain.gain.setValueAtTime(0.012, now);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      overtone.start(now);
      osc.stop(now + 1.5);
      overtone.stop(now + 0.7);
    } catch {
      // Bỏ qua nếu trình duyệt chặn Web Audio
    }
  }

  function startSynthFallback() {
    if (!CONFIG.music.enableWebAudioFallback) return false;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === "suspended") audioCtx.resume();

      usingSynthFallback = true;
      updateMusicUI(true);
      const notes = CONFIG.music.melodyNotes;
      playMusicBoxNote(notes[noteStep % notes.length]);
      noteStep++;
      clearInterval(synthInterval);
      synthInterval = setInterval(() => {
        if (!isMusicPlaying || !usingSynthFallback) return;
        playMusicBoxNote(notes[noteStep % notes.length]);
        noteStep++;
      }, 720);
      return true;
    } catch {
      return false;
    }
  }

  function startLocalOrSynthMusic(showNotification = false) {
    if (musicEl && typeof musicEl.play === "function" && !mp3Failed) {
      try {
        const playPromise = musicEl.play();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise
            .then(() => {
              usingSynthFallback = false;
              updateMusicUI(true);
              if (showNotification) showToast("Đang phát nhạc nền lễ cưới ♫");
            })
            .catch(() => {
              if (startSynthFallback() && showNotification) {
                showToast("Đang phát giai điệu hộp nhạc ♫");
              } else {
                updateMusicUI(false);
              }
            });
          return;
        }
        usingSynthFallback = false;
        updateMusicUI(true);
        if (showNotification) showToast("Đang phát nhạc nền lễ cưới ♫");
        return;
      } catch {
        // Chuyển sang Web Audio API bên dưới
      }
    }

    if (startSynthFallback() && showNotification) {
      showToast("Đang phát giai điệu hộp nhạc ♫");
    }
  }

  function startMusic(showNotification = false) {
    if (isMusicPlaying) return;

    if (youtubeVideoId && !ytFailed) {
      ytPendingPlay = true;
      updateMusicUI(true);
      if (ytPlayer && ytReady && typeof ytPlayer.playVideo === "function") {
        try {
          ytPlayer.unMute?.();
          ytPlayer.setVolume?.(100);
          ytPlayer.playVideo();
        } catch {
          // fallback if playVideo throws
        }
      }
      if (showNotification) showToast("Đang phát nhạc nền YouTube ♫");
      return;
    }

    startLocalOrSynthMusic(showNotification);
  }

  function stopMusic(showNotification = false) {
    ytPendingPlay = false;
    if (ytPlayer && ytReady && typeof ytPlayer.pauseVideo === "function") {
      try {
        ytPlayer.pauseVideo();
      } catch {
        // ignore
      }
    }
    if (musicEl && typeof musicEl.pause === "function") {
      try {
        musicEl.pause();
      } catch {
        // ignore
      }
    }
    usingSynthFallback = false;
    clearInterval(synthInterval);
    synthInterval = null;
    updateMusicUI(false);
    if (showNotification) showToast("Đã tạm dừng nhạc nền");
  }

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isMusicPlaying) stopMusic(true);
      else startMusic(true);
    });
  }

  /* =========================================================
     5. PHẦN 1: INTRO CÁNH CỬA TÁCH ĐÔI 3D
     ========================================================= */
  let doorsOpened = false;
  let openedAt = 0;

  function openSplitDoors() {
    if (doorsOpened) return;
    doorsOpened = true;

    if (!openedAt) {
      openedAt = Date.now();
      schedulePoll();
    }

    if (introOverlay) introOverlay.classList.add("is-opening");
    document.body.classList.remove("intro-locked");
    if (weddingMain) weddingMain.classList.add("is-revealed");
    startMusic(false);

    const card1 = document.getElementById("card-1");
    if (card1) card1.classList.add("in-view");

    setTimeout(() => {
      if (doorsOpened && introOverlay) {
        introOverlay.classList.add("is-gone");
      }
      checkVisibleElementsFallback();
    }, 1250);
  }

  if (introOverlay) {
    introOverlay.addEventListener("click", openSplitDoors);
    introOverlay.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openSplitDoors();
      }
    });
  }
  if (openDoorsTrigger) {
    openDoorsTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      openSplitDoors();
    });
  }

  /* =========================================================
     6. OBSERVER 7 Ô THIỆP & TIMELINE ĐỘNG
     ========================================================= */
  const cards = Array.from(document.querySelectorAll(".wedding-card"));
  const timelineItems = Array.from(document.querySelectorAll("[data-tl-item]"));

  if (typeof IntersectionObserver === "function") {
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    cards.forEach((card) => cardObserver.observe(card));

    const tlObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("tl-visible");
          }
        });
      },
      { threshold: 0.2 }
    );
    timelineItems.forEach((item) => tlObserver.observe(item));
  } else {
    cards.forEach((card) => card.classList.add("in-view"));
    timelineItems.forEach((item) => item.classList.add("tl-visible"));
  }

  function checkVisibleElementsFallback() {
    const vh = window.innerHeight || 800;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect?.() || { top: 0, bottom: 200 };
      if (rect.top < vh * 0.92 && (rect.bottom === undefined || rect.bottom > 40)) {
        card.classList.add("in-view");
      }
    });
    timelineItems.forEach((item) => {
      const rect = item.getBoundingClientRect?.() || { top: 0 };
      if (rect.top < vh * 0.92) {
        item.classList.add("tl-visible");
      }
    });
  }

  /* --- Ô 02: Đồng hồ đếm ngược --- */
  const targetWeddingTime = new Date(c.weddingIso).getTime();
  const cdDays = document.getElementById("cdDays");
  const cdHours = document.getElementById("cdHours");
  const cdMinutes = document.getElementById("cdMinutes");
  const cdSeconds = document.getElementById("cdSeconds");
  const prevCd = { d: "", h: "", m: "", s: "" };

  function updateCountdown() {
    if (document.hidden) return;
    const diff = Math.max(0, targetWeddingTime - Date.now());
    const totalSecs = Math.floor(diff / 1000);
    const d = String(Math.floor(totalSecs / 86400)).padStart(2, "0");
    const h = String(Math.floor((totalSecs % 86400) / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
    const s = String(totalSecs % 60).padStart(2, "0");

    if (cdDays && prevCd.d !== d) { cdDays.textContent = d; prevCd.d = d; }
    if (cdHours && prevCd.h !== h) { cdHours.textContent = h; prevCd.h = h; }
    if (cdMinutes && prevCd.m !== m) { cdMinutes.textContent = m; prevCd.m = m; }
    if (cdSeconds && prevCd.s !== s) { cdSeconds.textContent = s; prevCd.s = s; }
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* --- Ô 03: Trục dọc Timeline tự vẽ & Nút Replay --- */
  let tlReplayTimers = [];

  function updateTimelineAxisProgress() {
    if (!timelineContainer || !timelineAxisFill) return;
    const rect = timelineContainer.getBoundingClientRect?.();
    if (!rect) return;
    const vh = window.innerHeight || 800;
    const startPoint = vh * 0.78;
    const rawProgress = (startPoint - rect.top) / Math.max(rect.height || 1, 1);
    const progress = Math.max(0, Math.min(1, rawProgress));
    const isDesktop = (window.innerWidth || 1024) >= 768;
    timelineAxisFill.style.transform = isDesktop
      ? `translateX(-50%) scaleY(${progress.toFixed(3)})`
      : `scaleY(${progress.toFixed(3)})`;
  }

  const btnReplayTimeline = document.getElementById("btnReplayTimeline");
  if (btnReplayTimeline) {
    btnReplayTimeline.addEventListener("click", () => {
      tlReplayTimers.forEach((id) => clearTimeout(id));
      tlReplayTimers = [];
      timelineItems.forEach((item) => item.classList.remove("tl-visible"));
      const isDesktop = (window.innerWidth || 1024) >= 768;
      if (timelineAxisFill) {
        timelineAxisFill.style.transform = isDesktop ? "translateX(-50%) scaleY(0)" : "scaleY(0)";
      }
      timelineItems.forEach((item, index) => {
        const tId = setTimeout(() => {
          item.classList.add("tl-visible");
          const pct = ((index + 1) / Math.max(timelineItems.length, 1)).toFixed(2);
          const desktopNow = (window.innerWidth || 1024) >= 768;
          if (timelineAxisFill) {
            timelineAxisFill.style.transform = desktopNow
              ? `translateX(-50%) scaleY(${pct})`
              : `scaleY(${pct})`;
          }
        }, 220 + index * 460);
        tlReplayTimers.push(tId);
      });
    });
  }

  /* =========================================================
     7. Ô 07: SỔ LƯU BÚT 3 KIỂU + KẾT NỐI API MYSQL / LOCALSTORAGE
     ========================================================= */
  const pathParts = (window.location?.pathname || "/").split("/").filter(Boolean);
  let token = null;
  if (pathParts.length >= 2 && pathParts[0] === "invite") {
    token = pathParts[1];
  } else if (window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    token = params.get("token");
  }

  function formatAttendBadge(raw) {
    if (raw === "yes" || raw === "Sẽ tham dự" || raw === "Sẽ tham dự chung vui") {
      return "Sẽ tham dự";
    }
    if (raw === "no" || raw === "Tiếc quá không thể tới") {
      return "Tiếc quá không thể tới";
    }
    return raw || "Lời chúc phúc";
  }

  function normalizeWish(item, idx = 0) {
    return {
      id: item.id ?? `w-${idx}`,
      name: item.name || "Khách mời",
      attend: formatAttendBadge(item.attend || item.attendance),
      text: item.message ?? item.text ?? "",
      created_at: item.created_at || null,
      isSample: Boolean(item.isSample)
    };
  }

  // Khởi tạo dữ liệu lời chúc ban đầu
  function loadLocalWishes() {
    try {
      const raw = safeStorageGet(LOCAL_WISHES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeWish) : [];
    } catch {
      return [];
    }
  }

  let localWishes = loadLocalWishes();
  let apiWishes = [];

  function getVisualWishes() {
    return token ? apiWishes : localWishes;
  }

  /* --- SỔ GIẤY LẬT TRANG 3D --- */
  const bookStaticLeft = document.getElementById("bookStaticLeft");
  const bookStaticRight = document.getElementById("bookStaticRight");
  const bookSheetsContainer = document.getElementById("bookSheetsContainer");
  const btnBookPrev = document.getElementById("btnBookPrev");
  const btnBookNext = document.getElementById("btnBookNext");
  const bookPageIndicator = document.getElementById("bookPageIndicator");
  const bookScene = document.getElementById("bookScene");

  let currentBookSpread = 0;
  let totalBookSheets = 1;

  function buildBookWishPageHTML(wish, pageNum) {
    if (!wish) {
      return (
        `<div class="book-page-inner" style="justify-content:center; align-items:center;">` +
        `<div class="book-page-border"></div>` +
        `<div>` +
        `<p style="font-family:var(--font-serif); font-style:italic; font-size:clamp(20px,3.2vw,24px); color:var(--burgundy); margin-bottom:6px;">Cảm Ơn Quý Vị</p>` +
        `<p style="font-size:11.5px; color:var(--text-muted); max-width:190px; margin:0 auto;">Hãy viết thêm lời chúc ở khung bên dưới để lưu trang mới vào cuốn sổ này.</p>` +
        `</div>` +
        `<span style="position:absolute; bottom:12px; font-size:10px; letter-spacing:0.25em; color:var(--gold-dark);">— ${pageNum} —</span>` +
        `</div>`
      );
    }
    return (
      `<div class="book-page-inner">` +
      `<div class="book-page-border"></div>` +
      `<div style="padding-top:4px;">` +
      `<span class="tl-date" style="font-size:9px; padding:2px 8px; margin-bottom:5px;">${escapeHTML(wish.attend)}</span>` +
      `<h4 style="font-family:var(--font-display); font-size:clamp(14px,2.8vw,21px); color:var(--text-main); line-height:1.2;">${escapeHTML(wish.name)}</h4>` +
      `<div style="width:36px; height:1px; background:var(--gold); margin:8px auto 0;"></div>` +
      `</div>` +
      `<div class="book-page-body">` +
      `<p style="font-family:var(--font-serif); font-style:italic; font-size:clamp(13px,2.3vw,18px); color:var(--text-main); line-height:1.5;">“${escapeHTML(wish.text)}”</p>` +
      `</div>` +
      `<span style="font-size:10px; letter-spacing:0.25em; color:var(--gold-dark);">— ${pageNum} —</span>` +
      `</div>`
    );
  }

  function updateBookSheetsVisual() {
    if (!bookSheetsContainer) return;
    const sheets = bookSheetsContainer.querySelectorAll
      ? Array.from(bookSheetsContainer.querySelectorAll(".book-sheet"))
      : bookSheetsContainer.children || [];
    sheets.forEach((sheet, idx) => {
      const isFlipped = idx < currentBookSpread;
      sheet.classList.toggle("flipped", isFlipped);
      sheet.style.zIndex = isFlipped ? String(10 + idx) : String(10 + (sheets.length - idx));
    });
    if (btnBookPrev) btnBookPrev.disabled = currentBookSpread <= 0;
    if (btnBookNext) btnBookNext.disabled = currentBookSpread >= totalBookSheets;
    if (bookPageIndicator) {
      bookPageIndicator.textContent = `Trang ${currentBookSpread + 1} / ${totalBookSheets + 1}`;
    }
  }

  function goToBookSpread(nextSpread) {
    const clamped = Math.max(0, Math.min(nextSpread, totalBookSheets));
    if (clamped === currentBookSpread) return;
    currentBookSpread = clamped;
    updateBookSheetsVisual();
  }

  function renderGuestbook3D(targetSpread) {
    if (!bookStaticLeft || !bookStaticRight || !bookSheetsContainer) return;
    const wishesList = getVisualWishes();

    bookStaticLeft.innerHTML =
      `<div class="book-page-inner" style="justify-content:center; align-items:center;">` +
      `<div class="book-page-border"></div>` +
      `<div style="padding:6px;">` +
      `<p style="font-size:9.5px; letter-spacing:0.26em; text-transform:uppercase; color:var(--gold-dark); margin-bottom:6px;">Wedding Guestbook</p>` +
      `<p style="font-family:var(--font-serif); font-style:italic; font-size:clamp(20px,4vw,32px); color:var(--burgundy); line-height:1.15;">${escapeHTML(c.groomName)}<br/>&amp; ${escapeHTML(c.brideName)}</p>` +
      `<div style="width:42px; height:1px; background:var(--gold); margin:10px auto;"></div>` +
      `<p style="font-size:10.5px; color:var(--text-muted);">${escapeHTML(c.weddingDateDisplay)}</p>` +
      `<p style="font-size:11px; color:var(--gold-dark); margin-top:8px; font-style:italic;">${wishesList.length} lời chúc phúc</p>` +
      `</div>` +
      `</div>`;

    const sheetCount = Math.ceil((wishesList.length + 1) / 2);
    totalBookSheets = Math.max(1, sheetCount);
    const lastRightIdx = totalBookSheets * 2 - 1;
    bookStaticRight.innerHTML = buildBookWishPageHTML(wishesList[lastRightIdx] || null, lastRightIdx + 1);

    bookSheetsContainer.innerHTML = "";
    if (Array.isArray(bookSheetsContainer.children)) bookSheetsContainer.children.length = 0;

    for (let i = 0; i < totalBookSheets; i++) {
      const frontWish = wishesList[i * 2] || null;
      const backWish = wishesList[i * 2 + 1] || null;
      const sheet = document.createElement("div");
      sheet.className = "book-sheet";
      sheet.innerHTML =
        `<div class="book-face book-face-front">${buildBookWishPageHTML(frontWish, i * 2 + 1)}</div>` +
        `<div class="book-face book-face-back">${buildBookWishPageHTML(backWish, i * 2 + 2)}</div>`;

      sheet.addEventListener("click", () => {
        if (sheet.classList.contains("flipped")) goToBookSpread(currentBookSpread - 1);
        else goToBookSpread(currentBookSpread + 1);
      });
      bookSheetsContainer.appendChild(sheet);
    }

    currentBookSpread = Math.max(0, Math.min(typeof targetSpread === "number" ? targetSpread : 0, totalBookSheets));
    updateBookSheetsVisual();
  }

  if (btnBookPrev) btnBookPrev.addEventListener("click", () => goToBookSpread(currentBookSpread - 1));
  if (btnBookNext) btnBookNext.addEventListener("click", () => goToBookSpread(currentBookSpread + 1));

  if (bookScene) {
    let bookTouchStartX = 0;
    bookScene.addEventListener(
      "touchstart",
      (e) => {
        bookTouchStartX = e.changedTouches?.[0]?.clientX || 0;
      },
      { passive: true }
    );
    bookScene.addEventListener(
      "touchend",
      (e) => {
        const deltaX = (e.changedTouches?.[0]?.clientX || 0) - bookTouchStartX;
        if (Math.abs(deltaX) > 40) {
          if (deltaX < 0) goToBookSpread(currentBookSpread + 1);
          else goToBookSpread(currentBookSpread - 1);
        }
      },
      { passive: true }
    );
  }

  function syncAllGuestbookViews(highlightNewest = false) {
    if (highlightNewest) {
      renderGuestbook3D(Math.min(1, totalBookSheets));
      setTimeout(() => goToBookSpread(0), 180);
    } else {
      renderGuestbook3D(0);
    }
  }

  /* =========================================================
     8. TÍCH HỢP API MYSQL (/api/invite/:token) & SMART POLLING
     ========================================================= */
  let inviteLoading = false;
  let inviteLoaded = false;
  let inviteInvalid = false;
  let attendanceInteracted = false;
  let currentGuestName = "";
  let currentAttendance = "";
  let attendanceBusy = false;
  let submittingWish = false;
  let wishesLoading = false;
  let wishesRequest = 0;
  let lastWishesETag = null;
  let browsingOlderWishes = false;
  let nextCursor = null;
  let pollTimer = null;
  let pollFailures = 0;
  const ownWishes = new Map();

  function setRsvpUI(status) {
    if (status === "yes" || status === "no") {
      currentAttendance = status;
    }
    if (attendanceYesBtn) attendanceYesBtn.classList.toggle("selected", status === "yes");
    if (attendanceNoBtn) attendanceNoBtn.classList.toggle("selected", status === "no");
  }

  if (!token) {
    const savedLocalRsvp = safeStorageGet(LOCAL_RSVP_KEY);
    if (savedLocalRsvp === "yes" || savedLocalRsvp === "no") {
      setRsvpUI(savedLocalRsvp);
    }
  } else if (wishesRefreshBtn) {
    wishesRefreshBtn.hidden = false;
  }

  if (guestWishInput && wishCharCount) {
    guestWishInput.addEventListener("input", () => {
      wishCharCount.textContent = `${guestWishInput.value.length}/500`;
    });
  }

  function acceptWishes(data, append = false) {
    browsingOlderWishes = append;
    const incoming = (Array.isArray(data) ? data : data.wishes || []).map(normalizeWish);
    for (const wish of incoming) ownWishes.delete(wish.id);
    for (const [id, entry] of ownWishes) {
      if (Date.now() - entry.at > 5 * 60 * 1000) ownWishes.delete(id);
    }

    const unique = new Map();
    for (const wish of [
      ...(append ? apiWishes : []),
      ...incoming,
      ...Array.from(ownWishes.values(), (entry) => entry.wish)
    ]) {
      unique.set(wish.id, wish);
    }

    apiWishes = Array.from(unique.values()).sort((a, b) => Number(b.id) - Number(a.id));
    nextCursor = data.nextCursor || null;
    if (wishesMoreBtn) {
      wishesMoreBtn.hidden = !nextCursor;
    }
    showFormFeedback("");
    syncAllGuestbookViews(false);
  }

  async function loadGuest() {
    if (!token || inviteLoading || inviteInvalid || typeof fetchWithTimeout !== "function") return;
    inviteLoading = true;
    try {
      const response = await fetchWithTimeout(`/api/invite/${encodeURIComponent(token)}`);
      if (!response.ok) {
        if (response.status === 404) inviteInvalid = true;
        throw new Error(
          response.status === 404
            ? "Link thiệp không tồn tại hoặc đã bị vô hiệu hóa."
            : "Chưa tải được thông tin khách mời. Vui lòng thử lại sau."
        );
      }
      const data = await response.json();
      inviteLoaded = true;
      pollFailures = 0;
      const guest = data.guest || data;

      if (guest && guest.name) {
        currentGuestName = guest.name;
        if (guestGreeting) guestGreeting.textContent = `Trân trọng kính mời ${guest.name}`;
        if (invitationGuestName) invitationGuestName.textContent = guest.name;
        if (!attendanceInteracted && (guest.attendance === "yes" || guest.attendance === "no")) {
          setRsvpUI(guest.attendance);
        }
      }
      acceptWishes(data, false);
    } catch (err) {
      pollFailures = Math.min(pollFailures + 1, 3);
      if (guestGreeting) guestGreeting.textContent = "Trân trọng kính mời Quý khách";
      showFormFeedback(err.message);
    } finally {
      inviteLoading = false;
    }
  }

  async function loadWishes(append = false) {
    if (!token || inviteInvalid || wishesLoading || inviteLoading || typeof fetchWithTimeout !== "function") return;
    if (!inviteLoaded) return loadGuest();
    const request = ++wishesRequest;
    wishesLoading = true;
    try {
      const headers = {};
      if (lastWishesETag && !append) headers["If-None-Match"] = lastWishesETag;
      const cursor = append && nextCursor ? `?before=${nextCursor}` : "";
      const response = await fetchWithTimeout(`/api/invite/${encodeURIComponent(token)}/wishes${cursor}`, { headers });

      if (response.status === 304) {
        pollFailures = 0;
        return;
      }
      if (!response.ok) {
        if (response.status === 404) inviteInvalid = true;
        throw new Error("Không thể tải lời chúc.");
      }

      lastWishesETag = append ? null : response.headers?.get?.("ETag") || null;
      const data = await response.json();
      if (request === wishesRequest) acceptWishes(data, append);
      pollFailures = 0;
    } catch (err) {
      pollFailures = Math.min(pollFailures + 1, 3);
      if (request === wishesRequest) showFormFeedback(err.message);
    } finally {
      if (request === wishesRequest) wishesLoading = false;
    }
  }

  function schedulePoll() {
    if (
      !token ||
      inviteInvalid ||
      !openedAt ||
      document.hidden ||
      pollTimer ||
      Date.now() - openedAt >= 10 * 60 * 1000
    ) {
      return;
    }
    pollTimer = setTimeout(async () => {
      pollTimer = null;
      if (document.hidden || Date.now() - openedAt >= 10 * 60 * 1000) return;
      if (!browsingOlderWishes) await loadWishes(false);
      schedulePoll();
    }, 180000 * 2 ** pollFailures + Math.random() * 30000);
  }

  if (wishesRefreshBtn) {
    wishesRefreshBtn.addEventListener("click", async () => {
      wishesRefreshBtn.disabled = true;
      try {
        await loadWishes(false);
        showToast("Đã cập nhật sổ lưu bút mới nhất!");
      } finally {
        wishesRefreshBtn.disabled = false;
      }
    });
  }

  if (wishesMoreBtn) {
    wishesMoreBtn.addEventListener("click", async () => {
      wishesMoreBtn.disabled = true;
      try {
        if (nextCursor) await loadWishes(true);
      } finally {
        wishesMoreBtn.disabled = false;
      }
    });
  }

  /* --- Xử lý xác nhận tham dự (RSVP) 1 chạm --- */
  async function confirmAttendance(attendance) {
    if (attendanceBusy) return;
    attendanceInteracted = true;

    if (!token) {
      safeStorageSet(LOCAL_RSVP_KEY, attendance);
      setRsvpUI(attendance);
      launchConfetti();
      showToast(
        attendance === "yes"
          ? "Cảm ơn Quý vị đã xác nhận tham dự chung vui! ✨"
          : "Cảm ơn Quý vị đã phản hồi lời mời ❤"
      );
      return;
    }

    attendanceBusy = true;
    if (attendanceYesBtn) attendanceYesBtn.disabled = true;
    if (attendanceNoBtn) attendanceNoBtn.disabled = true;
    showFormFeedback("");

    try {
      const response = await fetchWithTimeout(`/api/invite/${encodeURIComponent(token)}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật trạng thái tham dự.");

      setRsvpUI(attendance);
      launchConfetti();
      showToast(
        attendance === "yes"
          ? "Gia đình rất hân hoan được đón tiếp Quý vị trong ngày vui! ✨"
          : "Cảm ơn Quý vị đã gửi phản hồi tới hai gia đình ❤"
      );
    } catch (err) {
      showFormFeedback(err.message);
    } finally {
      attendanceBusy = false;
      if (attendanceYesBtn) attendanceYesBtn.disabled = false;
      if (attendanceNoBtn) attendanceNoBtn.disabled = false;
    }
  }

  if (attendanceYesBtn) attendanceYesBtn.addEventListener("click", () => confirmAttendance("yes"));
  if (attendanceNoBtn) attendanceNoBtn.addEventListener("click", () => confirmAttendance("no"));

  /* --- Xử lý gửi lời chúc mới (Đồng bộ Sổ Lưu Bút 3D + Pháo giấy) --- */
  if (rsvpForm) {
    rsvpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submittingWish) return;

      const text = (guestWishInput?.value || "").trim();
      const attendCode = currentAttendance === "no" ? "no" : currentAttendance === "yes" ? "yes" : "";
      const attendLabel = formatAttendBadge(attendCode);
      const rawName = currentGuestName || "Khách mời";

      if (!text) {
        showFormFeedback("Vui lòng nhập lời chúc phúc trước khi gửi.");
        return;
      }

      // Chế độ bản xem trước / không có token -> Lưu vào localStorage (tối đa 3 lời chúc)
      if (!token) {
        if (localWishes.length >= 3) {
          showFormFeedback("Mỗi khách mời chỉ được gửi tối đa 3 lời chúc.");
          return;
        }
        const newWish = normalizeWish({
          id: "local-" + Date.now(),
          name: rawName,
          attend: attendLabel,
          message: text,
          created_at: new Date().toISOString()
        });
        localWishes.unshift(newWish);
        safeStorageSet(LOCAL_WISHES_KEY, JSON.stringify(localWishes.slice(0, 100)));
        showFormFeedback("");

        launchConfetti();
        syncAllGuestbookViews(true);

        showToast("Cảm ơn Quý vị! Lời chúc đã được ghi vào cuốn sổ 3D 📖");

        if (guestWishInput) guestWishInput.value = "";
        if (wishCharCount) wishCharCount.textContent = "0/500";
        return;
      }

      // Chế độ có token khách mời -> Kết nối API MySQL thật
      submittingWish = true;
      if (btnSubmitWish) btnSubmitWish.disabled = true;
      showFormFeedback("");

      try {
        const response = await fetchWithTimeout(`/api/invite/${encodeURIComponent(token)}/wishes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Không thể gửi lời chúc.");
        }

        if (guestWishInput) guestWishInput.value = "";
        if (wishCharCount) wishCharCount.textContent = "0/500";
        lastWishesETag = null;

        const savedWish = normalizeWish({
          ...(data.wish || { id: Date.now(), name: rawName, message: text }),
          attend: attendLabel
        });
        ownWishes.set(savedWish.id, { wish: savedWish, at: Date.now() });

        const unique = new Map(apiWishes.map((w) => [w.id, w]));
        unique.set(savedWish.id, savedWish);
        apiWishes = Array.from(unique.values()).sort((a, b) => Number(b.id) - Number(a.id));

        launchConfetti();
        syncAllGuestbookViews(true);

        const senderName = savedWish.name || rawName || "Quý khách";
        showToast(`Cảm ơn ${senderName}! Lời chúc đã được ghi vào cuốn sổ 3D 📖`);
      } catch (err) {
        showFormFeedback(err.message);
      } finally {
        submittingWish = false;
        if (btnSubmitWish) btnSubmitWish.disabled = false;
      }
    });
  }

  /* =========================================================
     9. CANVAS CÁNH HOA HỒNG RƠI 3 LỚP CHIỀU SÂU & PHÁO GIẤY
     ========================================================= */
  const ambientCanvas = document.getElementById("ambientCanvas");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const ambientCtx = ambientCanvas?.getContext ? ambientCanvas.getContext("2d") : null;
  const confettiCtx = confettiCanvas?.getContext ? confettiCanvas.getContext("2d") : null;

  let ambientParticles = [];
  let confettiParticles = [];
  let canvasRaf = null;
  let lastCanvasW = 0;
  let lastCanvasH = 0;

  const farPetalSprites = [];
  const midPetalSprites = [];
  const fgPetalSprites = [];

  function createRosePetalSprite(variant, blurPx, isLarge) {
    const size = isLarge ? 140 : 96;
    const spriteCanvas = document.createElement("canvas");
    if (!spriteCanvas?.getContext) return null;
    spriteCanvas.width = size;
    spriteCanvas.height = size;
    const ctx = spriteCanvas.getContext("2d");
    if (!ctx) return null;

    const cx = size / 2;
    const cy = size / 2;
    const s = isLarge ? 1.15 : 0.85;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    if (blurPx > 0) {
      ctx.filter = `blur(${blurPx}px)`;
    }

    const palettes = [
      ["#FFE5EC", "#FF9EB5", "#F26B8A", "#C93B5B"],
      ["#FFF0F4", "#FF9EB5", "#E85A7A", "#8F1D3A"],
      ["#FFE5EC", "#FFA8BD", "#F26B8A", "#B52D4E"],
      ["#FFEDF2", "#FF94AE", "#D94B6C", "#8F1D3A"]
    ];
    const pal = palettes[variant % palettes.length];

    ctx.beginPath();
    if (variant === 0) {
      ctx.moveTo(0, 28);
      ctx.bezierCurveTo(-24, 18, -32, -8, -16, -24);
      ctx.bezierCurveTo(-5, -34, 14, -32, 24, -16);
      ctx.bezierCurveTo(34, 0, 20, 22, 0, 28);
    } else if (variant === 1) {
      ctx.moveTo(0, 30);
      ctx.bezierCurveTo(-18, 16, -26, -12, -10, -28);
      ctx.bezierCurveTo(-2, -35, 10, -30, 16, -18);
      ctx.bezierCurveTo(26, 2, 16, 20, 0, 30);
    } else if (variant === 2) {
      ctx.moveTo(-26, 16);
      ctx.bezierCurveTo(-14, -8, 10, -28, 30, -22);
      ctx.bezierCurveTo(18, -4, 12, 16, -6, 24);
      ctx.bezierCurveTo(-16, 28, -28, 24, -26, 16);
    } else {
      ctx.moveTo(0, 28);
      ctx.bezierCurveTo(-28, 20, -34, -10, -18, -26);
      ctx.bezierCurveTo(-10, -33, -2, -26, 0, -20);
      ctx.bezierCurveTo(3, -26, 12, -33, 20, -24);
      ctx.bezierCurveTo(34, -8, 26, 20, 0, 28);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(-8, -14, 3, 2, 14, 42);
    grad.addColorStop(0, pal[0]);
    grad.addColorStop(0.32, pal[1]);
    grad.addColorStop(0.72, pal[2]);
    grad.addColorStop(1, pal[3]);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 240, 245, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(-4, 0, -2, -16);
    ctx.strokeStyle = "rgba(255, 229, 236, 0.24)";
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.restore();
    return spriteCanvas;
  }

  function initRosePetalSprites() {
    if (!ambientCtx) return;
    farPetalSprites.length = 0;
    midPetalSprites.length = 0;
    fgPetalSprites.length = 0;
    for (let v = 0; v < 4; v++) {
      farPetalSprites.push(createRosePetalSprite(v, 1.8, false));
      midPetalSprites.push(createRosePetalSprite(v, 1.0, false));
      fgPetalSprites.push(createRosePetalSprite(v, 4.8, true));
    }
  }

  function resizeCanvases(force = false) {
    const w = window.innerWidth || 1024;
    const h = window.innerHeight || 800;
    if (!force && w === lastCanvasW && Math.abs(h - lastCanvasH) < 120) return;
    lastCanvasW = w;
    lastCanvasH = h;
    if (ambientCanvas) {
      ambientCanvas.width = w;
      ambientCanvas.height = h;
    }
    if (confettiCanvas) {
      confettiCanvas.width = w;
      confettiCanvas.height = h;
    }
  }

  function initAmbientParticles() {
    if (!ambientCtx) return;
    ambientParticles = [];
    const w = lastCanvasW || window.innerWidth || 1024;
    const h = lastCanvasH || window.innerHeight || 800;
    const isMobile = w < 640;

    const farCount = isMobile ? 12 : 20;
    const midCount = isMobile ? 12 : 20;
    const fgCount = isMobile ? 4 : 6;

    // 1. Lớp xa (nhỏ, mờ 1.8px, rơi rất chậm)
    for (let i = 0; i < farCount; i++) {
      ambientParticles.push({
        layer: 0,
        spriteIdx: i % 4,
        x: Math.random() * w,
        y: Math.random() * h,
        size: 10 + Math.random() * 6,
        vy: 0.18 + Math.random() * 0.14,
        vx: -0.09 + Math.random() * 0.18,
        swayAmp: 0.14 + Math.random() * 0.15,
        swayFreq: 0.0045 + Math.random() * 0.0035,
        swayPhase: Math.random() * Math.PI * 2,
        angle: Math.random() * Math.PI * 2,
        va: (Math.random() - 0.5) * 0.008,
        flutterPhase: Math.random() * Math.PI * 2,
        flutterSpeed: 0.01 + Math.random() * 0.009,
        alpha: 0.16 + Math.random() * 0.14
      });
    }

    // 2. Lớp giữa (vừa, mờ 1.0px, chao lật 3D theo scaleY)
    for (let j = 0; j < midCount; j++) {
      ambientParticles.push({
        layer: 1,
        spriteIdx: j % 4,
        x: Math.random() * w,
        y: Math.random() * h,
        size: 18 + Math.random() * 12,
        vy: 0.32 + Math.random() * 0.2,
        vx: -0.14 + Math.random() * 0.28,
        swayAmp: 0.24 + Math.random() * 0.24,
        swayFreq: 0.0055 + Math.random() * 0.004,
        swayPhase: Math.random() * Math.PI * 2,
        angle: Math.random() * Math.PI * 2,
        va: (Math.random() - 0.5) * 0.013,
        flutterPhase: Math.random() * Math.PI * 2,
        flutterSpeed: 0.018 + Math.random() * 0.016,
        alpha: 0.36 + Math.random() * 0.18
      });
    }

    // 3. Lớp tiền cảnh (lớn, mờ bokeh 4.8px, alpha thấp không che chữ)
    for (let k = 0; k < fgCount; k++) {
      ambientParticles.push({
        layer: 2,
        spriteIdx: k % 4,
        x: Math.random() * w,
        y: Math.random() * h,
        size: 38 + Math.random() * 20,
        vy: 0.55 + Math.random() * 0.3,
        vx: -0.2 + Math.random() * 0.4,
        swayAmp: 0.36 + Math.random() * 0.24,
        swayFreq: 0.0035 + Math.random() * 0.003,
        swayPhase: Math.random() * Math.PI * 2,
        angle: Math.random() * Math.PI * 2,
        va: (Math.random() - 0.5) * 0.009,
        flutterPhase: Math.random() * Math.PI * 2,
        flutterSpeed: 0.012 + Math.random() * 0.01,
        alpha: 0.2 + Math.random() * 0.14
      });
    }
  }

  function launchConfetti() {
    if (!confettiCtx || prefersReducedMotion()) return;
    const colors = ["#C5A880", "#722F37", "#F2B968", "#FFFDF9", "#D99B82"];
    const cx = (window.innerWidth || 800) / 2;
    const cy = (window.innerHeight || 700) * 0.55;
    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 7.5;
      confettiParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 5 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.22,
        color: colors[i % colors.length],
        life: 1
      });
    }
    ensureAnimationLoops();
  }

  function renderCanvasLoop() {
    if (document.hidden || prefersReducedMotion()) {
      canvasRaf = null;
      return;
    }

    if (ambientCtx && ambientCanvas) {
      ambientCtx.clearRect(0, 0, ambientCanvas.width, ambientCanvas.height);
      for (let i = 0; i < ambientParticles.length; i++) {
        const p = ambientParticles[i];
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.y * p.swayFreq + p.swayPhase) * p.swayAmp;
        p.angle += p.va;
        p.flutterPhase += p.flutterSpeed;

        const pad = p.size + 16;
        if (p.y > ambientCanvas.height + pad) {
          p.y = -pad;
          p.x = Math.random() * ambientCanvas.width;
        } else if (p.x < -pad) {
          p.x = ambientCanvas.width + pad;
        } else if (p.x > ambientCanvas.width + pad) {
          p.x = -pad;
        }

        const flutterScaleY =
          p.layer === 1
            ? 0.45 + Math.abs(Math.cos(p.flutterPhase)) * 0.55
            : 0.68 + Math.abs(Math.cos(p.flutterPhase)) * 0.32;

        const sprite =
          p.layer === 2
            ? fgPetalSprites[p.spriteIdx]
            : p.layer === 1
            ? midPetalSprites[p.spriteIdx]
            : farPetalSprites[p.spriteIdx];

        if (sprite) {
          ambientCtx.save();
          ambientCtx.translate(p.x, p.y);
          ambientCtx.rotate(p.angle);
          ambientCtx.scale(1, flutterScaleY);
          ambientCtx.globalAlpha = p.alpha;
          ambientCtx.drawImage(sprite, -p.size / 2, -p.size / 2, p.size, p.size);
          ambientCtx.restore();
        }
      }
    }

    if (confettiCtx && confettiCanvas) {
      if (confettiParticles.length > 0) {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        for (let j = confettiParticles.length - 1; j >= 0; j--) {
          const cf = confettiParticles[j];
          cf.x += cf.vx;
          cf.y += cf.vy;
          cf.vy += 0.16;
          cf.vx *= 0.985;
          cf.rot += cf.vrot;
          cf.life -= 0.012;
          if (cf.life <= 0) {
            confettiParticles.splice(j, 1);
            continue;
          }
          confettiCtx.save();
          confettiCtx.translate(cf.x, cf.y);
          confettiCtx.rotate(cf.rot);
          confettiCtx.globalAlpha = Math.max(0, cf.life);
          confettiCtx.fillStyle = cf.color;
          confettiCtx.fillRect(-cf.size / 2, -cf.size / 3, cf.size, cf.size * 0.65);
          confettiCtx.restore();
        }
      } else {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    canvasRaf = requestAnimationFrame(renderCanvasLoop);
  }

  function ensureAnimationLoops() {
    if (document.hidden || prefersReducedMotion()) return;
    if (!canvasRaf && (ambientCtx || confettiCtx)) {
      canvasRaf = requestAnimationFrame(renderCanvasLoop);
    }
  }

  /* =========================================================
     10. SỰ KIỆN BÀN PHÍM, CUỘN TRANG, RESIZE & VISIBILITY
     ========================================================= */
  document.addEventListener("keydown", (e) => {
    if (lightboxModal && lightboxModal.classList.contains("is-open")) {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") stepLightbox(-1);
      else if (e.key === "ArrowRight") stepLightbox(1);
    } else if (mapModal && mapModal.classList.contains("is-open") && e.key === "Escape") {
      closeMapModal();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(pollTimer);
      pollTimer = null;
    } else {
      updateCountdown();
      schedulePoll();
      ensureAnimationLoops();
    }
  });

  window.addEventListener("pagehide", () => {
    clearTimeout(pollTimer);
    pollTimer = null;
  });

  window.addEventListener(
    "scroll",
    () => {
      updateTimelineAxisProgress();
      checkVisibleElementsFallback();
    },
    { passive: true }
  );

  window.addEventListener(
    "resize",
    () => {
      resizeCanvases(false);
      updateTimelineAxisProgress();
    },
    { passive: true }
  );

  /* --- Khởi chạy toàn bộ thành phần --- */
  resizeCanvases(true);
  if (!prefersReducedMotion()) {
    initRosePetalSprites();
    initAmbientParticles();
  }
  syncAllGuestbookViews(false);
  updateTimelineAxisProgress();
  ensureAnimationLoops();
  loadGuest();
});
