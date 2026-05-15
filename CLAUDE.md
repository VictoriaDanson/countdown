# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a simple countdown web application built with vanilla HTML, CSS, and JavaScript. The app allows users to create, edit, and delete countdown timers with target dates/times. All data is stored in browser localStorage for persistence.

## Key Features

- **Persistent Storage**: All countdowns saved to localStorage, survive page refreshes
- **System Default Timer**: "xiabanban" - automatically targets next holiday day at 18:00
- **Holiday Integration**: Fetches and uses Chinese holiday data from timor.tech API
- **Quick Presets**: One-click countdown templates for major Chinese holidays (元旦, 春节, 清明节, etc.)
- **Drag & Drop**: Reorder countdowns by dragging items in the list
- **Real-time Updates**: Countdown values update every second
- **Duplicate Prevention**: Prevents saving countdowns with same title and target time
- **Dual-Date Calendar**: Shows both solar (Gregorian) and lunar dates with click-to-select functionality

## Architecture

### File Structure
- `index.html` - Main HTML structure with semantic elements
- `style.css` - Green-themed UI with responsive design
- `js/script.js` - Main application logic
- `js/calendar.js` - Calendar component with dual-date display (separate module)
- `js/holiday-data.js` - Auto-generated static holiday data
- `scripts/generate-holidays.js` - Node.js script to fetch and generate holiday data

### Module Separation
- Main application logic (`js/script.js`) manages countdowns, form handling, and drag-drop
- Calendar component (`js/calendar.js`) is a standalone module for date selection
- DOM element references are isolated within each module to avoid conflicts

### Data Flow
1. User creates/edits countdown via form or clicks calendar date
2. Data validated and stored in localStorage under "countdown_items_v1"
3. System "xiabanban" countdown auto-updates to next holiday at 18:00
4. Countdown list rendered with real-time updates every second
5. Holiday data loaded from `js/holiday-data.js` (auto-generated)
6. Calendar updates date input when a date is selected

### Holiday Data System
- Fetches from `https://timor.tech/api/holiday/year/{year}`
- Generates static `js/holiday-data.js` with 3 arrays:
  - `HOLIDAY_DATES` - Official holiday dates
  - `WORKDAY_OVERRIDES` - Weekend work days (adjusted workdays)
  - `FESTIVAL_PRESETS` - Quick preset dates for major festivals
- Update command: `npm start` or `node scripts/generate-holidays.js [year]`

## Development Commands

```bash
# Generate holiday data for current year
npm start

# Generate holiday data for specific year
node scripts/generate-holidays.js 2026

# Run the application
# No build step - open index.html directly in browser
```

## Code Patterns

### Countdown Items
Each countdown is an object with:
```typescript
{
  id: string,
  title: string,
  targetISO: string, // ISO format datetime string
  createdAt: number,
  isSystemDefault?: boolean // only for "xiabanban"
}
```

### Holiday Calculation
- `isHolidayDate(date)` - Checks if date is a holiday (weekend or in holiday list)
- `findNextHolidayTarget(now)` - Finds next holiday day at 18:00
- Weekend workdays are handled via `WORKDAY_OVERRIDES` array

### Element References
- Main app uses `els` object for frequently accessed DOM elements
- Calendar uses individual variables (`calendarEl`, `prevMonthBtn`, etc.) to avoid conflicts
- All DOM interactions cache element references for performance

### Calendar Component
- Dual-date display with solar date on top, lunar date at bottom
- Click any date to auto-populate the countdown form date input
- Shows holidays with dot indicators and today's date with green gradient
- Month navigation with previous/next buttons
- Fully independent from main app logic

## Important Notes

- The "xiabanban" countdown is system-managed and cannot be edited/deleted
- Duplicate detection prevents same title + target time combinations
- Holiday data must be updated annually or when new year is approaching (<15 days remaining)
- The calendar is a standalone module - do not mix DOM element references
- Lunar calendar data is simplified for demonstration - use proper lunar library in production
- All scripts are loaded from the `js/` directory
- No build process required - direct browser deployment