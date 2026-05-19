# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 提供在处理此代码库代码时的指导。

## 项目概述

这是一个使用原生 HTML、CSS 和 JavaScript 构建的简单倒计时 Web 应用程序。该应用允许用户创建、编辑和删除具有目标日期/时间的倒计时器。所有数据都存储在浏览器的 localStorage 中以实现持久化。

## 主要功能

- **持久化存储**：所有倒计时保存到 localStorage，可 survived 页面刷新
- **系统默认计时器**："xiabanban" - 自动以下一个假期的 18:00 为目标
- **节日集成**：从 timor.tech API 获取并使用中国节日数据
- **快速预设**：一键倒计时模板用于主要中国节日（元旦, 春节, 清明节, 等）
- **拖放**：通过拖动列表中的项目重新排序倒计时
- **实时更新**：倒计时值每秒更新一次
- **重复预防**：防止保存具有相同标题和目标时间的倒计时
- **双日期日历**：显示公历（格里高利）和农历日期，并支持点击选择功能

## 架构

### 文件结构
- `index.html` - 具有语义元素的主 HTML 结构
- `style.css` - 绿色主题 UI，具有响应式设计
- `js/script.js` - 主应用程序逻辑
- `js/calendar.js` - 具有双日期显示的日历组件（独立模块）
- `js/holiday-data.js` - 自动生成的静态节日数据
- `js/lib/lunisolar@2.6.0.js` - 第三方农历日历库
- `scripts/generate-holidays.js` - 用于获取和生成节日数据的 Node.js 脚本
- `package.json` - 用于节日数据生成的 npm 脚本

### 模块分离
- **主应用程序**（`js/script.js`）：管理倒计时、表单处理、拖放、localStorage 持久化和系统默认计时器
- **日历组件**（`js/calendar.js`）：独立模块，用于具有双日期显示（公历 + 农历）的日期选择
- **节日数据系统**：独立模块，为计算提供节日信息

### 数据流
1. 用户通过表单创建/编辑倒计时或点击日历日期
2. 数据验证并存储在 localStorage 中的 "countdown_items_v1"
3. 系统 "xiabanban" 倒计时自动更新为下一个假期的 18:00
4. 倒计时列表以每秒的实时更新进行渲染
5. 节日数据从 `js/holiday-data.js` 加载（自动生成）
6. 日历在选中日期时更新表单日期输入

### 倒计时数据结构
每个倒计时是一个对象，包含：
```typescript
{
  id: string,
  title: string,
  targetISO: string, // ISO 格式日期时间字符串
  createdAt: number,
  isSystemDefault?: boolean // 仅用于 "xiabanban"
}
```

### 节日数据系统
- 从 `https://timor.tech/api/holiday/year/{year}` 获取
- 生成静态 `js/holiday-data.js`，包含 3 个数组：
  - `HOLIDAY_DATES` - 法定节假日日期
  - `WORKDAY_OVERRIDES` - 调休工作日（调整后的工作日）
  - `FESTIVAL_PRESETS` - 主要节日的快速预设日期
- 更新命令：`npm start` 或 `node scripts/generate-holidays.js [year]`

## 开发命令

```bash
# 安装依赖（如果需要）
npm install

# 为当前年份生成节日数据
npm start

# 为特定年份生成节日数据
node scripts/generate-holidays.js 2026

# 运行应用程序
# 无构建步骤 - 直接在浏览器中打开 index.html
```

## 重要模式和约定

### DOM 元素引用
- 主应用程序使用 `els` 对象来引用频繁访问的 DOM 元素
- 日历使用单独的变量（`calendarEl`、`prevMonthBtn` 等）以避免冲突
- 所有 DOM 交互都缓存元素引用以提高性能

### 节日计算
- `isHolidayDate(date)` - 检查日期是否为节日（周末或在节日列表中）
- `findNextHolidayTarget(now)` - 查找下一个假期的 18:00
- 调休工作日通过 `WORKDAY_OVERRIDES` 数组处理

### 系统默认计时器
- "xiabanban" 倒计时由系统管理，无法编辑/删除
- 自动更新为下一个假期的 18:00
- 防止重复的系统计时器

### 重复检测
- 防止保存具有相同标题 + 目标时间组合的倒计时
- 使用绿色渐变边框动画突出显示现有重复项

### 日历组件
- 双日期显示，公历日期在上方，农历日期在下方
- 点击任何日期自动填充倒计时表单日期输入
- 显示带有点指示器的节日和带有绿色渐变的今日日期
- 带有上一月/下一月按钮的月份导航
- 完全独立于主应用程序逻辑

## 重要注意事项

- 节日数据必须每年更新，或在新年临近时（<15 天剩余）更新
- 日历是独立模块 - 不要混合 DOM 元素引用
- 农历日历数据是简化的演示版本 - 生产环境中使用适当的农历库
- 所有脚本都从 `js/` 目录加载
- 无构建过程 - 直接浏览器部署
- 系统默认计时器（"xiabanban"）由系统自动维护，用户无法修改