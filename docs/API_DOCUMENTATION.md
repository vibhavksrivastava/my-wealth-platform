# Wealth Platform REST API — External Integration & Reference Guide

This document serves as the official API reference manual for external applications (mobile apps, CRMs, accounting systems, third-party fintech portals, or BSE StAR MF bridges) connecting to the platform to query and ingest data.

---

## 1. Overview & Architecture

The platform is built as a multi-tenant B2B wealth management system.
- **Production Base URL**: `https://my-wealth-platform.vercel.app`
- **Development Base URL**: `http://localhost:3000`
- **Protocol**: Standard HTTPS RESTful API
- **Payload Format**: `application/json` (except file uploads which use `multipart/form-data`)
- **Authentication**: JWT Bearer Tokens passed via the `Authorization` header

---

## 2. Authentication & Authorization

All protected endpoints require an authorization token in the request headers:
```http
Authorization: Bearer <YOUR_JWT_ACCESS_TOKEN>
Content-Type: application/json
```

### Roles & Access Levels
| Role | Capabilities |
| :--- | :--- |
| **`SUPER_ADMIN`** | Unrestricted platform-wide access across all tenants, firms, and users. |
| **`TENANT_ADMIN`** | Full administrative control over the specific firm/tenant (clients, advisors, billing, white-label branding, feature flags). |
| **`ADVISOR`** | Full access to own client book, mutual fund portfolios, SIP mandates, tax plans, and fact-finds. |
| **`STAFF`** | Operational support (read clients, upload CAS, view portfolios). |
| **`CLIENT`** | Investor self-service: strictly scoped to own client ID and household data. |

---

### Authentication Endpoints

#### `POST /api/auth/login`
Authenticates a user and issues a signed JWT token containing `sub` (User ID), `tenantId`, and `role`.

##### Request Body:
```json
{
  "email": "advisor@unitedwealth.com",
  "password": "Password123!"
}
```

##### Response (`200 OK`):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a94ac908-5413-4855-bfc6-77a6bc468527",
    "email": "advisor@unitedwealth.com",
    "firstName": "Master",
    "lastName": "Advisor",
    "role": "ADVISOR",
    "tenantId": "00000000-0000-0000-0000-000000000000"
  }
}
```

#### `POST /api/auth/forgot-password`
Initiates a password reset workflow and dispatches a reset token link.

#### `POST /api/auth/reset-password`
Resets the account password using the verification token.

---

## 3. Mutual Funds & Portfolio APIs

### `GET /api/portfolio/mutual-funds`
Fetches mutual fund holdings, current market valuations, live AMFI NAVs, historical performance curves, and asset allocation.

##### Query Parameters:
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `clientId` | String (UUID) | No | Target investor client UUID. If omitted, returns the aggregated book for the advisor. |
| `scope` | String | No | `"INDIVIDUAL"` or `"HOUSEHOLD"` (default). Aggregates family portfolios. |
| `period` | String | No | History range: `"1M"`, `"6M"`, `"1Y"`, `"3Y"`, `"5Y"`, or `"ALL"`. |

##### Example Request:
```bash
curl -X GET "https://api.yourwealthapp.com/api/portfolio/mutual-funds?clientId=37c28d65-3541-406b-bee5-5851fd024d7f" \
  -H "Authorization: Bearer <TOKEN>"
```

##### Response (`200 OK`):
```json
{
  "clientMetrics": {
    "totalValue": 4843210.05,
    "purchaseCost": 4250000.00,
    "unrealizedGain": 593210.05,
    "absoluteReturn": 13.96,
    "xirr": 15.2,
    "totalSipBook": 75000,
    "holdingsCount": 26
  },
  "holdings": [
    {
      "id": "inv-01",
      "schemeName": "ICICI Prudential Aggressive Hybrid Active FOF - Growth",
      "folioNumber": "27171474/13",
      "units": 360.513,
      "currentNav": 218.39,
      "investedCost": 80000.00,
      "currentValue": 78733.00,
      "monthlySip": 10000,
      "holdingNature": "Either or Survivor",
      "xirr": 14.8
    }
  ],
  "assetAllocation": {
    "equity": 82.5,
    "debt": 15.0,
    "hybrid": 2.5
  }
}
```

---

### `POST /api/portfolio/mutual-funds/rebalance-ai`
Leverages Google Gemini AI to analyze portfolio asset allocation drift and generate rebalancing and tax-efficient SIP redirection recommendations.

##### Request Body:
```json
{
  "clientId": "37c28d65-3541-406b-bee5-5851fd024d7f",
  "advisorDirectives": "Reduce small-cap exposure by 10% and increase large-cap equity.",
  "scope": "HOUSEHOLD"
}
```

---

## 4. Systematic Investment Plans (SIPs) & Mandates

### `GET /api/portfolio/sips`
Retrieves multi-tenant recurring SIP records, auto-debit bank mandates, and summary stats.

##### Query Parameters:
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `clientId` | String | Target investor UUID. |
| `status` | String | Filter by status: `ACTIVE`, `PAUSED`, `CANCELLED`, `REGISTERED`, `ALL`. |
| `source` | String | Filter by source: `CAS_IMPORT`, `MANUAL`, `API_SYNC`, `ALL`. |

##### Example Response:
```json
{
  "success": true,
  "stats": {
    "totalSipBook": 75000,
    "totalCount": 12,
    "activeCount": 11,
    "pausedCount": 1,
    "sourceBreakdown": {
      "casImport": 10,
      "manual": 1,
      "apiSync": 1
    }
  },
  "sips": [
    {
      "id": "3b2e5926-f761-419b-a36c-9a4f4949514e",
      "clientId": "37c28d65-3541-406b-bee5-5851fd024d7f",
      "clientName": "Pallavi Srivastava",
      "ucc": "UWP-FAM-6966",
      "arnId": "ARN-175318",
      "sipRegistrationNo": "BSE-SIP-982341",
      "mandateId": "MANDATE-NACH-9823",
      "schemeName": "ICICI Prudential Aggressive Hybrid Active FOF - Growth",
      "installmentAmount": 10000,
      "frequency": "MONTHLY",
      "installmentDay": 10,
      "startDate": "2026-09-01",
      "status": "ACTIVE",
      "source": "API_SYNC",
      "installmentsPaid": 6
    }
  ]
}
```

---

### `POST /api/portfolio/sips`
Registers a new systematic investment plan manually.

##### Request Body:
```json
{
  "clientId": "37c28d65-3541-406b-bee5-5851fd024d7f",
  "schemeName": "Parag Parikh Flexi Cap Fund - Direct Plan Growth",
  "installmentAmount": 15000,
  "frequency": "MONTHLY",
  "installmentDay": 10,
  "mandateId": "HDFC-NACH-981024",
  "arnId": "ARN-111111",
  "ucc": "UWP-FAM-6966",
  "startDate": "2026-11-10",
  "status": "ACTIVE"
}
```

---

### `PUT /api/portfolio/sips/[id]`
Modifies or pauses/resumes an existing SIP mandate.

##### Request Body:
```json
{
  "status": "PAUSED",
  "installmentAmount": 12000,
  "installmentDay": 15
}
```

---

### `POST /api/portfolio/sips/sync-bse`
Exchange API bridge for ingesting live or batch mandate payloads from **BSE StAR MF**.

##### Request Body:
```json
{
  "sips": [
    {
      "SIP_REG_NO": "BSE-SIP-847291",
      "CLIENT_CODE": "UWP-FAM-6966",
      "MANDATE_ID": "BSE-MANDATE-5012",
      "SCHEME_CODE": "INF109K01852",
      "SCHEME_NAME": "ICICI Prudential Aggressive Hybrid Active FOF",
      "AMOUNT": 10000,
      "FREQUENCY": "MONTHLY",
      "SIP_DAY": 10,
      "START_DATE": "2026-10-10",
      "STATUS": "ACTIVE",
      "INSTALLMENTS_PAID": 8,
      "ARN": "ARN-175318"
    }
  ],
  "overwriteManual": false
}
```

---

## 5. Client 360, Assets & Net Worth APIs

### `GET /api/clients/[id]/360`
Consolidated 360-degree financial profile aggregating incomes, living expenses, physical/tangible assets, market investments, liabilities, and goal progress.

##### Key Response Fields:
- `client`: Master investor details.
- `householdMembers`: All linked family members.
- `consolidatedMetrics`: Household Net Worth, liquid assets, debt-to-asset ratio, monthly surplus.
- `individualMetrics`: Client-specific Net Worth.
- `incomes`, `expenses`, `assets`, `liabilities`, `goals`.

---

### `GET /api/clients/[id]/net-worth`
Retrieves the balance-sheet statement separating tangible assets from liquid investments:
- `summary.physicalAssetsTotal`: Tangible assets (Real Estate, Gold, Bank Savings).
- `summary.investmentsTotal`: Mutual funds and equities.
- `summary.netWorth`: Total Assets minus Total Debt Obligations.

---

### Entity Specific CRUD Routes:
- `GET /api/clients/[id]/assets` & `POST /api/clients/[id]/assets` (Manage tangible assets)
- `GET /api/clients/[id]/liabilities` & `POST /api/clients/[id]/liabilities` (Home loans, personal debt)
- `GET /api/clients/[id]/incomes` & `POST /api/clients/[id]/incomes` (Salary, business, rental)
- `GET /api/clients/[id]/expenses` & `POST /api/clients/[id]/expenses` (Living expenses, insurance)
- `GET /api/clients/[id]/goals` & `POST /api/clients/[id]/goals` (Retirement, education, home purchase)

---

## 6. CAS Statement Ingestion

### `POST /api/cas/parse-pdf`
Uploads an encrypted or unencrypted CAMS, KFintech, or CDSL CAS PDF statement and parses holdings, transactions, and folios.

##### Headers:
```http
Content-Type: multipart/form-data
Authorization: Bearer <TOKEN>
```
##### Form Fields:
- `file`: PDF file blob.
- `password`: (Optional) PDF decryption password (typically investor's PAN uppercase).

---

### `POST /api/clients/[id]/import-cas`
Loads the parsed CAS data into the client's live portfolio.
- **Holdings**: Refreshes current closing balance snapshot.
- **Transactions**: Appends new monthly transactions using smart deduplication signatures.
- **SIPs**: Ingests active recurring SIPs into `public.sips` with `source = 'CAS_IMPORT'`.

---

## 7. Tax Planning & Capital Gains Harvesting

### `GET /api/planning/tax`
Simulates tax liability under Old vs. New Tax Regimes and identifies real-time tax optimization opportunities:
- **₹1.25 Lakh LTCG Harvesting**: Recommends which equity funds to redeem tax-free before March 31.
- **STCG Tax-Loss Harvesting**: Identifies funds in loss to offset taxable short-term capital gains.

##### Query Parameters:
- `clientId`: Investor UUID.
- `salaryIncome`, `otherIncome`, `section80C`, `section80D` (Optional overrides).

---

## 8. Communications & Notifications

### `POST /api/communications/send`
Sends multi-channel notifications to clients (WhatsApp, SMS, or Email) via configured gateways (Twilio / SMTP).

##### Request Body:
```json
{
  "clientId": "37c28d65-3541-406b-bee5-5851fd024d7f",
  "channel": "WHATSAPP",
  "recipient": "+919876543210",
  "template": "PORTFOLIO_REVIEW_REMINDER",
  "variables": {
    "clientName": "Pallavi",
    "reviewDate": "15th Nov 2026"
  }
}
```

---

## 9. Code Examples for External Applications

### Python Example
```python
import requests

BASE_URL = "https://yourwealthplatform.com"

# 1. Login
auth_res = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "advisor@unitedwealth.com",
    "password": "Password123!"
})
token = auth_res.json()["token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Fetch Client Portfolio
client_id = "37c28d65-3541-406b-bee5-5851fd024d7f"
portfolio_res = requests.get(f"{BASE_URL}/api/portfolio/mutual-funds?clientId={client_id}", headers=headers)
print("Portfolio Valuation:", portfolio_res.json()["clientMetrics"]["totalValue"])

# 3. Fetch SIP Mandates
sips_res = requests.get(f"{BASE_URL}/api/portfolio/sips?clientId={client_id}", headers=headers)
print("Active SIPs:", sips_res.json()["stats"]["activeCount"])
```

### Node.js / TypeScript Example
```typescript
import axios from "axios";

const API = axios.create({ baseURL: "https://yourwealthplatform.com" });

async function getClientData(clientId: string) {
  // Login
  const { data: auth } = await API.post("/api/auth/login", {
    email: "advisor@unitedwealth.com",
    password: "Password123!",
  });

  const headers = { Authorization: `Bearer ${auth.token}` };

  // Parallel Fetch: 360 View + SIPs + Tax Optimization
  const [v360, sips, tax] = await Promise.all([
    API.get(`/api/clients/${clientId}/360`, { headers }),
    API.get(`/api/portfolio/sips?clientId=${clientId}`, { headers }),
    API.get(`/api/planning/tax?clientId=${clientId}`, { headers }),
  ]);

  return {
    netWorth: v360.data.individualMetrics.netWorth,
    totalMonthlySip: sips.data.stats.totalSipBook,
    taxSavingRecommendation: tax.data.harvestingRecommendation,
  };
}
```

---

## 10. HTTP Status & Error Codes

| Code | Status | Meaning |
| :--- | :--- | :--- |
| `200` | `OK` | Request succeeded. |
| `400` | `Bad Request` | Validation failure or malformed payload. |
| `401` | `Unauthorized` | Missing, expired, or invalid JWT Bearer token. |
| `403` | `Forbidden` | Access denied due to tenant isolation or insufficient role permissions. |
| `404` | `Not Found` | The requested client, portfolio, or SIP record does not exist. |
| `500` | `Internal Error`| Unhandled server exception. |

