# Logistics Service (Shipping Provider)

Layanan backend simulasi kurir/ekspedisi yang menyediakan data tarif dan kalkulasi ongkos kirim berdasarkan berat (weight) dan tujuan. Dirancang sangat ringan (**Low Memory Footprint**) untuk deployment di **STB** dengan target RAM **< 40MB**.

---

## Teknologi yang Digunakan

- **Node.js (Native Modules):** `http`, `fs`, `url` (serta `path` untuk akses file)
- **Docker:** base image `node:alpine`
- **Database:** JSON File Based → `data/tariffs.json`

---

## Struktur Project

```text
.
├─ Dockerfile
├─ server.js
└─ data/
   └─ tariffs.json
```

---

## Cara Menjalankan (Local Development)

1. Pastikan Node.js sudah terinstall.
2. Jalankan service:

```bash
node server.js
```

Service berjalan di **PORT 3030** (agar tidak bentrok dengan Inventory Service di 3000).

Cek cepat:

```bash
curl http://localhost:3030/health
```

---

## Cara Menjalankan dengan Docker (Deployment)

### Build Image

```bash
docker build -t logistics_service .
```

### Run Container (Limit RAM 40MB)

```bash
docker run -d -p 3030:3030 --name logistics_container --memory="40m" logistics_service
```

Cek health dari host:

```bash
curl http://localhost:3030/health
```

---

## Dokumentasi API (Endpoints)

Base URL (local):

```text
http://localhost:3030
```

### Ringkasan Endpoint

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/tariffs` | Menampilkan daftar semua kota dan tarif dasar |
| GET | `/health` | Cek status server (uptime & memory) |
| POST | `/calculate` | (Endpoint Utama) Menghitung ongkir |

> Semua response menggunakan JSON dan sudah mengaktifkan CORS (`Access-Control-Allow-Origin: *`).

---

### 1) GET `/tariffs`
Menampilkan daftar semua kota tujuan beserta tarif dasar.

**Contoh Request**

```bash
curl http://localhost:3030/tariffs
```

**Contoh Response (200)**

```json
{
  "success": true,
  "message": "Daftar semua tarif pengiriman",
  "total": 12,
  "data": [
    {
      "destination": "Jakarta",
      "base_cost": 10000,
      "cost_per_kg": 5000,
      "eta_days": "1-2 hari"
    }
  ]
}
```

---

### 2) GET `/health`
Cek status service untuk kebutuhan monitoring (uptime, penggunaan memory, jumlah data tarif yang berhasil dimuat).

**Contoh Request**

```bash
curl http://localhost:3030/health
```

**Contoh Response (200)**

```json
{
  "success": true,
  "service": "LOGISTICS-SERVICE",
  "status": "healthy",
  "uptime": 123.456,
  "memory_usage_mb": "9.81",
  "tariffs_loaded": 12
}
```

---

### 3) POST `/calculate` (Endpoint Utama)
Menghitung total ongkos kirim berdasarkan tujuan dan berat paket.

**Rumus Perhitungan**

```text
(cost_per_kg * weight_kg) + base_cost
```

**Contoh Body Request**

```json
{ "destination": "Surabaya", "weight_kg": 2.5 }
```

**Contoh Request (cURL)**

```bash
curl -X POST http://localhost:3030/calculate \
  -H "Content-Type: application/json" \
  -d "{\"destination\":\"Surabaya\",\"weight_kg\":2.5}"
```

**Contoh Response (200)**

```json
{
  "success": true,
  "destination": "Surabaya",
  "weight_kg": 2.5,
  "base_cost": 15000,
  "cost_per_kg": 6000,
  "total_cost": 30000,
  "eta": "2-3 hari",
  "calculation": "(6000 x 2.5) + 15000 = 30000"
}
```

**Kemungkinan Error**

- **400**: body tidak valid / field wajib tidak lengkap
- **404**: destinasi tidak ditemukan (response juga mengembalikan daftar destinasi yang tersedia)

---

## Akses Layanan (Deployment Info)

- **IP Internal (Tailscale):**

```text
http://100.114.117.49:3030
```

- **Public URL:**

```text
https://jacob.tugastst.my.id
```
