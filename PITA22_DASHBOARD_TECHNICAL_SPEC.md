# Pita 22 NemoClaw Dashboard - Technical Specification

**Project:** Pita 22 Restaurant AI Agent Dashboard  
**Client:** Avi (Owner) & Jessica (Manager)  
**Deployment:** Vercel + Supabase + GitHub  
**Tech Stack:** React, Node.js, PostgreSQL, Clerk Auth  
**Status:** Specification (Ready for Development)

---

## 1. OVERVIEW

The Pita 22 Dashboard is a real-time monitoring and control interface for the restaurant's NemoClaw AI agent running on AWS EC2. The agent automates sales reporting, review monitoring, inventory tracking, and operational insights. The dashboard provides:

- **Real-time agent activity & logs**
- **Daily automated reports** (sales, reviews, inventory, labor)
- **AI-generated suggestions** (staffing, pricing, reorders)
- **Manual controls** (approve actions, edit settings, view audit trail)
- **Role-based access** (owner/manager authentication)

---

## 2. ARCHITECTURE DIAGRAM

```
┌──────────────────────────────────────────────────────────────────┐
│                        PITA 22 DASHBOARD                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Frontend (React/Next.js)                                │   │
│  │  - Real-time status cards                               │   │
│  │  - Daily reports & suggestions                          │   │
│  │  - Inventory management                                 │   │
│  │  - Review responses                                     │   │
│  │  - Audit logs & activity feed                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│              ↓ (HTTPS API Calls)                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Backend (Node.js/Express)                              │   │
│  │  - API endpoints for dashboard data                     │   │
│  │  - Clerk authentication integration                     │   │
│  │  - Agent webhook receiver                               │   │
│  │  - Supabase client                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│              ↓ (PostgreSQL Queries)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Database (Supabase PostgreSQL)                          │   │
│  │  - agent_logs (agent actions)                            │   │
│  │  - daily_reports (sales, reviews, inventory)            │   │
│  │  - suggestions (AI recommendations)                      │   │
│  │  - settings (user preferences)                           │   │
│  │  - audit_trail (all actions)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
       ↑ (Agent sends updates via webhook)
       │
       │
┌──────────────────────────────────────────────────────────────────┐
│                   PITA 22 NEMOCLAW AGENT                         │
│                     (AWS EC2)                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  OpenClaw Agent (restaurantagent sandbox)               │   │
│  │  - Monitors sales (Clover API)                          │   │
│  │  - Tracks reviews (Google Business, Yelp)              │   │
│  │  - Inventory alerts                                     │   │
│  │  - Labor suggestions                                    │   │
│  │  - Cost analysis                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│              ↓ (HTTPS POST webhook)                             │
│  Sends updates to: https://dashboard.vercel.app/api/webhook    │
│              ↓                                                  │
│  Dashboard stores in Supabase & updates UI in real-time        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. DATABASE SCHEMA (Supabase PostgreSQL)

### 3.1 `agent_logs` table
Stores every action the agent performs.

```sql
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  action_type VARCHAR(50), -- 'sales_check', 'review_scan', 'inventory_alert', etc.
  status VARCHAR(20), -- 'success', 'failed', 'pending'
  data JSONB, -- Flexible storage for action-specific data
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example data:
{
  "action_type": "sales_check",
  "status": "success",
  "data": {
    "daily_revenue": 1243.50,
    "transactions": 47,
    "top_items": ["Chicken Shawarma", "Hummus Plate"],
    "peak_hours": ["12-1pm", "6-7pm"]
  }
}
```

### 3.2 `daily_reports` table
Stores auto-generated daily summaries.

```sql
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE,
  sales_total DECIMAL(10, 2),
  num_transactions INT,
  top_items JSONB, -- [{name, qty, revenue}]
  reviews_new INT,
  reviews_sentiment VARCHAR(20), -- 'positive', 'mixed', 'negative'
  inventory_status JSONB, -- [{item, qty, par_level, status}]
  labor_forecast JSONB, -- [{time_slot, suggested_staff, actual_staff}]
  food_cost_pct DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 `suggestions` table
Agent recommendations that need approval.

```sql
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_type VARCHAR(50), -- 'staffing', 'pricing', 'reorder', 'review_response'
  content TEXT, -- The actual suggestion
  data JSONB, -- Additional context
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP,
  approved_by VARCHAR(100),
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example:
{
  "suggestion_type": "staffing",
  "content": "Schedule 1 additional staff Friday 6-8 PM (historical peak)",
  "data": {
    "day": "Friday",
    "time_slot": "6-8 PM",
    "reason": "Peak sales period - avg 2.3x normal volume",
    "confidence": 0.92
  }
}
```

### 3.4 `settings` table
User preferences and configurations.

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100), -- Clerk user ID
  daily_report_time TIME DEFAULT '23:45', -- 11:45 PM
  low_inventory_threshold INT DEFAULT 20, -- Alert at 20% of par
  review_response_target INT DEFAULT 2, -- 2 hour target
  enabled_alerts JSONB DEFAULT '["inventory", "reviews", "sales"]'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.5 `audit_trail` table
Complete audit of all actions and approvals.

```sql
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(200), -- Description of what happened
  performed_by VARCHAR(100), -- Clerk user ID or 'agent'
  ip_address INET,
  details JSONB, -- Context and data
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 4. API ENDPOINTS (Backend)

### Base URL
```
https://pita22-api.vercel.app/api
```

### 4.1 Authentication (Clerk)
All requests must include:
```
Authorization: Bearer {clerk_jwt_token}
```

### 4.2 Endpoints

#### `GET /dashboard/status`
Returns real-time agent status and today's summary.

**Response:**
```json
{
  "agent_status": "online",
  "last_update": "2026-03-26T20:35:00Z",
  "today": {
    "revenue": 1243.50,
    "transactions": 47,
    "reviews_new": 2,
    "inventory_alerts": 1,
    "suggestions_pending": 3
  }
}
```

---

#### `GET /reports/daily?date=2026-03-26`
Retrieves daily report for specific date.

**Response:**
```json
{
  "date": "2026-03-26",
  "sales": {
    "total": 1243.50,
    "transactions": 47,
    "top_items": ["Chicken Shawarma (34)", "Hummus Plate (28)"],
    "peak_hours": ["12-1pm", "6-7pm"]
  },
  "reviews": {
    "new": 2,
    "sentiment": "positive",
    "pending_responses": 1
  },
  "inventory": {
    "status": "warning",
    "low_items": ["Hummus (15/100)"],
    "reorder_suggestions": ["Hummus", "Chicken"]
  },
  "labor": {
    "scheduled": 6,
    "suggested": 7,
    "reason": "Peak demand Friday 6-8 PM"
  },
  "costs": {
    "food_cost_pct": 28.5,
    "target": 30,
    "status": "good"
  }
}
```

---

#### `GET /logs?limit=50&offset=0`
Returns paginated agent activity logs.

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid-123",
      "timestamp": "2026-03-26T20:35:00Z",
      "action": "Review scan",
      "status": "success",
      "details": "Found 2 new reviews on Yelp"
    },
    {
      "id": "uuid-124",
      "timestamp": "2026-03-26T20:30:00Z",
      "action": "Inventory check",
      "status": "success",
      "details": "Hummus below par level (15/100)"
    }
  ],
  "total": 247,
  "limit": 50,
  "offset": 0
}
```

---

#### `GET /suggestions`
Returns pending suggestions awaiting approval.

**Response:**
```json
{
  "suggestions": [
    {
      "id": "uuid-001",
      "type": "staffing",
      "content": "Schedule 1 more staff Friday 6-8 PM",
      "confidence": 0.92,
      "created_at": "2026-03-26T19:00:00Z"
    },
    {
      "id": "uuid-002",
      "type": "pricing",
      "content": "Lamb has 45% margin - consider featuring on menu",
      "confidence": 0.78,
      "created_at": "2026-03-26T18:45:00Z"
    }
  ]
}
```

---

#### `POST /suggestions/{id}/approve`
Approves a suggestion.

**Body:**
```json
{
  "notes": "Approved - will schedule extra staff"
}
```

**Response:**
```json
{
  "id": "uuid-001",
  "status": "approved",
  "approved_at": "2026-03-26T20:40:00Z",
  "approved_by": "avi@pita22.com"
}
```

---

#### `POST /webhook/agent-update`
**THIS IS THE CRITICAL ENDPOINT FOR AGENT INTEGRATION**

The agent POSTs updates to this endpoint regularly (every 30 minutes and on-demand).

**Headers:**
```
Authorization: Bearer {WEBHOOK_SECRET}
Content-Type: application/json
```

**Body:**
```json
{
  "event_type": "daily_report", // or "log", "suggestion", "alert"
  "timestamp": "2026-03-26T23:45:00Z",
  "data": {
    "revenue": 1243.50,
    "transactions": 47,
    "top_items": ["Chicken Shawarma", "Hummus Plate"],
    "reviews_new": 2,
    "inventory": {
      "hummus": { "current": 15, "par": 100, "status": "low" }
    },
    "suggestions": [
      {
        "type": "staffing",
        "content": "Schedule 1 more staff Friday 6-8 PM",
        "confidence": 0.92
      }
    ]
  }
}
```

**Response:**
```json
{
  "status": "received",
  "id": "webhook-789",
  "processed_at": "2026-03-26T23:45:05Z"
}
```

---

#### `GET /settings`
Retrieves current user settings.

**Response:**
```json
{
  "daily_report_time": "23:45",
  "low_inventory_threshold": 20,
  "review_response_target": 2,
  "enabled_alerts": ["inventory", "reviews", "sales"]
}
```

---

#### `POST /settings`
Updates user settings.

**Body:**
```json
{
  "daily_report_time": "23:45",
  "low_inventory_threshold": 25,
  "review_response_target": 2,
  "enabled_alerts": ["inventory", "reviews", "sales", "labor"]
}
```

---

## 5. FRONTEND (React Components)

### 5.1 Architecture
```
pages/
  ├── dashboard.tsx (main page)
  ├── reports.tsx (daily reports history)
  ├── inventory.tsx (inventory management)
  ├── suggestions.tsx (pending recommendations)
  ├── logs.tsx (activity logs)
  └── settings.tsx (user preferences)

components/
  ├── StatusCards.tsx (sales, reviews, inventory summary)
  ├── DailyReport.tsx (detailed report view)
  ├── SuggestionCard.tsx (approval workflow)
  ├── InventoryAlert.tsx (low item warnings)
  ├── ActivityLog.tsx (agent actions timeline)
  └── ReviewResponse.tsx (approve review responses)

lib/
  ├── api.ts (API client functions)
  ├── auth.ts (Clerk integration)
  └── utils.ts (formatting, helpers)
```

### 5.2 Key Component: DailyReport.tsx

```typescript
// Displays today's report with key metrics
export default function DailyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport(new Date().toISOString().split('T')[0]);
  }, []);

  const fetchReport = async (date: string) => {
    const res = await fetch(`/api/reports/daily?date=${date}`);
    setReport(await res.json());
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <h3>Daily Revenue</h3>
        <p className="text-2xl font-bold">${report?.sales.total}</p>
        <p className="text-sm text-gray-500">{report?.sales.transactions} transactions</p>
      </Card>
      
      <Card>
        <h3>New Reviews</h3>
        <p className="text-2xl font-bold">{report?.reviews.new}</p>
        <p className={`text-sm ${report?.reviews.sentiment === 'positive' ? 'text-green-500' : 'text-yellow-500'}`}>
          {report?.reviews.sentiment}
        </p>
      </Card>

      <Card>
        <h3>Inventory Alerts</h3>
        <p className="text-2xl font-bold text-red-500">{report?.inventory.low_items.length}</p>
        <p className="text-sm">Items below par</p>
      </Card>
    </div>
  );
}
```

---

## 6. AGENT INTEGRATION

### 6.1 How the Agent Sends Data

The agent runs on AWS EC2 inside the NemoClaw sandbox. Every 30 minutes and on-demand, it:

1. Gathers data (sales, reviews, inventory)
2. Generates suggestions
3. Formats as JSON
4. POSTs to the webhook endpoint

### 6.2 Agent Authentication & Security Model

**CRITICAL: One-Way Communication Architecture**

The agent communicates with the dashboard using a **secure webhook pattern**:

```
┌─────────────────────────────────────────────────────────────┐
│                     AGENT (AWS EC2)                         │
│                                                             │
│  1. Gathers data (sales, reviews, inventory)               │
│  2. Generates suggestions                                   │
│  3. POSTs to: https://pita22-api.vercel.app/api/webhook    │
│     Headers: Authorization: Bearer {WEBHOOK_SECRET}        │
│  4. Polls /api/approvals every 5 minutes                   │
│  5. Executes approved actions locally                       │
└─────────────────────────────────────────────────────────────┘
           ↓ (HTTPS POST with Bearer token)
┌─────────────────────────────────────────────────────────────┐
│                  DASHBOARD (Vercel)                         │
│                                                             │
│  1. Receives webhook from agent                            │
│  2. Validates WEBHOOK_SECRET                               │
│  3. Stores data in Supabase                                │
│  4. Shows to Avi on dashboard                              │
│  5. Avi approves suggestions                               │
│  6. Dashboard stores approvals in DB                       │
└─────────────────────────────────────────────────────────────┘
           ↑ (Agent polls via Authorization header)
```

**Security Guarantees:**
- Agent identifies itself with `WEBHOOK_SECRET` bearer token
- Dashboard validates token on every webhook
- Dashboard stores in Supabase (not accessible by agent)
- Agent polls read-only `/api/approvals` endpoint
- All communication over HTTPS only
- Agent has NO access to dashboard database

---

### 6.3 Agent Webhook Code (Node.js)

```javascript
// File: agent-integration.js
// Deploy this inside the NemoClaw sandbox

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://pita22-api.vercel.app';

/**
 * Send update to dashboard
 * Runs every 30 minutes automatically
 */
async function sendDashboardUpdate() {
  try {
    const data = {
      event_type: 'daily_report',
      timestamp: new Date().toISOString(),
      data: {
        revenue: await getSalesTotal(),
        transactions: await getTransactionCount(),
        top_items: await getTopItems(),
        reviews_new: await getNewReviewCount(),
        inventory: await checkInventory(),
        suggestions: await generateSuggestions()
      }
    };

    const response = await fetch(
      `${DASHBOARD_URL}/api/webhook/agent-update`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WEBHOOK_SECRET}`,
          'Content-Type': 'application/json',
          'X-Agent-Signature': generateSignature(JSON.stringify(data))
        },
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      console.error(`[DASHBOARD] Webhook failed: ${response.status} ${response.statusText}`);
      return false;
    }

    const result = await response.json();
    console.log(`[DASHBOARD] Update received. ID: ${result.id}`);
    return true;
  } catch (error) {
    console.error('[DASHBOARD] Webhook error:', error.message);
    return false;
  }
}

/**
 * Poll dashboard for approved suggestions
 * Agent checks every 5 minutes for actions to execute
 */
async function checkForApprovals() {
  try {
    const response = await fetch(
      `${DASHBOARD_URL}/api/approvals/pending`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WEBHOOK_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`[DASHBOARD] Approval check failed: ${response.status}`);
      return [];
    }

    const approvals = await response.json();
    
    if (approvals.length > 0) {
      console.log(`[DASHBOARD] ${approvals.length} approved actions found`);
      
      // Execute each approved action
      for (const approval of approvals) {
        await executeApprovedAction(approval);
      }
    }

    return approvals;
  } catch (error) {
    console.error('[DASHBOARD] Approval check error:', error.message);
    return [];
  }
}

/**
 * Execute an approved action from dashboard
 */
async function executeApprovedAction(approval) {
  try {
    console.log(`[DASHBOARD] Executing: ${approval.type} - ${approval.action_id}`);

    switch (approval.type) {
      case 'reorder_inventory':
        await sendReorderEmail(approval.data.items);
        break;
      case 'staff_scheduling':
        await createSchedulingNote(approval.data.suggestion);
        break;
      case 'review_response':
        await submitReviewResponse(approval.data.review_id, approval.data.response);
        break;
      default:
        console.log(`[DASHBOARD] Unknown action type: ${approval.type}`);
    }

    // Mark as executed
    await markApprovalExecuted(approval.id);
  } catch (error) {
    console.error(`[DASHBOARD] Execution error: ${error.message}`);
  }
}

/**
 * Mark approval as executed
 */
async function markApprovalExecuted(approvalId) {
  try {
    await fetch(
      `${DASHBOARD_URL}/api/approvals/${approvalId}/executed`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WEBHOOK_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('[DASHBOARD] Failed to mark approval executed:', error.message);
  }
}

/**
 * Generate HMAC signature for extra security
 */
function generateSignature(payload) {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
}

// ============ SCHEDULING ============

// Send update every 30 minutes
setInterval(sendDashboardUpdate, 30 * 60 * 1000);

// Check for approvals every 5 minutes
setInterval(checkForApprovals, 5 * 60 * 1000);

// Send initial update on startup
sendDashboardUpdate();
checkForApprovals();

console.log('[DASHBOARD] Agent integration initialized');
console.log(`[DASHBOARD] Webhook URL: ${DASHBOARD_URL}`);
console.log('[DASHBOARD] Update frequency: every 30 minutes');
console.log('[DASHBOARD] Approval check frequency: every 5 minutes');
```

---

### 6.4 Backend API: Webhook Receiver & Approvals

**File: `src/api/webhook/agent-update.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Validate webhook secret
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse body
    const body = await req.json();

    // Validate signature
    const signature = req.headers.get('x-agent-signature');
    if (signature) {
      const hash = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET!)
        .update(JSON.stringify(body))
        .digest('hex');
      
      if (hash !== signature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Store webhook in database
    const { data, error } = await supabase
      .from('agent_logs')
      .insert({
        action_type: body.event_type,
        status: 'success',
        data: body.data,
        timestamp: body.timestamp
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to store' },
        { status: 500 }
      );
    }

    // If daily report, also create daily_reports entry
    if (body.event_type === 'daily_report') {
      await supabase
        .from('daily_reports')
        .insert({
          report_date: new Date().toISOString().split('T')[0],
          sales_total: body.data.revenue,
          num_transactions: body.data.transactions,
          top_items: body.data.top_items,
          reviews_new: body.data.reviews_new,
          inventory_status: body.data.inventory
        });
    }

    // If suggestions, store them
    if (body.data.suggestions && body.data.suggestions.length > 0) {
      for (const suggestion of body.data.suggestions) {
        await supabase
          .from('suggestions')
          .insert({
            suggestion_type: suggestion.type,
            content: suggestion.content,
            data: suggestion
          });
      }
    }

    return NextResponse.json({
      status: 'received',
      id: data?.[0]?.id || 'unknown',
      processed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**File: `src/api/approvals/pending.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  // Validate webhook secret (same as webhook receiver)
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  if (token !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // Get all approved but not yet executed suggestions
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('approved', true)
      .eq('executed', false)
      .order('approved_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Approvals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}
```

**File: `src/api/approvals/[id]/executed.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Validate webhook secret
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.substring(7);
  if (token !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('suggestions')
      .update({
        executed: true,
        executed_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select();

    if (error) throw error;

    return NextResponse.json({
      status: 'executed',
      suggestion_id: params.id
    });
  } catch (error) {
    console.error('Execution error:', error);
    return NextResponse.json(
      { error: 'Failed to mark executed' },
      { status: 500 }
    );
  }
}
```

---

### 6.5 Agent Environment Variables Setup

**On AWS EC2, run this ONE TIME:**

```bash
# SSH into EC2
ssh -i RestaurantNemoClaw.pem ubuntu@44.251.116.96

# Generate a secure webhook secret (use this value)
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Your WEBHOOK_SECRET: $WEBHOOK_SECRET"

# Store it in a safe place and copy the value

# Create environment file
mkdir -p ~/.nemoclaw/config
cat > ~/.nemoclaw/config/dashboard.env << EOF
# Dashboard Integration
WEBHOOK_SECRET="$WEBHOOK_SECRET"
DASHBOARD_URL="https://pita22-api.vercel.app"
AGENT_NAME="restaurantagent"
AGENT_ID="pita22-prod-001"
EOF

# Source it in bashrc
echo 'source ~/.nemoclaw/config/dashboard.env' >> ~/.bashrc
source ~/.bashrc

# Verify
echo $WEBHOOK_SECRET
echo $DASHBOARD_URL
```

---

### 6.6 Update Vercel Environment Variables

**Add to Vercel dashboard (Settings → Environment Variables):**

```
WEBHOOK_SECRET={THE_VALUE_FROM_ABOVE}
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

**Then redeploy:**
```bash
vercel deploy --prod
```

---

### 6.7 Deploy Agent Integration Code

**Inside EC2 NemoClaw sandbox, create the integration file:**

```bash
# SSH into sandbox
nemoclaw restaurantagent connect

# Create agent integration script
cat > ~/.openclaw/agent-dashboard.js << 'EOF'
[PASTE THE CONTENT FROM SECTION 6.3 ABOVE]
EOF

# Make it executable
chmod +x ~/.openclaw/agent-dashboard.js

# Start it
node ~/.openclaw/agent-dashboard.js
```

**Or add to systemd service for auto-start:**

```bash
sudo cat > /etc/systemd/system/pita22-dashboard-agent.service << EOF
[Unit]
Description=Pita 22 Agent Dashboard Integration
After=network.target nemoclaw.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/.openclaw
EnvironmentFile=/home/ubuntu/.nemoclaw/config/dashboard.env
ExecStart=/usr/bin/node /home/ubuntu/.openclaw/agent-dashboard.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable pita22-dashboard-agent
sudo systemctl start pita22-dashboard-agent
sudo systemctl status pita22-dashboard-agent
```

---

### 6.8 Database Schema Addition

Add this column to `suggestions` table:

```sql
ALTER TABLE suggestions ADD COLUMN executed BOOLEAN DEFAULT FALSE;
ALTER TABLE suggestions ADD COLUMN executed_at TIMESTAMP;

ALTER TABLE agent_logs ADD COLUMN webhook_id VARCHAR(100);
ALTER TABLE agent_logs ADD COLUMN webhook_acknowledged BOOLEAN DEFAULT FALSE;
```

---

### 6.9 Complete Deployment Checklist

**DEVELOPERS: Follow this exact order**

- [ ] Build frontend & backend code (all endpoints)
- [ ] Deploy to Vercel
- [ ] Create Supabase project & run migrations
- [ ] Add WEBHOOK_SECRET to Vercel env vars
- [ ] Redeploy Vercel
- [ ] Copy agent-dashboard.js code to EC2
- [ ] Generate WEBHOOK_SECRET on EC2 using `openssl rand -hex 32`
- [ ] Create dashboard.env file on EC2 with WEBHOOK_SECRET
- [ ] Start agent integration: `node ~/.openclaw/agent-dashboard.js`
- [ ] Verify webhook is sending: Check Vercel logs & Supabase
- [ ] Verify approvals polling: Check agent logs every 5 minutes
- [ ] Test approval workflow: Approve a suggestion in dashboard

**AVT (YOU): After deployment**

- [ ] SSH into EC2
- [ ] Verify agent integration running: `systemctl status pita22-dashboard-agent`
- [ ] Check logs: `journalctl -u pita22-dashboard-agent -f`
- [ ] Open dashboard: https://pita22-api.vercel.app
- [ ] Approve a test suggestion
- [ ] Check agent logs to confirm execution
- [ ] Set up cron jobs for scheduled tasks

---

### 6.10 Troubleshooting

**Agent not sending data?**
```bash
# Check if integration is running
ps aux | grep agent-dashboard

# Check logs
tail -f ~/.openclaw/agent-logs.txt

# Verify environment variables
echo $WEBHOOK_SECRET
echo $DASHBOARD_URL

# Test webhook manually
curl -X POST https://pita22-api.vercel.app/api/webhook/agent-update \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","data":{}}'
```

**Dashboard not receiving?**
```bash
# Check Vercel logs
vercel logs

# Check Supabase for entries
SELECT * FROM agent_logs ORDER BY created_at DESC LIMIT 10;

# Verify WEBHOOK_SECRET matches
echo $WEBHOOK_SECRET  # On EC2
# Compare to Vercel dashboard env var
```

**Approvals not being picked up?**
```bash
# Check if approvals exist in DB
SELECT * FROM suggestions WHERE approved = true AND executed = false;

# Check if agent is polling
grep "Approval check" ~/.openclaw/agent-logs.txt

# Verify polling interval (should be every 5 minutes)
```

---

## 7. DEPLOYMENT INSTRUCTIONS

### 7.1 Prerequisites

- GitHub account
- Vercel account (free)
- Supabase account (free)
- Clerk account (free)

### 7.2 Supabase Setup

1. Create project at supabase.com
2. Run SQL migrations from `database/migrations.sql`
3. Get credentials:
   - Supabase URL
   - Supabase Anon Key
   - Database password

### 7.3 Clerk Setup

1. Create app at clerk.com
2. Configure sign-up/sign-in
3. Get Clerk keys:
   - Publishable Key
   - Secret Key

### 7.4 GitHub & Vercel Deployment

1. Push code to GitHub:
```bash
git clone https://github.com/your-org/pita22-dashboard.git
cd pita22-dashboard
git add .
git commit -m "Initial commit"
git push origin main
```

2. Connect to Vercel:
```bash
npm install -g vercel
vercel login
vercel
```

3. Add environment variables in Vercel:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
CLERK_SECRET_KEY=sk_live_...
WEBHOOK_SECRET=pita22-webhook-secret-key
```

### 7.5 Backend Deployment

Backend should be deployed to same Vercel project or separate serverless function.

```bash
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_ANON_KEY": "@supabase_anon_key",
    "WEBHOOK_SECRET": "@webhook_secret"
  }
}
```

---

## 8. SECURITY CONSIDERATIONS

### 8.1 Authentication
- All endpoints require valid Clerk JWT token
- Webhook uses Bearer token authentication
- HTTPS only (enforced by Vercel)

### 8.2 Data Protection
- Sensitive data (API keys) stored in environment variables
- Database connection strings encrypted
- Webhook secret rotated monthly

### 8.3 Audit Logging
- All user actions logged to `audit_trail` table
- Agent updates traced to timestamp
- Approval workflows tracked with user ID

---

## 9. DEPLOYMENT CHECKLIST

- [ ] Supabase database created & migrations applied
- [ ] Clerk authentication configured
- [ ] GitHub repository created with all code
- [ ] Vercel project created & connected to GitHub
- [ ] Environment variables added to Vercel
- [ ] Database backups configured
- [ ] Agent webhook endpoint tested
- [ ] Frontend deployed and accessible
- [ ] Backend API deployed and responding
- [ ] SSL certificate auto-renewed (Vercel handles)
- [ ] Analytics/monitoring setup (Vercel built-in)

---

## 10. AGENT CONFIGURATION

### 10.1 On AWS EC2

Add to agent startup script:

```bash
#!/bin/bash
# Start NemoClaw agent with webhook integration

export WEBHOOK_SECRET="$(aws secretsmanager get-secret-value --secret-id pita22-webhook | jq -r .SecretString)"
export DASHBOARD_URL="https://pita22-api.vercel.app"

nemoclaw restaurantagent connect

# Inside sandbox:
openclaw agent --local \
  --webhook-url "https://pita22-api.vercel.app/api/webhook/agent-update" \
  --webhook-interval 1800 # 30 minutes
```

### 10.2 Cron Jobs for Regular Tasks

```bash
# Daily sales report at 11:45 PM
45 23 * * * /path/to/agent/send-daily-report.sh

# Hourly review check
0 * * * * /path/to/agent/check-reviews.sh

# Every 4 hours inventory scan
0 */4 * * * /path/to/agent/check-inventory.sh
```

---

## 11. MONITORING & MAINTENANCE

### 11.1 Uptime Monitoring
- Set up Vercel monitoring (built-in)
- Supabase health checks
- Agent heartbeat every 5 minutes

### 11.2 Regular Tasks
- **Daily:** Review dashboard logs
- **Weekly:** Check database storage usage
- **Monthly:** Rotate webhook secret, review audit trail
- **Quarterly:** Performance optimization

---

## 12. SUPPORT & DOCUMENTATION

### 12.1 For Developers
- GitHub Wiki: Setup & deployment guide
- API docs: Swagger at `/api/docs`
- Agent integration: See section 6

### 12.2 For Avi (Owner)
- Dashboard user guide (separate doc)
- Quick troubleshooting guide
- Support contact info

---

## APPENDIX: File Structure

```
pita22-dashboard/
├── README.md
├── package.json
├── vercel.json
├── tsconfig.json
│
├── public/
│   └── favicon.ico
│
├── src/
│   ├── pages/
│   │   ├── _app.tsx
│   │   ├── index.tsx (dashboard)
│   │   ├── reports.tsx
│   │   ├── inventory.tsx
│   │   ├── suggestions.tsx
│   │   ├── logs.tsx
│   │   └── settings.tsx
│   │
│   ├── api/
│   │   ├── dashboard/
│   │   │   └── status.ts
│   │   ├── reports/
│   │   │   └── daily.ts
│   │   ├── suggestions/
│   │   │   ├── [id]/
│   │   │   │   └── approve.ts
│   │   │   └── index.ts
│   │   ├── logs.ts
│   │   ├── settings.ts
│   │   └── webhook/
│   │       └── agent-update.ts
│   │
│   ├── components/
│   │   ├── StatusCards.tsx
│   │   ├── DailyReport.tsx
│   │   ├── SuggestionCard.tsx
│   │   ├── InventoryAlert.tsx
│   │   ├── ActivityLog.tsx
│   │   └── ReviewResponse.tsx
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   │
│   └── styles/
│       └── globals.css
│
├── database/
│   ├── migrations.sql
│   └── seed.sql
│
├── scripts/
│   ├── deploy.sh
│   └── backup.sh
│
└── docs/
    ├── USER_GUIDE.md
    └── TROUBLESHOOTING.md
```

---

**END OF SPECIFICATION**

This document provides everything developers need to build, deploy, and integrate the Pita 22 Dashboard with the NemoClaw agent on AWS.
