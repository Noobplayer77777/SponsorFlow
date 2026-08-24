/**
 * RACE CONDITION PREVENTION & LOCKING EXPLANATION
 * 
 * In a traditional check-then-act pattern:
 * 1. SELECT * FROM Company WHERE id = X
 * 2. If lockedById is null -> UPDATE Company SET lockedById = 'UserA'
 * 
 * If Member A and Member B execute step 1 simultaneously, they both see `lockedById = null`.
 * They both proceed to step 2. The last one to execute step 2 "wins", but BOTH think they have the lock.
 * This results in Duplicate Outreach (both draft and send an email).
 * 
 * SOLUTION IN THIS CODEBASE (Atomic Update):
 * We bypass check-then-act entirely by pushing the condition into the UPDATE statement itself.
 * 
 * prisma.company.updateMany({
 *   where: {
 *     id: companyId,
 *     OR: [ { lockedById: null }, { lockedAt: < expired > } ]
 *   },
 *   data: { lockedById: userId }
 * });
 * 
 * Under the hood, Prisma translates this to:
 * UPDATE "Company" 
 * SET "lockedById" = $1, "lockedAt" = $2 
 * WHERE "id" = $3 AND ("lockedById" IS NULL OR "lockedAt" < $4);
 * 
 * PostgreSQL handles this query atomically:
 * - When Member A's query starts, Postgres acquires a Row Exclusive Lock on the row.
 * - The row is updated.
 * - When Member B's query (which arrived a millisecond later) acquires the lock, it re-evaluates the WHERE clause.
 * - Because Member A already set "lockedById" to non-null, Member B's WHERE clause fails.
 * - Member B's query updates 0 rows (count === 0).
 * - Our API checks `if (result.count === 0)` and safely throws a 409 Conflict.
 * 
 * This natively and securely prevents 100% of race conditions without requiring complex Redis locks.
 */
