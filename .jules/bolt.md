## 2026-05-18 - Missing Promise.all on independent database queries
**Learning:** Sequential, independent database queries within API routes are a common anti-pattern that slows down dashboard loading significantly. When multiple independent counts or aggregates are required, doing them sequentially multiplies latency.
**Action:** Always check if multiple `await db...` queries in the same function can be grouped into a single `Promise.all()` to run them concurrently, especially in dashboard/statistics endpoints.
