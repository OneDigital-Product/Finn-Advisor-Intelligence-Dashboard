# Household V3 API Documentation

## Overview

Two Apex REST endpoints used for Household V3, proxied through MuleSoft:

- `HouseholdServiceV3.getHouseholdDataRest`
- `HouseholdMembersServiceV3.getHouseholdMembersRest`

Both are deployed in `ODUAT` as `global with sharing` Apex REST services.

## Endpoint Mapping

| API Name | MuleSoft Endpoint | Orion / SF Endpoint |
|---|---|---|
| OAuth Token | `/v1.0/oauth2/token` | `/api/v1/security/token` |
| Client Portfolio | `/api/v1/portfolio/clients/value` | `/api/v1/portfolio/clients/value` |
| Client Accounts Value | `/api/v1/portfolio/clients/{id}/accounts/value` | `/api/v1/portfolio/clients/value` |
| Client Assets | `/api/v1/portfolio/clients/{id}/assets` | `/api/v1/portfolio/clients/{id}/assets` |
| Household | `/api/v1/household?username=&searchName=` | `/services/apexrest/household/v3` |
| Household Members | `/api/v1/household/members?username=&householdId=&searchName=` | `/services/apexrest/household/v3/members` |

## 1. Household Summary API

### Endpoint

```
GET /api/v1/household
```

### Query Parameters

| Parameter | Required | Type | Description |
|---|---|---|---|
| `username` | Yes | String | Salesforce username to resolve the advisor context |
| `searchName` | No | String | Filters household accounts by `Account.Name` |
| `pageSize` | No | Integer | Number of household accounts to return per page. Default `50`, max `200` |
| `offset` | No | Integer | Zero-based offset for household account pagination. Default `0` |

### Notes

- `searchName` is normalized to lowercase internally.
- Filtering is applied before pagination.
- `totalSize` reflects the total number of filtered household accounts, not just the current page.
- Record visibility is enforced by `with sharing` and `UserRecordAccess`.
- Advisor email and username are masked in the response.

### Response Fields

| Field | Type | Description |
|---|---|---|
| `advisor` | Object | Advisor summary block |
| `advisor.id` | Id | Salesforce User Id |
| `advisor.name` | String | Advisor name |
| `advisor.email` | String | Masked advisor email |
| `advisor.username` | String | Masked advisor username |
| `advisor.division` | String | Advisor division |
| `householdAccounts` | List | Current page of household accounts |
| `householdDetails` | List | Household detail records |
| `openTasks` | List | Advisor-level open tasks |
| `upcomingEvents` | List | Advisor-level upcoming events |
| `openCases` | List | Advisor-level open cases |
| `staleOpportunities` | List | Advisor-level stale opportunities |
| `totalSize` | Integer | Total number of households after filtering |
| `pageSize` | Integer | Applied page size |
| `offset` | Integer | Applied offset |
| `hasMore` | Boolean | Whether more household records are available |
| `nextOffset` | Integer | Offset for next page, or `null` |
| `searchName` | String | Normalized search term used for filtering |

### Sample Response

```json
{
  "advisor": {
    "id": "005xxxxxxxxxxxx",
    "name": "Michael Gouldin",
    "email": "m**************@onedigital.com",
    "username": "m**************@onedigital.com.uat",
    "division": "Wealth"
  },
  "householdAccounts": [
    {
      "Id": "001xxxxxxxxxxxx",
      "Name": "Sharon Miller",
      "OwnerId": "005xxxxxxxxxxxx",
      "FinServ__Status__c": "Active"
    }
  ],
  "householdDetails": [],
  "openTasks": [],
  "upcomingEvents": [],
  "openCases": [],
  "staleOpportunities": [],
  "totalSize": 1,
  "pageSize": 25,
  "offset": 0,
  "hasMore": false,
  "nextOffset": null,
  "searchName": "sharon"
}
```

## 2. Household Members API

### Endpoint

```
GET /api/v1/household/members
```

### Query Parameters

| Parameter | Required | Type | Description |
|---|---|---|---|
| `username` | Yes | String | Salesforce username |
| `householdId` | Yes | Id | Household account id |
| `searchName` | No | String | Filters members by name |
| `pageSize` | No | Integer | Default `50`, max `200` |
| `offset` | No | Integer | Zero-based offset. Default `0` |

### Household Validation

Household must satisfy:
- Owned by the requested advisor
- `Division_N__c` matches the advisor division
- `Client_Status__c = 'Active'`
- Visible via `UserRecordAccess`

### Response Fields

| Field | Type | Description |
|---|---|---|
| `householdId` | Id | Household account id |
| `householdName` | String | Household name |
| `members` | List | Current page of household members |
| `totalSize` | Integer | Total number of matching members |
| `pageSize` | Integer | Applied page size |
| `offset` | Integer | Applied offset |
| `hasMore` | Boolean | Whether more member records are available |
| `nextOffset` | Integer | Offset for next page, or `null` |
| `searchName` | String | Normalized search term |

### Sample Response

```json
{
  "totalSize": 1,
  "searchName": "sharon",
  "pageSize": 25,
  "offset": 0,
  "nextOffset": null,
  "members": [
    {
      "Id": "0017y00000tG5s9AAC",
      "FirstName": "Sharon",
      "LastName": "Miller",
      "PersonEmail": "f**********@verizon.net",
      "Phone": "***-***-5510",
      "PersonMailingCity": "M*******d",
      "PersonMailingState": "****",
      "PersonBirthdate": "1954-01-01"
    }
  ],
  "householdName": "Sharon Miller",
  "householdId": "0017y00001UPCh1AAH",
  "hasMore": false
}
```

## Error Handling

### Household Summary API

| Scenario | HTTP Status | Behavior |
|---|---|---|
| Missing `username` | `400` | Returns empty response |
| Unknown username | `200` | Returns empty response |

### Household Members API

| Scenario | HTTP Status | Behavior |
|---|---|---|
| Missing `username` or `householdId` | `400` | Returns empty response |
| Invalid `householdId` format | `400` | Returns empty response |
| Household not found / not accessible / not active | `404` | Returns empty response |

## Security and Masking

Both APIs enforce `with sharing` and `UserRecordAccess` filtering.

Masked fields: advisor email, advisor username, person account email, phone, city, state, birthdate, selected FSC profile fields, document titles.

## Recommended Consumer Flow

1. Call `GET /api/v1/household?username=<advisor username>`
2. Read household accounts from `householdAccounts`
3. For a selected household, call:
   `GET /api/v1/household/members?username=<advisor username>&householdId=<household id>`
