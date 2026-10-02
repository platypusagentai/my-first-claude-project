// Personal productivity dashboard.
// All data lives in the browser's localStorage, so it survives page refreshes.

const STORAGE_KEY = "productivity-dashboard-v1";

// Shown the first time you open the app (and after "Reset to sample tasks").
const SAMPLE_DATA = {
  today: [
    { text: "Reply to important emails", done: true },
    { text: "30-minute walk", done: false },
    { text: "Plan tomorrow's priorities", done: false },
    { text: "Read 10 pages of a book", done: false },
  ],
  week: [
    { text: "Grocery shopping", done: true },
    { text: "Call Mom", done: false },
    { text: "Finish project draft", done: false },
    { text: "Clean out inbox", done: false },
  ],
  goals: [
    { text: "Learn the basics of Claude Code", done: false },
    { text: "Exercise 3 times a week", done: false },
    { text: "Save for a weekend trip", done: false },
  ],
};

const LISTS = ["today", "week", "goals"];

let data = loadData();

// ---------- Saving and loading ----------

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function sampleData() {
  const copy = {};
  for (const list of LISTS) {
    copy[list] = SAMPLE_DATA[list].map((task) => ({ id: makeId(), ...task }));
  }
  return copy;
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && LISTS.every((list) => Array.isArray(saved[list]))) {
      return saved;
    }
  } catch (error) {
    // Storage unavailable or data corrupted — fall back to the samples.
  }
  return sampleData();
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Private browsing can block storage; the app still works for this visit.
  }
}

// ---------- Changing tasks ----------

function addTask(list, text) {
  data[list].push({ id: makeId(), text, done: false });
  update();
}

function toggleTask(list, id) {
  const task = data[list].find((t) => t.id === id);
  if (task) task.done = !task.done;
  update();
}

function deleteTask(list, id) {
  data[list] = data[list].filter((t) => t.id !== id);
  update();
}

function update() {
  saveData();
  render();
}

// ---------- Drawing the page ----------

function renderList(list) {
  const card = document.querySelector(`[data-list="${list}"]`);
  const ul = card.querySelector(".tasks");
  ul.replaceChildren();

  if (data[list].length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = list === "goals" ? "No goals yet — add one below." : "Nothing here yet — add a task below.";
    ul.append(empty);
  }

  for (const task of data[list]) {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " is-done" : "");
    li.dataset.id = task.id;

    const checkboxId = `${list}-${task.id}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = checkboxId;
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => toggleTask(list, task.id));

    const label = document.createElement("label");
    label.className = "task-label";
    label.htmlFor = checkboxId;
    label.textContent = task.text; // textContent keeps typed text safe

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete-button";
    del.textContent = "×";
    del.setAttribute("aria-label", `Delete "${task.text}"`);
    del.addEventListener("click", () => deleteTask(list, task.id));

    li.append(checkbox, label, del);
    ul.append(li);
  }

  const done = data[list].filter((t) => t.done).length;
  const total = data[list].length;
  document.getElementById(`${list}-count`).textContent =
    total === 0 ? "No items" : `${done} of ${total} done`;
}

function todayPercent() {
  const total = data.today.length;
  if (total === 0) return 0;
  const done = data.today.filter((t) => t.done).length;
  return Math.round((done / total) * 100);
}

function renderProgress() {
  const percent = todayPercent();
  const bar = document.getElementById("progress-bar");
  const circumference = 2 * Math.PI * bar.r.baseVal.value;
  bar.style.strokeDasharray = circumference;
  bar.style.strokeDashoffset = circumference * (1 - percent / 100);
  document.getElementById("progress-text").textContent = `${percent}%`;
  bar.closest(".progress").classList.toggle("is-complete", percent === 100);

  const summary = document.getElementById("summary");
  if (data.today.length === 0) {
    summary.textContent = "Add a task to get your day started.";
  } else if (percent === 100) {
    summary.textContent = "All done for today — nice work! 🎉";
  } else {
    const left = data.today.filter((t) => !t.done).length;
    summary.textContent = `${left} task${left === 1 ? "" : "s"} left today`;
  }
}

function renderHeader() {
  const now = new Date();
  document.getElementById("today-date").textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  document.getElementById("greeting").textContent = greeting;
}

function render() {
  renderHeader();
  LISTS.forEach(renderList);
  renderProgress();
}

// ---------- Connecting the buttons ----------

for (const list of LISTS) {
  const form = document.querySelector(`[data-list="${list}"] .add-form`);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.elements.text;
    const text = input.value.trim();
    if (!text) return;
    addTask(list, text);
    input.value = "";
    input.focus();
  });
}

document.getElementById("reset-button").addEventListener("click", () => {
  if (confirm("Replace all your tasks with the sample tasks?")) {
    data = sampleData();
    update();
  }
});

render();
