# Production checklist

## Configuration

- [ ] `DATABASE_URL` uses the Supabase pooled runtime endpoint.
- [ ] `DIRECT_DATABASE_URL` is available only to the migration environment.
- [ ] `AUTH_SECRET` is unique, random and at least 32 characters.
- [ ] `ALLOW_DEMO_RESET=false`.
- [ ] Seed credentials and demo data are absent from production.
- [ ] Optional Upstash Redis credentials are configured together if analytics caching is required.

## Database

- [ ] `npm run db:migrate` completed against the intended database.
- [ ] A backup and restore procedure has been tested.
- [ ] Connection and query metrics are monitored in Supabase.

## Quality gate

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm audit --omit=dev`
- [ ] `npm run build`
- [ ] Admin, manager, expert and viewer permissions verified.
- [ ] Login throttling, logout and expired sessions verified.
- [ ] Request create, assign, status, comment and delete workflows verified.
- [ ] Mobile layouts and both themes checked in supported browsers.

## Operations

- [ ] Runtime logs do not contain credentials, tokens or request bodies.
- [ ] Error monitoring and deployment rollback are configured.
- [ ] An owner is assigned for access reviews and incident response.
