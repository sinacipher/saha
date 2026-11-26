# SAHA Database Migration Workflow

## For Developers (Development)
1. Modify `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name your_migration_name`.
3. This creates the migration SQL and applies it to the dev database.

## For Deployment (Production)
1. Never use `db push` in production.
2. Run `npx prisma migrate deploy` to apply pending migrations.

## Backup & Rollback
- **Neon Database:** Uses Point-in-Time Recovery (PITR). You can restore to any point in the last 7 days from the Neon dashboard.
- **Rollback:** Revert the schema in `prisma/schema.prisma` and run `npx prisma migrate dev --name rollback_name`.

## Handling Existing Databases
This project was baselined using `prisma migrate resolve --applied 0_init`. Do not reset the database.