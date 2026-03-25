# Orion API Instructions (Complete Swagger Inventory)

Source reviewed:
- https://stagingapi.orionadvisor.com/api/swagger/ui/index#/
- https://stagingapi.orionadvisor.com/api/swagger/docs/V1

Reviewed on: 2026-03-15

## API Identity
- API Name: Orion Connect API
- Swagger Version: V1
- Host: stagingapi.orionadvisor.com
- Base Path: /api
- Scheme: https
- Swagger: 2.0

Base URL for requests:
- https://stagingapi.orionadvisor.com/api

## Authentication
- Security definition: `Authorization`
- Most endpoints require an `Authorization` header.
- Typical usage in this project: `Authorization: Bearer {{authToken}}`

## Swagger Coverage Summary (full inventory)
- Total path templates: 4466
- Total operations: 5352
- Unique tags: 558

HTTP method counts:
- GET: 2960
- POST: 1307
- PUT: 831
- DELETE: 250
- PATCH: 3
- HEAD: 1

## Complete Top-Level API Families (operation count)
This section is complete by top-level route family from `/v1/<family>/...`:

- {uri}: 1
- Actions: 2
- Aggregator: 7
- Authorization: 27
- Billing: 407
- Blogging: 43
- Compliance: 269
- Configuration: 2
- Confirm: 381
- Dashboards: 4
- DataMaintenance: 21
- Email: 1
- FileImport: 12
- Fuse: 23
- Global: 104
- Homepage: 37
- Integration: 4
- Integrations: 1011
- MarketProperties: 2
- Mobile: 13
- Monitor: 1
- OrionStored: 4
- Performance: 66
- Portfolio: 1153
- PortfolioDataSync: 22
- Product: 1
- Public: 17
- QueryStudio: 35
- RepExpTrading: 70
- ReportAdministration: 2
- ReportBuilder: 32
- Reporting: 775
- Rollups: 14
- Scheduler: 8
- Security: 88
- Settings: 112
- Status: 2
- Theoretical: 5
- Trading: 386
- User: 4
- Utility: 177
- ValidateImport: 7

## Largest Tag Areas (top 20)
- Compliance/Inform: 162
- Portfolio/Accounts: 145
- Reporting/Envision: 123
- Reporting/Composite: 112
- Portfolio/Clients: 112
- Portfolio/SecurityClassification: 92
- Portfolio/ValidateImport: 80
- Portfolio/Registrations: 80
- RepExpTrading/{entityEnum}: 69
- Reporting/FundPerformance: 65
- Integrations/Eclipse: 61
- Confirm/Overview: 59
- Integrations/CustodialIntegrator: 59
- Reporting/Widgets: 58
- Portfolio/Products: 57
- Integrations/Salesforce: 53
- Reporting/Custom: 53
- Reporting/Deliver: 50
- Utility/Process: 45
- Confirm/DownloadFiles: 42

## API Endpoints Used in This Repository

Auth + health/basic
- POST /auth/login
- GET /users/me
- GET /health
- GET /portfolios?limit=10

Portfolio-focused (current working flow)
- GET /api/v1/Authorization/User
- GET /api/v1/portfolio/clients?limit=20&offset=0
- GET /api/v1/portfolio/clients?limit=50&offset=0
- GET /api/v1/portfolio/clients?limit=100&offset=0
- GET /api/v1/portfolio/clients/39798
- GET /api/v1/portfolio/clients/39798/accounts
- GET /api/v1/portfolio/clients/{{clientId}}
- GET /api/v1/portfolio/clients/{{clientId}}/accounts

## Staging Examples
- GET https://stagingapi.orionadvisor.com/api/v1/Authorization/User
- GET https://stagingapi.orionadvisor.com/api/v1/portfolio/clients/39798
- GET https://stagingapi.orionadvisor.com/api/v1/portfolio/clients/39798/accounts

## Notes
- This file now contains complete inventory metadata from Swagger (counts + full top-level family coverage).
- Full endpoint definitions (all 4466 paths / 5352 operations) are available directly in:
  - https://stagingapi.orionadvisor.com/api/swagger/docs/V1
- A generated full operation dump is available in this repo:
  - api-endpoints-full.md
- Keep Postman environment variables in sync:
  - `baseUrl`
  - `authToken`
  - `clientId`
- In this workspace, household/client `39798` currently returns account count = 9.
