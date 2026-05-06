# 倒计时网页（HTML + CSS + JavaScript）

## 使用方式

- 直接用浏览器打开 `index.html`

## 功能

- 新增倒计时：填写**标题 / 目标日期 / 目标时间**并保存
- 倒计时每秒更新
- 数据保存在浏览器本地 `localStorage`，刷新页面不会丢失
- 内置系统倒计时 `xiabanban`：
  - 目标时间为最近节假日（含周末、法定节假日）的前一天 18:00
  - 节假日与调休上班日由静态数据文件提供，支持自动更新
  - 此条倒计时有唯一标识，不可编辑和删除

## 文件说明

- `index.html`：页面结构
- `style.css`：绿色清新 UI（圆角、阴影、响应式）
- `script1.0.0.js`：最初版本的倒计时逻辑
  - 仅支持手动添加/编辑/删除倒计时
  - 不包含节假日自动计算，也没有内置默认倒计时
- `script.js`：当前版本倒计时逻辑
  - 在 `script1.0.0.js` 基础上迭代：
    - 新增系统默认倒计时 `xiabanban`（最近节假日前一天 18:00）
    - 接入自动生成的节假日数据（法定节假日 + 周末调休工作日）
    - 支持默认倒计时的唯一标识与编辑/删除保护
- `holiday-data.js`：静态节假日数据文件，由脚本生成
- `scripts/generate-holidays.js`：Node 脚本，从节假日 API 拉取数据并生成 `holiday-data.js`

## 节假日数据自动生成

- 依赖 Node.js 环境
- 在项目根目录运行：

  - `node scripts/generate-holidays.js`：
    - 使用当前年份
    - 只生成“当前日期之后”的法定节假日与周末补班日
  - `node scripts/generate-holidays.js 2026`：显式指定年份（从该年起生效）

生成完成后会覆盖 `holiday-data.js`，页面加载时自动根据当前年份加载对应节假日数据，用于计算 `xiabanban` 的目标时间。
