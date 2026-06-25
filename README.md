# TaskFlow Dashboard

Ein funktionales, interaktives Projektmanagement-Dashboard für agile Teams. Es kombiniert Issue-Tracking, Kanban-Board, Backlog-Planung, Wiki, Reports und Team-Übersicht in einer modernen React-Anwendung.

## Funktionen

- **Board** – Kanban-Ansicht des aktiven Sprints mit Drag & Drop
- **Backlog** – Übersicht aller Issues, gruppiert nach Sprints
- **Wiki** – Dokumentation mit Markdown-ähnlichem Renderer
- **Reports** – Burndown, Velocity, Issue-Verteilung und Workload-Charts
- **Team** – Übersicht der Teammitglieder mit zugewiesenen Issues
- **Light/Dark Mode** – Umschaltbar über die Sidebar

## Lokale Entwicklung

```bash
npm install
npm run dev
```

## Produktions-Build

```bash
npm run build
npm run preview
```

Der `dist`-Ordner enthält die fertige Web-App und kann auf jedem statischen Webserver oder als PWA installiert werden.
