const DATA_PATHS = {
  experiments: "data/experiments.json",
  hypotheses: "data/hypotheses.json",
  tasks: "data/tasks.json",
  team: "data/team.json",
};

const state = {
  experiments: [],
  hypotheses: [],
  tasks: [],
  team: [],
  filters: {
    search: "",
    status: "all",
    owner: "all",
  },
};

const statusOrder = ["planned", "todo", "running", "submitted", "done", "failed", "risk"];
const taskColumns = ["todo", "running", "blocked", "done"];

const statusLabels = {
  planned: "Planlandı",
  todo: "Yapılacak",
  running: "Çalışıyor",
  submitted: "Submit edildi",
  done: "Tamamlandı",
  failed: "Başarısız",
  risk: "Risk",
  blocked: "Bloklu",
  closed: "Kapandı",
};

const priorityLabels = {
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

/**
 * Format numeric leaderboard and validation scores for compact table output.
 *
 * @param {number|string|null|undefined} value Score value from dashboard data.
 * @returns {string} Rounded score text or a placeholder when the value is empty.
 */
function fmtScore(value) {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value).toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Calculate the public leaderboard gap against the local validation score.
 *
 * @param {number|string|null|undefined} local Local validation score.
 * @param {number|string|null|undefined} kaggle Public Kaggle score.
 * @returns {string} Signed score gap or a placeholder when either side is missing.
 */
function fmtGap(local, kaggle) {
  if (local === null || local === undefined || kaggle === null || kaggle === undefined) return "-";
  const diff = Number(kaggle) - Number(local);
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(5)}`;
}

/**
 * Resolve a team member id to its display name.
 *
 * @param {string} id Team member id stored in dashboard JSON.
 * @returns {string} Display name, raw id, or a placeholder.
 */
function ownerName(id) {
  return state.team.find((member) => member.id === id)?.name || id || "-";
}

function statusLabel(status) {
  return statusLabels[status] || status || "-";
}

function priorityLabel(priority) {
  return priorityLabels[priority] || priority || "-";
}

function statusClass(status) {
  return `status ${String(status || "").toLowerCase()}`;
}

function priorityRank(priority) {
  return { high: 0, medium: 1, low: 2 }[priority] ?? 3;
}

/**
 * Fetch one dashboard JSON file without using the browser cache.
 *
 * @param {string} path Relative JSON path under the dashboard root.
 * @returns {Promise<unknown>} Parsed JSON payload.
 * @throws {Error} When the static server cannot return the requested file.
 */
async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} yüklenemedi`);
  return response.json();
}

/**
 * Load every dashboard dataset into shared state before the first render.
 *
 * @returns {Promise<void>}
 */
async function loadData() {
  const [experiments, hypotheses, tasks, team] = await Promise.all([
    loadJson(DATA_PATHS.experiments),
    loadJson(DATA_PATHS.hypotheses),
    loadJson(DATA_PATHS.tasks),
    loadJson(DATA_PATHS.team),
  ]);
  state.experiments = experiments;
  state.hypotheses = hypotheses;
  state.tasks = tasks;
  state.team = team;
  document.getElementById("lastSync").textContent = new Date().toLocaleString();
}

function renderMetrics() {
  const submitted = state.experiments.filter((run) => run.kaggle_public_score !== null && run.kaggle_public_score !== undefined);
  const localScored = state.experiments.filter((run) => run.local_score !== null && run.local_score !== undefined);
  const bestLocal = localScored.length ? Math.min(...localScored.map((run) => Number(run.local_score))) : null;
  const bestKaggle = submitted.length ? Math.min(...submitted.map((run) => Number(run.kaggle_public_score))) : null;
  const openTasks = state.tasks.filter((task) => !["done", "closed"].includes(task.status)).length;
  const highHypotheses = state.hypotheses.filter((item) => item.priority === "high" && !["rejected", "validated"].includes(item.status)).length;

  const metrics = [
    ["Deney", state.experiments.length, `${submitted.length} submit edildi`],
    ["En iyi local", fmtScore(bestLocal), "MSE"],
    ["En iyi Kaggle", fmtScore(bestKaggle), "public MSE"],
    ["Açık iş", openTasks, `${state.tasks.length} toplam`],
    ["Yüksek hipotez", highHypotheses, `${state.hypotheses.length} takipte`],
  ];

  document.getElementById("metricGrid").innerHTML = metrics
    .map(([label, value, note]) => `<div class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`)
    .join("");
}

/**
 * Apply current search, status, and owner filters to experiment records.
 *
 * @returns {Array<object>} Experiments that match the active UI filters.
 */
function filteredExperiments() {
  const term = state.filters.search.trim().toLowerCase();
  return state.experiments.filter((run) => {
    const statusOk = state.filters.status === "all" || run.status === state.filters.status;
    const ownerOk = state.filters.owner === "all" || run.owner === state.filters.owner;
    const haystack = [
      run.id,
      run.title,
      run.model,
      run.status,
      run.owner,
      run.submission_file,
      run.notebook_or_script,
      run.notes,
      ...(run.features || []),
      ...(run.hypotheses || []),
    ]
      .join(" ")
      .toLowerCase();
    return statusOk && ownerOk && (!term || haystack.includes(term));
  });
}

function renderFilters() {
  const statusFilter = document.getElementById("statusFilter");
  const ownerFilter = document.getElementById("ownerFilter");
  const statuses = [...new Set(state.experiments.map((run) => run.status).filter(Boolean))].sort(
    (a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b)
  );
  statusFilter.innerHTML = `<option value="all">Tüm durumlar</option>${statuses
    .map((status) => `<option value="${status}">${statusLabel(status)}</option>`)
    .join("")}`;
  ownerFilter.innerHTML = `<option value="all">Tüm kişiler</option>${state.team
    .map((member) => `<option value="${member.id}">${member.name}</option>`)
    .join("")}`;
}

function renderExperiments() {
  const rows = filteredExperiments()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)))
    .map((run) => {
      const fileBits = [run.submission_file, run.notebook_or_script, ...(run.artifacts || [])].filter(Boolean);
      const tags = (run.features || []).slice(0, 5).map((feature) => `<span class="tag">${feature}</span>`).join("");
      const files = fileBits.length ? fileBits.map((file) => `<div class="muted">${file}</div>`).join("") : '<span class="muted">-</span>';
      return `<tr>
        <td>
          <div class="run-title">${run.id} - ${run.title}</div>
          <div class="muted">${run.date} - ${run.cv_strategy || "-"}</div>
          <div class="tag-list">${tags}</div>
        </td>
        <td>${ownerName(run.owner)}</td>
        <td><span class="${statusClass(run.status)}">${statusLabel(run.status)}</span></td>
        <td>${run.model || "-"}</td>
        <td>${fmtScore(run.local_score)}</td>
        <td>${fmtScore(run.kaggle_public_score)}</td>
        <td>${fmtGap(run.local_score, run.kaggle_public_score)}</td>
        <td>${files}</td>
      </tr>`;
    })
    .join("");
  document.getElementById("experimentRows").innerHTML = rows || `<tr><td colspan="8" class="empty">Eşleşen deney yok.</td></tr>`;
}

function renderHypotheses() {
  const cards = [...state.hypotheses]
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .map(
      (item) => `<article class="hypothesis">
        <header>
          <div>
            <h3>${item.title}</h3>
            <div class="muted">${item.id} - ${ownerName(item.owner)}</div>
          </div>
          <span class="${statusClass(item.status)}">${statusLabel(item.status)}</span>
        </header>
        <div class="priority">${priorityLabel(item.priority)} öncelik</div>
        <p>${item.evidence}</p>
        <p><strong>Sonraki adım:</strong> ${item.next_step}</p>
      </article>`
    )
    .join("");
  document.getElementById("hypothesisGrid").innerHTML = cards;
}

function renderTasks() {
  const board = taskColumns
    .map((column) => {
      const tasks = state.tasks
        .filter((task) => task.status === column)
        .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || String(a.due).localeCompare(String(b.due)));
      const list = tasks.length
        ? tasks
            .map(
              (task) => `<article class="task">
                <strong>${task.title}</strong>
                <div class="task-meta">
                  <span class="tag">${ownerName(task.owner)}</span>
                  <span class="tag">${priorityLabel(task.priority)}</span>
                  <span class="tag">${task.due || "-"}</span>
                </div>
                ${task.linked_experiment ? `<div class="muted">${task.linked_experiment}</div>` : ""}
              </article>`
            )
            .join("")
        : `<div class="empty">Bu kolonda iş yok.</div>`;
      return `<section class="task-column"><h3>${statusLabel(column)}</h3><div class="task-list">${list}</div></section>`;
    })
    .join("");
  document.getElementById("taskBoard").innerHTML = board;
}

function renderPreviews() {
  document.getElementById("experimentsPreview").textContent = JSON.stringify(state.experiments.slice(0, 3), null, 2);
}

/**
 * Render the local-vs-Kaggle score trend as an inline SVG line chart.
 *
 * @param {HTMLElement} container Chart mount element.
 * @param {Array<object>} runs Experiment records from dashboard state.
 * @returns {void}
 */
function lineChart(container, runs) {
  const scored = runs
    .filter((run) => run.local_score !== null || run.kaggle_public_score !== null)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));

  if (!scored.length) {
    container.innerHTML = `<div class="empty">Henüz skorlu deney yok.</div>`;
    return;
  }

  const width = 760;
  const height = 280;
  const pad = { top: 24, right: 26, bottom: 46, left: 52 };
  const values = scored.flatMap((run) => [run.local_score, run.kaggle_public_score]).filter((v) => v !== null && v !== undefined);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const yMin = min - span * 0.15;
  const yMax = max + span * 0.15;
  const x = (i) => pad.left + (i * (width - pad.left - pad.right)) / Math.max(1, scored.length - 1);
  const y = (value) => height - pad.bottom - ((value - yMin) * (height - pad.top - pad.bottom)) / (yMax - yMin);

  const pathFor = (key) =>
    scored
      .map((run, i) => [run[key], i])
      .filter(([value]) => value !== null && value !== undefined)
      .map(([value, i], idx) => `${idx === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(Number(value)).toFixed(1)}`)
      .join(" ");

  const pointsFor = (key, color) =>
    scored
      .map((run, i) => [run[key], i, run.id])
      .filter(([value]) => value !== null && value !== undefined)
      .map(
        ([value, i, id]) =>
          `<circle cx="${x(i)}" cy="${y(Number(value))}" r="4.5" fill="${color}"><title>${id}: ${fmtScore(value)}</title></circle>`
      )
      .join("");

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const yy = pad.top + t * (height - pad.top - pad.bottom);
      const value = yMax - t * (yMax - yMin);
      return `<line class="grid-line" x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}"></line>
        <text x="8" y="${yy + 4}" font-size="11" fill="#64717f">${fmtScore(value)}</text>`;
    })
    .join("");

  const labels = scored
    .map((run, i) => `<text x="${x(i)}" y="${height - 16}" font-size="10" text-anchor="middle" fill="#64717f">${run.id}</text>`)
    .join("");

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Skor trend grafiği">
    ${grid}
    <line class="axis" x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}"></line>
    <line class="axis" x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
    <path d="${pathFor("local_score")}" fill="none" stroke="#246bfe" stroke-width="3"></path>
    <path d="${pathFor("kaggle_public_score")}" fill="none" stroke="#0f9f8f" stroke-width="3"></path>
    ${pointsFor("local_score", "#246bfe")}
    ${pointsFor("kaggle_public_score", "#0f9f8f")}
    ${labels}
    <text x="${width - 190}" y="22" font-size="12" fill="#246bfe">Local CV</text>
    <text x="${width - 110}" y="22" font-size="12" fill="#0f9f8f">Kaggle public</text>
  </svg>`;
}

/**
 * Render experiment counts by status as an inline SVG bar chart.
 *
 * @param {HTMLElement} container Chart mount element.
 * @param {Array<object>} experiments Experiment records from dashboard state.
 * @returns {void}
 */
function barChart(container, experiments) {
  const counts = experiments.reduce((acc, run) => {
    acc[run.status] = (acc[run.status] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts).sort((a, b) => statusOrder.indexOf(a[0]) - statusOrder.indexOf(b[0]));
  const width = 460;
  const height = 230;
  const pad = { top: 22, right: 20, bottom: 44, left: 36 };
  const max = Math.max(...entries.map(([, count]) => count), 1);
  const barWidth = (width - pad.left - pad.right) / Math.max(1, entries.length);
  const bars = entries
    .map(([status, count], i) => {
      const h = (count / max) * (height - pad.top - pad.bottom);
      const x = pad.left + i * barWidth + 8;
      const y = height - pad.bottom - h;
      return `<rect x="${x}" y="${y}" width="${Math.max(20, barWidth - 16)}" height="${h}" rx="4" fill="#246bfe"></rect>
        <text x="${x + Math.max(20, barWidth - 16) / 2}" y="${y - 6}" text-anchor="middle" font-size="12" fill="#17212b">${count}</text>
        <text x="${x + Math.max(20, barWidth - 16) / 2}" y="${height - 18}" text-anchor="middle" font-size="11" fill="#64717f">${statusLabel(status)}</text>`;
    })
    .join("");
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Durum çubuk grafiği">
    <line class="axis" x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}"></line>
    ${bars}
  </svg>`;
}

function renderCharts() {
  lineChart(document.getElementById("scoreChart"), state.experiments);
  barChart(document.getElementById("statusChart"), state.experiments);
}

function renderAll() {
  renderMetrics();
  renderFilters();
  renderExperiments();
  renderHypotheses();
  renderTasks();
  renderPreviews();
  renderCharts();
}

function bindEvents() {
  document.getElementById("searchInput").addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    renderExperiments();
  });
  document.getElementById("statusFilter").addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    renderExperiments();
  });
  document.getElementById("ownerFilter").addEventListener("change", (event) => {
    state.filters.owner = event.target.value;
    renderExperiments();
  });
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `datathon-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("fileInput").click();
  });
  document.getElementById("fileInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imported = JSON.parse(await file.text());
    state.experiments = imported.experiments || state.experiments;
    state.hypotheses = imported.hypotheses || state.hypotheses;
    state.tasks = imported.tasks || state.tasks;
    state.team = imported.team || state.team;
    renderAll();
  });
}

loadData()
  .then(() => {
    bindEvents();
    renderAll();
  })
  .catch((error) => {
    document.body.innerHTML = `<main class="main" style="margin:0"><section class="section"><h2>Dashboard yüklenemedi</h2><pre>${error.message}</pre></section></main>`;
  });
