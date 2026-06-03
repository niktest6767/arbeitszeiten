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

const fields = {
  displayName: document.querySelector("#displayName"),
  weeklyHours: document.querySelector("#weeklyHours"),
  workdaysPerWeek: document.querySelector("#workdaysPerWeek"),
  vacationTotal: document.querySelector("#vacationTotal"),
  vacationUsed: document.querySelector("#vacationUsed"),
  overtimeBalance: document.querySelector("#overtimeBalance"),
  sickUsed: document.querySelector("#sickUsed"),
};

const selectors = {
  form: document.querySelector("#profileForm"),
  backToDashboard: document.querySelector("#backToDashboard"),
};

let state = loadState();

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
  localStorage.setItem("arbeitszeiten-display-name", state.displayName || "");
}

function monthlyTarget() {
  return (Number(fields.weeklyHours.value || 0) * 52) / 12;
}

function profileQuery() {
  const params = new URLSearchParams();
  params.set("displayName", fields.displayName.value.trim());
  params.set("weeklyHours", fields.weeklyHours.value || "0");
  params.set("workdaysPerWeek", fields.workdaysPerWeek.value || "0");
  params.set("vacationTotal", fields.vacationTotal.value || "0");
  params.set("vacationUsed", fields.vacationUsed.value || "0");
  params.set("overtimeBalance", fields.overtimeBalance.value || "0");
  params.set("sickUsed", fields.sickUsed.value || "0");
  return params.toString();
}

function updateBackLink() {
  selectors.backToDashboard.href = `index.html?${profileQuery()}`;
}

function collectProfileState() {
  return {
    ...state,
    displayName: fields.displayName.value.trim(),
    weeklyHours: Number(fields.weeklyHours.value || 0),
    workdaysPerWeek: Number(fields.workdaysPerWeek.value || 0),
    vacationTotal: Number(fields.vacationTotal.value || 0),
    vacationUsed: Number(fields.vacationUsed.value || 0),
    overtimeBalance: Number(fields.overtimeBalance.value || 0),
    sickUsed: Number(fields.sickUsed.value || 0),
    monthlyTarget: monthlyTarget(),
  };
}

function updateProfileState() {
  state = collectProfileState();
  saveState();
  updateBackLink();
}

function renderForm() {
  fields.displayName.value = state.displayName || "";
  fields.weeklyHours.value = state.weeklyHours ?? 37;
  fields.workdaysPerWeek.value = state.workdaysPerWeek ?? 5;
  fields.vacationTotal.value = state.vacationTotal ?? 30;
  fields.vacationUsed.value = state.vacationUsed ?? 0;
  fields.overtimeBalance.value = state.overtimeBalance ?? 0;
  fields.sickUsed.value = state.sickUsed ?? 0;
  updateBackLink();
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", updateProfileState);
  field.addEventListener("change", updateProfileState);
  field.addEventListener("blur", updateProfileState);
});

selectors.backToDashboard.addEventListener("click", updateProfileState);

selectors.form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateProfileState();
  window.location.href = selectors.backToDashboard.href;
});

window.addEventListener("pagehide", updateProfileState);
window.addEventListener("beforeunload", updateProfileState);

renderForm();
