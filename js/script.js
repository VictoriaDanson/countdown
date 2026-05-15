/**
 * ===== 倒计时应用主逻辑 =====
 * 主要功能：创建、编辑、删除倒计时，拖动排序，节假日数据集成
 */

// 存储键名 - 用于 localStorage
const STORAGE_KEY = "countdown_items_v1";

// 默认系统倒计时名称 - "下班班"自动定位到下一个节假日18:00
const SYSTEM_DEFAULT_NAME = "xiabanban";

/**
 * 倒计时项目的类型定义
 * @typedef {{
 *   id: string,                  // 唯一标识符
 *   title: string,               // 倒计时标题
 *   targetISO: string,           // 目标时间 ISO 字符串
 *   createdAt: number,           // 创建时间戳
 *   isSystemDefault?: boolean    // 是否为系统默认倒计时
 * }} CountdownItem
 */

// DOM 元素缓存 - 避免重复查询，提升性能
const els = {
  // 表单元素
  form: document.getElementById("countdownForm"),
  title: document.getElementById("titleInput"),
  date: document.getElementById("dateInput"),
  time: document.getElementById("timeInput"),
  hint: document.getElementById("formHint"),
  clearBtn: document.getElementById("clearBtn"),
  saveBtn: document.getElementById("saveBtn"),
  // 列表相关
  list: document.getElementById("countdownList"),
  empty: document.getElementById("emptyState"),
  chip: document.getElementById("countChip"),
  sortBtn: document.getElementById("sortBtn"),  
  // 节假日预设
  presetBar: document.getElementById("presetBar"),
  holidayTts: document.getElementById("holidayTts"),
  presetUpdateHint: document.getElementById("presetUpdateHint")
};
/**
 * ===== 数据存储管理 =====
 */

/**
 * 从 localStorage 加载倒计时项目
 * 包含数据验证和类型转换
 * @returns {CountdownItem[]} 倒计时项目数组
 */
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
        isSystemDefault: Boolean(x.isSystemDefault),
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

// ---- 节假日计算（周六日 + 可选法定节假日配置） ----

// 节假日数据来源：holiday-data.js（由 Node 脚本生成）
const CURRENT_YEAR = new Date().getFullYear();
const HOLIDAY_DATA = (typeof window !== "undefined" && window.HOLIDAY_DATA) || {};

const HOLIDAY_DATES = [];
const WORKDAY_OVERRIDES = [];
let FESTIVAL_PRESETS = {};

(() => {
  const entry = HOLIDAY_DATA[String(CURRENT_YEAR)];
  if (!entry || typeof entry !== "object") return;

  if (Array.isArray(entry.HOLIDAY_DATES)) {
    for (const d of entry.HOLIDAY_DATES) {
      if (typeof d === "string") HOLIDAY_DATES.push(d);
    }
  }

  if (Array.isArray(entry.WORKDAY_OVERRIDES)) {
    for (const d of entry.WORKDAY_OVERRIDES) {
      if (typeof d === "string") WORKDAY_OVERRIDES.push(d);
    }
  }

  if (entry.FESTIVAL_PRESETS && typeof entry.FESTIVAL_PRESETS === "object") {
    FESTIVAL_PRESETS = entry.FESTIVAL_PRESETS;
  }
})();

function dateKey(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHolidayDate(date) {
  const key = dateKey(date);
  if (HOLIDAY_DATES.indexOf(key) !== -1) return true;

  if (isWeekend(date)) {
    if (WORKDAY_OVERRIDES.indexOf(key) !== -1) return false;
    return true;
  }

  return false;
}

function buildDateTime(date, h, m, s) {
  const d = new Date(date.getTime());
  d.setHours(h, m, s, 0);
  return d;
}

// ---- 法定节假日快速预设：节日按钮 + 00:00 目标时间 ----

const FESTIVAL_ORDER = [
  "元旦",
  "春节",
  "清明节",
  "劳动节",
  "端午节",
  "中秋节",
  "国庆节",
];

/**
 * 判断当前节假日快速预设是否需要更新
 * 规则：
 * 1. 当前年份在 HOLIDAY_DATA 里不存在
 * 2. 距离当前年份结束 <= 15 天，且下一年数据尚未准备好时，提示准备更新下一年
 */
function needsFestivalPresetUpdate(now) {
  const year = now.getFullYear();
  const yearKey = String(year);
  const nextYearKey = String(year + 1);
  const entry = HOLIDAY_DATA[yearKey];
  const nextEntry = HOLIDAY_DATA[nextYearKey];

  /** @type {string[]} */
  const reasons = [];

  // 1. 当前年份在 HOLIDAY_DATA 里不存在
  if (!entry || typeof entry !== "object") {
    reasons.push(`当前年份 ${year} 的节假日数据在 HOLIDAY_DATA 中不存在。`);
  }

  // 2. 距离当前年份结束 <= 15 天，且下一年数据尚未准备好
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const msLeft = yearEnd.getTime() - now.getTime();
  const daysLeft = msLeft / (24 * 60 * 60 * 1000);
  if (daysLeft <= 15 && (!nextEntry || typeof nextEntry !== "object" || nextEntry.HOLIDAY_DATES?.length === 0)) {
    reasons.push(
      `距离 ${year} 年结束仅剩约 ${Math.max(0, Math.floor(daysLeft))} 天，请准备更新 ${
        year + 1
      } 年的节假日数据。`,
    );
  }

  return {
    need: reasons.length > 0,
    reasons,
  };
}

function renderFestivalPresets() {
  if (!els.presetBar) return;

  const todayKey = dateKey(new Date());

  // 只展示“今天之后”的节假日快速预设
  const names = FESTIVAL_ORDER.filter((name) => {
    if (!Object.prototype.hasOwnProperty.call(FESTIVAL_PRESETS, name)) return false;
    const d = FESTIVAL_PRESETS[name];
    if (typeof d !== "string" || !d) return false;
    return d > todayKey;
  });

  if (!names.length) return;

  const html = names
    .map(
      (name) => `
        <button
          type="button"
          class="iconBtn"
          data-festival="${name}"
          title="快速预设：${name}"
        >
          ${name}
        </button>
      `,
    )
    .join("");

  els.presetBar.insertAdjacentHTML("beforeend", html);
}

// 查找从当前时间起最近的一次节假日的「前一天 18:00」：
// - xiabanban 默认目标时间统一为 18:00
// - 从明天开始往后找节假日
// - 对每个节假日，计算其前一天 18:00，选第一个还在未来的作为目标
function findNextHolidayTarget(now) {
  const today = new Date(now.getTime());
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(today.getTime());

  for (let i = 1; i <= 365; i++) {
    candidate.setDate(candidate.getDate() + 1);

    if (!isHolidayDate(candidate)) {
      continue;
    }

    // 节假日的前一天 18:00 作为目标
    const dayBefore = new Date(candidate.getTime());
    dayBefore.setDate(dayBefore.getDate() - 1);
    const target = buildDateTime(dayBefore, 18, 0, 0);

    if (target.getTime() > now.getTime()) {
      return target;
    }
  }

  // 兜底：如果一年内都没找到合适的目标，就用今天 18:00
  return buildDateTime(today, 18, 0, 0);
}

function ensureSystemDefaultCountdown() {
  const now = new Date();
  const targetDate = findNextHolidayTarget(now);
  const targetISO = targetDate.toISOString();

  let existing = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].isSystemDefault) {
      existing = items[i];
      break;
    }
  }

  if (!existing) {
    const newItem = {
      id: uid(),
      title: SYSTEM_DEFAULT_NAME,
      targetISO,
      createdAt: Date.now(),
      isSystemDefault: true,
    };
    items = [newItem, ...items];
    saveItems(items);
    return;
  }

  const currentTarget = new Date(existing.targetISO);
  if (Number.isNaN(currentTarget.getTime()) || currentTarget.getTime() <= now.getTime()) {
    existing.targetISO = targetISO;
    existing.isSystemDefault = true;
    saveItems(items);
  }
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
      const isSystemDefault = Boolean(item.isSystemDefault);
      return `
        <li class="item" data-id="${escapeHtml(item.id)}" draggable="true">
          <div class="itemTop">
            <div>
              <div class="itemTitle">${escapeHtml(item.title)}</div>
              <div class="itemMeta">目标：${escapeHtml(targetText)}</div>
            </div>
            ${
              isSystemDefault
                ? ""
                : `<div class="itemActions">
                     <button class="iconBtn" type="button" data-action="edit" aria-label="编辑">
                       编辑
                     </button>
                     <button class="iconBtn danger" type="button" data-action="delete" aria-label="删除">
                       删除
                     </button>
                   </div>`
            }
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

// 按目标时间从近到远排序
/** @param {CountdownItem[]} list */
function sortItemsByTimeAsc(list) {
  return [...list].sort((a, b) => {
    const ta = new Date(a.targetISO).getTime();
    const tb = new Date(b.targetISO).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });
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
let draggingId = null;

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

// 确保存在一个名为 "xiabanban" 的默认倒计时
ensureSystemDefaultCountdown();

// 初始渲染法定节假日快速预设按钮
renderFestivalPresets();

// 判断是否需要更新快速预设，并在页面显示提示
if (els.presetUpdateHint) {
  const { need, reasons } = needsFestivalPresetUpdate(new Date());
  if (need) {
    els.presetUpdateHint.textContent =
      "节假日快速预设可能需要更新，请更新 holiday-data.js：" + reasons.join(" ");
  } else {
    els.presetUpdateHint.textContent = "";
  }
}

// 初始渲染（使用本地存储中的顺序）
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

  // 检查是否存在相同标题和目标时间的倒计时，避免重复保存
  const duplicateItem = items.find(
    (x) =>
      (!editingId || x.id !== editingId) &&
      x.title === res.title &&
      x.targetISO === res.targetISO,
  );
  if (duplicateItem) {
    setHint("已存在相同的倒计时，请勿重复保存", true);

    // 列表中高亮重复的卡片：绿色渐变边框闪烁 2 下后消失
    const li = els.list.querySelector(`.item[data-id="${CSS.escape(duplicateItem.id)}"]`);
    if (li) {
      li.classList.remove("duplicate-highlight");
      // 强制回流，确保重复添加类时动画会重新触发
      void li.offsetWidth;
      li.classList.add("duplicate-highlight");

      const handleAnimationEnd = () => {
        li.classList.remove("duplicate-highlight");
        li.removeEventListener("animationend", handleAnimationEnd);
      };
      li.addEventListener("animationend", handleAnimationEnd);
    }

    return;
  }

  if (editingId) {
    // 更新已存在的倒计时
    items = items.map((x) =>
      x.id === editingId ? { ...x, title: res.title, targetISO: res.targetISO } : x,
    );
    // 保存前按时间从近到远排序
    items = sortItemsByTimeAsc(items);
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

    // 新增后按时间从近到远排序
    items = sortItemsByTimeAsc([newItem, ...items]);
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

  const item = items.find((x) => x.id === id);
  if (!item) return;

  // 系统默认倒计时不可编辑或删除
  if (item.isSystemDefault) {
    setHint("默认倒计时不可编辑或删除", true);
    return;
  }

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
    enterEditMode(item);
  }
});

// 节日快速预设：点击按钮，自动填充标题/日期/时间（00:00），等待用户保存
if (els.presetBar) {
  els.presetBar.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-festival]");
    if (!btn) return;

    const festName = btn.getAttribute("data-festival");
    if (!festName) return;

    const dateKey = FESTIVAL_PRESETS[festName];
    if (!dateKey) {
      setHint(`未找到【${festName}】的节假日日期，请先更新节假日数据`, true);
      return;
    }

    // 退出编辑状态，清空表单
    exitEditMode();
    clearForm();

    // 快速预设：标题 = 节日名，日期 = 节日当天，时间 = 00:00
    els.title.value = festName;
    els.date.value = dateKey;
    els.time.value = "00:00";

    setHint(`已应用【${festName}】预设（${dateKey} 00:00），请确认后保存。`, false);
  });
}

window.addEventListener("storage", (e) => {
  if (e.key !== STORAGE_KEY) return;
  items = loadItems();
  render(items);
  tick(items);
});

window.addEventListener("beforeunload", () => {
  clearInterval(timer);
});

// 最近放假安排 TTS 文案
function loadHolidayTts() {
  if (!els.holidayTts) return;

  fetch("https://timor.tech/api/holiday/tts")
    .then((res) => res.json())
    .then((data) => {
      if (data && data.code === 0 && data.tts) {
        els.holidayTts.textContent = data.tts;
      }
    })
    .catch(() => {
      // 忽略错误，不展示文案即可
    });
}

// 页面加载时拉取一次文案
loadHolidayTts();

if (els.sortBtn) {
  let sortAsc = true; // true: 近 -> 远, false: 远 -> 近

  els.sortBtn.addEventListener("click", () => {
    if (!items.length) return;

    items = [...items].sort((a, b) => {
      const ta = new Date(a.targetISO).getTime();
      const tb = new Date(b.targetISO).getTime();
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return sortAsc ? ta - tb : tb - ta;
    });

    saveItems(items);
    render(items);
    tick(items);

    sortAsc = !sortAsc;
    if (sortAsc) {
      setHint("已按时间从近到远排序", false);
      els.sortBtn.textContent = "按时间排序";
      els.sortBtn.title = "按目标时间排序（最近的在前）";
    } else {
      setHint("已按时间从远到近排序", false);
      els.sortBtn.textContent = "按时间倒序";
      els.sortBtn.title = "按目标时间排序（最远的在前）";
    }
  });
}

// ---- 日期详情显示 ----

/**
 * 更新选中日期详情显示
 */
function updateDateDetails() {
  // if (!selectedDate) return;

  // try {
  //   // 获取日期详情
  //   const details = getSelectedDateDetails();

  //   // 获取日期对象
  //   const date = new Date(selectedDate);
  //   const dateStr = formatDate(date);
  //   const festivalName = getFestivalName(date);
  //   const isHoliday = isOfficialHoliday(date);
  //   const isWeekendDay = isWeekend(date);
  //   const isMakeUp = isMakeUpWorkday(date);

  //   // 更新显示
  //   document.getElementById('solarDate').textContent = dateStr;
  //   document.getElementById('lunarDate').textContent = details.day;
  //   document.getElementById('festivalName').textContent = festivalName || '-';
  //   document.getElementById('isHoliday').textContent = isHoliday ? '是' : '否';
  //   document.getElementById('isWeekend').textContent = isWeekendDay ? '是' : '否';
  //   document.getElementById('isMakeUpWorkday').textContent = isMakeUp ? '是' : '否';
  //   document.getElementById('goodActs').textContent = details.good || '-';
  //   document.getElementById('badActs').textContent = details.bad || '-';
  // } catch (error) {
  //   console.error('更新日期详情失败:', error);
  // }
}

// ---- 拖动排序 ----

// 重新根据当前 DOM 中 li 的顺序生成 items 并保存
function syncItemsOrderFromDom() {
  const ids = Array.from(els.list.querySelectorAll(".item"))
    .map((li) => li.getAttribute("data-id"))
    .filter(Boolean);

  if (!ids.length) return;

  const map = new Map(items.map((x) => [x.id, x]));
  items = ids
    .map((id) => map.get(id))
    .filter(Boolean);

  saveItems(items);
}

els.list.addEventListener("dragstart", (e) => {
  const li = e.target.closest(".item");
  if (!li) return;
  const id = li.getAttribute("data-id");
  if (!id) return;

  draggingId = id;
  li.classList.add("dragging");
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    // 一些浏览器要求设置 data 才会触发拖动
    e.dataTransfer.setData("text/plain", id);
  }
});

els.list.addEventListener("dragend", (e) => {
  const li = e.target.closest(".item");
  if (li) li.classList.remove("dragging");
  draggingId = null;
});

els.list.addEventListener("dragover", (e) => {
  if (!draggingId) return;
  e.preventDefault();

  const afterElement = (() => {
    const itemsEls = Array.from(els.list.querySelectorAll(".item"));
    const y = e.clientY;
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    for (const el of itemsEls) {
      if (el.classList.contains("dragging")) continue;
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closest = el;
      }
    }
    return closest;
  })();

  const draggingEl = els.list.querySelector(".item.dragging");
  if (!draggingEl) return;

  if (!afterElement) {
    els.list.appendChild(draggingEl);
  } else {
    els.list.insertBefore(draggingEl, afterElement);
  }
});

els.list.addEventListener("drop", (e) => {
  e.preventDefault();
  if (!draggingId) return;
  syncItemsOrderFromDom();
  // 重新渲染是为了确保 DOM 与内部 items 完全一致
  render(items);
  tick(items);
});
