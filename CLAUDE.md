# EkosWizard — Development Guidelines

## GitHub — Commit and Push After Every Session

After completing any meaningful change, always commit and push to GitHub:

```bash
cd "C:\Users\User\Google Drive\EkosWizard"
git add .
git commit -m "Brief description of what changed"
git push
```

- Commit after every feature, fix, or significant edit — don't batch up days of work
- Use a clear commit message describing what changed (e.g. "Add CIS program filtering to AuditController", "Fix timezone dropdown clipping")
- The GitHub remote is: `https://github.com/ProjectDefault/ImpWizard.git`
- Branch: `main`

## Security is a Top Priority

**Every feature, every endpoint, every UI change must be evaluated through a security lens.** Before shipping any code, ask: "Can a user access data that isn't theirs? Can a user escalate privileges? Can input be injected?" If the answer to any of these is "maybe," fix it first.

---

## Backend Security Rules

### Authorization — Enforce on Every Endpoint

- Every controller endpoint **must** check authorization before touching data.
- Use `[Authorize(Roles = "...")]` at the controller or action level. Never rely on the frontend to hide things.
- For project-scoped endpoints, always call `CanAccessProject(id)` **before** any DB query.
- For team management actions, use `CanManageTeam(id)` — not just `CanAccessProject`.

### IDOR Prevention (Insecure Direct Object Reference)

- Whenever a route has both a parent ID and a child ID (e.g., `/projects/{id}/forms/{faid}`), **always verify the child belongs to the parent** in the DB query — never assume the URL is honest.
- Example: `ProjectFormAssignment` must be loaded with `f.Id == faid && f.ProjectId == id`.
- This applies to: form assignments, submissions, meetings, resources, team members.

### Input Validation

- **Never trust user-supplied foreign keys.** Always verify they exist and belong to the expected parent.
- For form submissions, validate every `FormFieldId` in the answers array against the actual fields of the form being submitted. Reject with `400 BadRequest` if any are invalid.
- Never use `Entry().CurrentValues.SetValues()` — always assign fields explicitly to prevent mass assignment.

### Role-Based Data Isolation

- **CIS users** are restricted to specific programs via `UserProgramAccess`. This restriction must be enforced in:
  - `FormsController.GetAll()` — filter by allowed program IDs
  - `JourneysController.GetAll()` — filter by allowed program IDs
  - `AuditController.GetAuditLog()` and `ExportCsv()` — filter by allowed project IDs
  - Any new endpoint that lists program- or project-scoped data
- **Customer users** can only access forms assigned to them (or unassigned). Check `AssignedToUserId` before allowing SaveDraft/SubmitForm/GetFormDetail.
- **SuperCustomer users** can manage team membership within their project only.

### DbContext Thread Safety

- `AuditService` uses `IServiceScopeFactory` to create its own scope — do not revert this. It prevents concurrent `SaveChangesAsync` races when a controller uses both `_db` and `_audit` in the same request.
- `BackgroundService` implementations must also use `IServiceScopeFactory` — never inject `AppDbContext` directly into a singleton or hosted service.

### Authentication

- JWTs are validated for issuer, audience, lifetime, and signing key.
- `sessionStorage` is used for JWT storage (cleared on browser/tab close) — do not revert to `localStorage`.
- After email change: `ChangeEmailAsync` updates the SecurityStamp. The frontend immediately logs out the user. Do not weaken this flow.
- Future: if JWT expiry is lengthened beyond 1 hour, implement SecurityStamp validation in the JWT bearer `OnTokenValidated` event.

---

## Frontend Security Rules

### No Client-Side Authorization

- Role checks in the UI (e.g., `isAdmin`, `isCis`) are **display conveniences only** — they control what the user sees, not what they can do.
- Every protected action must be enforced by the API. Never remove a backend auth check because "the UI already hides the button."

### Session Management

- Auth state is stored in `sessionStorage` via Zustand persist. Do not change this to `localStorage`.
- On logout, `useAuthStore.logout()` must be called before any redirect.
- On email change success, the frontend must call `logout()` and redirect to `/login` — this is already implemented and must not be removed.

### URL Manipulation

- Frontend routes use React Router with role-based redirects. However, all data fetched by those routes must also be authorized server-side.
- Never make an API call with a user-supplied ID from the URL without the API validating ownership.

---

## Database Safety

- **Never drop or recreate production tables** without an explicit migration strategy and backup.
- Always use EF Core migrations — never `EnsureCreated()` in production.
- Sensitive config (connection strings, JWT keys) lives in `appsettings.json` / environment variables — never commit real credentials to source control.
- When adding new tables or columns, write a migration and test it against the existing data.

---

## Code Review Checklist (Before Every Commit)

- [ ] Does every new endpoint check authorization?
- [ ] Are all child-resource lookups scoped to their parent? (IDOR check)
- [ ] Are user-supplied foreign keys validated against the DB?
- [ ] Are CIS program restrictions applied to any new list endpoints?
- [ ] Is any new background work using `IServiceScopeFactory`?
- [ ] Does any new customer-facing feature expose data from other customers?
- [ ] Are error messages generic enough not to leak internal state?
