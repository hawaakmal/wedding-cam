# Kamera Majlis — Groom & Bride 📷💍

Aplikasi kamera digital untuk tetamu majlis. Tetamu imbas kod QR → ambil gambar dengan bingkai & penapis → gambar masuk terus ke album dan Google Drive pengantin.

```
index.html        struktur skrin (muka depan, laman utama, kamera, album)
style.css         rupa & warna
config.js         ← SATU-SATUNYA fail yang perlu diubah (nama, tarikh, URL backend)
frames.js         bingkai Renda / Emas / Polaroid / Asli (dilukis dengan Canvas)
app.js            kamera, penapis, grid, kira detik, muzik, album, muat naik
apps-script/Code.gs   backend Google Apps Script → Google Drive
assets/           letak lagu.mp3 & gambar Canva di sini
```

---

## 1. Cuba dulu dalam komputer (mod demo)

Kamera hanya berfungsi melalui `https://` atau `localhost`.

```bash
cd wedding-cam
python3 -m http.server 8000
```
Buka `http://localhost:8000`. Selagi `APPS_SCRIPT_URL` kosong, aplikasi berjalan dalam **mod demo** — gambar disimpan dalam pelayar sahaja, jadi anda boleh uji semua fungsi tanpa backend.

## 2. Sediakan Google Drive + Apps Script

1. Dalam Google Drive akaun pengantin, buat folder baru, cth. **Asyraf X Dhirah**.
2. Buka folder → salin ID dari URL: `drive.google.com/drive/folders/`**`1AbC...xyz`**
3. Pergi ke [script.google.com](https://script.google.com) → **New project**.
4. Padam kod sedia ada, tampal semua isi `apps-script/Code.gs`.
5. Tukar `FOLDER_ID` kepada ID folder tadi.
6. Pilih fungsi **`setup`** → **Run** → benarkan akses Drive (klik *Advanced → Go to project* jika ada amaran — ini skrip anda sendiri).
7. **Deploy → New deployment → ⚙️ Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Salin **Web app URL** (berakhir `/exec`) dan tampal dalam `config.js`:
   ```js
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfy.../exec',
   ```

> Setiap kali ubah `Code.gs`, buat **Deploy → Manage deployments → ✏️ Edit → Version: New version** supaya URL kekal sama.

## 3. Muat naik ke GitHub Pages

1. Buat repo baru di GitHub (cth. `wedding-cam`), muat naik semua fail.
2. **Settings → Pages → Source: Deploy from a branch → `main` / root** → Save.
3. Selepas 1–2 minit, laman tersedia di `https://<username>.github.io/wedding-cam/`

## 4. Kod QR untuk goodies

Dalam Canva: **Apps → QR Code** → tampal URL GitHub Pages → letak pada kad goodies. Uji imbas dengan iPhone **dan** Android sebelum cetak.

## 5. Hiasan dari Canva (pilihan)

Aplikasi sudah lengkap dengan hiasan terbina. Untuk guna reka bentuk Canva anda sendiri:

| Apa | Fail | Dalam `config.js` |
|---|---|---|
| Lagu | `assets/lagu.mp3` | `music` |
| Ilustrasi sampul muka depan | `assets/cover.png` | `images.cover` |
| Gambar pasangan dalam sampul | `assets/couple.jpg` | `images.coverPhoto` |
| Kolaj laman utama | `assets/home.png` | `images.homeCollage` |
| Bingkai gambar | `assets/frames/renda.png` | `frameImages.renda` |

**Bingkai PNG:** saiz **1080 × 1440 px**, latar lutsinar di ruang gambar. Ruang gambar mesti sama dengan kedudukan di bawah (atau ubah `win` dalam `frames.js`):

| Bingkai | Bentuk | x | y | lebar | tinggi |
|---|---|---|---|---|---|
| renda | gerbang (atas separuh bulatan) | 220 | 210 | 640 | 790 |
| emas | bujur | 250 | 225 | 580 | 780 |
| polaroid | segi empat, condong −2.5° | 180 | 200 | 720 | 850 |
| asli | penuh | 0 | 0 | 1080 | 1440 |

Mampatkan lagu (~128 kbps, < 5 MB) supaya cepat dimuat dengan data telefon.

## Cara ia berfungsi

- **Kamera:** `getUserMedia` → video dilukis ke `<canvas>` setiap bingkai. Pratonton guna CSS `filter`; gambar akhir guna matriks warna yang sama piksel demi piksel (iOS Safari tidak sokong `ctx.filter`), jadi hasil sama seperti pratonton.
- **Grid:** 1 / 2 / 4 gambar, kira detik 3-2-1 sebelum setiap gambar.
- **Muat naik:** gambar JPEG 1080×1440 dihantar ke Apps Script sebagai `text/plain` (tiada CORS preflight), disimpan dalam folder Drive.
- **Internet lemah di dewan:** gambar masuk barisan dalam IndexedDB dahulu, dan dihantar semula secara automatik bila talian pulih — tetamu tidak kehilangan gambar.
- **Padam gambar sendiri:** setiap muat naik ada token rawak yang disimpan dalam telefon tetamu; Drive hanya simpan hash SHA-256 token itu. Tanpa token, tiada siapa boleh padam gambar orang lain. Gambar yang dipadam masuk **Tong Sampah Drive** — pengantin masih boleh pulihkan.
- **Muzik:** Web Audio API (fade in/out, berhenti bila tab ditutup, main walaupun suis senyap iPhone di iOS 17+). Jika tiada `lagu.mp3`, lagu kotak muzik ringkas dimainkan.

## Nota & had

- Sesiapa yang ada pautan boleh muat naik — pengantin boleh padam terus dalam Drive jika perlu.
- Fail dalam folder dikongsi "Anyone with the link — Viewer" supaya album boleh papar gambar. Akaun Google Workspace syarikat mungkin menyekat ini; guna akaun Gmail peribadi.
- Apps Script akaun percuma: ~30 permintaan serentak. Senarai album di-cache 15 saat, jadi ratusan tetamu masih okay.
- Pautan dibuka dalam pelayar dalaman Instagram/Facebook kadangkala menyekat kamera — mesej dalam aplikasi akan minta buka dalam Chrome/Safari atau guna Galeri.
- Semak tarikh hijrah dalam `config.js` (`hijriLabel`).
