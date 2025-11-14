## CODO Accounts Frontend

React + Vite dashboard consuming the CODO AI Innovations Finance Management APIs.

### Environment variables

Create a `.env` (or `.env.local`) at the project root with:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_TOKEN=your_personal_access_token
```

> Generate a personal access token for a staff user via `php artisan tinker` or a login endpoint. The API today expects a Bearer token issued by Laravel Sanctum.

### Getting started

```bash
cd front-end
npm install
npm run dev
```

The `/admin` section now provides UI to manage:

- Finance Types (CRUD & soft delete)
- Departments (CRUD & soft delete)
- Staff access (roles, activation, deletion)
- Salaries (payroll run + ledger linkage)

All operations use the backend endpoints introduced in the Laravel service. Toast notifications highlight success/failure, and React Query keeps views in sync.

