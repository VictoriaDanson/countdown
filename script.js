const STORAGE_KEY = "countdown_items_v1";

/** @typedef {{ id: string, title: string, targetISO: string, createdAt: number }} CountdownItem */

const els = {
  form: document.getElementById("countdownForm"),
  title: document.getElementById("titleInput"),
  date: document.getElementById("dateInput"),
  time: document.getElementById("timeInput"),
  hint: document.getElementById("formHint"),
  clearBtn: document.getElementById("clearBtn"),
  saveBtn: document.getElementById("saveBtn"),
  list: document.getElementById("countdownList"),
  empty: document.getElementById("emptyState"),
  chip: document.getElementById("countChip"),
};

/** @returns {CountdownItem[]} */
function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        id: String(x.id || ""),
        title: String(x.title || ""),
        targetISO: String(x.targetISO || ""),
        createdAt: Number(x.createdAt || Date.now()),
      }))
      .filter((x) => x.id && x.title && x.targetISO);
  } catch {
    return [];
  }
}

/** @param {CountdownItem[]} items */
function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function setHint(message, isError = false) {
  els.hint.textContent = message || "";
  els.hint.classList.toggle("error", Boolean(isError));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTarget(targetDate) {
  const y = targetDate.getFullYear();
  const m = pad2(targetDate.getMonth() + 1);
  const d = pad2(targetDate.getDate());
  const hh = pad2(targetDate.getHours());
  const mm = pad2(targetDate.getMinutes());
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

/**
 * @param {number} msLeft
 * @returns {{ done: boolean, days: number, hours: number, minutes: number, seconds: number }}
 */
function splitTime(msLeft) {
  if (msLeft <= 0) {
    return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { done: false, days, hours, minutes, seconds };
}

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** @param {CountdownItem[]} items */
function render(items) {
  els.chip.textContent = String(items.length);
  els.empty.style.display = items.length ? "none" : "block";
  els.list.innerHTML = items
    .map((item) => {
      const target = new Date(item.targetISO);
      const targetText = isNaN(target.getTime()) ? "无效时间" : formatTarget(target);
      return `
        <li class="item" data-id="${escapeHtml(item.id)}">
          <div class="itemTop">
            <div>
              <div class="itemTitle">${escapeHtml(item.title)}</div>
              <div class="itemMeta">目标：${escapeHtml(targetText)}</div>
            </div>
            <div class="itemActions">
              <button class="iconBtn" type="button" data-action="edit" aria-label="编辑">
                编辑
              </button>
              <button class="iconBtn danger" type="button" data-action="delete" aria-label="删除">
                删除
              </button>
            </div>
          </div>
          <div class="timeLeft" data-role="time">
            <div class="pill"><div class="pillNum" data-k="days">-</div><div class="pillLabel">天</div></div>
            <div class="pill"><div class="pillNum" data-k="hours">-</div><div class="pillLabel">小时</div></div>
            <div class="pill"><div class="pillNum" data-k="minutes">-</div><div class="pillLabel">分钟</div></div>
            <div class="pill"><div class="pillNum" data-k="seconds">-</div><div class="pillLabel">秒</div></div>
          </div>
        </li>
      `;
    })
    .join("");
}

/** @param {CountdownItem[]} items */
function tick(items) {
  const now = Date.now();
  for (const item of items) {
    const li = els.list.querySelector(`.item[data-id="${CSS.escape(item.id)}"]`);
    if (!li) continue;
    const targetMs = new Date(item.targetISO).getTime();
    const timeBox = li.querySelector('[data-role="time"]');
    if (!timeBox || Number.isNaN(targetMs)) continue;

    const { done, days, hours, minutes, seconds } = splitTime(targetMs - now);
    timeBox.querySelector('[data-k="days"]').textContent = String(days);
    timeBox.querySelector('[data-k="hours"]').textContent = pad2(hours);
    timeBox.querySelector('[data-k="minutes"]').textContent = pad2(minutes);
    timeBox.querySelector('[data-k="seconds"]').textContent = pad2(seconds);

    li.style.opacity = done ? "0.75" : "1";
  }
}

function getFormTargetISO() {
  const title = els.title.value.trim();
  const date = els.date.value;
  const time = els.time.value;
  if (!title) return { ok: false, message: "请填写标题" };
  if (!date) return { ok: false, message: "请选择目标日期" };
  if (!time) return { ok: false, message: "请选择目标时间" };

  // local time
  const target = new Date(`${date}T${time}:00`);
  if (Number.isNaN(target.getTime())) return { ok: false, message: "目标时间无效" };
  if (target.getTime() <= Date.now()) return { ok: false, message: "目标时间需要在未来" };

  return { ok: true, title, targetISO: target.toISOString() };
}

function clearForm() {
  els.title.value = "";
  els.date.value = "";
  els.time.value = "";
  setHint("");
  els.title.focus();
}

let items = loadItems();
let editingId = null;

function enterEditMode(item) {
  editingId = item.id;
  els.title.value = item.title;

  const target = new Date(item.targetISO);
  if (!Number.isNaN(target.getTime())) {
    const y = target.getFullYear();
    const m = pad2(target.getMonth() + 1);
    const d = pad2(target.getDate());
    const hh = pad2(target.getHours());
    const mm = pad2(target.getMinutes());
    els.date.value = `${y}-${m}-${d}`;
    els.time.value = `${hh}:${mm}`;
  } else {
    els.date.value = "";
    els.time.value = "";
  }

  if (els.saveBtn) {
    els.saveBtn.textContent = "保存修改";
  }
  setHint(`正在编辑：「${item.title}」`, false);
}

function exitEditMode() {
  editingId = null;
  if (els.saveBtn) {
    els.saveBtn.textContent = "保存倒计时";
  }
}

function clearFormAndExitEdit() {
  clearForm();
  exitEditMode();
}

// sort: nearest first
items.sort((a, b) => new Date(a.targetISO).getTime() - new Date(b.targetISO).getTime());
render(items);
tick(items);

let timer = setInterval(() => tick(items), 1000);

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const res = getFormTargetISO();
  if (!res.ok) {
    setHint(res.message, true);
    return;
  }

  if (editingId) {
    // 更新已存在的倒计时
    items = items
      .map((x) =>
        x.id === editingId
          ? { ...x, title: res.title, targetISO: res.targetISO }
          : x,
      )
      .sort((a, b) => new Date(a.targetISO).getTime() - new Date(b.targetISO).getTime());
    saveItems(items);
    render(items);
    tick(items);
    setHint("已更新倒计时", false);
    editingId = null;
    if (els.saveBtn) {
      els.saveBtn.textContent = "保存倒计时";
    }
    clearForm();
  } else {
    // 新增倒计时
    const newItem = {
      id: uid(),
      title: res.title,
      targetISO: res.targetISO,
      createdAt: Date.now(),
    };

    items = [newItem, ...items].sort(
      (a, b) => new Date(a.targetISO).getTime() - new Date(b.targetISO).getTime(),
    );
    saveItems(items);
    render(items);
    tick(items);
    setHint("已保存到本地浏览器", false);
  }
});

els.clearBtn.addEventListener("click", () => {
  clearForm();
  editingId = null;
  if (els.saveBtn) {
    els.saveBtn.textContent = "保存倒计时";
  }
});

els.list.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  const li = btn.closest(".item");
  if (!li) return;
  const id = li.getAttribute("data-id");
  if (!id) return;

  if (action === "delete") {
    items = items.filter((x) => x.id !== id);
    saveItems(items);
    render(items);
    tick(items);
    setHint("已删除（本地）", false);
    if (editingId === id) {
      // 删除的是正在编辑的项，退出编辑
      editingId = null;
      clearForm();
      if (els.saveBtn) {
        els.saveBtn.textContent = "保存倒计时";
      }
    }
  } else if (action === "edit") {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    enterEditMode(item);
  }
});

window.addEventListener("storage", (e) => {
  if (e.key !== STORAGE_KEY) return;
  items = loadItems().sort((a, b) => new Date(a.targetISO).getTime() - new Date(b.targetISO).getTime());
  render(items);
  tick(items);
});

window.addEventListener("beforeunload", () => {
  clearInterval(timer);
});

