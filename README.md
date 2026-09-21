# Certificate Verifier

Register → email OTP verification → login → upload a certificate (PDF/PNG/JPG) → get **Original** or **Duplicate**.

| Part | Tech | Free host |
|---|---|---|
| Frontend | React (Vite) | Vercel |
| Backend | Python, FastAPI, SQLAlchemy | Render |
| Database | PostgreSQL | Neon |
| OTP email | Brevo HTTP API | Brevo (300 mails/day) |

**How duplicate detection works:** the SHA-256 hash of the uploaded file is stored. First time a hash is seen → *Original* (registered). Same hash again (by anyone) → *Duplicate*. Only the hash and file name are stored, not the file.

---

## Run locally

**Backend** (PowerShell)
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then edit .env
uvicorn app.main:app --reload --port 5000
```
With `DATABASE_URL=sqlite:///./dev.db` you don't need Postgres locally, and with an empty `BREVO_API_KEY` the OTP prints in the terminal. API docs: http://localhost:5000/docs

**Frontend**
```powershell
cd frontend
npm install
copy .env.example .env      # VITE_API_URL=http://localhost:5000
npm run dev
```
Open http://localhost:5173

---

## Deploy for free

Do them in this order, because each step needs a URL/key from the previous one.

### 1. Database: Neon
1. Sign up at https://neon.tech → create a project.
2. Copy the **connection string** (`postgresql://...?sslmode=require`). This is your `DATABASE_URL`.
Tables are created automatically on the first backend start.

### 2. Email: Brevo
1. Sign up at https://www.brevo.com.
2. **Senders & IP → Senders**: add your email and click the verification link they send. This is your `MAIL_FROM`.
3. **SMTP & API → API Keys**: create a key. This is your `BREVO_API_KEY`.

### 3. Backend: Render
1. Push this project to a GitHub repo.
2. Render → **New → Web Service** → pick the repo.
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Instance type: **Free**
   (Or use **New → Blueprint** and it reads `backend/render.yaml`.)
3. Environment variables:
   - `ENV` = `production`
   - `PYTHON_VERSION` = `3.12.6`
   - `DATABASE_URL` = the Neon string
   - `JWT_SECRET` = a long random string
   - `BREVO_API_KEY`, `MAIL_FROM` = from step 2
   - `CLIENT_URL` = your Vercel URL (add after step 4, then redeploy)
4. Note the URL, e.g. `https://certificate-verifier-api.onrender.com`. Check `/health`.

### 4. Frontend: Vercel
1. Vercel → **Add New → Project** → pick the repo.
   - Root Directory: `frontend` (framework: Vite is auto-detected)
   - Environment variable: `VITE_API_URL` = the Render URL (no trailing slash)
2. Deploy, then copy the Vercel URL into Render's `CLIENT_URL` and redeploy the backend (CORS).

### Free-tier notes
- Render free services **sleep after 15 min idle**; the first request afterwards takes ~30–50 s.
- Brevo's free plan sends from your own verified address; some inboxes may put OTP mails in spam at first.
- Don't use Render's own free Postgres: it's deleted after 30 days. Neon's free tier doesn't expire.

---

## Ideas to extend
- Issuer/admin role that pre-registers genuine certificates, so "original" means "issued by the institution".
- Near-duplicate detection (perceptual hash for images, text extraction/OCR for PDFs), since re-saving or screenshotting changes the file hash.
- Rate limiting (e.g. `slowapi`) on login/register.
