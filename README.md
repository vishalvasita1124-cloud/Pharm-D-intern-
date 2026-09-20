# Pharm D Intern Notes — Stage 1

> **Your Clinical Pharmacy Companion**
>
> Practical, concise and ward-ready notes designed for Pharm D students, interns and clinical pharmacy learners.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd 20000
npm install
```

### 2. Set Up Environment Variables

```bash
copy .env.example .env
```

Open `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ **Never** put `SUPABASE_SERVICE_ROLE_KEY` in the frontend `.env`.

### 3. Run Locally

```bash
npm run dev
```

Visit **http://localhost:5173**

---

## 🗄️ Connecting Supabase

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a region (India — `ap-south-1` recommended for low latency)
3. Set a strong database password

### Step 2 — Get Your API Keys

In your Supabase dashboard → **Project Settings → API**:
- Copy **Project URL** → paste into `VITE_SUPABASE_URL`
- Copy **anon / public** key → paste into `VITE_SUPABASE_ANON_KEY`

### Step 3 — Run Database Migrations

In Supabase dashboard → **SQL Editor → New Query**:

**Run this first:**
```sql
-- Paste entire contents of: supabase/migrations/001_schema.sql
```

**Then run:**
```sql
-- Paste entire contents of: supabase/migrations/002_seed.sql
```

Both files are in the `supabase/migrations/` folder.

### Step 4 — Enable Email Auth

In Supabase dashboard → **Authentication → Providers → Email**:
- Ensure "Enable Email Signup" is ON
- (Optional) Disable "Confirm email" for faster testing

---

## 👤 Creating the First Admin User

After a user has registered via `/register`:

1. Go to Supabase → **SQL Editor**
2. Run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

Admin users will see the Admin route at `/admin` (Stage 2 dashboard).

---

## 📦 Adding Sample Products

The seed file (`supabase/migrations/002_seed.sql`) inserts all 8 products automatically. If you need to add more later:

```sql
INSERT INTO public.products (title, slug, description, short_description, category_id, price, pages, topics, is_published)
VALUES (
  'Your Note Title',
  'your-note-slug',
  'Full description...',
  'Short description.',
  (SELECT id FROM public.categories WHERE slug = 'diagnostic-skills'),
  99,
  30,
  ARRAY['Topic 1', 'Topic 2', 'Topic 3'],
  TRUE
);
```

---

## 🌐 Deploying to Cloudflare Pages

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: Stage 1 initial release"
git remote add origin https://github.com/your-username/pharm-d-intern-notes.git
git push -u origin main
```

### Step 2 — Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages**
2. Connect your GitHub repository
3. Configure build settings:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | 20 |

### Step 3 — Add Environment Variables

In Cloudflare Pages → **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

Add these for both **Production** and **Preview** environments.

### Step 4 — Deploy

Click **Save and Deploy**. Cloudflare will build and deploy. The `public/_redirects` file ensures all routes serve `index.html` for SPA routing.

---

## 📁 Project Structure

```
pharm-d-intern-notes/
├── public/
│   └── _redirects              # Cloudflare Pages SPA routing
├── src/
│   ├── assets/covers/          # AI-generated product cover images
│   ├── components/
│   │   ├── auth/               # ProtectedRoute
│   │   ├── layout/             # Navbar, Footer, Layout
│   │   ├── products/           # ProductCard, CategoryCard
│   │   └── ui/                 # Badge, Spinner, EmptyState
│   ├── contexts/
│   │   └── AuthContext.tsx     # Supabase auth state management
│   ├── data/
│   │   └── products.ts         # Static product data (pre-Supabase)
│   ├── lib/
│   │   └── supabase.ts         # Supabase client (env vars only)
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── NotesPage.tsx       # /notes — marketplace with search/filter
│   │   ├── NoteDetailPage.tsx  # /notes/:slug
│   │   ├── CategoriesPage.tsx  # /categories
│   │   ├── LoginPage.tsx       # /login
│   │   ├── RegisterPage.tsx    # /register
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── DashboardPage.tsx   # /dashboard (protected)
│   │   ├── AdminPage.tsx       # /admin (admin-only skeleton)
│   │   └── NotFoundPage.tsx    # 404
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── App.tsx                 # Routes
│   ├── index.css               # Tailwind v4 + brand theme
│   └── main.tsx
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql      # Tables + RLS + triggers
│       └── 002_seed.sql        # 4 categories + 8 products
├── .env                        # Local secrets (gitignored)
├── .env.example                # Template for env setup
└── README.md
```

---

## 🔐 Security

- **RLS enabled** on all tables
- Users can only read/update their **own** profile
- Only published products are visible via anon key
- `role` field is protected from self-modification via RLS
- No `service_role` key in frontend code

---

## 🗺️ Stage Roadmap

| Stage | Features |
|---|---|
| **Stage 1** ✅ | Homepage, marketplace, auth, dashboard, Supabase RLS |
| **Stage 2** | Orders, manual UPI payment, UTR submission, admin dashboard, payment approval |
| **Stage 3** | Private PDF storage, secure download authorization |
| **Stage 4** | Razorpay, webhooks, automatic payment verification |
