# TaskFlow Dashboard

Ein funktionales, interaktives Projektmanagement-Dashboard für agile Teams mit Login, rollenbasierter Berechtigung und SQLite-Backend.

## Funktionen

- **Board** – Kanban-Ansicht des aktiven Sprints mit Drag & Drop
- **Backlog** – Übersicht aller Issues, gruppiert nach Sprints (nur Admin / berechtigte Rollen)
- **Wiki** – Dokumentation mit Markdown-ähnlichem Renderer
- **Reports** – KPIs, Issue-Verteilung und Workload-Charts (nur Admin / berechtigte Rollen)
- **Team** – Übersicht der Teammitglieder mit zugewiesenen Issues
- **Settings** – Nutzer- und Rollenverwaltung (nur Admin)
- **Darkmode** – Als Standard aktiviert, umschaltbar über die Sidebar

## Architektur

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui-Komponenten
- **Backend:** Node.js + Express + SQLite
- **Auth:** JWT, Passwort-Hashing mit bcryptjs
- **Rollen:** In der SQLite-Datenbank verwaltet (`roles` + `users`)

## Lokale Entwicklung

```bash
npm install
cd server && npm install
cd ..
npm run server:seed   # Erstellt Admin-Account
npm run dev           # Startet Backend (localhost:3001) und Frontend (localhost:5173)
```

### Standard-Login

- **Admin:** `admin@taskflow.local` / `admin123`
- Weitere Nutzer können nach dem Admin-Login unter *Settings* angelegt werden.

## Production-Build

```bash
npm run build
set NODE_ENV=production
cd server && node index.js
```

Der Server liefert dann das gebaute Frontend aus und läuft unter `http://localhost:3001`.

## Deployment

### Wichtiger Hinweis

Das Backend mit SQLite benötigt einen Server mit persistentem Dateisystem. **GitHub Pages** und **Vercel** können das Backend nicht selbst hosten – sie eignen sich nur für das statische Frontend. Das Backend muss separat deployed werden (z.B. Render, Railway, Fly.io, VPS).

### GitHub Pages (Frontend only)

1. Repository auf GitHub pushen.
2. Unter *Settings → Pages* die Quelle auf **GitHub Actions** umstellen.
3. Unter *Settings → Secrets and variables → Actions → Variables* eine Variable `VITE_API_URL` mit der öffentlichen Backend-URL anlegen, z.B. `https://taskflow-api.example.com`.
4. Push auf `main` deployed das Frontend automatisch.

### Vercel (Frontend only)

1. Projekt in Vercel importieren.
2. Unter *Settings → Environment Variables* `VITE_API_URL` mit der öffentlichen Backend-URL setzen.
3. Die `vercel.json` ist bereits konfiguriert.

### Backend deployen

Das Backend ist ein normaler Node.js-Server. Es kann z.B. auf Render, Railway oder einem VPS laufen. Vergiss nicht, `JWT_SECRET` und `ALLOWED_ORIGINS` zu setzen:

```env
JWT_SECRET=your-strong-secret
ALLOWED_ORIGINS=https://your-username.github.io,https://your-project.vercel.app
```

## Sicherheit

- Ändere `JWT_SECRET` und Admin-Passwort in Production.
- Verwende HTTPS für das Backend.
- Schränke `ALLOWED_ORIGINS` auf deine Frontend-Domains ein.
