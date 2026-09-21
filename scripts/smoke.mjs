/**
 * HTTP smoke check against a running app (dev or production build).
 *
 * Usage: SMOKE_BASE_URL=http://localhost:3000 node scripts/smoke.mjs
 * Exits non-zero if any public route does not return the expected status.
 */

const BASE_URL = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

const CHECKS = [
  { path: '/', status: 200 },
  { path: '/tournaments', status: 200 },
  { path: '/auth/login', status: 200 },
  { path: '/auth/signup', status: 200 },
  // Protected areas must not render for anonymous visitors.
  { path: '/auctioneer/dashboard', status: [302, 307] },
  { path: '/team-owner/dashboard', status: [302, 307] },
  { path: '/player/dashboard', status: [302, 307] },
]

let failed = 0
for (const { path, status } of CHECKS) {
  const expected = Array.isArray(status) ? status : [status]
  try {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' })
    const ok = expected.includes(res.status)
    if (!ok) failed++
    console.log(`${ok ? 'PASS' : 'FAIL'} ${path} -> ${res.status} (expected ${expected.join('|')})`)
  } catch (err) {
    failed++
    console.log(`FAIL ${path} -> ${err instanceof Error ? err.message : String(err)}`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} smoke check(s) failed against ${BASE_URL}`)
  process.exit(1)
}
console.log(`\nAll ${CHECKS.length} smoke checks passed against ${BASE_URL}`)
