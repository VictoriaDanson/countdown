// Calendar functionality
/**
 * 公历日期 转 农历（使用 lunisolar）
 * @param {number} year  公历年
 * @param {number} month 公历月（0-11，Date 标准）
 * @param {number} day   公历日
 * @returns {Object} 农历信息
 */
function solarToLunar(date) {
  const nullLunar = { fullName: '' }
  if (typeof lunisolar === 'undefined') return nullLunar
  // lunisolar 使用 1-12 月
  const dl = lunisolar(date).lunar
  if (!dl) return nullLunar
  const lunarMonth = dl.getMonthName() || ''
  const lunarDay = dl.getDayName() || ''
  return {
    fullName: lunarDay // lunarMonth.replace('月', '‧') + lunarDay
  }
}

// Get calendar elements
const calendarEl = document.getElementById('calendar')
const holidaySelect = document.getElementById('holidaySelect')
const prevMonthBtn = document.getElementById('prevMonth')
const nextMonthBtn = document.getElementById('nextMonth')
const todayBtn = document.getElementById('todayBtn')
const currentMonthEl = document.getElementById('currentMonth')
const calendarDaysEl = document.getElementById('calendarDays')

let currentDate = new Date()
let selectedDate = null

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isToday(date) {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function isOfficialHoliday(date) {
  const dateStr = formatDate(date)

  // Check if it's a holiday from HOLIDAY_DATES (official holidays only)
  if (
    window.HOLIDAY_DATA &&
    window.HOLIDAY_DATA['2026'] &&
    window.HOLIDAY_DATA['2026'].HOLIDAY_DATES.includes(dateStr)
  ) {
    return true
  }

  return false
}

function isWeekend(date) {
  const day = date.getDay()
  const dateStr = formatDate(date)

  // Check if it's a weekend that's not overridden as a workday
  if (day === 0 || day === 6) {
    if (
      window.HOLIDAY_DATA &&
      window.HOLIDAY_DATA['2026'] &&
      window.HOLIDAY_DATA['2026'].WORKDAY_OVERRIDES.includes(dateStr)
    ) {
      return false
    }
    return true
  }

  return false
}

function isMakeUpWorkday(date) {
  const dateStr = formatDate(date)

  // Check if it's in WORKDAY_OVERRIDES (make-up workdays)
  if (
    window.HOLIDAY_DATA &&
    window.HOLIDAY_DATA['2026'] &&
    window.HOLIDAY_DATA['2026'].WORKDAY_OVERRIDES.includes(dateStr)
  ) {
    return true
  }

  return false
}

function getFestivalName(date) {
  const dateStr = formatDate(date)

  if (
    window.HOLIDAY_DATA &&
    window.HOLIDAY_DATA['2026'] &&
    window.HOLIDAY_DATA['2026'].FESTIVAL_PRESETS
  ) {
    const festivals = window.HOLIDAY_DATA['2026'].FESTIVAL_PRESETS
    for (const [festivalName, festivalDate] of Object.entries(festivals)) {
      if (festivalDate === dateStr) {
        return festivalName
      }
    }
  }

  return null
}

function renderCalendar() {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Update month display
  currentMonthEl.textContent = `${year}年${month + 1}月`

  // Clear calendar days
  calendarDaysEl.innerHTML = ''

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDay.getDay()
  // Adjust for Monday-first week order (shift Sunday from position 0 to 6)
  const adjustedStartingDay =
    startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

  // Add empty cells for days before month starts
  for (let i = 0; i < adjustedStartingDay; i++) {
    const emptyDay = document.createElement('div')
    emptyDay.className = 'calendarDay other-month'
    calendarDaysEl.appendChild(emptyDay)
  }

  // Add days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayElement = document.createElement('div')
    const date = new Date(year, month, day)
    const dateStr = formatDate(date)
    const lunarDate = solarToLunar(date).fullName || ''
    const festivalName = getFestivalName(date)

    dayElement.className = 'calendarDay'
    dayElement.innerHTML = `
      <span class="solar-date">${day}</span>
      ${festivalName ? `<span class="lunar-date festival-name">${festivalName}</span>` : lunarDate ? `<span class="lunar-date">${lunarDate}</span>` : ''}
      ${isToday(date) ? `<div class="tag"><span class="now">今</span></div>` : ''}
      ${isOfficialHoliday(date) ? `<div class="tag holiday-tag"><span class="holiday-text">休</span></div>` : ''}
      ${isMakeUpWorkday(date) ? `<div class="tag makeup-tag"><span class="makeup-text">班</span></div>` : ''}
    `
    dayElement.dataset.date = dateStr

    // Check if today
    if (isToday(date)) {
      dayElement.classList.add('today')
    }

    // Check if holiday
    if (isOfficialHoliday(date)) {
      dayElement.classList.add('holiday')
    }

    // Check if weekend (for styling only)
    if (isWeekend(date)) {
      dayElement.classList.add('weekend')
    }

    // Check if make-up workday
    if (isMakeUpWorkday(date)) {
      dayElement.classList.add('makeup-workday')
    }

    // Check if selected
    if (selectedDate && dateStr === selectedDate) {
      dayElement.classList.add('selected')
    }

    // Add click handler
    dayElement.addEventListener('click', () => {
      // Remove previous selection
      document.querySelectorAll('.calendarDay.selected').forEach((el) => {
        el.classList.remove('selected')
      })

      // Add selection to clicked day
      dayElement.classList.add('selected')
      selectedDate = dateStr

      // Update date input if form is available
      const dateInput = document.getElementById('dateInput')
      if (dateInput) {
        dateInput.value = dateStr
      }

      // Update date details display
      try {
        // 调用 script.js 中的 updateDateDetails 函数
        if (typeof updateDateDetails === 'function') {
          updateDateDetails()
        }
      } catch (error) {
        console.error('更新日期详情失败:', error)
      }
    })

    calendarDaysEl.appendChild(dayElement)
  }
}

// Calendar navigation
prevMonthBtn.addEventListener('click', () => {
  const currentSelectedDate = selectedDate
  currentDate.setMonth(currentDate.getMonth() - 1)
  holidaySelect.value = ''
  // if (currentSelectedDate) {
  //   const [year, month, day] = currentSelectedDate.split('-').map(Number)
  //   const targetDate = new Date(year, month - 1, day)
  //   const newMonth = currentDate.getMonth()
  //   const newYear = currentDate.getFullYear()
  //   // Try to set the same day in the new month
  //   let targetDay = day
  //   let adjustedDate = new Date(newYear, newMonth, targetDay)
  //   // If the day doesn't exist in the new month (e.g., Feb 30), adjust to last day
  //   if (adjustedDate.getMonth() !== newMonth) {
  //     const lastDay = new Date(newYear, newMonth + 1, 0).getDate()
  //     targetDay = lastDay
  //     adjustedDate = new Date(newYear, newMonth, targetDay)
  //   }
  //   currentDate = adjustedDate
  //   selectedDate = formatDate(adjustedDate)
  // }
  renderCalendar()
})

nextMonthBtn.addEventListener('click', () => {
  const currentSelectedDate = selectedDate
  currentDate.setMonth(currentDate.getMonth() + 1)
  holidaySelect.value = ''
  // if (currentSelectedDate) {
  //   const [year, month, day] = currentSelectedDate.split('-').map(Number)
  //   const targetDate = new Date(year, month - 1, day)
  //   const newMonth = currentDate.getMonth()
  //   const newYear = currentDate.getFullYear()
  //   // Try to set the same day in the new month
  //   let targetDay = day
  //   let adjustedDate = new Date(newYear, newMonth, targetDay)
  //   // If the day doesn't exist in the new month (e.g., Feb 30), adjust to last day
  //   if (adjustedDate.getMonth() !== newMonth) {
  //     const lastDay = new Date(newYear, newMonth + 1, 0).getDate()
  //     targetDay = lastDay
  //     adjustedDate = new Date(newYear, newMonth, targetDay)
  //   }
  //   currentDate = adjustedDate
  //   selectedDate = formatDate(adjustedDate)
  // }
  renderCalendar()
})

// Holiday select - jump to selected holiday
holidaySelect.addEventListener('change', (e) => {
  const selectedHoliday = e.target.value
  if (selectedHoliday && window.HOLIDAY_DATA && window.HOLIDAY_DATA['2026']) {
    const festivalPresets = window.HOLIDAY_DATA['2026'].FESTIVAL_PRESETS
    if (festivalPresets[selectedHoliday]) {
      const holidayDate = new Date(festivalPresets[selectedHoliday])
      currentDate = holidayDate
      selectedDate = formatDate(holidayDate)
      renderCalendar()
    }
  }
})

// Today button - go back to current date
todayBtn.addEventListener('click', () => {
  currentDate = new Date()
  selectedDate = formatDate(currentDate)
  holidaySelect.value = ''
  renderCalendar()
})

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Auto-select today's date
  selectedDate = formatDate(new Date())
  renderCalendar()

  // 初始化时更新日期详情
  try {
    // 调用 script.js 中的 updateDateDetails 函数
    if (typeof updateDateDetails === 'function') {
      updateDateDetails()
    }
  } catch (error) {
    console.error('初始化日期详情失败:', error)
  }
})
const lunisolar = window.lunisolar
lunisolar.extend(window.lunisolarPluginTheGods) // 注册插件
// 获取选中日期详情卡片信息
function getSelectedDateDetails() {
  if (!selectedDate) return
  const d = lunisolar(selectedDate)
  const allDirections = d.theGods.getAllLuckDirection()
  let wealth = ''
  for (let i = 0; i < allDirections.length; i++) {
    const [d24, god] = allDirections[i]
    if (['喜神', '福神', '財神'].includes(god.name)) {
      wealth += `${god.name}${d24.direction}${d24.angle}°   `
    }
  }
  // const stem = lunisolar(new Date()).char8.hour.stem
  // const branch = lunisolar(new Date()).char8.hour.branch
  // console.log("===", stem.name, branch.name)
  const dInfo = {
    year:
      lunisolar(selectedDate).format('cY') +
      '年 ' +
      lunisolar(selectedDate).format('cZ'),
    day: d.lunar.getMonthName() + d.lunar.getDayName(),
    good: d.theGods.getGoodActs().join('.'),
    bad: d.theGods.getBadActs().join('.'),
    wealth
  }
  return dInfo
}
