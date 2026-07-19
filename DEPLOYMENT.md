# Study Buddy Matcher: Deployment & Setup Guide

This guide provides step-by-step instructions to get your "Study Buddy Matcher" project connected to a database, version-controlled with Git, and deployed live on Vercel.

---

## Step 1: Create a Postgres Database

You can use either **Supabase** or **Railway** to spin up a free PostgreSQL database.

### Option A: Using Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com) and sign in or sign up.
2. Click **New Project** and select your organization.
3. Enter a project name (e.g., `study-buddy-matcher`) and a secure database password (save this password!).
4. Select a region close to your target users and click **Create New Project**.
5. Once the project is provisioned (takes 1-2 minutes):
   - Go to **Project Settings** (gear icon) -> **Database**.
   - Under the **Connection string** section, copy the URI.
   - For Prisma 7, copy the **Transaction** connection URL (port `6543`) or the **Session** connection URL (port `5432`). It looks like:
     `postgresql://postgres.[username]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
   - Make sure to replace `[password]` with the actual database password you chose.
6. Create a `.env` file in your project root (if not present) and add the connection string:
   ```env
   DATABASE_URL="postgresql://postgres.[username]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

### Option B: Using Railway
1. Go to [railway.com](https://railway.com) and sign in or sign up.
2. Click **New Project** -> **Provision PostgreSQL**.
3. Once the database is initialized, click on the **PostgreSQL** service block.
4. Go to the **Variables** tab.
5. Copy the value of the `DATABASE_URL` variable. It looks like:
   `postgresql://postgres:[password]@railway.internal:5432/railway` or a public TCP alternative like `postgresql://postgres:[password]@roundhouse.proxy.rlwy.net:[port]/railway`.
6. Add this `DATABASE_URL` connection string to your local `.env` file.

---

## Step 2: Push to GitHub

1. Open your terminal at the root of the project (`c:\Users\ankur\OneDrive\Desktop\Full Stack\STUDY BUDDY MATCHER`).
2. Initialize Git if not already done:
   ```powershell
   git init
   ```
3. Stage all files (Next.js automatically generated a `.gitignore` that excludes `node_modules`, `.next`, and `.env`):
   ```powershell
   git add .
   ```
4. Commit your changes:
   ```powershell
   git commit -m "Initial commit: Study Buddy Matcher skeleton"
   ```
5. Go to [github.com](https://github.com) and create a new repository:
   - Repository name: `study-buddy-matcher`
   - Keep it Public or Private (according to your preference).
   - Do **NOT** initialize it with a README, `.gitignore`, or license.
6. Copy the commands under **"…or push an existing repository from the command line"**:
   ```powershell
   git remote add origin https://github.com/your-username/study-buddy-matcher.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** -> **Project**.
3. Import the `study-buddy-matcher` repository from your GitHub account.
4. Under **Configure Project**:
   - Keep **Framework Preset** as **Next.js**.
   - Expand the **Environment Variables** section.
   - Add a new variable:
     - **Key**: `DATABASE_URL`
     - **Value**: [Paste your Postgres connection string from Step 1]
   - Click **Add**.
5. Click **Deploy**.
6. Once deployment finishes, Vercel will provide a live URL (e.g., `study-buddy-matcher.vercel.app`).
7. Open the URL in your browser and confirm that you see the premium **Study Buddy Matcher - coming soon** landing page!

---

## Prisma Commands Cheat Sheet

- **Generate Prisma Client**: Run `npx prisma generate` to update types after schema changes.
- **Run migrations**: Run `npx prisma migrate dev --name <migration-name>` to create and apply database migrations locally.
- **Inspect DB**: Run `npx prisma studio` to open a local GUI for exploring your tables and data.
