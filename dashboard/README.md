# Datathon 2026 Takım Paneli

Bu statik dashboard; deneyleri, hipotezleri, görevleri, local CV skorlarını, Kaggle public skorlarını ve dosya yollarını takım içinde ortak takip etmek için kullanılır.

## Dosyalar

- `index.html`: dashboard arayüzü
- `styles.css`: görsel tasarım
- `app.js`: tarayıcı tarafı render ve grafikler
- `data/experiments.json`: deney kayıtları
- `data/hypotheses.json`: hipotez takip listesi
- `data/tasks.json`: takım iş listesi
- `data/team.json`: takım üyeleri

## Güncelleme Akışı

1. `dashboard/data/` altındaki JSON dosyalarını düzenle.
2. Commit ve push yap.
3. GitHub Pages dashboard'u otomatik günceller.

Kaggle ham verisini, tam submission dosyalarını, model dosyalarını, gizli bilgi içeren notebookları veya yarışmaya özel özel materyalleri commit etme. Bu repo sadece paylaşılabilir metadata içindir.

## Local Önizleme

Repo kök klasöründen:

```powershell
.\.venv\Scripts\python.exe -m http.server 8010 -d dashboard
```

Aç:

```text
http://localhost:8010
```
