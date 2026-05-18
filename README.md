# 倒计时网页（HTML + CSS + JavaScript）

一个基于原生 HTML/CSS/JavaScript 的倒计时应用，可创建多个倒计时，支持节假日自动计算与本地持久化存储。

## 使用方式

- 直接用浏览器打开 `index.html`
- 建议使用现代浏览器（Chrome / Edge / Safari / Firefox）

## 功能特性

- 新增倒计时：填写 **标题 / 目标日期 / 目标时间** 并保存
- 实时刷新：倒计时每秒更新剩余天数、小时、分钟、秒
- 本地持久化：数据保存在浏览器 `localStorage`，刷新页面不会丢失
- 内置系统倒计时 `xiabanban`：
  - 自动对齐到最近节假日（含周末、法定节假日）的前一天 18:00
  - 使用静态节假日数据（含调休上班日）计算
  - 为系统默认项，具有唯一标识，不可编辑和删除
- 法定节假日快速预设：
  - 内置元旦、春节、清明节、劳动节、端午节、中秋节、国庆节预设按钮
  - 一键填充对应节假日当天 00:00 的倒计时
  - 仅展示”今天之后”的节假日按钮
- 重复检测：如已存在同一标题且目标时间完全相同的倒计时，阻止保存并高亮列表中已存在的卡片（绿色渐变边框闪烁）
- 拖动排序：支持拖拽倒计时卡片调整顺序，排序会写回 `localStorage`
- 目标时间排序按钮：支持在”从近到远”和”从远到近”之间切换
- 日历与日期详情：
  - 集成双日期日历组件（公历 + 农历）
  - 点击日历中的任意日期可填充表单日期
  - 使用 lunisolar 库获取农历和简单黄历信息
  - 日期详情显示：显示选中日期距离今天的天数（例如：”距离 2026年端午节 还有32天”）
- 节假日预设更新提示：
  - 当 `holiday-data.js` 中缺少当前年份的数据时提示
  - 或距离年末不足 15 天且下一年数据尚未准备好时提示
- 多格式日期支持：
  - `formatDate` 函数支持多种日期格式（yyyy-MM-dd, yyyy年MM月dd日, MM/dd/yyyy, dd-MM-yyyy, yyyy/MM/dd）

## 文件结构

- `index.html`：主页面结构
- `style.css`：绿色主题 UI（圆角、阴影、响应式布局）
- `js/script.js`：倒计时主逻辑
  - 管理倒计时增删改查、表单校验、重复检测
  - 处理 `xiabanban` 系统倒计时的自动维护
  - 集成节假日静态数据与快速预设按钮
  - 实现拖动排序与本地存储同步
- `js/calendar.js`：日历组件
  - 展示公历 + 农历双日期
  - 与主表单解耦，点击日期时只负责回填日期输入框
- `js/holiday-data.js`：静态节假日数据文件（由脚本自动生成）
- `js/lib/lunisolar@2.6.0.js`：第三方农历与黄历库
- `scripts/generate-holidays.js`：Node 脚本，从节假日 API 拉取数据并生成 `holiday-data.js`
- `package.json`：npm 脚本定义（主要用于生成节假日数据）

## 倒计时数据结构

每个倒计时以对象形式存储在 `localStorage` 的 `countdown_items_v1` 键下，结构如下：

```js
{
  id: string,        // 唯一标识符
  title: string,     // 倒计时标题
  targetISO: string, // 目标时间的 ISO 字符串
  createdAt: number, // 创建时间戳（毫秒）
  isSystemDefault?: boolean // 是否为系统默认倒计时（仅 xiabanban 使用）
}
```

## 节假日数据说明

节假日数据存放在 `js/holiday-data.js` 中，脚本运行后会生成类似结构：

```js
window.HOLIDAY_DATA = {
  "2026": {
    HOLIDAY_DATES: ["2026-01-01", ...],      // 法定节假日日期（含周末）
    WORKDAY_OVERRIDES: ["2026-02-18", ...], // 周末调休为工作日的日期
    FESTIVAL_PRESETS: {                       // 节日快速预设按钮使用
      "元旦": "2026-01-01",
      "春节": "2026-02-17",
      // ...
    }
  },
  // 其他年份...
};
```

- `HOLIDAY_DATES`：用来判断“是否节假日”，包括周末和法定节日
- `WORKDAY_OVERRIDES`：周末调休改为工作日时的日期（例如部分周末上班）
- `FESTIVAL_PRESETS`：节日名称到具体日期的映射，用于生成预设按钮

主逻辑中会根据当前年份自动读取对应字段：

- 使用 `isHolidayDate(date)` 判断某日是否为节假日（含周末 + 法定）
- 使用 `findNextHolidayTarget(now)` 计算最近节假日前一天 18:00 作为 `xiabanban` 的目标时间

## 节假日数据自动生成

依赖 Node.js 环境，脚本位于 `scripts/generate-holidays.js`。

在项目根目录运行：

- 使用当前年份生成全年节假日数据：

  ```bash
  npm start
  # 或
  node scripts/generate-holidays.js
  ```

- 显式指定年份（例如 2026）：

  ```bash
  node scripts/generate-holidays.js 2026
  ```

说明：

- 脚本会从 `https://timor.tech/api/holiday/year/{year}` 拉取节假日数据
- 生成或更新 `js/holiday-data.js` 中对应年份的记录
- 仅覆盖指定年份的数据，其它年份会被保留
- 页面加载时会根据当前年份读取数据，用于计算 `xiabanban` 与节日快速预设

## 开发与调试

- 无需构建流程，直接双击 `index.html` 即可预览
- 如需更新节假日数据，先安装依赖再运行脚本：

  ```bash
  npm install
  npm start
  ```

- 建议在控制台观察：
  - `localStorage` 中 `countdown_items_v1` 的值
  - 网络请求 `https://timor.tech/api/holiday/tts` 的结果（用于顶部 TTS 提示）
