document.addEventListener("DOMContentLoaded", () => {
  // =====================================================
  // DOM ELEMENTS
  // =====================================================
  const loginScreen = document.getElementById("login-screen");
  const adminScreen = document.getElementById("admin-screen");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const logoutButton = document.getElementById("logout-button");

  const guestName = document.getElementById("guest-name");
  const createButton = document.getElementById("create-link-button");
  const createMessage = document.getElementById("create-message");
  const createdLinkBox = document.getElementById("created-link-box");
  const createdLink = document.getElementById("created-link");
  const copyCreatedLink = document.getElementById("copy-created-link");

  const guestTable = document.getElementById("guest-table-body");
  const guestTableWrapper = document.getElementById("guest-table-wrapper");
  const guestCount = document.getElementById("guest-count");
  const guestEmpty = document.getElementById("guest-empty");
  const guestSearch = document.getElementById("guest-search");
  const exportGuestsCsvBtn = document.getElementById("export-guests-csv");
  const filterPills = document.querySelectorAll(".filter-pill");

  const statTotal = document.getElementById("stat-total");
  const statYes = document.getElementById("stat-yes");
  const statNo = document.getElementById("stat-no");
  const statPending = document.getElementById("stat-pending");

  const adminWishes = document.getElementById("admin-wishes");
  const wishCount = document.getElementById("wish-count");

  let allGuests = [];
  let activeFilter = "all";
  let searchQuery = "";

  // =====================================================
  // HELPERS (CLIPBOARD, CSV, VIETNAMESE SEARCH)
  // =====================================================
  function foldText(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  }

  async function copyToClipboard(text) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback below
      }
    }
    if (!document.createElement || !document.body?.appendChild) return false;
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select?.();
    const ok = Boolean(document.execCommand?.("copy"));
    area.remove?.();
    return ok;
  }

  function escapeCsvCell(value) {
    const str = String(value ?? "");
    // Guard against spreadsheet formula injection (=, +, -, @)
    const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildCsv(rows) {
    // UTF-8 BOM ensures Microsoft Excel displays Vietnamese characters accurately
    return "\uFEFF" + rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  }

  // =====================================================
  // API HELPER (WITH ROBUST ERROR EXTRACTION)
  // =====================================================
  async function getJson(url, options = {}) {
    let response;
    try {
      response = await fetchWithTimeout(url, {
        ...options,
        credentials: "same-origin"
      });
    } catch (networkErr) {
      console.error("NETWORK ERROR:", networkErr);
      throw networkErr;
    }

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Phản hồi máy chủ không hợp lệ (${response.status}).`);
    }
    if (!response.ok) {
      const error = new Error(data.message || `Lỗi máy chủ (${response.status})`);
      error.status = response.status;
      if (response.status === 401 && url !== "/api/admin/login") {
        showLogin();
        loginMessage.textContent = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
        loginMessage.className = "message error";
      }
      throw error;
    }
    return data;
  }

  // =====================================================
  // SCREEN SWITCHING
  // =====================================================
  function showLogin() {
    loginScreen.classList.remove("hidden");
    adminScreen.classList.add("hidden");
  }

  function showAdmin() {
    loginScreen.classList.add("hidden");
    adminScreen.classList.remove("hidden");
    loadGuests();
    loadWishes();
  }

  async function checkLogin() {
    try {
      const data = await getJson("/api/admin/me");
      if (data.loggedIn) {
        showAdmin();
      } else {
        showLogin();
      }
    } catch (err) {
      console.warn("CHECK LOGIN NOTE:", err.message);
      showLogin();
    }
  }

  // =====================================================
  // LOGIN / LOGOUT
  // =====================================================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const btnLogin = document.getElementById("btn-login");
    const btnLoginLabel = document.getElementById("btn-login-label");

    loginMessage.textContent = "";
    loginMessage.className = "message";
    if (btnLogin) btnLogin.disabled = true;
    if (btnLoginLabel) btnLoginLabel.textContent = "Đang xác thực...";

    try {
      await getJson("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      showAdmin();
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      loginMessage.textContent = err.message;
      loginMessage.className = "message error";
    } finally {
      if (btnLogin) btnLogin.disabled = false;
      if (btnLoginLabel) btnLoginLabel.textContent = "Đăng nhập hệ thống";
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await getJson("/api/admin/logout", { method: "POST" });
      showLogin();
    } catch (err) {
      alert("Chưa xác nhận đăng xuất. " + err.message);
    } finally {
      logoutButton.disabled = false;
    }
  });

  // =====================================================
  // CREATE SINGLE GUEST
  // =====================================================
  document.getElementById("guest-form").addEventListener("submit", (event) => {
    event.preventDefault();
    createGuest();
  });

  async function createGuestByName(name) {
    const data = await getJson("/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    return { name: data.name, link: data.link };
  }

  async function createGuest() {
    if (createButton.disabled) return;
    const name = guestName.value.trim();
    if (!name) {
      createMessage.textContent = "Vui lòng nhập tên khách.";
      createMessage.className = "message error";
      guestName.focus();
      return;
    }

    createButton.disabled = true;
    createButton.textContent = "Đang tạo...";
    createMessage.textContent = "";

    try {
      const data = await createGuestByName(name);

      guestName.value = "";
      createMessage.textContent = `✓ Đã tạo link cho "${data.name}"`;
      createMessage.className = "message success";

      if (createdLinkBox && createdLink) {
        createdLink.value = data.link;
        createdLinkBox.classList.remove("hidden");
      }

      await loadGuests();
      guestName.focus();
    } catch (err) {
      console.error("CREATE GUEST ERROR:", err);
      createMessage.textContent = err.message;
      createMessage.className = "message error";
    } finally {
      createButton.disabled = false;
      createButton.textContent = "+ Tạo link";
    }
  }

  if (copyCreatedLink && createdLink) {
    copyCreatedLink.addEventListener("click", async () => {
      const ok = await copyToClipboard(createdLink.value);
      if (ok) {
        copyCreatedLink.textContent = "✓ Đã copy";
        setTimeout(() => { copyCreatedLink.textContent = "Sao chép"; }, 1500);
      } else {
        alert("Không thể copy link.");
      }
    });
  }

  // =====================================================
  // GUEST STATS, SEARCH, FILTER & TABLE RENDERING
  // =====================================================
  function updateStats(guests) {
    let yes = 0;
    let no = 0;
    let pending = 0;
    for (const g of guests) {
      if (g.attendance === "yes") yes++;
      else if (g.attendance === "no") no++;
      else pending++;
    }
    if (statTotal) statTotal.textContent = String(guests.length);
    if (statYes) statYes.textContent = String(yes);
    if (statNo) statNo.textContent = String(no);
    if (statPending) statPending.textContent = String(pending);
  }

  function createAttendanceBadge(attendance) {
    const badge = document.createElement("span");
    if (attendance === "yes") {
      badge.className = "status-badge yes";
      badge.textContent = "✓ Có tham dự";
    } else if (attendance === "no") {
      badge.className = "status-badge no";
      badge.textContent = "✕ Không tham dự";
    } else {
      badge.className = "status-badge pending";
      badge.textContent = "Chưa xác nhận";
    }
    return badge;
  }

  function renderGuestsTable() {
    const foldedQuery = foldText(searchQuery);
    const filtered = allGuests.filter((guest) => {
      const status = guest.attendance === "yes" || guest.attendance === "no" ? guest.attendance : "pending";
      if (activeFilter !== "all" && status !== activeFilter) return false;
      if (foldedQuery && !foldText(guest.name).includes(foldedQuery)) return false;
      return true;
    });

    guestTable.innerHTML = "";
    guestCount.textContent =
      filtered.length === allGuests.length
        ? String(allGuests.length)
        : `${filtered.length}/${allGuests.length}`;

    if (filtered.length === 0) {
      if (guestEmpty) {
        guestEmpty.textContent =
          allGuests.length === 0
            ? "Chưa có khách mời nào."
            : "Không tìm thấy khách mời phù hợp bộ lọc.";
        guestEmpty.style.display = "block";
      }
      if (guestTableWrapper) guestTableWrapper.classList.add("hidden");
      return;
    }

    if (guestEmpty) guestEmpty.style.display = "none";
    if (guestTableWrapper) guestTableWrapper.classList.remove("hidden");

    const fragment = document.createDocumentFragment
      ? document.createDocumentFragment()
      : guestTable;

    filtered.forEach((guest) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.className = "guest-name-cell";
      nameCell.textContent = guest.name;

      const linkCell = document.createElement("td");
      linkCell.className = "link-cell";
      const linkAnchor = document.createElement("a");
      linkAnchor.href = guest.link;
      linkAnchor.target = "_blank";
      linkAnchor.rel = "noopener noreferrer";
      linkAnchor.textContent = guest.link;
      linkCell.appendChild(linkAnchor);

      const attendanceCell = document.createElement("td");
      attendanceCell.className = "attendance-cell";
      attendanceCell.appendChild(createAttendanceBadge(guest.attendance));

      const copyCell = document.createElement("td");
      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-button";
      copyBtn.type = "button";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        const ok = await copyToClipboard(guest.link);
        if (ok) {
          copyBtn.textContent = "✓ Đã copy";
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.classList.remove("copied");
          }, 1500);
        } else {
          alert("Không thể sao chép link.");
        }
      });
      copyCell.appendChild(copyBtn);

      const deleteCell = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-button";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Xóa";
      deleteBtn.addEventListener("click", () => deleteGuest(guest.id, guest.name));
      deleteCell.appendChild(deleteBtn);

      row.appendChild(nameCell);
      row.appendChild(linkCell);
      row.appendChild(attendanceCell);
      row.appendChild(copyCell);
      row.appendChild(deleteCell);
      fragment.appendChild(row);
    });

    if (fragment !== guestTable) {
      guestTable.appendChild(fragment);
    }
  }

  if (guestSearch) {
    guestSearch.addEventListener("input", () => {
      searchQuery = guestSearch.value.trim();
      renderGuestsTable();
    });
  }

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      activeFilter = pill.getAttribute?.("data-filter") || "all";
      filterPills.forEach((p) => p.classList.toggle("active", p === pill));
      renderGuestsTable();
    });
  });

  if (exportGuestsCsvBtn) {
    exportGuestsCsvBtn.addEventListener("click", () => {
      if (!allGuests.length) {
        alert("Danh sách khách mời đang trống.");
        return;
      }
      const statusLabel = (s) =>
        s === "yes" ? "Có tham dự" : s === "no" ? "Không tham dự" : "Chưa xác nhận";
      const rows = [
        ["STT", "Tên khách mời", "Trạng thái xác nhận", "Link thiệp mời", "Ngày tạo"],
        ...allGuests.map((g, idx) => [
          idx + 1,
          g.name,
          statusLabel(g.attendance),
          g.link,
          g.created_at ? new Date(g.created_at).toLocaleString("vi-VN") : ""
        ])
      ];
      downloadBlob(buildCsv(rows), "danh-sach-khach-moi.csv", "text/csv;charset=utf-8");
    });
  }

  async function loadGuests() {
    try {
      const guests = await getJson("/api/admin/guests");
      if (!Array.isArray(guests)) {
        throw new Error("Dữ liệu khách không hợp lệ.");
      }
      allGuests = guests;
      updateStats(allGuests);
      renderGuestsTable();
    } catch (err) {
      console.error("GET GUESTS ERROR:", err);
      if (err.status === 401) {
        showLogin();
      }
    }
  }

  async function deleteGuest(id, name) {
    if (!confirm(`Xóa khách "${name}"?\n(Toàn bộ lời chúc của khách này cũng sẽ bị xóa)`)) {
      return;
    }
    try {
      await getJson(`/api/admin/guests/${id}`, { method: "DELETE" });
      await Promise.all([loadGuests(), loadWishes()]);
    } catch (err) {
      alert(err.message || "Không thể xóa khách.");
    }
  }

  // =====================================================
  // LOAD & MANAGE WISHES
  // =====================================================
  async function loadWishes() {
    try {
      const wishes = await getJson("/api/admin/wishes");
      if (!Array.isArray(wishes)) return;

      adminWishes.innerHTML = "";
      wishCount.textContent = String(wishes.length);

      if (wishes.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-wishes";
        empty.textContent = "Chưa có lời chúc nào.";
        adminWishes.appendChild(empty);
        return;
      }

      const fragment = document.createDocumentFragment
        ? document.createDocumentFragment()
        : adminWishes;

      wishes.forEach((wish) => {
        const item = document.createElement("div");
        item.className = "admin-wish-card";

        const header = document.createElement("div");
        header.className = "admin-wish-head";

        const nameSpan = document.createElement("span");
        nameSpan.className = "admin-wish-author";
        nameSpan.textContent = wish.name || "Khách mời";

        const timeSpan = document.createElement("span");
        timeSpan.className = "admin-wish-time";
        if (wish.created_at) {
          timeSpan.textContent = new Date(wish.created_at).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
        }

        header.appendChild(nameSpan);
        header.appendChild(timeSpan);

        const messageP = document.createElement("p");
        messageP.className = "admin-wish-message";
        messageP.textContent = wish.message;

        const delBtn = document.createElement("button");
        delBtn.className = "delete-wish-btn";
        delBtn.type = "button";
        delBtn.textContent = "Xóa lời chúc";
        delBtn.addEventListener("click", () => deleteWish(wish.id));

        item.appendChild(header);
        item.appendChild(messageP);
        item.appendChild(delBtn);

        fragment.appendChild(item);
      });

      if (fragment !== adminWishes) {
        adminWishes.appendChild(fragment);
      }
    } catch (err) {
      console.error("GET WISHES ERROR:", err);
    }
  }

  async function deleteWish(id) {
    if (!confirm("Xóa lời chúc này?")) return;
    try {
      await getJson(`/api/admin/wishes/${id}`, { method: "DELETE" });
      await loadWishes();
    } catch (err) {
      alert(err.message || "Không thể xóa lời chúc.");
    }
  }

  // =====================================================
  // BULK CREATE (BATCHED API — FAST & ZERO 429 ERRORS)
  // =====================================================
  const bulkList = document.getElementById("bulk-guest-list");
  const bulkCount = document.getElementById("bulk-count");
  const bulkStartButton = document.getElementById("bulk-start-button");
  const bulkStopButton = document.getElementById("bulk-stop-button");
  const bulkProgress = document.getElementById("bulk-progress");
  const bulkProgressFill = document.getElementById("bulk-progress-fill");
  const bulkProgressText = document.getElementById("bulk-progress-text");
  const bulkProgressCurrent = document.getElementById("bulk-progress-current");
  const bulkMessage = document.getElementById("bulk-message");
  const bulkResultsBox = document.getElementById("bulk-results-box");
  const bulkResults = document.getElementById("bulk-results");
  const bulkCopyButton = document.getElementById("bulk-copy-button");
  const bulkDownloadButton = document.getElementById("bulk-download-button");
  const bulkDownloadCsvButton = document.getElementById("bulk-download-csv-button");
  const bulkErrorsBox = document.getElementById("bulk-errors-box");
  const bulkErrorList = document.getElementById("bulk-error-list");

  const BULK_CHUNK_SIZE = 100;
  let bulkRunning = false;
  let bulkStopRequested = false;
  let lastBulkCreated = [];

  function parseBulkGuests(raw) {
    const seen = new Set();
    const guests = [];
    const skipped = { duplicate: 0, tooLong: 0 };
    raw.split(/\r?\n/).forEach((line) => {
      const name = line.trim();
      if (!name) return;
      if ([...name].length > 255) { skipped.tooLong += 1; return; }
      if (seen.has(name)) { skipped.duplicate += 1; return; }
      seen.add(name);
      guests.push(name);
    });
    return { guests, skipped };
  }

  function updateBulkCount() {
    if (!bulkList || !bulkCount) return { guests: [], skipped: { duplicate: 0, tooLong: 0 } };
    const parsed = parseBulkGuests(bulkList.value);
    bulkCount.textContent = String(parsed.guests.length);
    return parsed;
  }

  function renderBulkProgress(done, total, currentLabel, results, errors) {
    if (!bulkProgress) return;
    bulkProgress.classList.remove("hidden");
    const pct = total ? Math.round((done / total) * 100) : 0;
    if (bulkProgressFill) bulkProgressFill.style.width = pct + "%";
    if (bulkProgressText) {
      bulkProgressText.textContent = `Đã xử lý ${done}/${total} • Thành công: ${results.length} • Lỗi: ${errors.length}`;
    }
    if (bulkProgressCurrent) {
      bulkProgressCurrent.textContent = currentLabel || "";
    }
    if (bulkResultsBox && bulkResults && results.length > 0) {
      bulkResultsBox.classList.remove("hidden");
      bulkResults.value = results.map((r) => `${r.name} — ${r.link}`).join("\n");
    }
    if (bulkErrorsBox && bulkErrorList && errors.length > 0) {
      bulkErrorsBox.classList.remove("hidden");
      bulkErrorList.innerHTML = "";
      errors.forEach((e) => {
        const li = document.createElement("li");
        li.textContent = `${e.name}: ${e.error}`;
        bulkErrorList.appendChild(li);
      });
    }
  }

  async function runBulkCreate(guests) {
    bulkRunning = true;
    bulkStopRequested = false;
    lastBulkCreated = [];
    if (bulkStartButton) bulkStartButton.disabled = true;
    if (bulkStopButton) bulkStopButton.classList.remove("hidden");
    if (createButton) createButton.disabled = true;
    if (bulkMessage) {
      bulkMessage.textContent = "";
      bulkMessage.className = "message";
    }
    if (bulkResultsBox) bulkResultsBox.classList.add("hidden");
    if (bulkErrorsBox) bulkErrorsBox.classList.add("hidden");
    if (bulkErrorList) bulkErrorList.innerHTML = "";

    const results = [];
    const errors = [];
    renderBulkProgress(0, guests.length, "", results, errors);

    for (let offset = 0; offset < guests.length; offset += BULK_CHUNK_SIZE) {
      if (bulkStopRequested) break;
      const chunk = guests.slice(offset, offset + BULK_CHUNK_SIZE);
      renderBulkProgress(
        offset,
        guests.length,
        `Đang tạo lô ${offset + 1}–${offset + chunk.length}...`,
        results,
        errors
      );

      try {
        const data = await getJson("/api/admin/guests/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: chunk })
        });
        for (const item of data.created || []) {
          results.push({ name: item.name, link: item.link });
        }
      } catch (err) {
        console.error("BULK CREATE CHUNK ERROR:", err);
        for (const name of chunk) {
          errors.push({ name, error: err.message || "Tạo link thất bại." });
        }
        if (err.status === 401) break;
      }

      renderBulkProgress(results.length + errors.length, guests.length, "", results, errors);
    }

    lastBulkCreated = results;
    await loadGuests();
    bulkRunning = false;
    if (bulkStartButton) bulkStartButton.disabled = false;
    if (bulkStopButton) bulkStopButton.classList.add("hidden");
    if (createButton) createButton.disabled = false;
    if (bulkProgressCurrent) bulkProgressCurrent.textContent = "";
    if (bulkMessage) {
      const stopped = bulkStopRequested;
      bulkMessage.textContent = stopped
        ? `Đã dừng: tạo được ${results.length}/${guests.length} link (${errors.length} lỗi).`
        : `Hoàn tất: tạo thành công ${results.length}/${guests.length} link (${errors.length} lỗi).`;
      bulkMessage.className = errors.length ? "message error" : "message success";
    }
  }

  if (bulkList) {
    bulkList.addEventListener("input", updateBulkCount);
    updateBulkCount();
  }

  if (bulkStartButton) {
    bulkStartButton.addEventListener("click", () => {
      if (bulkRunning) return;
      const parsed = updateBulkCount();
      if (!parsed.guests.length) {
        if (bulkMessage) {
          bulkMessage.textContent = "Danh sách trống. Dán tên khách vào ô trên, mỗi khách một dòng.";
          bulkMessage.className = "message error";
        }
        return;
      }
      runBulkCreate(parsed.guests);
    });
  }

  if (bulkStopButton) {
    bulkStopButton.addEventListener("click", () => {
      bulkStopRequested = true;
      if (bulkMessage) {
        bulkMessage.textContent = "Đã gửi lệnh dừng, sẽ dừng ngay sau lô hiện tại…";
        bulkMessage.className = "message";
      }
    });
  }

  if (bulkCopyButton && bulkResults) {
    bulkCopyButton.addEventListener("click", async () => {
      const ok = await copyToClipboard(bulkResults.value);
      if (ok) {
        bulkCopyButton.textContent = "✓ Đã sao chép";
        setTimeout(() => { bulkCopyButton.textContent = "Sao chép tất cả"; }, 1500);
      } else {
        alert("Không thể sao chép link.");
      }
    });
  }

  if (bulkDownloadButton && bulkResults) {
    bulkDownloadButton.addEventListener("click", () => {
      if (!bulkResults.value) return;
      downloadBlob(bulkResults.value, "link-thiep-cuoi.txt", "text/plain;charset=utf-8");
    });
  }

  if (bulkDownloadCsvButton) {
    bulkDownloadCsvButton.addEventListener("click", () => {
      if (!lastBulkCreated.length) return;
      const rows = [
        ["STT", "Tên khách mời", "Link thiệp mời"],
        ...lastBulkCreated.map((item, idx) => [idx + 1, item.name, item.link])
      ];
      downloadBlob(buildCsv(rows), "link-thiep-cuoi.csv", "text/csv;charset=utf-8");
    });
  }

  // =====================================================
  // INITIALIZE & AUTO-REFRESH
  // =====================================================
  checkLogin();

  let isRefreshing = false;
  setInterval(async () => {
    if (document.hidden || adminScreen.classList.contains("hidden") || isRefreshing || bulkRunning) {
      return;
    }
    isRefreshing = true;
    try {
      await Promise.all([loadGuests(), loadWishes()]);
    } catch (err) {
      console.error("AUTO REFRESH ERROR:", err);
    } finally {
      isRefreshing = false;
    }
  }, 60000);

  // =====================================================
  // PWA: ĐĂNG KÝ SERVICE WORKER
  // =====================================================
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW REGISTRATION NOTE:", err);
      });
    });
  }
});
