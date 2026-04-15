# 🔐 Authentication & Multi-Tenancy Setup Guide

## ✅ Tamamlanan

- [x] Auth utilities (password hashing, JWT)
- [x] Login/Register API routes
- [x] Logout API route
- [x] Middleware (route protection + userId extraction)
- [x] Login & Register pages (UI)
- [x] Seed script (test user)
- [x] Candidates & Jobs API routes updated with userId filtering

---

## 🚀 Kurulum Adımları

### **Adım 1: Veritabanı Migrationını Çalıştır**

```powershell
cd C:\Users\y.pullukcu\Documents\Claude\Projects\Recuter\recuter-app\recuter-app

npx prisma migrate dev --name add_auth_and_multi_tenancy
```

Bu komut:
- Eski veritabanını yedekleyecek
- User ve Subscription tablolarını oluşturacak
- Tüm data modellerine `userId` ekleyecek
- Migration'ları uygulayacak

---

### **Adım 2: Test User'ı Oluştur**

```powershell
npm run db:seed-auth
```

Çıktı:
```
✓ Test user created:
  Email: yavuz@arkhetalent.com
  Password: password123
  Plan: pro
```

---

### **Adım 3: Dev Server'ı Başlat**

```powershell
npm run dev
```

---

## 🧪 Test Etme

### **1. Login Sayfasını Aç**
```
http://localhost:3000/login
```

Demo credentials:
- Email: `yavuz@arkhetalent.com`
- Password: `password123`

**Beklenen:** Giriş yapınca Dashboard'a redirect olacak.

---

### **2. Register Sayfasını Test Et**
```
http://localhost:3000/register
```

Yeni bir kullanıcı kaydedip giriş yapabiliyor musun test et.

---

### **3. Data Isolation Test (Multi-Tenancy)**

1. User A olarak giriş yap → 5 aday ekle
2. Browser'ı logout et (sağ üstteki menü)
3. User B olarak kayıt ol → Dashboard'a bak

**Beklenen:** User B sadece kendi adaylarını görecek (User A'nınkileri görmeyecek)

---

### **4. Token Verification**

Chrome DevTools → Application → Cookies → `auth-token`

Token'ı kopyala ve decode et:
```
https://jwt.io/
```

Decoded token'da `userId` ve `email` görünecek.

---

## 📋 Yapılması Gereken Sonraki Adımlar

### **Phase 2 (Şu anda Pending):**

1. **Tüm API routes'u güncelleyelim:**
   - [ ] `/api/candidates/[id]` (PUT, DELETE)
   - [ ] `/api/jobs/[id]` (PUT, DELETE)
   - [ ] `/api/assignments`
   - [ ] `/api/companies`
   - [ ] `/api/projects`
   - [ ] `/api/contracts`

2. **Dashboard'u güncelleyelim:**
   - [ ] userId ile veri çekme
   - [ ] Logout butonu
   - [ ] User profil menüsü

3. **License Dashboard:**
   - [ ] Subscription bilgileri göster
   - [ ] Plan upgrade butonu
   - [ ] Usage tracking (adayların kaçı kullanıldığı)

4. **Admin Panel:**
   - [ ] Tüm users listesi
   - [ ] Plan management
   - [ ] License activation/revocation

---

## 🐛 Troubleshooting

### **"Unauthorized" hatasına alıyorum**
- ✓ Auth token cookie'si ayarlandı mı?
- ✓ Middleware.ts çalışıyor mu?
- ✓ Logout mu ettin? Tekrar login et.

### **"Foreign key constraint" hatası migration'da**
- ✓ Eski dev.db silinmiş mi?
- ✓ `npx prisma migrate reset` dene (tüm veri silinir)

### **Test user oluşmuyor**
- ✓ Eski user varsa seed skip eder
- ✓ Eski user'ı silmek için:
  ```powershell
  npx prisma db push
  npx prisma studio  # Aç → User tablosundan sil → kapat
  npm run db:seed-auth
  ```

---

## 📊 Database Schema

```
User (yeni)
├─ id, email, passwordHash, firstName, lastName
└─ subscription (1-1)

Subscription (yeni)
├─ userId, plan, maxCandidates, maxJobs, maxTeamMembers
├─ stripeCustomerId (future)
└─ expiresAt

Candidate (güncellenmiş)
├─ userId ← YENİ
├─ name, title, skills...
└─ activities[] (userId ile)

Job (güncellenmiş)
├─ userId ← YENİ
├─ title, description...
└─ candidates[]

... ve tüm other models userId ile
```

---

## ✨ Sonraki Aşama

Adım 3'de dev server başlat ve login test et. Sorun olursa yaz — Phase 2'ye geçeceğiz.
