# storagemap
A web application for organizing household belongings, managing storage locations, and quickly finding stored items.
## Favorite Quote

> "But what is grief, if not love persevering?"
>
> — Vision, *WandaVision* (2021)

---

> "The sky's the same color everywhere, isn't it?"
>
> — Kei Nagase, *Ace Combat 5: The Unsung War* (2004)

---

> "Scars can heal and reveal just where you are."
>
> — Rachel House, *Moana* (2016)


## Frontend

The frontend uses React and provides an interface for managing inventory items and nested storage locations.

### Features

- Create and manage storage locations and sublocations.
- Add, rename, move, and delete inventory items.
- Move locations together with their contents.
- Search for inventory items.

### Running the frontend

From the project root:

```bash
npm install
```

Start the React development server on port 3001:

```powershell
$env:PORT=3001
npm start
```

Open http://localhost:3001 in your browser.

### Running the backend

Open another terminal:

```bash
cd backend
npm install
node server.js
```

The Express backend runs on http://localhost:3000.

### Running tests

From the project root:

```bash
npm test
```

### Current limitations

Inventory data is currently stored in React state and is not yet persisted to SQLite. Frontend and backend integration is planned for a later development stage.
