# Prompt Book

<p align="center">
  <strong>A community-driven encyclopedia for discovering, sharing, scoring, and organizing AI prompts.</strong>
</p>

<p align="center">
  Prompt Book combines a public prompt library with collaborative team collections, OAuth sign-in, voting, comments, favorites, and prompt scoring metadata.
</p>

<p align="center">
  <a href="#features">Features</a>
  ·
  <a href="https://www.promptbook.info/prompts">Live Demo</a>
  ·
  <a href="#architecture">Architecture</a>
  ·
  <a href="#quick-start">Quick Start</a>
  ·
  <a href="#deployment-notes">Deployment Notes</a>
  ·
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Postgres-compatible-336791?logo=postgresql&logoColor=white" alt="Postgres" />
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="Apache 2.0 License" />
</p>

## Features

<table>
  <tr>
    <td width="50%" valign="top">
      <strong>Structured discovery</strong><br />
      Browse prompts by category, subcategory, tags, keyword search, popularity, recency, or score so useful prompts are easy to find.
    </td>
    <td width="50%" valign="top">
      <strong>Publishing workflow</strong><br />
      Create prompts with titles, descriptions, full prompt content, and metadata that make them reusable instead of disposable snippets.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <strong>Community quality signals</strong><br />
      Combine votes, comments, favorites, and stored scoring data to surface prompts that are both useful and battle-tested.
    </td>
    <td width="50%" valign="top">
      <strong>OAuth-based accounts</strong><br />
      Sign in with GitHub or Google, maintain a profile, and keep your submissions, favorites, and activity tied to one account.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <strong>Team collaboration</strong><br />
      Create teams, manage membership, and organize prompts into shared collections for internal curation and reuse.
    </td>
    <td width="50%" valign="top">
      <strong>Split frontend and backend</strong><br />
      Run the UI and API independently with Next.js, Prisma, PostgreSQL, and deployment-friendly environment isolation.
    </td>
  </tr>
</table>

## Why Prompt Book

Prompt Book is built for teams and communities that want more than a flat list of prompts. Instead of treating prompts like loose notes, it gives them structure, social feedback, reusable organization, and a backend data model that can evolve with ranking, moderation, and analytics.

## Architecture

```mermaid
flowchart LR
    U["User Browser"] --> F["promptbook-frontend<br/>Next.js app"]
    F --> A["NextAuth<br/>GitHub / Google OAuth"]
    F --> B["promptbook-backend<br/>Next.js API app"]
    B --> D["Postgres / Supabase"]
```

### Apps

| App | Path | Purpose |
| --- | --- | --- |
| Frontend | `promptbook-frontend` | Next.js UI, authentication, browsing, profiles, teams, prompt creation |
| Backend | `promptbook-backend` | Next.js API routes, Prisma models, authorization, prompt/team/activity data |

### Core stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 18, TypeScript |
| Auth | NextAuth with GitHub and Google providers |
| Backend | Next.js route handlers |
| Database | Prisma + PostgreSQL |
| Deployment-friendly extras | Vercel analytics, Vercel speed insights |

## Repository Layout

```text
.
├── promptbook-backend/
│   ├── prisma/
│   └── src/
│       ├── app/api/
│       ├── lib/
│       ├── repositories/
│       └── services/
├── promptbook-frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── styles/
│       └── types/
└── LICENSE
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- A PostgreSQL database
- GitHub OAuth app credentials
- Google OAuth client credentials

### 1. Clone and install

```bash
git clone https://github.com/ishwantsingh/prompt-book.git
cd prompt-book

cd promptbook-backend
npm install

cd ../promptbook-frontend
npm install
```

### 2. Configure environment variables

Create `promptbook-frontend/.env.local`:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Create `promptbook-backend/.env`:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
NEXTAUTH_SECRET=replace-with-the-same-secret-used-in-the-frontend
CORS_ORIGINS=http://localhost:3000
ADMIN_USER_EMAILS=
ADMIN_USER_IDS=
```

Important:

- `NEXTAUTH_SECRET` must match in both apps.
- `NEXT_PUBLIC_API_BASE_URL` should point to the backend app.
- `CORS_ORIGINS` should include the frontend origin.

### 3. Initialize the database

```bash
cd promptbook-backend
npx prisma db push
```

Optional sample data:

```bash
npm run seed:383
```

### 4. Start the apps

Backend:

```bash
cd promptbook-backend
npm run dev
```

Frontend:

```bash
cd promptbook-frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## OAuth Setup

Use these callback URLs in local development:

- GitHub: `http://localhost:3000/api/auth/callback/github`
- Google: `http://localhost:3000/api/auth/callback/google`

For production, replace `http://localhost:3000` with your deployed frontend URL.

## Development Workflow

### Useful commands

Frontend:

```bash
cd promptbook-frontend
npm run dev
npm run build
```

Backend:

```bash
cd promptbook-backend
npm run dev
npm run build
npx prisma studio
```

### Current capabilities

- Public prompt browsing and prompt creation
- Voting, favorites, comments, and user profiles
- Team creation, membership, and shared collections
- OAuth sign-in with GitHub and Google
- Prompt ranking via stored score fields

## Deployment Notes

- Deploy `promptbook-frontend` and `promptbook-backend` as separate apps.
- Point `NEXT_PUBLIC_API_BASE_URL` at the deployed backend.
- Set `CORS_ORIGINS` on the backend to your deployed frontend origin.
- Use the same `NEXTAUTH_SECRET` in both apps.
- Provision PostgreSQL or Supabase for `DATABASE_URL`.
- Add `ADMIN_USER_EMAILS` or `ADMIN_USER_IDS` if you need admin-only backend routes.

## Security Notes

- Do not commit `.env` files or provider secrets.
- Keep OAuth client secrets and `NEXTAUTH_SECRET` in your deployment platform's secret manager.
- If you rotate auth or OAuth secrets, redeploy both apps so they stay in sync.

## Contributing

Issues and pull requests are welcome.

If you want to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes with clear commit messages.
4. Open a pull request with context, screenshots, or testing notes when relevant.

## License

This project is licensed under the Apache 2.0 License. See [LICENSE](./LICENSE) for details.
