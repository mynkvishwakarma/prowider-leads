## 🛠️ Setup Instructions

### 1. Clone & Install
```bash
git clone <your-repo>
cd prowider-leads
npm install
```

### 2. Configure Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection String**
3. Copy the **Connection pooling** string (port 6543) and the **Direct** string (port 5432)
4. Update `.env`:
```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
```

### 3. Push DB Schema
```bash
npx prisma db push
```

### 4. Seed Database
```bash
npx prisma db seed
```
This creates: 3 services, 8 providers, initial allocation state.

### 5. Run Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 📄 Routes

| Route | Description |
|-------|-------------|
| `/` | Home / navigation |
| `/request-service` | Customer enquiry form |
| `/dashboard` | Real-time provider dashboard |
| `/test-tools` | Webhook simulation & stress testing |

---

## 🧠 Allocation Algorithm

### Rules
| Service | Mandatory | Pool | Slots from Pool |
|---------|-----------|------|-----------------|
| Service 1 | Provider 1 | [2, 3, 4] | 2 |
| Service 2 | Provider 5 | [6, 7, 8] | 2 |
| Service 3 | Provider 1, 4 | [2, 3, 5, 6, 7, 8] | 1 |

### Round-Robin Fair Distribution
1. Each service has an `AllocationState` row storing `lastPoolIndex`
2. On each lead, we advance from `lastPoolIndex` through the pool array
3. We skip providers that are over monthly quota (10)
4. The new `lastPoolIndex` is persisted — survives server restarts
5. Result: providers are picked cyclically, fairly, without repetition

---

## 🔒 Concurrency Handling

Uses **PostgreSQL Advisory Locks** (`pg_advisory_lock`) per service ID:

```
Service 1 lead → acquires lock(1001) → allocate → release
Service 2 lead → acquires lock(1002) → allocate → release  ← runs in parallel with above
```

- Two simultaneous Service 1 leads are **serialized** — no double-assignment
- Different services run concurrently without blocking each other
- All allocation + assignment happens inside a **single DB transaction**
- DB unique constraint `(leadId, providerId)` is the final safety net

---

## 🔁 Webhook Idempotency

The `/api/webhook` endpoint stores each processed `idempotencyKey` in the `webhook_events` table.

1. First call with key `abc123` → process, store key, return `{ idempotent: false }`
2. Second call with same key → find existing record, **return immediately** without any DB changes, return `{ idempotent: true }`

This prevents duplicate quota resets even if the payment gateway retries.

---

## 🗄️ Database Schema

```
services         id, name
providers        id, name, monthly_quota, leads_received
leads            id, customer_name, phone, city, service_id, description
                 UNIQUE(phone, service_id) ← duplicate prevention
lead_assignments id, lead_id, provider_id, assigned_at
                 UNIQUE(lead_id, provider_id) ← no double assignment
allocation_state id, service_id, last_pool_index ← round-robin state
webhook_events   id, idempotency_key, event_type, processed_at
                 UNIQUE(idempotency_key) ← idempotency guard
```

---

## 🧪 Testing Checklist

- [x] Submit duplicate phone + same service → rejected
- [x] Submit same phone + different service → allowed
- [x] Generate 10 concurrent leads → allocation stays fair
- [x] Trigger webhook 3× with same key → only 1 quota reset
- [x] Leave dashboard open, submit lead in other tab → auto-updates
- [x] Quota respected — providers over limit skip to next pool member
