# Finance Parser (Finance Parser)

A Next.js application designed to parse, categorize, and organize unstructured financial transactions from various sources using AI. 

Whether it's a messy WhatsApp chat log, a physical shopping receipt, or a raw JSON dump, this tool intelligently extracts the transactions, automatically categorizes them, and presents them in a clean, spreadsheet-like workspace for further curation.

## ✨ Features

- **Multi-Source Data Ingestion**
  - **💬 WhatsApp Chat Parser:** Paste raw chat logs containing financial notes.
  - **🧾 Receipt Scanner:** Upload images of physical receipts (powered by Cloudinary and AI OCR).
  - **🤖 Manual AI / JSON:** Direct JSON input for fallback when API limits are reached.
- **AI-Powered Categorization**
  - Supports multiple AI providers (`gemini-2.5-flash`, `swiftrouter`, etc.).
  - Automatically translates abbreviations and maps items to customizable categories.
  - Smart keyword lookup to remember past categorizations.
- **Workspace & Session Management**
  - Spreadsheet-like table to view, edit, and filter parsed data.
  - Advanced filtering by Data Source (Chat, Scan, Manual) and Categories.
  - Sessions are saved to the database automatically, preventing data loss.
- **Single-User Security**
  - Built-in global password authentication to secure the workspace from unauthorized access.
  - HTTP-only cookie session management.

## 🚀 Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Styling:** Tailwind CSS, shadcn/ui, Lucide Icons
- **Database:** PostgreSQL (Neon / Local)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **State Management:** Zustand
- **Media Upload:** Cloudinary

## 🛠️ Getting Started

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in the required values:
```bash
cp .env.example .env
```
Key variables to configure:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `APP_PASSWORD`: The password required to log into the app.
- `AUTH_SECRET`: A random string for securing session cookies.
- `GEMINI_API_KEY`: API key for Google's Gemini models.
- `CLOUDINARY_*`: Credentials for receipt image uploads.

### 3. Database Setup
Generate and push the database schema using Drizzle:
```bash
npm run db:generate
npm run db:push
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser. You will be prompted to enter the `APP_PASSWORD` defined in your `.env` file.

## 📂 Project Structure

- `/src/app`: Next.js App Router pages (Login, Workspace, Settings).
- `/src/components`: UI Components organized by feature (workspace, settings, ui).
- `/src/actions`: Next.js Server Actions for secure backend operations (auth, AI parsing, Cloudinary).
- `/src/db`: Drizzle ORM schema and database client.
- `/src/features`: Core business logic (categorization taxonomy, audio notifications, validation).
- `/src/lib/ai`: AI Provider integrations (Gemini, SwiftRouter).

## 🔒 Security Note
This application is designed as a **single-user personal tool**. The authentication system uses a single global password (`APP_PASSWORD`) to lock the entire application. Do not share this password.
