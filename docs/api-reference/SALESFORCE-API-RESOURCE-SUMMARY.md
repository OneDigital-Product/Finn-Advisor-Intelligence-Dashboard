# Salesforce API Resource Summary
## For MuleSoft Process/System API — Wealth Advisory Dashboard

All queries target Salesforce Financial Services Cloud (FSC) objects.
Authentication: Salesforce REST API via connected app (OAuth 2.0).
Base: `/services/data/vXX.0/query/?q=`

---

## SALESFORCE OBJECTS OVERVIEW

| Object | API Name | Purpose |
|--------|----------|---------|
| Household Account | Account (RecordType = IndustriesHousehold) | Household records with AUM, review dates, service model |
| Person Account | Account (RecordType = PersonAccount) | Individual client records with contact info, risk tolerance |
| Financial Account | FinServ__FinancialAccount__c | Investment accounts, bank accounts, insurance policies |
| Financial Holding | FinServ__FinancialHolding__c | Individual holdings (stocks, bonds, funds) within accounts |
| Financial Goal | FinServ__FinancialGoal__c | Client financial goals with target/actual values |
| Revenue | FinServ__Revenue__c | Revenue generated from financial accounts |
| Assets & Liabilities | FinServ__AssetsAndLiabilities__c | Non-account assets (real estate) and debts (mortgages) |
| Financial Account Party | FinancialAccountParty | Roles on accounts: beneficiary, owner, trustee |
| Task | Task | Advisor tasks, follow-ups, to-dos |
| Event | Event | Meetings, calendar events |
| Case | Case | Service cases, compliance reviews, document requests |
| Opportunity | Opportunity | Sales pipeline, cross-sell, referrals |
| Activity History | ActivityHistory | Historical calls, emails, meetings |
| Document | ContentDocumentLink + ContentVersion | Documents attached to households |
| User | User | Advisor profiles, team members |
| Household Relation | Account (ParentId relationship) | Household membership hierarchy |

---

## EXACT SOQL QUERIES BY USE CASE

### 1. Household Data (Dashboard, Client List, Client 360)

**Get all households for an advisor:**
```sql
SELECT Id, Name, OwnerId, FinServ__Status__c, FinServ__ReviewFrequency__c,
       FinServ__ServiceModel__c, FinServ__TotalAUMPrimary__c,
       FinServ__TotalNonFinancialAssets__c, FinServ__TotalFinancialAccounts__c,
       FinServ__LastReview__c, FinServ__NextReview__c,
       FinServ__InvestmentObjectives__c, CreatedDate
FROM Account
WHERE RecordType.DeveloperName = 'IndustriesHousehold'
  AND OwnerId = :currentUserId
```

**Get person accounts (individuals) in a household:**
```sql
SELECT Id, FirstName, LastName, PersonEmail, Phone,
       PersonMailingCity, PersonMailingState, PersonBirthdate,
       FinServ__RiskTolerance__c, FinServ__InvestmentExperience__c,
       FinServ__Occupation__c, FinServ__EmployerName__c,
       FinServ__LastInteraction__c
FROM Account
WHERE RecordType.DeveloperName = 'PersonAccount'
  AND ParentId = :householdId
```

### 2. Financial Accounts (Client 360, Portfolio, Dashboard)

**Get all financial accounts for a household:**
```sql
SELECT Id, Name, FinServ__FinancialAccountType__c, FinServ__Balance__c,
       FinServ__Status__c, FinServ__HeldAway__c, FinServ__OwnerType__c,
       FinServ__PrimaryOwner__c, FinServ__Custodian__c, FinServ__OpenDate__c
FROM FinServ__FinancialAccount__c
WHERE FinServ__PrimaryOwner__c = :householdId
ORDER BY FinServ__Balance__c DESC
```

### 3. Holdings (Portfolio, Investments Page)

**Get top holdings for a household:**
```sql
SELECT Id, Name, FinServ__Symbol__c, FinServ__MarketValue__c,
       FinServ__GainLoss__c, FinServ__Shares__c, FinServ__Price__c,
       FinServ__FinancialAccount__c, FinServ__FinancialAccount__r.Name
FROM FinServ__FinancialHolding__c
WHERE FinServ__FinancialAccount__r.FinServ__PrimaryOwner__c = :householdId
ORDER BY FinServ__MarketValue__c DESC
LIMIT 20
```

### 4. Revenue (Dashboard, Analytics)

**Get YTD revenue for a household:**
```sql
SELECT Id, FinServ__Amount__c, FinServ__RevenueDate__c
FROM FinServ__Revenue__c
WHERE FinServ__FinancialAccount__r.FinServ__PrimaryOwner__c = :householdId
  AND FinServ__RevenueDate__c = THIS_YEAR
```

### 5. Assets & Liabilities / Net Worth (Client 360, Estate)

**Get non-account assets and liabilities:**
```sql
SELECT Id, Name, FinServ__Amount__c, FinServ__AssetsAndLiabilitiesType__c
FROM FinServ__AssetsAndLiabilities__c
WHERE FinServ__PrimaryOwner__c = :householdId
```

### 6. Financial Goals (Dashboard, Client 360)

**Get all goals for a household:**
```sql
SELECT Id, Name, FinServ__Type__c, FinServ__TargetValue__c,
       FinServ__ActualValue__c, FinServ__TargetDate__c, FinServ__Status__c
FROM FinServ__FinancialGoal__c
WHERE FinServ__PrimaryOwner__c = :householdId
```

### 7. Beneficiary Designations (Compliance, Estate)

**Get beneficiary roles on financial accounts:**
```sql
SELECT FinancialAccountId, Role, RelatedAccount.Name
FROM FinancialAccountParty
WHERE FinancialAccountId IN :financialAccountIds
  AND Role IN ('Beneficiary', 'Contingent Beneficiary')
```

### 8. Tasks (Dashboard Action Queue, Engagement)

**Get all open tasks for an advisor:**
```sql
SELECT Id, Subject, Status, Priority, ActivityDate, Type,
       WhatId, What.Name, WhoId, Who.Name,
       Description, CreatedDate
FROM Task
WHERE OwnerId = :currentUserId
  AND Status != 'Completed'
  AND Status != 'Deferred'
ORDER BY ActivityDate ASC NULLS LAST
```

**Get compliance-related tasks for a household:**
```sql
SELECT Id, Subject, Status, ActivityDate, Priority
FROM Task
WHERE WhatId = :householdId
  AND (Subject LIKE '%review%'
    OR Subject LIKE '%compliance%'
    OR Subject LIKE '%beneficiary%'
    OR Subject LIKE '%IPS%'
    OR Subject LIKE '%suitability%'
    OR Subject LIKE '%insurance%'
    OR Subject LIKE '%estate%')
```

### 9. Events / Meetings (Calendar, Dashboard)

**Get upcoming events for an advisor (next 7 days):**
```sql
SELECT Id, Subject, StartDateTime, EndDateTime,
       WhatId, What.Name, Type, Location
FROM Event
WHERE OwnerId = :currentUserId
  AND StartDateTime >= TODAY
  AND StartDateTime <= NEXT_N_DAYS:7
ORDER BY StartDateTime ASC
```

**Get events for a household (last 180 days):**
```sql
SELECT Id, Subject, StartDateTime, EndDateTime, Type
FROM Event
WHERE WhatId = :householdId
  AND StartDateTime >= LAST_N_DAYS:180
ORDER BY StartDateTime DESC
```

### 10. Cases (Compliance, Dashboard)

**Get open cases for an advisor:**
```sql
SELECT Id, Subject, Status, Priority, Type,
       CreatedDate, AccountId, Account.Name
FROM Case
WHERE OwnerId = :currentUserId
  AND IsClosed = false
ORDER BY Priority DESC, CreatedDate ASC
```

**Get compliance cases for a household:**
```sql
SELECT Id, Subject, Status, Type, Priority, CreatedDate, ClosedDate
FROM Case
WHERE AccountId = :householdId
  AND (Type = 'Compliance Review'
    OR Type = 'Document Request'
    OR Type = 'Beneficiary Update')
```

### 11. Opportunities (Analytics, Dashboard)

**Get open opportunities (stale = no activity in 14+ days):**
```sql
SELECT Id, Name, StageName, Amount, CloseDate,
       AccountId, Account.Name, LastActivityDate
FROM Opportunity
WHERE OwnerId = :currentUserId
  AND IsClosed = false
  AND LastActivityDate < LAST_N_DAYS:14
ORDER BY Amount DESC
```

### 12. Activity History (Engagement Scoring)

**Get recent activity for a household:**
```sql
SELECT Id, Subject, ActivityDate, ActivityType, Status,
       CallType, CallDurationInSeconds
FROM ActivityHistory
WHERE AccountId = :householdId
ORDER BY ActivityDate DESC
LIMIT 50
```

### 13. Documents (Compliance, Client 360)

**Get documents attached to a household:**
```sql
SELECT ContentDocument.Id, ContentDocument.Title,
       ContentDocument.FileType, ContentDocument.CreatedDate
FROM ContentDocumentLink
WHERE LinkedEntityId = :householdId
```

### 14. User / Advisor Profile

**Get current advisor:**
```sql
SELECT Id, Name, Email
FROM User
WHERE Id = :currentUserId
```

---

## SALESFORCE WRITE-BACK ENDPOINTS

After AI analysis (meeting transcripts, engagement scoring), the API server
creates records back in Salesforce:

| HTTP | Endpoint | Object Created |
|------|----------|----------------|
| POST | /services/data/vXX.0/sobjects/Task | Action items, follow-ups |
| POST | /services/data/vXX.0/sobjects/Event | Scheduled meetings |
| POST | /services/data/vXX.0/sobjects/Case | Compliance reviews, document requests |
| POST | /services/data/vXX.0/sobjects/Opportunity | New business, cross-sell, referrals |
| POST | /services/data/vXX.0/sobjects/FinServ__InteractionSummary__c | Meeting notes |

---

## PRIORITY ORDER FOR SALESFORCE MULESOFT BUILD

**Phase 1 (this week):**
1. Account (Household) — list all households for advisor
2. Account (Person Account) — individuals in a household
3. FinServ__FinancialAccount__c — financial accounts per household
4. Task — open tasks for advisor

**Phase 2 (next week):**
5. FinServ__FinancialHolding__c — holdings
6. Event — meetings/calendar
7. Case — compliance cases
8. ContentDocumentLink — documents on file

**Phase 3 (week 3+):**
9. FinServ__Revenue__c — revenue tracking
10. FinServ__FinancialGoal__c — goals
11. FinServ__AssetsAndLiabilities__c — net worth
12. FinancialAccountParty — beneficiary audit
13. Opportunity — pipeline
14. Write-back endpoints (Task, Event, Case creation)

---

**Total Salesforce objects: 16**
**Total SOQL queries: ~20 unique queries**
**Estimated MuleSoft system APIs for Salesforce: 6-8**
