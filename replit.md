# Running AgriConnect on Replit

Use the **Start application** workflow (or the Run button) to start the development server. It runs:

```bash
tsx watch --clear-screen=false backend/index.ts
```

The web app is served on port 5000 and is available in the Replit preview.

## Environment

Replit provides the development PostgreSQL database and session secret. The database schema has been applied during setup.

Payment processing, Google sign-in, AI tools, SMS, email, and carrier integrations require their respective external credentials before those features can be enabled.