#!/usr/bin/env node

// 使用公开节假日接口，生成本地静态节假日数据文件 holiday-data.js
// 默认生成当前年份和下一年份的数据：
//   node scripts/generate-holidays.js            // 使用当前年份
//   node scripts/generate-holidays.js 2025       // 指定起始年份

const https = require("https");
const fs = require("fs");
const path = require("path");

/**
 * 简单 GET 请求并解析为 JSON
 * @param {string} url
 * @returns {Promise<any>}
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Request failed: ${res.statusCode}`));
          res.resume();
          return;
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * 从节假日接口中构造 HOLIDAY_DATES 与 WORKDAY_OVERRIDES
 * 仅保留 "当前日期之后" 的节假日与周末补班日。
 * @param {number} year
 * @param {Record<string, any>} holidayMap
 * @param {Date} minDate 仅保留 >= minDate 的日期
 */
function buildYearArrays(year, holidayMap, minDate) {
  const holidayDates = [];
  const workdayOverrides = [];

  if (!holidayMap || typeof holidayMap !== "object") {
    return { holidayDates, workdayOverrides };
  }

  for (const [dateKey, info] of Object.entries(holidayMap)) {
    if (!dateKey) continue;
    const meta = info || {};

    // timor 接口返回的 holiday map key 通常为 "MM-DD"，
    // meta.date 一般为 "YYYY-MM-DD"，优先使用 meta.date。
    const fullDateStr =
      typeof meta.date === "string" && meta.date
        ? meta.date
        : `${year}-${dateKey}`;

    const d = new Date(fullDateStr);
    if (Number.isNaN(d.getTime())) continue;

    // 只保留当前日期之后（含当天）的记录
    if (minDate && d.getTime() < minDate.getTime()) {
      continue;
    }

    const isHoliday = meta.isHoliday === true || meta.holiday === true;
    if (isHoliday) {
      holidayDates.push(fullDateStr);
      continue;
    }

    // 非节假日，但若是周六/周日，则视为调休上班日（周末补班）
    const day = d.getDay(); // 0=周日, 6=周六
    if (day === 0 || day === 6) {
      workdayOverrides.push(fullDateStr);
    }
  }

  holidayDates.sort();
  workdayOverrides.sort();

  return { holidayDates, workdayOverrides };
}

async function fetchYearHoliday(year, minDate) {
  const url = `https://timor.tech/api/holiday/year/${year}`;
  // 若需替换为其他节假日 API，可修改此 URL 及解析逻辑
  const data = await fetchJson(url);
  if (!data || typeof data !== "object") {
    throw new Error(`Invalid response for year ${year}`);
  }

  if (typeof data.code !== "undefined" && data.code !== 0) {
    throw new Error(`API error for year ${year}: code=${data.code}`);
  }

  const holidayMap = data.holiday || data.data || data.result || {};
  return buildYearArrays(year, holidayMap, minDate);
}

async function main() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const argYear = process.argv[2];
  const baseYear = argYear ? Number(argYear) : now.getFullYear();
  if (!Number.isInteger(baseYear) || baseYear < 1970 || baseYear > 2100) {
    console.error("请输入合法的年份，例如：2025");
    process.exit(1);
  }

  // 只生成“当前年份”数据，并且只保留当前日期之后的记录
  const years = [baseYear];
  const allData = {};

  for (const year of years) {
    try {
      console.log(`Fetching holiday data for year ${year}...`);
      const minDate = year === now.getFullYear() ? now : new Date(`${year}-01-01T00:00:00`);
      const { holidayDates, workdayOverrides } = await fetchYearHoliday(year, minDate);
      allData[year] = {
        HOLIDAY_DATES: holidayDates,
        WORKDAY_OVERRIDES: workdayOverrides,
      };
      console.log(
        `Year ${year}: holidays=${holidayDates.length}, weekend-work=${workdayOverrides.length}`,
      );
    } catch (err) {
      console.error(`Failed to fetch year ${year}:`, err.message || err);
    }
  }

  const outPath = path.join(__dirname, "..", "holiday-data.js");
  const content =
    "// 自动生成，请勿手动修改\n" +
    "// 生成命令：node scripts/generate-holidays.js [起始年份]\n" +
    "window.HOLIDAY_DATA = " +
    JSON.stringify(allData, null, 2) +
    ";\n";

  fs.writeFileSync(outPath, content, "utf8");
  console.log(`写入节假日数据到 ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
