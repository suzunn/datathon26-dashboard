# Datathon 2026 Dashboard

Takım deneylerini, hipotezleri, görevleri ve Kaggle skorlarını takip etmek için public metadata dashboard'u.

Canlı site `dashboard/` klasöründen GitHub Pages ile yayınlanır. Ham Kaggle verisi, submission dosyaları, model çıktıları ve local deney artefaktları bilerek ignore edilir.

Local önizleme:

```powershell
.\.venv\Scripts\python.exe -m http.server 8010 -d dashboard
```

Sonra `http://localhost:8010` adresini aç.
