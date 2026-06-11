# Datathon 2026 Team Dashboard

Static dashboard for tracking Datathon experiments, hypotheses, tasks, local CV scores, Kaggle public scores and artifact paths.

## Files

- `index.html`: dashboard UI
- `styles.css`: dashboard styling
- `app.js`: client-side rendering and charts
- `data/experiments.json`: experiment log
- `data/hypotheses.json`: hypothesis tracker
- `data/tasks.json`: execution queue
- `data/team.json`: team members

## Update Flow

1. Add or edit records under `dashboard/data/`.
2. Commit and push.
3. GitHub Pages refreshes the public dashboard.

Do not commit Kaggle raw data, full submissions, model binaries, notebooks with secrets, or private competition material. This repo is intended to publish metadata only.

## Local Preview

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m http.server 8010 -d dashboard
```

Open:

```text
http://localhost:8010
```
