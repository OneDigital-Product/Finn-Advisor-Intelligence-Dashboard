# Wealth Advisory Dashboard — API Resource Summary
## For MuleSoft Experience/Process/System API Scoping

Base URL (Test): `https://testapi.orionadvisor.com/api/v1`
Base URL (Prod): `https://api.orionadvisor.com/api/v1`

---

## ORION API RESOURCES NEEDED (11 resource groups)

### 1. Authentication
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /v1/Security/Token | Get access token (OAuth) |

### 2. Households (Portfolio/Clients)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /v1/Portfolio/Clients | List all households |
| GET | /v1/Portfolio/Clients/Value | List households with AUM |
| GET | /v1/Portfolio/Clients/Verbose/{id} | Full household detail |
| GET | /v1/Portfolio/Clients/{id}/Value | Single household with AUM |
| GET | /v1/Portfolio/Clients/{id}/Accounts/Value | Accounts with balances |
| GET | /v1/Portfolio/Clients/{id}/Assets | All holdings in household |
| GET | /v1/Portfolio/Clients/{id}/Transactions | Transaction history |
| GET | /v1/Portfolio/Clients/{id}/Performance/Summary | Returns (MTD, QTD, YTD, 1Y, etc.) |
| GET | /v1/Portfolio/Clients/{id}/AumOverTime | AUM time series (sparklines) |
| GET | /v1/Portfolio/Clients/{id}/GoalTracking | Goal summary + performance |
| GET | /v1/Portfolio/Clients/{id}/BalanceSheet | Net worth / balance sheet |
| GET | /v1/Portfolio/Clients/{id}/RmdCalculations | RMD calculations |
| GET | /v1/Portfolio/Clients/{id}/Documents | Household documents |
| GET | /v1/Portfolio/Clients/{id}/PortfolioTree | Full hierarchy (HH → Reg → Acct) |
| GET | /v1/Portfolio/Clients/{id}/ModelTolerance | Drift from target model |

### 3. Accounts
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /v1/Portfolio/Accounts/{id}/Assets/Value | Holdings with market value |
| GET | /v1/Portfolio/Accounts/{id}/TaxLot | Tax lot detail (for TLH) |
| GET | /v1/Portfolio/Accounts/{id}/Performance/Summary | Account-level performance |
| GET | /v1/Portfolio/Accounts/{id}/RmdCalculation | Per-account RMD |
| GET | /v1/Portfolio/Accounts/AccountInformation/Rmd/{repId} | All RMDs for advisor |
| GET | /v1/Portfolio/Accounts/AccountInformation/Beneficiaries/{repId} | Beneficiary audit |

### 4. Representatives (Advisors)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /v1/Portfolio/Representatives/Value | Advisor-level AUM total |
| GET | /v1/Portfolio/Representatives/{id} | Advisor profile |

### 5. Reporting Scope (MASTER ENDPOINT)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /v1/Reporting/Scope | Performance + Allocation + Activity + Tax in ONE call |

**Reporting/Scope parameters:**
- `entity`: "Household" or "Representative"
- `entityIds`: [array of Orion Household IDs]
- `asOfDate`: "2026-03-16"
- `managed`: 1=Performance, 2=Activity, 4=Allocation, 8=Portfolio Detail, 16=Tax Detail

**This single endpoint replaces 5 separate API calls. Prioritize this.**

### 6. Reporting (Additional)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /v1/Reporting/Performance/Overview | Stored daily performance |
| GET | /v1/Reporting/Activity/CostBasis | Cost basis for tax reporting |
| POST | /v1/Reporting/Reports/{id}/Generate | Generate PDF report |

### 7. Billing
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /v1/Billing/BillGenerator/Action/Instance | Create bill to calculate fees |
| GET | /v1/Billing/Instances/{id} | Get calculated revenue/fees |
| GET | /v1/Billing/BillGenerator/Summary | Billing summary |

### 8. Compliance
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /v1/Compliance/RiskDashboard/RiskTiles | Risk/suitability tiles |
| GET | /v1/Compliance/RiskDashboard/AccountAlerts | Account-level alerts |
| GET | /v1/Compliance/RiskDashboard/OutOfTolerance/{days} | Drift alerts |

### 9. Risk (via HiddenLevers integration)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /v1/Integrations/HiddenLevers/StressTest/Client/{id} | Stress test scenarios |
| GET | /v1/Integrations/HiddenLevers/GetSurveyResults | Risk questionnaire results |

### 10. Net Worth (3 integration options)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /v1/Portfolio/Clients/{id}/BalanceSheet | Orion-native balance sheet |
| GET | /v1/Integrations/eMoney/Client/NetWorth | eMoney net worth |
| GET | /v1/Integrations/MoneyGuidePro/Networth/Client/{id} | MoneyGuidePro net worth |

### 11. User/Authorization
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /v1/Authorization/User | Logged-in user info |
| GET | /v1/Authorization/User/Verbose | Full user detail |

---

## SALESFORCE OBJECTS NEEDED (6 objects)

| Object | Filter | Purpose |
|--------|--------|---------|
| Account | RecordType.DeveloperName = 'IndustriesHousehold' | Household records |
| Account | RecordType.DeveloperName = 'PersonAccount' | Individual client records |
| Household Person Account Relation | — | Household membership |
| User | IsActive = true | Advisor profiles |
| Opportunity | IsClosed = false | Pipeline / follow-ups |
| Task / Event / Case | OwnerId = advisor | CRM activity + compliance |

**Salesforce FSC Custom Objects (if available):**
| Object | Purpose |
|--------|---------|
| FinServ__FinancialAccount__c | Financial accounts (investment, bank, insurance) |
| FinServ__FinancialHolding__c | Holdings within accounts |
| FinServ__FinancialGoal__c | Client financial goals |
| FinServ__Revenue__c | Revenue from accounts |
| FinServ__AssetsAndLiabilities__c | Non-account assets and debts |
| FinancialAccountParty | Roles on accounts (beneficiary, owner, trustee) |

---

## PRIORITY ORDER FOR MULESOFT BUILD

**Phase 1 (this week):**
1. POST /v1/Reporting/Scope — the master endpoint, covers 5 data types
2. GET /v1/Portfolio/Clients/Value — household list with AUM
3. GET /v1/Portfolio/Clients/{id}/Accounts/Value — accounts per household
4. GET /v1/Portfolio/Clients/{id}/Assets — holdings
5. Salesforce Account (Household + Person Account) queries

**Phase 2 (next week):**
6. GET /v1/Portfolio/Clients/{id}/Performance/Summary
7. GET /v1/Portfolio/Clients/{id}/Transactions
8. GET /v1/Billing/BillGenerator/Summary
9. GET /v1/Compliance/RiskDashboard/RiskTiles
10. Salesforce Task/Event/Case/Opportunity queries

**Phase 3 (week 3+):**
11. Remaining reporting endpoints
12. Risk/stress test integrations
13. Net worth integrations
14. Document management endpoints

---

**Total Orion endpoints: ~35**
**Total Salesforce objects: ~12**
**Estimated MuleSoft APIs to build: 8-12 experience layer endpoints**
(Many Orion calls are grouped behind single experience API resources)
