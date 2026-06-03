const storageKey = "arbeitszeiten-dashboard-v1";

const defaultState = {
  monthlyTarget: 160,
  weeklyHours: 37,
  workdaysPerWeek: 5,
  vacationTotal: 30,
  vacationUsed: 8,
  overtimeBalance: 0,
  sickUsed: 0,
  displayName: "",
  entries: [
    { date: "2026-06-01", hours: 8, overtime: 0, overtimeUsed: 0, vacation: false, sick: false, holiday: false },
    { date: "2026-06-02", hours: 7.5, overtime: 0, overtimeUsed: 0, vacation: false, sick: false, holiday: false },
  ],
};

const selectors = {
  greetingTitle: document.querySelector("#greetingTitle"),
  workedHours: document.querySelector("#workedHours"),
  vacationLeft: document.querySelector("#vacationLeft"),
  vacationNote: document.querySelector("#vacationNote"),
  overtimeHours: document.querySelector("#overtimeHours"),
  overtimeNote: document.querySelector("#overtimeNote"),
  sickDays: document.querySelector("#sickDays"),
  sickNote: document.querySelector("#sickNote"),
  exportButton: document.querySelector("#exportButton"),
  exportStatus: document.querySelector("#exportStatus"),
  previousMonthButton: document.querySelector("#previousMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarSubtitle: document.querySelector("#calendarSubtitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  entryModal: document.querySelector("#entryModal"),
  entryModalDate: document.querySelector("#entryModalDate"),
  closeEntryModal: document.querySelector("#closeEntryModal"),
  calendarEntryForm: document.querySelector("#calendarEntryForm"),
  entryStartTime: document.querySelector("#entryStartTime"),
  entryEndTime: document.querySelector("#entryEndTime"),
  entryBreakMinutes: document.querySelector("#entryBreakMinutes"),
  entryOvertime: document.querySelector("#entryOvertime"),
  entryOvertimeUsed: document.querySelector("#entryOvertimeUsed"),
  entryVacation: document.querySelector("#entryVacation"),
  entrySick: document.querySelector("#entrySick"),
  entryHoliday: document.querySelector("#entryHoliday"),
  deleteEntryButton: document.querySelector("#deleteEntryButton"),
};

let state = loadState();
state = applyProfileParams(state);
saveState();
let visibleMonth = new Date();
let selectedDate = todayKey();
let exportObjectUrl = "";

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);

  try {
    return { ...structuredClone(defaultState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function applyProfileParams(currentState) {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("displayName")) return currentState;

  const nextState = { ...currentState };
  const textFields = ["displayName"];
  const numberFields = ["weeklyHours", "workdaysPerWeek", "vacationTotal", "vacationUsed", "overtimeBalance", "sickUsed"];

  textFields.forEach((field) => {
    nextState[field] = params.get(field) || "";
  });

  numberFields.forEach((field) => {
    const value = Number(params.get(field) || 0);
    if (Number.isFinite(value)) nextState[field] = value;
  });

  nextState.monthlyTarget = nextState.weeklyHours > 0 ? (nextState.weeklyHours * 52) / 12 : nextState.monthlyTarget;

  if (window.history.replaceState) {
    window.history.replaceState({}, document.title, "index.html");
  }

  return nextState;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function todayKey() {
  return dateKey(new Date());
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromKey(key) {
  return new Date(`${key}T00:00:00`);
}

function isProfileWorkday(date) {
  const workdays = Math.min(7, Math.max(1, Number(state.workdaysPerWeek || 5)));
  const weekdayIndex = (date.getDay() + 6) % 7;
  return weekdayIndex < workdays;
}

function isCountedWorkday(key) {
  return isProfileWorkday(dateFromKey(key));
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(date);
}

function exportNumber(value) {
  return String(Number(value || 0)).replace(".", ",");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateEntryHours(startValue, endValue, breakValue) {
  const start = timeToMinutes(startValue);
  let end = timeToMinutes(endValue);
  const pause = Number(breakValue || 0);

  if (end < start) end += 24 * 60;

  return Math.max(0, (end - start - pause) / 60);
}

function entryFromForm() {
  if (selectors.entryVacation.checked || selectors.entrySick.checked || selectors.entryHoliday.checked) {
    return {
      start: "",
      end: "",
      breakMinutes: 0,
      hours: 0,
      overtime: 0,
      overtimeUsed: 0,
      vacation: selectors.entryVacation.checked,
      sick: selectors.entrySick.checked,
      holiday: selectors.entryHoliday.checked,
    };
  }

  return {
    start: selectors.entryStartTime.value,
    end: selectors.entryEndTime.value,
    breakMinutes: Number(selectors.entryBreakMinutes.value || 0),
    hours: calculateEntryHours(selectors.entryStartTime.value, selectors.entryEndTime.value, selectors.entryBreakMinutes.value),
    overtime: Number(selectors.entryOvertime.value || 0),
    overtimeUsed: Number(selectors.entryOvertimeUsed.value || 0),
    vacation: false,
    sick: false,
    holiday: false,
  };
}

function upsertEntry(date, entryData) {
  const existing = state.entries.find((entry) => entry.date === date);
  const nextEntry = { date, ...entryData };

  if (existing) {
    Object.assign(existing, nextEntry);
  } else {
    state.entries.push(nextEntry);
  }
}

function deleteEntry(date) {
  state.entries = state.entries.filter((entry) => entry.date !== date);
}

function entryFor(date) {
  return state.entries.find((entry) => entry.date === date);
}

function monthEntries() {
  const current = monthKey(visibleMonth);
  return state.entries.filter((entry) => entry.date.startsWith(current) && !entry.vacation && !entry.sick && !entry.holiday);
}

function calendarYearVacationEntries() {
  const year = String(visibleMonth.getFullYear());
  return state.entries.filter((entry) => entry.date.startsWith(year) && entry.vacation && isCountedWorkday(entry.date));
}

function calendarYearSickEntries() {
  const year = String(visibleMonth.getFullYear());
  return state.entries.filter((entry) => entry.date.startsWith(year) && entry.sick && isCountedWorkday(entry.date));
}

function entriesUntilVisibleMonth() {
  const visibleMonthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  return state.entries.filter((entry) => {
    if (entry.vacation || entry.sick || entry.holiday) return false;
    return dateFromKey(entry.date) <= visibleMonthEnd;
  });
}

function monthlyTarget() {
  const weeklyHours = Number(state.weeklyHours || 0);
  if (weeklyHours > 0) return (weeklyHours * 52) / 12;
  return Number(state.monthlyTarget || 0);
}

function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  return "Guten Abend";
}

function buildExcelWorkbook() {
  state = loadState();

  const entries = [...state.entries].sort((a, b) => a.date.localeCompare(b.date));
  const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  const totalOvertime = entries.reduce((sum, entry) => sum + Number(entry.overtime || 0), 0);
  const totalOvertimeUsed = entries.reduce((sum, entry) => sum + Number(entry.overtimeUsed || 0), 0);
  const totalSickDays = entries.filter((entry) => entry.sick && isCountedWorkday(entry.date)).length;
  const totalHolidays = entries.filter((entry) => entry.holiday).length;
  const createdAt = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const rows = entries.map((entry) => `
    <tr>
      <td>${escapeHtml(entry.date)}</td>
      <td>${escapeHtml(entry.start || "")}</td>
      <td>${escapeHtml(entry.end || "")}</td>
      <td>${exportNumber(entry.breakMinutes)}</td>
      <td>${exportNumber(entry.hours)}</td>
      <td>${exportNumber(entry.overtime)}</td>
      <td>${exportNumber(entry.overtimeUsed)}</td>
      <td>${entry.vacation ? "Ja" : ""}</td>
      <td>${entry.sick ? "Ja" : ""}</td>
      <td>${entry.holiday ? "Ja" : ""}</td>
    </tr>
  `).join("");

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; }
          th, td { border: 1px solid #c8c8c8; padding: 8px; }
          th { background: #f2f2f2; font-weight: bold; }
          .title { font-size: 20px; font-weight: bold; }
          .meta { color: #555; }
        </style>
      </head>
      <body>
        <table>
          <tr><td class="title" colspan="10">Arbeitszeiten Export</td></tr>
          <tr><td class="meta">Erstellt</td><td colspan="9">${escapeHtml(createdAt)}</td></tr>
          <tr><td class="meta">Name</td><td colspan="9">${escapeHtml(state.displayName || "")}</td></tr>
          <tr><td class="meta">Wochenstunden</td><td colspan="9">${exportNumber(state.weeklyHours)}</td></tr>
          <tr><td class="meta">Urlaubstage/Jahr</td><td colspan="9">${exportNumber(state.vacationTotal)}</td></tr>
          <tr><td class="meta">Bereits genommene Urlaubstage</td><td colspan="9">${exportNumber(state.vacationUsed)}</td></tr>
          <tr><td class="meta">Überstunden vorhanden</td><td colspan="9">${exportNumber(state.overtimeBalance)}</td></tr>
          <tr><td class="meta">Krankheitstage bisher</td><td colspan="9">${exportNumber(state.sickUsed)}</td></tr>
          <tr></tr>
          <tr>
            <th>Datum</th>
            <th>Start</th>
            <th>Ende</th>
            <th>Pause</th>
            <th>Arbeitsstunden</th>
            <th>Überstunden aufgebaut</th>
            <th>Überstunden genutzt</th>
            <th>Urlaubstag</th>
            <th>Kranktag</th>
            <th>Feiertag</th>
          </tr>
          ${rows}
          <tr>
            <th>Summe</th>
            <th></th>
            <th></th>
            <th></th>
            <th>${exportNumber(totalHours)}</th>
            <th>${exportNumber(totalOvertime)}</th>
            <th>${exportNumber(totalOvertimeUsed)}</th>
            <th></th>
            <th></th>
            <th></th>
          </tr>
          <tr><th>Kranktage gesamt</th><th colspan="9">${exportNumber(Number(state.sickUsed || 0) + totalSickDays)}</th></tr>
          <tr><th>Feiertage markiert</th><th colspan="9">${exportNumber(totalHolidays)}</th></tr>
        </table>
      </body>
    </html>`;
}

function updateExportLink() {
  const today = todayKey();
  const workbook = buildExcelWorkbook();
  const blob = new Blob(["\ufeff", workbook], { type: "application/vnd.ms-excel;charset=utf-8" });

  if (exportObjectUrl) {
    URL.revokeObjectURL(exportObjectUrl);
  }

  exportObjectUrl = URL.createObjectURL(blob);
  selectors.exportButton.href = exportObjectUrl;
  selectors.exportButton.download = `arbeitszeiten_${today}.xls`;
}

function exportEntriesToExcel() {
  updateExportLink();
  selectors.exportStatus.textContent = "Export wird heruntergeladen.";
  window.setTimeout(() => {
    selectors.exportStatus.textContent = "";
  }, 2400);
}

function setTimeFieldsDisabled(disabled) {
  selectors.entryStartTime.disabled = disabled;
  selectors.entryEndTime.disabled = disabled;
  selectors.entryBreakMinutes.disabled = disabled;
  selectors.entryOvertime.disabled = disabled;
  selectors.entryOvertimeUsed.disabled = disabled;
}

function anyDayTypeChecked() {
  return selectors.entryVacation.checked || selectors.entrySick.checked || selectors.entryHoliday.checked;
}

function selectOnlyDayType(activeSelector) {
  [selectors.entryVacation, selectors.entrySick, selectors.entryHoliday].forEach((selector) => {
    if (selector !== activeSelector) selector.checked = false;
  });
  setTimeFieldsDisabled(anyDayTypeChecked());
}

function openEntryModal(date) {
  selectedDate = date;
  const entry = entryFor(date);
  const dateLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

  selectors.entryModalDate.textContent = dateLabel;
  selectors.entryStartTime.value = entry?.start || "08:00";
  selectors.entryEndTime.value = entry?.end || "17:00";
  selectors.entryBreakMinutes.value = entry?.breakMinutes ?? 30;
  selectors.entryOvertime.value = entry?.overtime ?? 0;
  selectors.entryOvertimeUsed.value = entry?.overtimeUsed ?? 0;
  selectors.entryVacation.checked = Boolean(entry?.vacation);
  selectors.entrySick.checked = Boolean(entry?.sick);
  selectors.entryHoliday.checked = Boolean(entry?.holiday);
  selectors.deleteEntryButton.classList.toggle("hidden", !entry);
  setTimeFieldsDisabled(Boolean(entry?.vacation || entry?.sick || entry?.holiday));
  selectors.entryModal.classList.remove("hidden");
}

function closeEntryModal() {
  selectors.entryModal.classList.add("hidden");
}

function renderCalendar() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const monthLabel = formatMonthLabel(firstDay);
  const days = [];

  selectors.calendarTitle.textContent = monthLabel;
  selectors.calendarSubtitle.textContent = "Tippe einen Tag zum Bearbeiten";

  for (let index = 0; index < leadingBlanks; index += 1) {
    days.push('<span class="calendar-day is-empty"></span>');
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const key = dateKey(date);
    const entry = entryFor(key);
    const isToday = key === todayKey();
    const classes = [
      "calendar-day",
      entry ? "has-entry" : "",
      entry?.vacation ? "is-vacation" : "",
      entry?.sick ? "is-sick" : "",
      entry?.holiday ? "is-holiday" : "",
      isToday ? "is-today" : "",
    ].filter(Boolean).join(" ");
    const detail = entry?.holiday
      ? "Feiertag"
      : entry?.sick
      ? "Krank"
      : entry?.vacation
      ? "Urlaub"
      : entry
        ? `${formatNumber(Number(entry.hours || 0))} h`
        : "";

    days.push(`
      <button class="${classes}" type="button" data-date="${key}">
        <span>${day}</span>
        <small>${detail}</small>
      </button>
    `);
  }

  selectors.calendarGrid.innerHTML = days.join("");
}

function render() {
  state = applyProfileParams(loadState());
  saveState();

  const now = new Date();
  const entries = monthEntries();
  const overtimeEntries = entriesUntilVisibleMonth();
  const worked = entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  const overtime = Number(state.overtimeBalance || 0) + overtimeEntries.reduce((sum, entry) => sum + Number(entry.overtime || 0) - Number(entry.overtimeUsed || 0), 0);
  const calendarYear = visibleMonth.getFullYear();
  const vacationLeft = Math.max(0, Number(state.vacationTotal || 0) - Number(state.vacationUsed || 0) - calendarYearVacationEntries().length);
  const sickDays = Number(state.sickUsed || 0) + calendarYearSickEntries().length;
  const storedName = localStorage.getItem("arbeitszeiten-display-name");
  const name = String(state.displayName || storedName || "").trim();

  selectors.greetingTitle.textContent = name ? `${greetingFor(now)}, ${name}` : greetingFor(now);
  renderCalendar();
  updateExportLink();
  selectors.workedHours.textContent = formatNumber(worked);
  selectors.vacationLeft.textContent = formatNumber(vacationLeft);
  selectors.vacationNote.textContent = `für ${calendarYear}`;
  selectors.overtimeHours.textContent = formatNumber(overtime);
  selectors.overtimeNote.textContent = `Saldo bis ${formatMonthLabel(visibleMonth)}`;
  selectors.sickDays.textContent = formatNumber(sickDays);
  selectors.sickNote.textContent = `für ${calendarYear}`;
}

selectors.exportButton.addEventListener("click", exportEntriesToExcel);

window.addEventListener("beforeunload", () => {
  if (exportObjectUrl) URL.revokeObjectURL(exportObjectUrl);
});

selectors.previousMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  render();
});

selectors.nextMonthButton.addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  render();
});

selectors.calendarGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".calendar-day[data-date]");
  if (!button) return;
  openEntryModal(button.dataset.date);
});

selectors.closeEntryModal.addEventListener("click", closeEntryModal);

selectors.entryModal.addEventListener("click", (event) => {
  if (event.target === selectors.entryModal) closeEntryModal();
});

selectors.entryVacation.addEventListener("change", () => {
  if (selectors.entryVacation.checked) selectOnlyDayType(selectors.entryVacation);
  setTimeFieldsDisabled(anyDayTypeChecked());
});

selectors.entrySick.addEventListener("change", () => {
  if (selectors.entrySick.checked) selectOnlyDayType(selectors.entrySick);
  setTimeFieldsDisabled(anyDayTypeChecked());
});

selectors.entryHoliday.addEventListener("change", () => {
  if (selectors.entryHoliday.checked) selectOnlyDayType(selectors.entryHoliday);
  setTimeFieldsDisabled(anyDayTypeChecked());
});

selectors.calendarEntryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  upsertEntry(selectedDate, entryFromForm());
  saveState();
  closeEntryModal();
  render();
});

selectors.deleteEntryButton.addEventListener("click", () => {
  deleteEntry(selectedDate);
  saveState();
  closeEntryModal();
  render();
});

render();

window.addEventListener("pageshow", render);
window.addEventListener("focus", render);
