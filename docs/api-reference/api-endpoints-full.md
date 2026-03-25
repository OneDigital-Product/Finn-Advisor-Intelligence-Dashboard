# Orion Connect API - Full Endpoint List

Source: https://stagingapi.orionadvisor.com/api/swagger/docs/V1
Generated: 2026-03-16 05:54:08

- Title: Orion Connect API
- Version: V1
- Host: stagingapi.orionadvisor.com
- Base Path: /api
- Total Paths: 4466
- Total Operations: 5352

| Method | Path | Primary Tag | Summary |
|---|---|---|---|
| POST | /Actions/Remove | Remove | Removes the Schwab integration for the current user. |
| POST | /Actions/Setup | Setup |  |
| GET | /v1/{uri} | {uri} |  |
| GET | /v1/Aggregator | Aggregator | Gets a list of all aggregators |
| GET | /v1/Aggregator/AccessToken | Aggregator/AccessToken | Gets a new access token from an id token request |
| GET | /v1/Aggregator/Accounts | Aggregator/Accounts | Gets All Akoya Accounts with balances |
| GET | /v1/Aggregator/Holdings | Aggregator/Holdings | Get All Holdings |
| GET | /v1/Aggregator/Token | Aggregator/Token | Gets All Idtokens for a single credentialId (aka: applinkdtlId) |
| PUT | /v1/Aggregator/Token | Aggregator/Token | Update refresh token of an akoya user |
| GET | /v1/Aggregator/Transactions | Aggregator/Transactions | Get All Transactions |
| GET | /v1/Authorization/Databases | Authorization/Databases | Gets a list of databases the logged in user has access to. The list includes a mark for which one the user is currently logged into. |
| GET | /v1/Authorization/Profiles | Authorization/Profiles | Gets a list of profiles for the currently logged in user. |
| GET | /v1/Authorization/User | Authorization/User | Gets commonly used information about the logged in user. |
| POST | /v1/Authorization/User | Authorization/User | Create a new Client level user.  Special permissions are required to allow client users to be created through this method.  The selected user name must be unique, or an error will be returned. |
| GET | /v1/Authorization/User/AvailableToConnect/{searchText} | Authorization/User | Gets a list of users that the current user is allowed to connect with. |
| GET | /v1/Authorization/User/Databases | Authorization/User | Gets a list of databases the logged in user has access to. |
| GET | /v1/Authorization/User/Databases/{key} | Authorization/User | Gets the database that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Authorization/User/Databases/{key} | Authorization/User |  |
| PUT | /v1/Authorization/User/Databases/Action/LockDown | Authorization/User |  |
| GET | /v1/Authorization/User/Databases/LockDown | Authorization/User |  |
| GET | /v1/Authorization/User/Gravatar | Authorization/User | Gets commonly used information about the logged in user. |
| DELETE | /v1/Authorization/User/Integrations/{app} | Authorization/User | Deletes the integration information for the specified integration application, and for the current logged in user. |
| GET | /v1/Authorization/User/Integrations/{app} | Authorization/User | Retreives the Intgration information for the specified integration partner application for the user that is currently logged in, or the impersonated user. |
| PUT | /v1/Authorization/User/Integrations/{app} | Authorization/User | Updates the current users integration information for the Currently logged in, or the impersonated user. |
| POST | /v1/Authorization/User/Integrations/SaleForce | Authorization/User |  |
| GET | /v1/Authorization/User/Logo | Authorization/User | Gets the user's logo |
| GET | /v1/Authorization/User/Privileges | Authorization/User |  |
| GET | /v1/Authorization/User/Privileges/{code} | Authorization/User | Gets the right that the logged in user has that matches the security code provided. |
| POST | /v1/Authorization/User/Privileges/Codes | Authorization/User | Gets the rights that the logged in user has that matches the security codes provided. |
| PUT | /v1/Authorization/User/Reset | Authorization/User | Marks the currently logged in user as reset, requiring a password change on next login. |
| GET | /v1/Authorization/User/Rights | Authorization/User | Gets a list of rights that the logged in user has. |
| GET | /v1/Authorization/User/Rights/{securitycode} | Authorization/User | Gets the right that the logged in user has that matches the security code provided. |
| GET | /v1/Authorization/User/Rights/Groups | Authorization/User | Gets the groups that the logged in user has access to. |
| GET | /v1/Authorization/User/Rights/ObjectTypeCode/{code} | Authorization/User | Gets the rights that the logged in user has that fall within the object type code provided. |
| GET | /v1/Authorization/User/ServiceTeam | Authorization/User |  |
| GET | /v1/Authorization/User/Verbose | Authorization/User |  |
| PUT | /v1/Authorization/User/Verbose | Authorization/User |  |
| GET | /v1/Billing/Accounts | Billing/Accounts |  |
| GET | /v1/Billing/Accounts/{key} | Billing/Accounts | Gets the bill account that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Billing/Accounts/{key}/CreditCardNumber | Billing/Accounts | Return Credit Card Number |
| GET | /v1/Billing/Accounts/{key}/DefaultPercentsForGeneralAccount | Billing/Accounts | Gets Percent for Account |
| GET | /v1/Billing/Accounts/{key}/RecurringAdjustments | Billing/Accounts | Returns accounts with recurring adjustments |
| GET | /v1/Billing/Accounts/{key}/Tickers/Simple | Billing/Accounts | Generate Tickers associated with account |
| GET | /v1/Billing/Accounts/AccountSearch | Billing/Accounts | Search Billing Accounts |
| GET | /v1/Billing/Accounts/AccountSearch/{search} | Billing/Accounts | Search Billing Accounts |
| POST | /v1/Billing/Accounts/CheckPayforAccounts | Billing/Accounts | check bill account paymethid indirect can't add payfor accounts |
| GET | /v1/Billing/Accounts/GetAllPaidbyBillAccounts | Billing/Accounts | Return all acount ids paying for someone |
| GET | /v1/Billing/Accounts/GetCounts | Billing/Accounts |  |
| GET | /v1/Billing/Accounts/Grid | Billing/Accounts |  |
| GET | /v1/Billing/Accounts/Grid/New | Billing/Accounts |  |
| GET | /v1/Billing/Accounts/HouseholdRecurringAdjustments | Billing/Accounts | Returns recurring adjustments for household |
| POST | /v1/Billing/Accounts/ImportFileFilter | Billing/Accounts | Takes an xlsx or csv file as multipart content. The file needs either an "Account ID" or "Account Number" or "Household ID" or "Representative Name" or "Representative Number" column The file will be processed and returned billing accounts data filtered by column. |
| POST | /v1/Billing/Accounts/List | Billing/Accounts | Gets a list of bill accounts that match one of the keys in the provided list. |
| POST | /v1/Billing/Accounts/List/AccountIds | Billing/Accounts | Gets a list of Bill Account Grid objects by AccountIds |
| POST | /v1/Billing/Accounts/List/Id | Billing/Accounts | Gets a list of bill accounts that match one of the keys in the provided list. |
| GET | /v1/Billing/Accounts/RecurringAdjustments | Billing/Accounts | Returns recurring adjustments |
| GET | /v1/Billing/Accounts/SimpleBillAccounts | Billing/Accounts | Get a list of simple bill accounts that the logged in user has access to see. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Accounts/Summary | Billing/Accounts | Gets the bill account summaries. |
| GET | /v1/Billing/accountsPaidByFor/{key} | Billing/accountsPaidByFor |  |
| GET | /v1/Billing/AccountStatusTypes | Billing/AccountStatusTypes | Get list of Bill Account Status Types. |
| GET | /v1/Billing/AdjustmentTypes | Billing/AdjustmentTypes |  |
| POST | /v1/Billing/AdjustmentTypes | Billing/AdjustmentTypes |  |
| DELETE | /v1/Billing/AdjustmentTypes/{key} | Billing/AdjustmentTypes |  |
| GET | /v1/Billing/AdjustmentTypes/{key} | Billing/AdjustmentTypes |  |
| PUT | /v1/Billing/AdjustmentTypes/{key} | Billing/AdjustmentTypes |  |
| POST | /v1/Billing/AdjustmentTypes/DeleteMany | Billing/AdjustmentTypes |  |
| GET | /v1/Billing/AdjustmentTypes/History/{key} | Billing/AdjustmentTypes |  |
| GET | /v1/Billing/Assets | Billing/Assets | Get a list of bill assets that the logged in user has access to see. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Assets/{key} | Billing/Assets | Gets the bill asset that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Billing/Assets/ExcludeandPartially | Billing/Assets | Get a list of excluded &amp; partially excluded bill assets that the logged in user has access to see. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Assets/HouseholdExclusions | Billing/Assets | Get all assets that have been excluded at the household level The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Assets/HouseholdExclusionsAll | Billing/Assets | Get all assets that have been excluded enable and disabled at the household level The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Billing/Assets/List | Billing/Assets | Gets a list of bill assets that match one of the keys in the provided list. |
| POST | /v1/Billing/Assets/List/Id | Billing/Assets | Gets a list of bill assets that match one of the keys in the provided list. |
| DELETE | /v1/Billing/Audit/{key}/File | Billing/Audit |  |
| GET | /v1/Billing/Audit/{key}/File | Billing/Audit |  |
| GET | /v1/Billing/Audit/AuditFiles | Billing/Audit |  |
| GET | /v1/Billing/Audit/Consolidation/AuditFiles | Billing/Audit |  |
| POST | /v1/Billing/Audit/PayablesByRep | Billing/Audit |  |
| GET | /v1/Billing/Audit/PayablesByRep/{key} | Billing/Audit |  |
| DELETE | /v1/Billing/Audit/PayablesByRep/Action/Delete/{key} | Billing/Audit |  |
| POST | /v1/Billing/Audit/PayablesByRep/Action/Download | Billing/Audit |  |
| GET | /v1/Billing/Audit/PayablesByRep/Action/Download/{sessionId} | Billing/Audit |  |
| POST | /v1/Billing/Audit/PayablesByRep/Action/SendFile | Billing/Audit | Send files to users associated with Reps |
| GET | /v1/Billing/BillAssetItem/{key} | Billing/BillAssetItem |  |
| GET | /v1/Billing/BillAssetItem/{key}/export | Billing/BillAssetItem |  |
| GET | /v1/Billing/BillCompareDashboard/BillTypes | Billing/BillCompareDashboard | Get Bill Compare Instances for comparision |
| POST | /v1/Billing/BillCompareDashboard/Note | Billing/BillCompareDashboard | Create new bill compare note. |
| DELETE | /v1/Billing/BillCompareDashboard/Note/{key} | Billing/BillCompareDashboard | Deletes note record provided the key. |
| GET | /v1/Billing/BillCompareDashboard/Note/{key} | Billing/BillCompareDashboard | Gets the note that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Billing/BillCompareDashboard/Note/{key} | Billing/BillCompareDashboard | Update the note that has the provided key. |
| GET | /v1/Billing/BillCompareDashboard/Note/New | Billing/BillCompareDashboard | Gets the notes that match with provided filters. |
| GET | /v1/Billing/BillCompareDashboard/Notes | Billing/BillCompareDashboard | Gets the notes that match with provided filters. |
| GET | /v1/Billing/BillCompareDashboard/Results | Billing/BillCompareDashboard | Get Bill Compare results |
| GET | /v1/Billing/BillCompareDashboard/SummaryCount | Billing/BillCompareDashboard | Get summary for Bill Compare Dashboard |
| GET | /v1/Billing/BillDataExport | Billing/BillDataExport | Get list of unpaid bills. |
| POST | /v1/Billing/BillGenerator/Action/Instance | Billing/BillGenerator | Create bill instance and client instances |
| POST | /v1/Billing/BillGenerator/Action/Recalc | Billing/BillGenerator | Create bill instance and client instances |
| POST | /v1/Billing/BillGenerator/Action/RecalcPayables | Billing/BillGenerator |  |
| POST | /v1/Billing/BillGenerator/Action/RecalcPayees | Billing/BillGenerator |  |
| POST | /v1/Billing/BillGenerator/Action/RecalcRepSplit | Billing/BillGenerator | recalculate payables by spliting rep bill by percentage setup thru history |
| PUT | /v1/Billing/BillGenerator/BillAccountItem | Billing/BillGenerator |  |
| GET | /v1/Billing/BillGenerator/BillAccountItems | Billing/BillGenerator |  |
| GET | /v1/Billing/BillGenerator/BillAccountItems/BillAccountAdj/{key} | Billing/BillGenerator | Retrieves bill account item adjustments by BillAccountItem key |
| PUT | /v1/Billing/BillGenerator/BillAccountItems/BillAccountAdj/edit/{billAccountItemId} | Billing/BillGenerator | This operation will add/update/delete Bill Account Adjustments. It takes three parameters billAccountItemId (required), adjustments(required), cancellationToken(required) &amp; optional createPayableAdj |
| GET | /v1/Billing/BillGenerator/BillAccountItems/PayableItems/{key} | Billing/BillGenerator | Retrieves PayableItems by BillAccountItem key |
| GET | /v1/Billing/BillGenerator/BillAccountItems/PayableItems/PayableItemAdjustment/{key} | Billing/BillGenerator | Retrieves Payable Item adjustments by Payable Item key |
| PUT | /v1/Billing/BillGenerator/BillAccountItems/PayableItems/PayableItemAdjustment/edit/{payableId} | Billing/BillGenerator | This operation will add/update/delete payable adjustments. It takes three parameters payableId (required), payableAdjs(required) and cancellationToken(required) |
| GET | /v1/Billing/BillGenerator/BillItems | Billing/BillGenerator |  |
| GET | /v1/Billing/BillGenerator/BillItemsOptimize | Billing/BillGenerator | Call the v1/Billing/BillGenerator/BillItems endpoint instead. |
| GET | /v1/Billing/BillGenerator/BillPeriodDetail | Billing/BillGenerator | Get bill period detail. |
| GET | /v1/Billing/BillGenerator/BillTimeFrames | Billing/BillGenerator | Bill generator billing timeframes |
| POST | /v1/Billing/BillGenerator/getCashflows | Billing/BillGenerator | Get cash-flow detail |
| GET | /v1/Billing/BillGenerator/Instance/{key}/ClientList | Billing/BillGenerator | Return list of client instances |
| GET | /v1/Billing/BillGenerator/Instance/{key}/ClientList/Grid | Billing/BillGenerator | Get Bill Instance Clients |
| POST | /v1/Billing/BillGenerator/Instance/{key}/ClientList/Grid | Billing/BillGenerator | Get Bill Instance Clients by client Ids |
| GET | /v1/Billing/BillGenerator/Overview | Billing/BillGenerator | Bill generator overview |
| POST | /v1/Billing/BillGenerator/Simple/Bill/Ids | Billing/BillGenerator |  |
| GET | /v1/Billing/BillGenerator/Summary | Billing/BillGenerator | Get summary for bill generator |
| GET | /v1/Billing/BillingCompare | Billing/BillingCompare | Get list of Billing Compares in DB |
| GET | /v1/Billing/BillingCompare/HouseholdBills/{clientId} | Billing/BillingCompare | Get Household Bills |
| GET | /v1/Billing/BillingCompare/instance | Billing/BillingCompare | This operation will compare account items between two bill instances |
| GET | /v1/Billing/BillingCompare/instance/new | Billing/BillingCompare | Enhanced billing compare that returns both Receivables and Payables data with warnings and filtering |
| GET | /v1/Billing/BillingEntities | Billing/BillingEntities |  |
| GET | /v1/Billing/BillingSummary | Billing/BillingSummary | Get a billing summary list. |
| GET | /v1/Billing/BillPayMethods | Billing/BillPayMethods | Get list of pay methods in database |
| GET | /v1/Billing/BillPayMethods/{key} | Billing/BillPayMethods | Get a bill pay method by Id |
| PUT | /v1/Billing/BillPayMethods/Update | Billing/BillPayMethods | Update bill pay method |
| GET | /v1/Billing/BillProductGroup | Billing/BillProductGroup | Returns a list of Bill Product Groups |
| POST | /v1/Billing/BillProductGroup | Billing/BillProductGroup | Create a new Bill Product Group |
| DELETE | /v1/Billing/BillProductGroup/{key} | Billing/BillProductGroup | Delete a Bill Product Group by key |
| GET | /v1/Billing/BillProductGroup/{key} | Billing/BillProductGroup | Fetch a Bill Product Group by key |
| PUT | /v1/Billing/BillProductGroup/{key} | Billing/BillProductGroup | Updates a new Bill Product Group |
| GET | /v1/Billing/BillProductGroup/{key}/Grid | Billing/BillProductGroup | Returns Bill Product Groups Details by Bill Product Group ID for a grid |
| GET | /v1/Billing/BillProductGroup/Grid | Billing/BillProductGroup | Returns a list of Bill Product Groups Details for a grid |
| GET | /v1/Billing/Bills | Billing/Bills | Get a list of bills that the logged in user has access to see. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Bills/{key} | Billing/Bills | Gets the bills that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| DELETE | /v1/Billing/Bills/{key}/Action/DeleteClientRelatedBills | Billing/Bills |  |
| PUT | /v1/Billing/Bills/{key}/Action/Hold | Billing/Bills |  |
| GET | /v1/Billing/Bills/{key}/Log | Billing/Bills | Get bill log that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Billing/Bills/{key}/Simple | Billing/Bills | Gets the simple bill that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Billing/Bills/Action/Delete | Billing/Bills | Delete bill records provided in the list of ids. |
| POST | /v1/Billing/Bills/List | Billing/Bills | Gets a list of bill assets that match one of the keys in the provided list. |
| POST | /v1/Billing/Bills/List/Id | Billing/Bills | Gets a list of bill assets that match one of the keys in the provided list. |
| GET | /v1/Billing/Bills/Simple | Billing/Bills | Gets a simple list of bills that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Billing/Bills/Simple/List | Billing/Bills | Gets a simple list of bill that match one of the keys in the provided list. |
| POST | /v1/Billing/Bills/Simple/List/Id | Billing/Bills | Gets a simple list of bill that match one of the keys in the provided list. |
| POST | /v1/Billing/Bills/ValidateAccPayments | Billing/Bills | Returns a list of BillIds for instances where a Household account was making payments to other Household accounts. |
| GET | /v1/Billing/BillScheduleElementRestrictions | Billing/BillScheduleElementRestrictions | Returns a list of broker dealer fees. |
| POST | /v1/Billing/BillScheduleElementRestrictions | Billing/BillScheduleElementRestrictions | Accepts a Broker Dealers Fee Restriction and writes it into the table. |
| PUT | /v1/Billing/BillScheduleElementRestrictions/Action/Delete | Billing/BillScheduleElementRestrictions | Deletes a list of Broker Dealers Fee Restrictions . |
| PUT | /v1/Billing/BillScheduleElementRestrictions/list | Billing/BillScheduleElementRestrictions | Accepts a list of Broker Dealers Fee Restrictions and writes them into the table. |
| GET | /v1/Billing/BillTransmitMethods | Billing/BillTransmitMethods | Get a list of BillTransmitMethods that the logged in user has access to see. |
| GET | /v1/Billing/BillTransmitMethods/{key} | Billing/BillTransmitMethods | Gets the BillTransmitMethod that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Billing/BillTransmitMethods/Simple | Billing/BillTransmitMethods | Get a simple list of BillTransmitMethods that the logged in user has access to see. |
| GET | /v1/Billing/CancellationFeeAdjDefault | Billing/CancellationFeeAdjDefault |  |
| POST | /v1/Billing/CancellationFeeAdjDefault | Billing/CancellationFeeAdjDefault |  |
| DELETE | /v1/Billing/CancellationFeeAdjDefault/{key} | Billing/CancellationFeeAdjDefault |  |
| GET | /v1/Billing/CancellationFeeAdjDefault/{key} | Billing/CancellationFeeAdjDefault |  |
| PUT | /v1/Billing/CancellationFeeAdjDefault/{key} | Billing/CancellationFeeAdjDefault |  |
| PUT | /v1/Billing/CancellationFeeAdjDefault/DeleteMany | Billing/CancellationFeeAdjDefault |  |
| GET | /v1/Billing/CancellationFeeAdjDefault/History/{key} | Billing/CancellationFeeAdjDefault |  |
| GET | /v1/Billing/CashFunding | Billing/CashFunding | Returns a list of Cash Funding Accounts with Balance Due |
| GET | /v1/Billing/Clients | Billing/Clients | Get a list of billing clients that the logged in user has access to see. The return is limited to pages of 60000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Clients/{key} | Billing/Clients | Gets the client that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Billing/Clients/{key}/RelatedAccounts | Billing/Clients | Gets a list of related accounts. Related accounts are accounts that fall below the client with the specified key or fall below another client which is related to the client with the specified key. The list does not include additional accounts. |
| GET | /v1/Billing/Clients/All | Billing/Clients | Get a list of all clients that the logged in user has access to see. |
| GET | /v1/Billing/Clients/Grid | Billing/Clients | Get a list of all clients that the logged in user has access to see. |
| POST | /v1/Billing/Clients/List | Billing/Clients | Gets a list of bill clients that match one of the keys in the provided list. |
| POST | /v1/Billing/Clients/List/Id | Billing/Clients | Gets a list of bill clients that match one of the keys in the provided list. |
| GET | /v1/Billing/ClientStatuses/Simple | Billing/ClientStatuses | Get all billing client statuses |
| POST | /v1/Billing/Consolidation/PostAuditFiles | Billing/Consolidation | Generate Audit files |
| GET | /v1/Billing/Consolidation/ReceiveableSummary | Billing/Consolidation | Obsolete. This endpoint is no longer valid and will be removed 7/11/2024. New endpont is /Billing/CashFunding. |
| GET | /v1/Billing/Counts | Billing/Counts |  |
| PUT | /v1/Billing/CreateNewBillAccountItemAdj | Billing/CreateNewBillAccountItemAdj |  |
| PUT | /v1/Billing/CreateNewPayableItemAdj | Billing/CreateNewPayableItemAdj |  |
| POST | /v1/Billing/DeleteNotes | Billing/DeleteNotes | Create new confirm overview notes |
| GET | /v1/Billing/Entities/{key} | Billing/Entities | Get a bill entity by Id |
| GET | /v1/Billing/Entities/BillEntitiyHistory | Billing/Entities | Gets a list of bill entity audit histories |
| PUT | /v1/Billing/Entities/Delete | Billing/Entities |  |
| GET | /v1/Billing/Entities/EntityList | Billing/Entities | Get list of bill entities in database |
| POST | /v1/Billing/Entities/New | Billing/Entities | Add new bill entity |
| PUT | /v1/Billing/Entities/Update | Billing/Entities | Update bill entity |
| GET | /v1/Billing/Enums | Billing/Enums |  |
| GET | /v1/Billing/FeatureFlags | Billing/FeatureFlags | Get feature flags for bill generation processing |
| DELETE | /v1/Billing/FeeCollection/{id} | Billing/FeeCollection |  |
| POST | /v1/Billing/FeeCollection/{id}/Action/BluePay | Billing/FeeCollection | Sent payment information to bluepay |
| POST | /v1/Billing/FeeCollection/{id}/Action/FeeFiles | Billing/FeeCollection |  |
| POST | /v1/Billing/FeeCollection/{id}/Action/Payments | Billing/FeeCollection |  |
| POST | /v1/Billing/FeeCollection/{id}/Action/Refresh | Billing/FeeCollection |  |
| GET | /v1/Billing/FeeCollection/{id}/Details | Billing/FeeCollection |  |
| GET | /v1/Billing/FeeCollection/{id}/Details/Counts | Billing/FeeCollection |  |
| GET | /v1/Billing/FeeCollection/{id}/Details/PayMethod/Counts | Billing/FeeCollection |  |
| POST | /v1/Billing/FeeCollection/Instance | Billing/FeeCollection |  |
| GET | /v1/Billing/FeeCollection/Instances | Billing/FeeCollection | Returns fee collection instance list |
| POST | /v1/Billing/FeeFile/Action/Schwab | Billing/FeeFile |  |
| GET | /v1/Billing/FeeFile/instance/{id} | Billing/FeeFile |  |
| POST | /v1/Billing/FeeType | Billing/FeeType | post form to add a new fee type |
| DELETE | /v1/Billing/FeeType/{id} | Billing/FeeType | remove a fee type by id |
| GET | /v1/Billing/FeeType/{id} | Billing/FeeType | find a fee type by id |
| PUT | /v1/Billing/FeeType/{id} | Billing/FeeType | post fee for update |
| GET | /v1/Billing/FeeType/List | Billing/FeeType | Return all the fee types |
| GET | /v1/Billing/FinalBills/account/{key} | Billing/FinalBills | Get Account for a given Account Id |
| GET | /v1/Billing/FinalBills/accounts/household/{key} | Billing/FinalBills | Get list of accounts by Household Id |
| GET | /v1/Billing/FinalBills/accounts/registration/{key} | Billing/FinalBills | Get list of accounts by Registration Id |
| GET | /v1/Billing/FinalBills/CreateBillInstance/{key} | Billing/FinalBills | Actually create the bill instance from the final bill instance session. |
| POST | /v1/Billing/FinalBills/CreateFinalBillInstance | Billing/FinalBills | Create final bill instance |
| PUT | /v1/Billing/FinalBills/CreateFinalBillInstanceItem | Billing/FinalBills | Create final bill instance item |
| DELETE | /v1/Billing/FinalBills/DeleteFinalBillInstance/{key} | Billing/FinalBills | Delete Final Bill Instance |
| DELETE | /v1/Billing/FinalBills/DeleteFinalBillInstanceItem/{key} | Billing/FinalBills | Delete Final Bill Instance Item |
| GET | /v1/Billing/FinalBills/GetFinalBillInstance/{key} | Billing/FinalBills | Gets a final bill instance for a given key |
| GET | /v1/Billing/FinalBills/GetFinalBillInstanceItem/{key} | Billing/FinalBills | Gets a final bill instance item by key |
| GET | /v1/Billing/FinalBills/GetFinalBillInstanceItemAccounts/{key} | Billing/FinalBills | Gets a list of final bill instance items accounts by the final bill instance id |
| GET | /v1/Billing/FinalBills/GetFinalBillInstances | Billing/FinalBills | Gets a list of incomplete final bill instances |
| GET | /v1/Billing/FinalBills/GetFinalBillInstances/Grid | Billing/FinalBills |  |
| PUT | /v1/Billing/FinalBills/UpdateFinalBillInstance | Billing/FinalBills | Update Final Bill Instance |
| PUT | /v1/Billing/FinalBills/UpdateFinalBillInstanceItem | Billing/FinalBills | Update Final Bill Instance Item |
| POST | /v1/Billing/FinancialPlanningFee/Action/Instance/{clientId}/{feeTypeId} | Billing/FinancialPlanningFee | Get a list of financial planning fees using a household id |
| POST | /v1/Billing/FinancialPlanningFee/CreateBluePayPayment | Billing/FinancialPlanningFee | Generate BluePay payments by taking a list of bill ids and submitting to BluePayPaymentsAccess |
| GET | /v1/Billing/FinancialPlanningFee/List/{householdId} | Billing/FinancialPlanningFee | Get a list of financial planning fees using a household id |
| POST | /v1/Billing/GenerateMockBills | Billing/GenerateMockBills | Generate Mock Bills for a date, renewals for pre-billing review |
| POST | /v1/Billing/Hierarchy | Billing/Hierarchy | Create a new fee hierarchy record. |
| PUT | /v1/Billing/Hierarchy | Billing/Hierarchy | Update a fee hierarchy record. |
| GET | /v1/Billing/Hierarchy/BillEntity/Search | Billing/Hierarchy | Searches fee hierarchy records by bill entity. |
| GET | /v1/Billing/Hierarchy/BillEntity/Search/{search} | Billing/Hierarchy | Searches fee hierarchy records by bill entity. |
| GET | /v1/Billing/Hierarchy/Consolidation | Billing/Hierarchy | Get all fee hierarchy records. |
| GET | /v1/Billing/Hierarchy/Consolidation/{entity}/Search | Billing/Hierarchy | Get fee hierarchy records for search criteria. |
| GET | /v1/Billing/Hierarchy/Consolidation/{entity}/Search/{search} | Billing/Hierarchy | Get fee hierarchy records for search criteria. |
| GET | /v1/Billing/Hierarchy/Consolidation/Accounts | Billing/Hierarchy | Get fee hierarchy account records |
| POST | /v1/Billing/Hierarchy/Consolidation/Accounts/Search | Billing/Hierarchy | Get fee hierarchy account records by search criteria |
| POST | /v1/Billing/Hierarchy/Consolidation/new/Search | Billing/Hierarchy | Get fee hierarchy records by search criteria. |
| GET | /v1/Billing/Hierarchy/Consolidation/Search | Billing/Hierarchy | Get fee hierarchy records for search criteria. |
| GET | /v1/Billing/Hierarchy/Consolidation/Search/{search} | Billing/Hierarchy | Get fee hierarchy records for search criteria. |
| PUT | /v1/Billing/Hierarchy/Consolidation/Update | Billing/Hierarchy | Update a fee hierarchy record. |
| GET | /v1/Billing/Hierarchy/CustodianCount | Billing/Hierarchy | Get counts of custodians given a specific fee hierarchy level/id |
| GET | /v1/Billing/Hierarchy/Default | Billing/Hierarchy | Get a fee hierarchy record with default values, for use in creating a new record. Does not add the new record. |
| PUT | /v1/Billing/Hierarchy/Delete | Billing/Hierarchy | Delete a list of fee hierarchy records by ID. |
| GET | /v1/Billing/Hierarchy/Entity/Search | Billing/Hierarchy | Searches fee hierarchy records by entity name. |
| GET | /v1/Billing/Hierarchy/Entity/Search/{search} | Billing/Hierarchy | Searches fee hierarchy records by entity name. |
| GET | /v1/Billing/Hierarchy/Estimate | Billing/Hierarchy | Get estimate of what the fee hierarchy would be given the specified paramter values. |
| GET | /v1/Billing/Hierarchy/MidLevel | Billing/Hierarchy | Get more details for the fee hierarchy level of the entity |
| GET | /v1/Billing/Hierarchy/PayoutRate/Search | Billing/Hierarchy | Searches fee hierarchy records by payout rate. |
| GET | /v1/Billing/Hierarchy/PayoutRate/Search/{search} | Billing/Hierarchy | Searches fee hierarchy records by payout rate. |
| GET | /v1/Billing/Hierarchy/Search | Billing/Hierarchy | Search for fee hierarchy records by Entity |
| GET | /v1/Billing/Hierarchy/TopLevel | Billing/Hierarchy | Get a top level view of fee hierarchy records for all entities. |
| GET | /v1/Billing/Hierarchy/Verbose | Billing/Hierarchy | Gets the verbose fee hierarchy record for the specified entity and entity ID |
| GET | /v1/Billing/HouseholdSummary/{key} | Billing/HouseholdSummary | Get household billing summary. |
| POST | /v1/Billing/IndirectScript | Billing/IndirectScript |  |
| GET | /v1/Billing/Instances | Billing/Instances | Get a list of bill instances that the logged in user has access to see. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Billing/Instances/{id}/Action/BillDataFiles | Billing/Instances |  |
| POST | /v1/Billing/Instances/{id}/Action/Complete | Billing/Instances |  |
| POST | /v1/Billing/Instances/{id}/Action/Invalidate | Billing/Instances |  |
| POST | /v1/Billing/Instances/{id}/Action/ResetFeeFile | Billing/Instances | This operation will provide entity payout payments. It takes one parameter id (bill instance id) (required) |
| GET | /v1/Billing/Instances/{key} | Billing/Instances | Gets the bill instance that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Billing/Instances/{key} | Billing/Instances | Update bill instance provided in the key. |
| PUT | /v1/Billing/Instances/{key}/Action/Generate | Billing/Instances |  |
| PUT | /v1/Billing/Instances/{key}/Action/Generate/Automate | Billing/Instances |  |
| PUT | /v1/Billing/Instances/{key}/Action/Generate/Cancel | Billing/Instances | Cancel a running Bill Generation Job |
| PUT | /v1/Billing/Instances/{key}/RecalcPayees | Billing/Instances |  |
| GET | /v1/Billing/Instances/{key}/Simple | Billing/Instances | Gets the simple bill instances that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Billing/Instances/ABCompare/{instanceId} | Billing/Instances | Returns a zip file containting the compare results from the AB Compare Regression Job |
| POST | /v1/Billing/Instances/Action/CompareBills | Billing/Instances |  |
| PUT | /v1/Billing/Instances/Action/Delete | Billing/Instances |  |
| POST | /v1/Billing/Instances/Action/FeeFiles | Billing/Instances | Creates fee files as db blobs based on bill instance ids and, optionally, a custodian ID. |
| POST | /v1/Billing/Instances/Action/FeeFiles/DateRange | Billing/Instances | Creates fee files for completed bill instances within the provided date range. |
| GET | /v1/Billing/Instances/CheckExportBillInstanceIds | Billing/Instances |  |
| POST | /v1/Billing/Instances/Client/{id}/Action/Invalidate | Billing/Instances |  |
| GET | /v1/Billing/Instances/Client/{id}/List | Billing/Instances | Get a list of billInstanceClients by a single clientId |
| POST | /v1/Billing/Instances/Client/Action/InvalidateMultiple | Billing/Instances |  |
| GET | /v1/Billing/Instances/EclipseExport | Billing/Instances |  |
| POST | /v1/Billing/Instances/GenerateCashFunding | Billing/Instances |  |
| POST | /v1/Billing/Instances/List | Billing/Instances | Gets a list of bill assets that match one of the keys in the provided list. |
| POST | /v1/Billing/Instances/List/Id | Billing/Instances | Gets a list of bill assets that match one of the keys in the provided list. |
| POST | /v1/Billing/Instances/New | Billing/Instances | Gets the bill instance that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Billing/Instances/Search | Billing/Instances |  |
| GET | /v1/Billing/Instances/Search/{search} | Billing/Instances |  |
| GET | /v1/Billing/Instances/Simple | Billing/Instances | Gets a simple list of bill instances that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Billing/Instances/Simple/List | Billing/Instances | Gets a simple list of bill instances that match one of the keys in the provided list. |
| POST | /v1/Billing/Instances/Simple/List/Id | Billing/Instances | Gets a simple list of bill instances that match one of the keys in the provided list. |
| GET | /v1/Billing/Invoices | Billing/Invoices | Get a list of invoices that the logged in user has access to see. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Invoices/{key} | Billing/Invoices | Gets the invoices that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Billing/Invoices/Simple | Billing/Invoices | Get a simple list of invoices that the logged in user has access to see. |
| GET | /v1/Billing/ManagementFeesNotPosted | Billing/ManagementFeesNotPosted | Get 'management fee' transactions. |
| GET | /v1/Billing/MasterPayoutSchedule | Billing/MasterPayoutSchedule | Get all master payout schedules with filter option by Id or Name The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Billing/MasterPayoutSchedule | Billing/MasterPayoutSchedule | Create master payout schedule |
| PUT | /v1/Billing/MasterPayoutSchedule | Billing/MasterPayoutSchedule | Modify multiple master payout schedules |
| GET | /v1/Billing/MasterPayoutSchedule/{key} | Billing/MasterPayoutSchedule | Get master payout schedule by key |
| PUT | /v1/Billing/MasterPayoutSchedule/{key} | Billing/MasterPayoutSchedule | Modify master payout schedule |
| GET | /v1/Billing/MasterPayoutSchedule/BillEntities/ByAccount/{key} | Billing/MasterPayoutSchedule | Get master payout schedule by key |
| GET | /v1/Billing/MasterPayoutSchedule/BillEntities/ByClient/{key} | Billing/MasterPayoutSchedule | Get master payout schedule by key |
| POST | /v1/Billing/MasterPayoutSchedule/Delete | Billing/MasterPayoutSchedule |  |
| GET | /v1/Billing/MasterPayoutSchedule/MasterPayoutScheduleDetailHistory | Billing/MasterPayoutSchedule | Get a list of MasterBillScheduleDetail History |
| GET | /v1/Billing/MasterPayoutSchedule/MasterPayoutScheduleHistory | Billing/MasterPayoutSchedule | Get master payout schedule history by key |
| GET | /v1/Billing/MasterPayoutSchedule/MasterPayoutSchedulesForAcctBD/{accountId} | Billing/MasterPayoutSchedule | Returns Master Payout schedules limited to given accounts associated broker dealers payout schedules Sample Request     GET /Billing/MasterPayoutSchedule/MasterPayoutSchedulesForAcctBD/123 Sample Response [     {         "id": 123,         "name": test"     } ] |
| GET | /v1/Billing/MasterPayoutSchedule/Simple | Billing/MasterPayoutSchedule | Get simple entities for master payout schedules The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Billing/PayablesByRep | Billing/PayablesByRep | Generate payable data by reps |
| GET | /v1/Billing/PayablesSummary | Billing/PayablesSummary | Get a summary list of payables. The return allows paging. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Payees | Billing/Payees | Get list of payees in DB |
| POST | /v1/Billing/Payees | Billing/Payees |  |
| DELETE | /v1/Billing/Payees/{key} | Billing/Payees |  |
| GET | /v1/Billing/Payees/{key} | Billing/Payees |  |
| PUT | /v1/Billing/Payees/{key} | Billing/Payees |  |
| GET | /v1/Billing/Payees/{key}/Documents | Billing/Payees |  |
| GET | /v1/Billing/Payees/{key}/Documents/{fileId} | Billing/Payees | Gets a file for the payee with the specified key and the file with the specified key. |
| GET | /v1/Billing/Payees/{key}/Documents/{fileId}/Download | Billing/Payees | Gets the raw data of the specific file with the blobId provided which is associated to the payee with the specified key. |
| PUT | /v1/Billing/Payees/{key}/SSNTaxId | Billing/Payees |  |
| GET | /v1/Billing/Payees/List | Billing/Payees | Get list of payees in DB |
| GET | /v1/Billing/Payees/Search | Billing/Payees |  |
| GET | /v1/Billing/Payees/Search/{search} | Billing/Payees |  |
| GET | /v1/Billing/Payees/Simple | Billing/Payees |  |
| GET | /v1/Billing/PayMethods | Billing/PayMethods |  |
| GET | /v1/Billing/PayoutDashboard | Billing/PayoutDashboard | Get the list of accounts for the appropriate values The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| PUT | /v1/Billing/PayoutDashboard/Action/Delete | Billing/PayoutDashboard |  |
| POST | /v1/Billing/PayoutDashboard/CreateExpense | Billing/PayoutDashboard | Creates a new expense |
| GET | /v1/Billing/PayoutDashboard/Payment/{paymentId}/Action/Report | Billing/PayoutDashboard |  |
| POST | /v1/Billing/PayoutDashboard/Payment/DeletePayables | Billing/PayoutDashboard | Unflushes Payables |
| POST | /v1/Billing/PayoutDashboard/Payment/Expenses | Billing/PayoutDashboard | Creates a new payout adjustment, which updates payables |
| POST | /v1/Billing/PayoutDashboard/Payment/GenerateReport | Billing/PayoutDashboard | Takes list of Payout Dashboard Ids and generates a report for them. |
| GET | /v1/Billing/PayoutDashboard/Payment/GetHangFireProgressById | Billing/PayoutDashboard |  |
| GET | /v1/Billing/PayoutDashboard/Payment/List | Billing/PayoutDashboard | Returns a list of Payments for a given date range |
| POST | /v1/Billing/PayoutDashboard/Payment/MultiplePayments | Billing/PayoutDashboard | Used to Create payments. If item is to be paid, set ToPay = true Items are queued to be processed, will return records that will be processed. |
| GET | /v1/Billing/PayoutDashboard/Payment/New | Billing/PayoutDashboard | This operation will provide entity payout payments. It takes two parameters startDate (not required), endDate (not required) |
| POST | /v1/Billing/PayoutDashboard/Payment/New | Billing/PayoutDashboard | Used to Create payments. If item is to be paid, set ToPay = true Items are queued to be processed, will return records that will be processed. |
| GET | /v1/Billing/PayoutDashboard/Payment/PaymentProcessing | Billing/PayoutDashboard |  |
| DELETE | /v1/Billing/PayoutDashboard/Reports/{key} | Billing/PayoutDashboard | This endpoint is no longer valid and will be removed 7/11/2024. Use endpoint is /Billing/PayoutDashboard/Payment/DeletePayables. |
| GET | /v1/Billing/PayoutDashboard/Reports/{key} | Billing/PayoutDashboard | Returns Report Data.  Requires Admin/Advisor with permissions. |
| PUT | /v1/Billing/PayoutDashboard/Reports/Action/Delete | Billing/PayoutDashboard | Used to delete Advisory Fee Reports |
| POST | /v1/Billing/PayoutDashboard/Reports/Action/ManualReportUpload | Billing/PayoutDashboard | Manually uploads an advisory fee report. Requires Admin. |
| POST | /v1/Billing/PayoutDashboard/Reports/CreatePaymentReports | Billing/PayoutDashboard | Generates a Payment Report. Requires Admin/Advisor with edit. |
| GET | /v1/Billing/PayoutDashboard/Reports/Download/{filename} | Billing/PayoutDashboard | Used to download a previously generated report. |
| GET | /v1/Billing/PayoutDashboard/Reports/List | Billing/PayoutDashboard |  |
| GET | /v1/Billing/PayoutDashboard/RepPayees | Billing/PayoutDashboard |  |
| GET | /v1/Billing/PayoutDashboard/Summary/ActivityChart | Billing/PayoutDashboard |  |
| GET | /v1/Billing/PayoutDashboard/Summary/Header | Billing/PayoutDashboard |  |
| GET | /v1/Billing/Payouts/Summary/Header | Billing/Payouts | Gets a sum of all payouts for the given timeframe for each billing status. |
| POST | /v1/Billing/PersonalizedPortfolio/UpdateRegistration | Billing/PersonalizedPortfolio | Allows updating fee and payout schedule for all accounts in a registration |
| POST | /v1/Billing/PostAuditFiles | Billing/PostAuditFiles | Generate data queries for billing |
| GET | /v1/Billing/PostedPayments | Billing/PostedPayments | Get a list of posted payments. Note: At least one filter is required. |
| PUT | /v1/Billing/PostedPayments/{billPaymentId}/Action/Undo | Billing/PostedPayments | Undo posted payments |
| PUT | /v1/Billing/PostedPayments/Action/Delete | Billing/PostedPayments |  |
| PUT | /v1/Billing/PostedPayments/Action/Reverse | Billing/PostedPayments | Reverse selected postedpayment ids |
| PUT | /v1/Billing/PostedPayments/Action/UndoMultiple | Billing/PostedPayments | Undo posted payments for multiple bill payments in a single request. |
| GET | /v1/Billing/PostedPayments/reports | Billing/PostedPayments | Get List of posted payments: returns only items with billPaymentIds |
| GET | /v1/Billing/PostedPayments/reportsByBatch/{batchId} | Billing/PostedPayments | Get List of posted payments by batch number: returns only items with billPaymentIds |
| POST | /v1/Billing/PostManagementFees | Billing/PostManagementFees |  |
| GET | /v1/Billing/PostPayments | Billing/PostPayments | Get list of payments so that they can be unposted. |
| POST | /v1/Billing/PostPayments | Billing/PostPayments | Generate post payments for billing |
| GET | /v1/Billing/PostPayments/accounts | Billing/PostPayments | Get all bill payments for accounts |
| GET | /v1/Billing/PostPayments/BillInstance/{key} | Billing/PostPayments | Get all bill payments by bill instance id |
| GET | /v1/Billing/PostPayments/BillPayments | Billing/PostPayments | Get list of unpaid bills. |
| GET | /v1/Billing/PostPayments/CustodianAndDate | Billing/PostPayments | Get Post Payments |
| GET | /v1/Billing/PostPayments/FFandDate | Billing/PostPayments | Get list of unpaid bills by client. |
| GET | /v1/Billing/PostPayments/FFandDate/Grid | Billing/PostPayments | Get list of unpaid bills by client. |
| GET | /v1/Billing/PostPayments/HHAndDate | Billing/PostPayments | Get list of unpaid bills by client. |
| POST | /v1/Billing/PostPayments/ImportAndDate | Billing/PostPayments | Takes an xlsx, xls, or csv file as multipart content. The file needs either an "Account ID" or "Account Number" or "Household ID" column The file will be processed and returned a Post Payments data filtered by column. |
| GET | /v1/Billing/PostPayments/IsPostingPayments | Billing/PostPayments | Check if there is an existing Post Payments batch in progress |
| PUT | /v1/Billing/PostPayments/PostPaymentBatch/{key}/Action/Rerun | Billing/PostPayments |  |
| GET | /v1/Billing/PostPayments/Status | Billing/PostPayments |  |
| POST | /v1/Billing/PostPayments/Status/{batchId} | Billing/PostPayments | Retries processing of a post payment batch |
| PUT | /v1/Billing/PostPayments/UpdateAmountToPost/{id} | Billing/PostPayments | Echo without an update. Slickgrid insists, but can we do this another way? |
| POST | /v1/Billing/PostPayments/WriteOffBills | Billing/PostPayments | Write off Bills |
| GET | /v1/Billing/Products | Billing/Products | Get a list of bill Products that the logged in user has access to see. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Products/{key} | Billing/Products | Gets the bill product that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Billing/Products/{key} | Billing/Products |  |
| GET | /v1/Billing/RecalcProcess/GetHangFireProgressById | Billing/RecalcProcess | get hangfire job Id for recalc process |
| GET | /v1/Billing/ReceiveableSummary | Billing/ReceiveableSummary | Get a summary list of recievables. |
| GET | /v1/Billing/ReferralPayments | Billing/ReferralPayments | Get a list of referral payments that the logged in user has access to see. Get referral payments. Can filter by payee, batch or CreatedDate |
| PUT | /v1/Billing/ReferralPayments/Action/CalculateBatch | Billing/ReferralPayments | Routine that calculates Referral payments and creates a new Referral Batch |
| GET | /v1/Billing/ReferralPayments/Batch | Billing/ReferralPayments | Get all batches |
| GET | /v1/Billing/ReferralPayments/Batch/{key} | Billing/ReferralPayments | Get batch by id |
| GET | /v1/Billing/ReferralPayments/Counts | Billing/ReferralPayments | Get counts for the UI |
| POST | /v1/Billing/ReferralPayments/Delete | Billing/ReferralPayments |  |
| GET | /v1/Billing/ReferralPayments/Payee | Billing/ReferralPayments | Get list of payees with referral payments |
| GET | /v1/Billing/ReferralPayouts | Billing/ReferralPayouts | Get a list of Referral Payouts that the logged in user has access to see. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Billing/ReferralPayouts | Billing/ReferralPayouts |  |
| DELETE | /v1/Billing/ReferralPayouts/{key} | Billing/ReferralPayouts |  |
| GET | /v1/Billing/ReferralPayouts/{key} | Billing/ReferralPayouts | Gets the Referral Payouts that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Billing/ReferralPayouts/{key} | Billing/ReferralPayouts |  |
| GET | /v1/Billing/RelatedBillingClient | Billing/RelatedBillingClient |  |
| GET | /v1/Billing/RelatedBillingClient/{key} | Billing/RelatedBillingClient |  |
| GET | /v1/Billing/RevenuePayout | Billing/RevenuePayout |  |
| POST | /v1/Billing/RevenuePayout | Billing/RevenuePayout | This operation will create revenue payout report. It takes three parameters asOfDate(required), description (not required), forecast (not required) |
| GET | /v1/Billing/RevenuePayout/{id} | Billing/RevenuePayout |  |
| GET | /v1/Billing/RevenuePayout/{id}/Details | Billing/RevenuePayout |  |
| GET | /v1/Billing/RevenuePayout/{id}/Payment/New | Billing/RevenuePayout |  |
| GET | /v1/Billing/RevenuePayout/{id}/Payment/Reports | Billing/RevenuePayout | Returns a list of all Reports for a given ReventuPayout Id |
| GET | /v1/Billing/RevenuePayout/{id}/Payments | Billing/RevenuePayout | Returns list of payments for revenue payout id |
| POST | /v1/Billing/RevenuePayout/Payment | Billing/RevenuePayout |  |
| DELETE | /v1/Billing/RevenuePayout/Payment/{key} | Billing/RevenuePayout |  |
| GET | /v1/Billing/RevenuePayout/Payment/Report/{key} | Billing/RevenuePayout |  |
| DELETE | /v1/Billing/RevenuePayout/Payout/Delete/{key} | Billing/RevenuePayout |  |
| POST | /v1/Billing/Run/IndirectManagementFeeAdjScript | Billing/Run | Run the Indirect Management Fee Adjustment Script for a given date range |
| GET | /v1/Billing/Schedules | Billing/Schedules |  |
| POST | /v1/Billing/Schedules | Billing/Schedules | Creates a new Bill Schedule based on the dto passed to the method |
| DELETE | /v1/Billing/Schedules/{key} | Billing/Schedules |  |
| GET | /v1/Billing/Schedules/{key} | Billing/Schedules | Gets the schedule that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Billing/Schedules/{key} | Billing/Schedules |  |
| GET | /v1/Billing/Schedules/{key}/Calculate | Billing/Schedules | Calculates the fee breakdown for the amount provided and the schedule that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Billing/Schedules/AssignedSchedules | Billing/Schedules |  |
| GET | /v1/Billing/Schedules/BillScheduleDetailHistory | Billing/Schedules | Get a list of BillScheduleDetail History |
| GET | /v1/Billing/Schedules/BillScheduleHistory | Billing/Schedules | Gets a list of bill schedule histories |
| GET | /v1/Billing/Schedules/CLS/Platform/{key}/BillSchedule | Billing/Schedules |  |
| PUT | /v1/Billing/Schedules/CLS/Platform/{key}/BillSchedule | Billing/Schedules |  |
| POST | /v1/Billing/Schedules/CLS/Platform/BillSchedule | Billing/Schedules |  |
| POST | /v1/Billing/Schedules/CLSBillingWizard | Billing/Schedules |  |
| PUT | /v1/Billing/Schedules/Delete | Billing/Schedules |  |
| GET | /v1/Billing/Schedules/full | Billing/Schedules | Gets the full schedule details. |
| GET | /v1/Billing/Schedules/Simple | Billing/Schedules |  |
| POST | /v1/Billing/SyncCashtoEclipse | Billing/SyncCashtoEclipse | Draft method to sync cash between receivables and Eclipse. Right now we just send one account at a time. Eventually, we want to be able to sync all accounts in a bill instance at once. |
| GET | /v1/Billing/Transactions | Billing/Transactions |  |
| GET | /v1/Billing/Transactions/{key} | Billing/Transactions | Gets the client that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Billing/Transactions/AutomateCashflows/Process | Billing/Transactions | Process Cashflow Automation on demand. |
| GET | /v1/Billing/Transactions/AutomateCashflowSettings | Billing/Transactions | Get Automated Casfhlow Settings |
| PUT | /v1/Billing/Transactions/AutomateCashflowSettings | Billing/Transactions | Update Automated Cashflow Settings |
| GET | /v1/Billing/Transactions/Consolidated | Billing/Transactions | Gets a list of transactions that the logged in user has access to. The return is limited to pages of 100000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Billing/Transactions/FeeExcludedAssets | Billing/Transactions | Gets a list of transactions of buys or sells to/from fee excluded assets that match one of the keys in the provided list. |
| GET | /v1/Billing/Transactions/FeeExcludedAssets/Test | Billing/Transactions | Testing endpoint for FeeExcludedAssets. Do not use outside of testing purposes. |
| GET | /v1/Billing/Transactions/Grid | Billing/Transactions |  |
| POST | /v1/Billing/Transactions/List | Billing/Transactions | Gets a list of bill transactions that match one of the keys in the provided list. |
| POST | /v1/Billing/Transactions/List/Id | Billing/Transactions | Gets a list of bill transactions that match one of the keys in the provided list. |
| GET | /v1/Billing/Transactions/SleeveTransfers | Billing/Transactions | Gets a list of bill transactions that match one of the keys in the provided list. |
| GET | /v1/Billing/Transactions/TransactionSleeveCashflows/Test | Billing/Transactions | Testing endpoint for TransactionSleeveCashflows. Do not use outside of testing purposes. |
| GET | /v1/Billing/Transactions/TransType | Billing/Transactions | Returns list of Transaction Types for Billing |
| PUT | /v1/Billing/UpdateBillaccountItem | Billing/UpdateBillaccountItem |  |
| POST | /v1/Billing/UpdateNotes | Billing/UpdateNotes | Create new confirm overview notes |
| POST | /v1/Billing/ValidateImport/Account/ReferralSchedules | Billing/ValidateImport |  |
| POST | /v1/Billing/ValidateImport/FeeHierarchy | Billing/ValidateImport | import the excel into a list of objects we can use |
| PUT | /v1/Billing/ValidateImport/FeeHierarchy/Import | Billing/ValidateImport | import the processed data into tblFeeHierarchy. This only does an insert. |
| GET | /v1/Billing/ValidateImport/FeeHierarchy/Templates/Csv | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/FeeHierarchy/Templates/Xls | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/FeeHierarchy/Templates/Xlsx | Billing/ValidateImport |  |
| POST | /v1/Billing/ValidateImport/PartialExclusion | Billing/ValidateImport |  |
| PUT | /v1/Billing/ValidateImport/PartialExclusion/Import | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/PartialExclusion/Templates/Csv | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/PartialExclusion/Templates/Xls | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/PartialExclusion/Templates/Xlsx | Billing/ValidateImport |  |
| POST | /v1/Billing/ValidateImport/PayForAccounts | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/PayForAccounts/Templates/Csv | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/PayForAccounts/Templates/Xls | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/PayForAccounts/Templates/Xlsx | Billing/ValidateImport |  |
| POST | /v1/Billing/ValidateImport/RelatedHouseholds | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/RelatedHouseholds/Templates/Csv | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/RelatedHouseholds/Templates/Xls | Billing/ValidateImport |  |
| GET | /v1/Billing/ValidateImport/RelatedHouseholds/Templates/Xlsx | Billing/ValidateImport |  |
| GET | /v1/Blogging/Blogs | Blogging/Blogs | Gets all blog objects for user |
| POST | /v1/Blogging/Blogs | Blogging/Blogs | Create a new blog |
| PUT | /v1/Blogging/Blogs | Blogging/Blogs | Mass update blogs |
| DELETE | /v1/Blogging/Blogs/{key} | Blogging/Blogs | Delete a blog |
| GET | /v1/Blogging/Blogs/{key} | Blogging/Blogs | Gets blog by key |
| PUT | /v1/Blogging/Blogs/{key} | Blogging/Blogs | Update one blog |
| GET | /v1/Blogging/Blogs/Simple | Blogging/Blogs |  |
| GET | /v1/Blogging/Emails/{emailId}/Attachments/{key}/Download | Blogging/Emails | Gets the raw data of the specific email attachment with the key provided which is associated to the email with the specified key. |
| GET | /v1/Blogging/Emails/{folder} | Blogging/Emails | Gets all received email objects for user |
| DELETE | /v1/Blogging/Emails/{key} | Blogging/Emails | Delete an email |
| GET | /v1/Blogging/Emails/{key} | Blogging/Emails | Gets email by key |
| GET | /v1/Blogging/Emails/Mailboxes | Blogging/Emails | Gets email mailboxes |
| POST | /v1/Blogging/Emails/New | Blogging/Emails | Create a new email |
| PUT | /v1/Blogging/Emails/Received/Action/Delete | Blogging/Emails |  |
| PUT | /v1/Blogging/Emails/Received/Action/MarkRead | Blogging/Emails |  |
| GET | /v1/Blogging/Emails/Recipients/Search | Blogging/Emails | Gets a list of recipients that the logged in user has access to where the UserName or UserId contains the search string. |
| GET | /v1/Blogging/Emails/Recipients/Search/{search} | Blogging/Emails | Gets a list of recipients that the logged in user has access to where the UserName or UserId contains the search string. |
| PUT | /v1/Blogging/Emails/Sent/Action/Archive | Blogging/Emails |  |
| GET | /v1/Blogging/Newsfeed | Blogging/Newsfeed | Gets all Newsfeed objects for user |
| GET | /v1/Blogging/Newsfeed/Admin | Blogging/Newsfeed | Gets all Newsfeed objects for user |
| POST | /v1/Blogging/Newsfeed/Admin | Blogging/Newsfeed | Adds a new News feed item to the database. |
| GET | /v1/Blogging/Newsfeed/Admin/{key} | Blogging/Newsfeed | Gets Newsfeed by key |
| PUT | /v1/Blogging/Newsfeed/Admin/{key} | Blogging/Newsfeed | Update News feed |
| PUT | /v1/Blogging/Newsfeed/Admin/Action/Active | Blogging/Newsfeed |  |
| PUT | /v1/Blogging/Newsfeed/Admin/Action/Delete | Blogging/Newsfeed |  |
| POST | /v1/Blogging/Newsfeed/Admin/AdvisorMaterial | Blogging/Newsfeed | Creates News feed advisor material.Special endpoint to flatten the object for multipart form data. |
| PUT | /v1/Blogging/Newsfeed/Admin/AdvisorMaterial/{key} | Blogging/Newsfeed | Update News feed advisor material.Special endpoint to flatten the object for multipart form data. |
| GET | /v1/Blogging/Newsfeed/Admin/AdvisorMaterial/File/{blobId}/download | Blogging/Newsfeed |  |
| GET | /v1/Blogging/Newsfeed/Admin/AdvisorMaterial/File/{newsfeedId} | Blogging/Newsfeed |  |
| GET | /v1/Blogging/Newsfeed/Admin/GetAllAdvisorPosts/{feedType}/{categoryId}/{subCategoryId} | Blogging/Newsfeed |  |
| GET | /v1/Blogging/Newsfeed/Admin/Grid/Post | Blogging/Newsfeed | Gets Newsfeed of type Post for grid display |
| GET | /v1/Blogging/Newsfeed/Admin/Grid/Rss | Blogging/Newsfeed | Gets Newsfeed of type RSS for grid display |
| GET | /v1/Blogging/Newsfeed/Admin/New | Blogging/Newsfeed | Gets all blog objects for user |
| GET | /v1/Blogging/Newsfeed/AdvisorMaterial | Blogging/Newsfeed | Gets Newsfeed of type AdvisorMaterial for user display |
| GET | /v1/Blogging/Newsfeed/AdvisorMaterial/View | Blogging/Newsfeed | Gets the viewable advisor material. |
| GET | /v1/Blogging/Newsfeed/Notification | Blogging/Newsfeed | Gets Newsfeed of type Notification |
| GET | /v1/Blogging/Newsfeed/Notification/View | Blogging/Newsfeed | Gets view of the Notification that was sent |
| GET | /v1/Blogging/Newsfeed/Post | Blogging/Newsfeed | Gets Newsfeed of type Post |
| GET | /v1/Blogging/Newsfeed/Rss | Blogging/Newsfeed | Gets Newsfeed of type RSS for user display |
| GET | /v1/Blogging/Newsfeed/Statement | Blogging/Newsfeed | Gets Newsfeed of type Statement |
| GET | /v1/Blogging/Newsfeed/Statement/View | Blogging/Newsfeed | Gets the viewable statement. |
| GET | /v1/Blogging/Newsfeed/Summary | Blogging/Newsfeed | Gets counts of all Newsfeed types |
| GET | /v1/Blogging/Newsfeed/Webinar | Blogging/Newsfeed | Gets Newsfeed of type Webinar for user display |
| GET | /v1/Compliance/Archive | Compliance/Archive | Gets all report Pdf archive items. |
| POST | /v1/Compliance/Archive | Compliance/Archive | Gets all reportPdfArchive items. |
| DELETE | /v1/Compliance/Archive/{key} | Compliance/Archive | Used to delete an existing report PDF Archive. Upon successful deletion a 204 will be returned. |
| PUT | /v1/Compliance/Archive/{key} | Compliance/Archive | Updates the properties of a {OAS.DataModel.Compliance.ReportPdfArchive} with the specified primary key, using the properties of the provided {OAS.WebApi.DTO.Compliance.ReportPdfArchiveDto}. |
| GET | /v1/Compliance/Archive/{key}/TestMetaData | Compliance/Archive | Tests the metadata archive process by generating and directly downloading archive files for the specified date range and report PDF archive configuration. |
| PUT | /v1/Compliance/Archive/Test | Compliance/Archive | Tests the upload target properties for a valid SFTP endpoint and credentials. |
| GET | /v1/Compliance/Archive/Types | Compliance/Archive |  |
| POST | /v1/Compliance/AuditRequests | Compliance/AuditRequests | Create a new Audit Request |
| GET | /v1/Compliance/AuditRequests/{auditRequestId}/DownloadZipAttachments | Compliance/AuditRequests | Download a single attachment |
| DELETE | /v1/Compliance/AuditRequests/{key} | Compliance/AuditRequests | Delete an Audit request item and all attached records for a given key |
| GET | /v1/Compliance/AuditRequests/{key} | Compliance/AuditRequests | Get a audit request for a given key |
| PUT | /v1/Compliance/AuditRequests/{key} | Compliance/AuditRequests | update a audit request record for the key given |
| POST | /v1/Compliance/AuditRequests/{key}/DataQuery | Compliance/AuditRequests | Create a .csv attachment based on a data query |
| GET | /v1/Compliance/AuditRequests/{key}/Items | Compliance/AuditRequests | Get a list of audit request items for a given audit request key |
| GET | /v1/Compliance/AuditRequests/DefaultCategories | Compliance/AuditRequests | Get a list of audit request default item |
| PUT | /v1/Compliance/AuditRequests/DefaultCategories | Compliance/AuditRequests | Update list of default request items |
| GET | /v1/Compliance/AuditRequests/DefaultItem | Compliance/AuditRequests | Get a list of audit request default item |
| POST | /v1/Compliance/AuditRequests/DefaultItem | Compliance/AuditRequests | Create a new audit request default item |
| GET | /v1/Compliance/AuditRequests/DefaultItem/Test | Compliance/AuditRequests | Get a list of audit request default item |
| GET | /v1/Compliance/AuditRequests/DownloadRequestLetter/{key} | Compliance/AuditRequests | Download the file loaded as the request letter |
| DELETE | /v1/Compliance/AuditRequests/Item/{id}/DeleteAttachments | Compliance/AuditRequests | Delete a single attachment |
| POST | /v1/Compliance/AuditRequests/Items | Compliance/AuditRequests | Create a new audit request item, will execute stored procedures as defined on the items |
| PUT | /v1/Compliance/AuditRequests/Items | Compliance/AuditRequests | Takes a list of items and adds/updates as needed. |
| POST | /v1/Compliance/AuditRequests/Items/{auditRequestItemId}/UploadAttachment | Compliance/AuditRequests | Create a new audit reqeuest item attachment |
| GET | /v1/Compliance/AuditRequests/Items/{id}/DownloadZipAttachments | Compliance/AuditRequests | Download a single attachment |
| GET | /v1/Compliance/AuditRequests/Items/{key} | Compliance/AuditRequests | Get an audit request items for a given audit request key |
| PUT | /v1/Compliance/AuditRequests/Items/{key} | Compliance/AuditRequests | update an audit request item |
| GET | /v1/Compliance/AuditRequests/Items/DownloadAttachment/{key} | Compliance/AuditRequests | Download a single attachment |
| POST | /v1/Compliance/AuditRequests/Summary | Compliance/AuditRequests | Gets a list of audit requests that the logged in user has access to. |
| GET | /v1/Compliance/AuditTests/{auditTestResultId}/ResultRows | Compliance/AuditTests | Get a list of Result Rows by Restult Id |
| GET | /v1/Compliance/AuditTests/{AuditTestResultId}/ResultRows/{cacheKey} | Compliance/AuditTests | Retrieve the previously generated slick grid result. |
| GET | /v1/Compliance/AuditTests/{testResultId}/DownloadAllAttachments | Compliance/AuditTests | Download All Attachments for the testResultId |
| GET | /v1/Compliance/AuditTests/{testResultRowId}/DownloadAttachments | Compliance/AuditTests | Download a single attachment |
| PUT | /v1/Compliance/AuditTests/ActiveSchedule | Compliance/AuditTests | End a test schedule |
| GET | /v1/Compliance/AuditTests/Categories | Compliance/AuditTests | Get a list of categories Optional Filter Parameters |
| PUT | /v1/Compliance/AuditTests/Category | Compliance/AuditTests | Update category name item |
| DELETE | /v1/Compliance/AuditTests/Category/{key} | Compliance/AuditTests | Delete an test template item |
| POST | /v1/Compliance/AuditTests/DefaultSchedule | Compliance/AuditTests | Create a schedule based on a template |
| PUT | /v1/Compliance/AuditTests/EndSchedule | Compliance/AuditTests | End a test schedule |
| PUT | /v1/Compliance/AuditTests/Result/Completed/{isCompleted} | Compliance/AuditTests | Set Archive Flag on Restult Record |
| PUT | /v1/Compliance/AuditTests/ResultRow | Compliance/AuditTests | Update a single Row Details |
| DELETE | /v1/Compliance/AuditTests/ResultRow/{auditTestResultRowId}/DeleteAttachment/{blobId} | Compliance/AuditTests | Delete a single attachment |
| GET | /v1/Compliance/AuditTests/ResultRow/{id} | Compliance/AuditTests | Get a single result record by id |
| PUT | /v1/Compliance/AuditTests/ResultRow/Action/Update/{reviewed} | Compliance/AuditTests |  |
| PUT | /v1/Compliance/AuditTests/ResultRow/Action/Update/Comment | Compliance/AuditTests |  |
| PUT | /v1/Compliance/AuditTests/ResultRow/Action/Update/Exception/{isException} | Compliance/AuditTests |  |
| GET | /v1/Compliance/AuditTests/ResultRow/CommentHistory/{key} | Compliance/AuditTests | Get a list of comment history for result row |
| GET | /v1/Compliance/AuditTests/ResultRow/Exceptions | Compliance/AuditTests | Gets the exception result rows. |
| POST | /v1/Compliance/AuditTests/Results | Compliance/AuditTests | Populate the Slick Grid Optional Filter Parameters |
| GET | /v1/Compliance/AuditTests/Results/{auditTestResultId} | Compliance/AuditTests | Get a single Result for breadcrumb Optional Filter Parameters |
| PUT | /v1/Compliance/AuditTests/Results/{auditTestResultId} | Compliance/AuditTests | Update a single result record |
| POST | /v1/Compliance/AuditTests/RunTest | Compliance/AuditTests | Update a schedule |
| POST | /v1/Compliance/AuditTests/Schedule | Compliance/AuditTests | Update a schedule |
| PUT | /v1/Compliance/AuditTests/Schedule | Compliance/AuditTests | Update a schedule |
| POST | /v1/Compliance/AuditTests/Schedules | Compliance/AuditTests | Get a list of schedules |
| POST | /v1/Compliance/AuditTests/Template | Compliance/AuditTests | Create new test template |
| DELETE | /v1/Compliance/AuditTests/Template/{key} | Compliance/AuditTests | Delete an test template item |
| GET | /v1/Compliance/AuditTests/Template/{key} | Compliance/AuditTests | Get a specific template by id |
| PUT | /v1/Compliance/AuditTests/Template/{key} | Compliance/AuditTests | Update test template |
| POST | /v1/Compliance/AuditTests/Templates/List | Compliance/AuditTests | List of all templates |
| GET | /v1/Compliance/Bcc/Accounts | Compliance/Bcc |  |
| GET | /v1/Compliance/Bcc/Consultants | Compliance/Bcc | Gets a list of consultants. |
| POST | /v1/Compliance/Bcc/Consultants/Email | Compliance/Bcc | Sends consultants emails. |
| GET | /v1/Compliance/Bcc/Holdings | Compliance/Bcc |  |
| POST | /v1/Compliance/Bcc/Households/Representatives | Compliance/Bcc |  |
| GET | /v1/Compliance/Bcc/Integration/Redirect | Compliance/Bcc | Redirects a user to a page in the OC web application. |
| GET | /v1/Compliance/Bcc/Platforms/Simple | Compliance/Bcc | Gets a simple list of platforms that the logged in user has access to. |
| GET | /v1/Compliance/Bcc/Transactions | Compliance/Bcc |  |
| GET | /v1/Compliance/Bcc/Users | Compliance/Bcc |  |
| GET | /v1/Compliance/Bcc/UsersByRiaOrBrokerDealer | Compliance/Bcc | BCC needs search results of users who are associated with an RIA or BrokerDealer Id when selecting users for a One2Many client. |
| GET | /v1/Compliance/Dashboard/Inform | Compliance/Dashboard | Populate the Inform Widget on the Compliance Dashboard |
| POST | /v1/Compliance/Dashboard/OpenAudits | Compliance/Dashboard | Populate the Verify Widget on the Compliance Dashboard |
| POST | /v1/Compliance/Dashboard/OpenLexisNexis | Compliance/Dashboard | Populate the Verify Widget on the Compliance Dashboard |
| POST | /v1/Compliance/Dashboard/OpenTests | Compliance/Dashboard | Populate Supervise on the Compliance Dashboard |
| POST | /v1/Compliance/Disclose/{type}/{asOfDate} | Compliance/Disclose | Populate ADV/AUM Tiles by type on Disclose Dashboard |
| POST | /v1/Compliance/Disclose/{type}/{asOfDate}/Detail | Compliance/Disclose | Detail Result by Type |
| GET | /v1/Compliance/Disclose/{type}/{asOfDate}/Detail/{cacheKey} | Compliance/Disclose | Retrieve the previously generated slick grid result. |
| POST | /v1/Compliance/Disclose/13f/FormReportSummary/{asOfDate} | Compliance/Disclose | Gets the 13f summary report asynchronous. |
| POST | /v1/Compliance/Disclose/13f/InformationSummary/{asOfDate} | Compliance/Disclose | Populate the 13F Filing Requirements Tile |
| GET | /v1/Compliance/Disclose/AdvCategories/AssetCategories | Compliance/Disclose |  |
| GET | /v1/Compliance/Disclose/AdvCategories/ClientCategories | Compliance/Disclose |  |
| PUT | /v1/Compliance/Disclose/AdvCategories/ResetAdvAssetCategories | Compliance/Disclose |  |
| POST | /v1/Compliance/Disclose/ADVConsolidated/Detail/{asOfDate} | Compliance/Disclose | Populate ADV Consolidated Tile on Disclose Dashboard |
| POST | /v1/Compliance/Disclose/AdvCustody/{asOfDate} | Compliance/Disclose | Gets Adv Custody Tile data |
| GET | /v1/Compliance/Disclose/AdvCustodyTypes | Compliance/Disclose | Gets Custody Types for Adv |
| POST | /v1/Compliance/Disclose/AdvSloa/{asOfDate} | Compliance/Disclose | Gets Adv Sloa Tile data |
| POST | /v1/Compliance/Disclose/AUA/{asOfDate} | Compliance/Disclose | Populate ADV AUM Tile on Disclose Dashboard |
| POST | /v1/Compliance/Disclose/AUAProducts/{asOfDate} | Compliance/Disclose | Populate AUA Products Tile on Disclose Dashboard |
| POST | /v1/Compliance/Disclose/AUM/{asOfDate} | Compliance/Disclose | Populate ADV AUM Tile on Disclose Dashboard |
| PUT | /v1/Compliance/Disclose/Detail/{type} | Compliance/Disclose | Update Account Status |
| POST | /v1/Compliance/Disclose/Discretionary/{asOfDate} | Compliance/Disclose | Populate ADV Discretionary Tile on Disclose Dashboard |
| POST | /v1/Compliance/Disclose/Domestic/{asOfDate} | Compliance/Disclose | Populate ADV Domestic vs Foreign Tile on Disclose Dashboard |
| POST | /v1/Compliance/Disclose/FormReport13F/{asOfDate}/XML | Compliance/Disclose | 13F Reporting XML Output. |
| GET | /v1/Compliance/Disclose/NeedEmployeeHouseholdsBanner | Compliance/Disclose | Checks if user has access to Employee Households |
| POST | /v1/Compliance/Disclose/UserAdvFilters | Compliance/Disclose | Update Adv or Aua Filter Settings from Compliance |
| POST | /v1/Compliance/Disclose/WrapManaged/{asOfDate} | Compliance/Disclose | Populate ADV Wrap Managed Tile on Disclose Dashboard |
| POST | /v1/Compliance/Filter/{type}/{searchText} | Compliance/Filter | List of Filter Choices by |
| DELETE | /v1/Compliance/Inform/AccessPerson/{accessPersonId}/Connection/{connectionId} | Compliance/Inform | Deletes the connection asynchronous. |
| POST | /v1/Compliance/Inform/AccessPerson/{isActive} | Compliance/Inform | Creates new Access Person Records with status provided |
| PUT | /v1/Compliance/Inform/AccessPerson/{isActive} | Compliance/Inform | Update Access person status |
| GET | /v1/Compliance/Inform/AccessPerson/{key} | Compliance/Inform | Returns Access Person Details |
| PUT | /v1/Compliance/Inform/AccessPerson/{key} | Compliance/Inform | Update access person details |
| POST | /v1/Compliance/Inform/AccessPerson/{key}/CloseAll | Compliance/Inform | Closes all access person asynchronous. |
| PUT | /v1/Compliance/Inform/AccessPerson/{key}/Preclearances/CloseAll | Compliance/Inform | Closes all access person preclearances asynchronous. |
| POST | /v1/Compliance/Inform/AccessPerson/BrokenConnections | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/AccessPerson/CurrentUser | Compliance/Inform | Returns Access Person Details |
| POST | /v1/Compliance/Inform/AccessPerson/Email/{type} | Compliance/Inform | Sends Email sand generates access person documents based on the list of users provided |
| PUT | /v1/Compliance/Inform/AccessPerson/MergeProfilesInDatabase | Compliance/Inform | Run Trade Rules |
| POST | /v1/Compliance/Inform/AccessPerson/NewInformAccountsEmail | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/AccessPerson/V2/Holdings | Compliance/Inform | Returns a list of the holdings for the access person |
| GET | /v1/Compliance/Inform/AccessPerson/V2/Trades | Compliance/Inform | Returns a combined list of Pre-Clearance and Transactions |
| GET | /v1/Compliance/Inform/AccessPerson/V2/Transactions | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/AccessPerson/V2/Users/{accessPersonId} | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/AccessPersons/{type} | Compliance/Inform | Returns a list of access person records based on the type |
| GET | /v1/Compliance/Inform/AccessPersons/Alert | Compliance/Inform | Returns count of all new access person or access persons who's active status does not match |
| GET | /v1/Compliance/Inform/AccessPersons/ByDepartment/{id} | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/AccessPersons/ByLocation/{id} | Compliance/Inform |  |
| POST | /v1/Compliance/Inform/Affirmation | Compliance/Inform | Create Affirmation Record |
| PUT | /v1/Compliance/Inform/Affirmation | Compliance/Inform | Update Affirmation Record |
| GET | /v1/Compliance/Inform/Affirmation/Responses | Compliance/Inform | Returns a list of all affirmation responses |
| GET | /v1/Compliance/Inform/Affirmations | Compliance/Inform | Returns a list of all affirmation types |
| DELETE | /v1/Compliance/Inform/Affirmations/{key} | Compliance/Inform | Delete Affirmation |
| PUT | /v1/Compliance/Inform/Affirmations/{key}/{status} | Compliance/Inform | Updates updates active status on Affirmations |
| GET | /v1/Compliance/Inform/AssetClass/{productId} | Compliance/Inform | Returns asset class for a product id |
| GET | /v1/Compliance/Inform/BrokerageAccount/{key} | Compliance/Inform | Gets the accounts. |
| GET | /v1/Compliance/Inform/BrokerageAccount/{key}/V2 | Compliance/Inform | Gets the accounts. |
| GET | /v1/Compliance/Inform/BrokerageAccount/CanBeReactivated/{key} | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/BrokerageAccounts | Compliance/Inform | Gets the accounts. |
| POST | /v1/Compliance/Inform/BrokerageAccounts | Compliance/Inform | Adds the account not linked to Quovo |
| PUT | /v1/Compliance/Inform/BrokerageAccounts | Compliance/Inform | Updates brokerage account details |
| PUT | /v1/Compliance/Inform/BrokerageAccounts/{key}/AccountNumberUpdate | Compliance/Inform | Update the Account Number for a Brokerage Account |
| GET | /v1/Compliance/Inform/BrokerageAccounts/{key}/Attachments | Compliance/Inform | Get Attachments for a Brokerage Account |
| POST | /v1/Compliance/Inform/BrokerageAccounts/{key}/Attachments | Compliance/Inform | Adds the account. |
| GET | /v1/Compliance/Inform/BrokerageAccounts/Alert | Compliance/Inform | Gets the accounts. |
| GET | /v1/Compliance/Inform/BrokerageAccounts/Attachment/Download/{key} | Compliance/Inform | Download a single Policy File |
| PUT | /v1/Compliance/Inform/BrokerageAccounts/DeactivateByAll | Compliance/Inform | Used to deactivate brokerage accounts from Inform and ByAll |
| GET | /v1/Compliance/Inform/BrokerageAccounts/DownloadAllAttachments | Compliance/Inform | Download All Attachments for all Brokerage Accounts |
| PUT | /v1/Compliance/Inform/BrokerageAccounts/ElectraSetup | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/BrokerageAccounts/StaleHoldings | Compliance/Inform | Gets the accounts with stale holdings. |
| GET | /v1/Compliance/Inform/BrokerageAccounts/StaleHoldings/Alert | Compliance/Inform | Gets the count for accounts with stale holdings. |
| PUT | /v1/Compliance/Inform/BrokerageAccounts/Status/{status} | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/BrokerageAccounts/V2 | Compliance/Inform | Gets the accounts. |
| POST | /v1/Compliance/Inform/ByAll/AccountDiscovery/ClaimCheck | Compliance/Inform | Use to call the Off Hour Investor clean up process from this database |
| POST | /v1/Compliance/Inform/ByAll/Discovery/ForAllUsers | Compliance/Inform | Use to call the Off Hour Account Discovery process for this database |
| POST | /v1/Compliance/Inform/ByAll/DiscoveryAndAdd/ForAllUsers | Compliance/Inform | Use to call the Discovery And Add For All Users For clean up |
| POST | /v1/Compliance/Inform/ByAll/Investor/CleanUp | Compliance/Inform | Use to call the Off Hour Investor clean up process from this database |
| GET | /v1/Compliance/Inform/ByAllSSOToken | Compliance/Inform | Get the SSO Token if advisor creds or investor creds do not exist it will create them |
| GET | /v1/Compliance/Inform/CanDistribute/{templateId} | Compliance/Inform | Returns a list of all affirmation types |
| POST | /v1/Compliance/Inform/Connection | Compliance/Inform | Creates the connection asynchronous. |
| PUT | /v1/Compliance/Inform/Connection/{connectionId} | Compliance/Inform | Updates the connection asynchronous. |
| GET | /v1/Compliance/Inform/Connection/InformUser | Compliance/Inform |  |
| POST | /v1/Compliance/Inform/Connection/V2/Manual | Compliance/Inform | Creates the connection. |
| POST | /v1/Compliance/Inform/Connection/V2/Orion | Compliance/Inform | Creates the user and connection for OC Accounts - Current User ONLY |
| PUT | /v1/Compliance/Inform/Connection/V2/Quovo/ConnectionStatus/{connectionId} | Compliance/Inform | Updates the connection status asynchronous. |
| GET | /v1/Compliance/Inform/Connections/AccessPerson/{key} | Compliance/Inform | Get connections for the compliance user |
| GET | /v1/Compliance/Inform/Connections/CurrentUser | Compliance/Inform | Gets the connections. |
| PUT | /v1/Compliance/Inform/Connections/Disable | Compliance/Inform | Updates the connections for removal asynchronous. |
| GET | /v1/Compliance/Inform/Connections/DiscoverByAllAccounts | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/Connections/LinkToByAllConnections | Compliance/Inform | This needs tyo be removed |
| GET | /v1/Compliance/Inform/Connections/V2/Broken | Compliance/Inform | Get broken connections details for the compliance user |
| GET | /v1/Compliance/Inform/Connections/V2/Broken/AccessPerson/{key} | Compliance/Inform | Get broken connections details for the compliance user by access person id |
| GET | /v1/Compliance/Inform/Connections/V2/Broken/Alert | Compliance/Inform | Get broken connections: either all or for user |
| GET | /v1/Compliance/Inform/Connections/V2/ConnectionSources | Compliance/Inform | Gets the inform connection sources. |
| GET | /v1/Compliance/Inform/Dashboard/Preclearances/V2 | Compliance/Inform |  |
| POST | /v1/Compliance/Inform/Deactivation | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/Departments | Compliance/Inform | Returns a list of all departments documents |
| POST | /v1/Compliance/Inform/Departments | Compliance/Inform | Returns a list of all departments documents |
| PUT | /v1/Compliance/Inform/Departments | Compliance/Inform | Returns a list of all departments documents |
| DELETE | /v1/Compliance/Inform/Distribute/{templateId} | Compliance/Inform | Updates the distributed template documents. |
| POST | /v1/Compliance/Inform/Distribute/{templateId}/{dueDate} | Compliance/Inform | Sends Email sand generates access person documents based on the list of users provided Access persons that have already received the questionnaire will be removed from the list |
| PUT | /v1/Compliance/Inform/Distribute/UpdateDueDate/{templateId}/{dueDate} | Compliance/Inform | Update due date for distributed documents that are have an open status |
| POST | /v1/Compliance/Inform/Document | Compliance/Inform | create new document |
| PUT | /v1/Compliance/Inform/Document/{id} | Compliance/Inform | updates document |
| GET | /v1/Compliance/Inform/Document/{key} | Compliance/Inform | Gets the document. |
| POST | /v1/Compliance/Inform/Document/{key}/Attachments | Compliance/Inform | creates documents |
| GET | /v1/Compliance/Inform/Document/Attachment/Download/{key} | Compliance/Inform | download document attachment |
| GET | /v1/Compliance/Inform/Document/EmptyTaskDocument/{templateKey} | Compliance/Inform | Gets the document. |
| POST | /v1/Compliance/Inform/Document/Reminders | Compliance/Inform | sends questionnaire reminder emails |
| PUT | /v1/Compliance/Inform/Document/Status | Compliance/Inform |  |
| DELETE | /v1/Compliance/Inform/Documents/{key} | Compliance/Inform | Delete Document |
| GET | /v1/Compliance/Inform/Documents/{templateId} | Compliance/Inform | Returns a list of all documents for a given template id Used for Compass Inform Admin App |
| GET | /v1/Compliance/Inform/Documents/{templateId}/{cacheKey} | Compliance/Inform | Retrieve the previously generated slick grid result for documents. |
| GET | /v1/Compliance/Inform/Documents/AccessPerson/{key} | Compliance/Inform | Returns all custom tasks and questionnaires for a given access person |
| GET | /v1/Compliance/Inform/Documents/Alert | Compliance/Inform | Returns all documents that have an  AlertStatus for Compliance User or OpenStatus for Access Person |
| GET | /v1/Compliance/Inform/Documents/MyDocuments | Compliance/Inform | Returns a list of all documents for the logged in user |
| GET | /v1/Compliance/Inform/Documents/MyTasks | Compliance/Inform | Returns a list of all documents for the logged in user |
| PUT | /v1/Compliance/Inform/Documents/Status/{status} | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/HistoricalDocuments | Compliance/Inform | Returns a list of all historical documents |
| POST | /v1/Compliance/Inform/HistoricalDocuments | Compliance/Inform | Creates new historical document |
| DELETE | /v1/Compliance/Inform/HistoricalDocuments/{key} | Compliance/Inform | Delete Historical Document |
| PUT | /v1/Compliance/Inform/HistoricalDocuments/{key} | Compliance/Inform | Updates historical document by ID |
| GET | /v1/Compliance/Inform/HistoricalDocuments/AccessPerson | Compliance/Inform | Returns a list of all historical documents for current user |
| GET | /v1/Compliance/Inform/HistoricalDocuments/AccessPerson/{accessPersonId} | Compliance/Inform | Returns a list of all historical documents by access person ID |
| GET | /v1/Compliance/Inform/HistoricalDocuments/Download/HistoricalDocuments/{historicalDocumentId} | Compliance/Inform | Download a single Policy File by policyid |
| GET | /v1/Compliance/Inform/License | Compliance/Inform | Returns list of Inform licenses |
| POST | /v1/Compliance/Inform/License | Compliance/Inform | Creates new License record |
| PUT | /v1/Compliance/Inform/License | Compliance/Inform | Updates all the licenses, but does not allow additions. Use Post method to create. |
| GET | /v1/Compliance/Inform/License/{key}/AccessPersons | Compliance/Inform | Returns License and Access Person infrom mation <param name="key">Access Person list with the given license id</param> |
| GET | /v1/Compliance/Inform/License/AccessPersons | Compliance/Inform | Returns License and Access Person infrom mation |
| GET | /v1/Compliance/Inform/License/Simple | Compliance/Inform | Returns list of Inform licenses |
| GET | /v1/Compliance/Inform/License/Summary | Compliance/Inform | Returns list of Inform licenses |
| GET | /v1/Compliance/Inform/MonitoredProductsHistory | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/Office/AllEmployees | Compliance/Inform | Returns list of all active access persons. |
| GET | /v1/Compliance/Inform/Office/Locations | Compliance/Inform |  |
| POST | /v1/Compliance/Inform/Office/Locations | Compliance/Inform | Creates the location. |
| PUT | /v1/Compliance/Inform/Office/Locations/{id} | Compliance/Inform | Updates the location asynchronous. |
| GET | /v1/Compliance/Inform/Policy | Compliance/Inform | Returns a list of all Policies With the current document |
| POST | /v1/Compliance/Inform/Policy | Compliance/Inform | Updates meta data about the document |
| PUT | /v1/Compliance/Inform/Policy | Compliance/Inform | Updates meta data about the document |
| DELETE | /v1/Compliance/Inform/Policy/{key} | Compliance/Inform | Delete Library Item |
| GET | /v1/Compliance/Inform/Policy/{key} | Compliance/Inform | Returns single Policy for key provided |
| PUT | /v1/Compliance/Inform/Policy/{key} | Compliance/Inform | Updates updates active and visibility status on policies |
| GET | /v1/Compliance/Inform/Policy/Download/{key} | Compliance/Inform | Download a single Policy File |
| GET | /v1/Compliance/Inform/Policy/Download/Policy/{policyId} | Compliance/Inform | Download a single Policy File by policyid |
| POST | /v1/Compliance/Inform/Preclearance | Compliance/Inform | Creates the pre-clearance for the access person user |
| GET | /v1/Compliance/Inform/Preclearance/{id} | Compliance/Inform | Gets the Pre-Clearance by ID |
| PUT | /v1/Compliance/Inform/Preclearance/{id} | Compliance/Inform | Update pre-clearance |
| GET | /v1/Compliance/Inform/Preclearance/{id}/V2 | Compliance/Inform | Gets the Pre-Clearance by ID |
| GET | /v1/Compliance/Inform/Preclearances | Compliance/Inform | Returns a list of Pre-Clearances |
| GET | /v1/Compliance/Inform/Preclearances/AccessPerson/{key} | Compliance/Inform | Returns the last 100 pre-clearance requests for the given access person |
| GET | /v1/Compliance/Inform/Preclearances/Alert | Compliance/Inform | Gets Pre-Clearances Alerts |
| GET | /v1/Compliance/Inform/Preclearances/Simple | Compliance/Inform | Returns simple pre-clearance list for ids provided |
| PUT | /v1/Compliance/Inform/Preclearances/Status/{status} | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/Preclearances/V2 | Compliance/Inform | Returns a list of Pre-Clearances |
| GET | /v1/Compliance/Inform/Preclearances/V2/AccessPerson/{key} | Compliance/Inform | Returns the last 100 pre-clearance requests for the given access person |
| GET | /v1/Compliance/Inform/Rules | Compliance/Inform | Returns rules for the database |
| PUT | /v1/Compliance/Inform/Rules | Compliance/Inform | Update Rule |
| POST | /v1/Compliance/Inform/Rules/Run | Compliance/Inform | Run Trade Rules |
| POST | /v1/Compliance/Inform/Rules/RunPrepareInformRecon/{alClientId}/{downloadFormatId} | Compliance/Inform |  |
| POST | /v1/Compliance/Inform/Template | Compliance/Inform | Returns a template by key |
| PUT | /v1/Compliance/Inform/Template | Compliance/Inform | Returns a template by key |
| DELETE | /v1/Compliance/Inform/Template/{key} | Compliance/Inform | Delete Template |
| GET | /v1/Compliance/Inform/Template/{key} | Compliance/Inform | Returns a template by key |
| PUT | /v1/Compliance/Inform/Template/{key}/{isActive} | Compliance/Inform | Updates active status of template |
| GET | /v1/Compliance/Inform/Template/{key}/DownloadAllAttachments | Compliance/Inform | Download All Attachments for the Template |
| GET | /v1/Compliance/Inform/Template/Clone/{key} | Compliance/Inform | Returns a template by key |
| GET | /v1/Compliance/Inform/Template/EmptyTemplate | Compliance/Inform | Gets all simple question types. |
| GET | /v1/Compliance/Inform/Template/EmptyTemplateQuestion | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/Template/QuestionTypes/Simple | Compliance/Inform | Gets all simple question types. |
| GET | /v1/Compliance/Inform/Templates/Questionnaire | Compliance/Inform | Returns Questionnaires for slick grid |
| GET | /v1/Compliance/Inform/Templates/Task | Compliance/Inform | Returns Tasks for Access Person to choose from |
| PUT | /v1/Compliance/Inform/TradeViolation | Compliance/Inform | Create Trade Violation status record |
| GET | /v1/Compliance/Inform/TradeViolation/{tradeViolationId} | Compliance/Inform | Returns exception by Id |
| GET | /v1/Compliance/Inform/TradeViolation/{tradeViolationId}/V2 | Compliance/Inform | Returns exception by Id |
| GET | /v1/Compliance/Inform/TradeViolation/Alert | Compliance/Inform | Returns a list of rules |
| GET | /v1/Compliance/Inform/TradeViolation/LinkedTransactions/{tradeViolationId} | Compliance/Inform |  |
| PUT | /v1/Compliance/Inform/TradeViolation/MassUpdate | Compliance/Inform | Create Trade Violation status record |
| GET | /v1/Compliance/Inform/TradeViolations/V2 | Compliance/Inform | Returns a list of exceptions |
| GET | /v1/Compliance/Inform/TradeViolations/V2/AccessPerson/{key} | Compliance/Inform | Returns a list of trade violations for access person |
| POST | /v1/Compliance/Inform/ValidateImport/ProductMonitoring | Compliance/Inform |  |
| PUT | /v1/Compliance/Inform/ValidateImport/ProductMonitoring/Import | Compliance/Inform | Imports the monitored products. |
| GET | /v1/Compliance/Inform/ValidateImport/ProductMonitoring/Templates/Csv | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/ValidateImport/ProductMonitoring/Templates/Xls | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/ValidateImport/ProductMonitoring/Templates/Xlsx | Compliance/Inform |  |
| POST | /v1/Compliance/Inform/ValidateImport/Questionnaire | Compliance/Inform |  |
| PUT | /v1/Compliance/Inform/ValidateImport/Questionnaire/Import | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/ValidateImport/Questionnaire/Templates/Csv | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/ValidateImport/Questionnaire/Templates/Xls | Compliance/Inform |  |
| GET | /v1/Compliance/Inform/ValidateImport/Questionnaire/Templates/Xlsx | Compliance/Inform |  |
| PUT | /v1/Compliance/InformEmail/Template/{key} | Compliance/InformEmail | Endpoint to update custom values on template |
| GET | /v1/Compliance/InformEmail/Templates | Compliance/InformEmail | Endpoint to return list of Inform Email Templates |
| POST | /v1/Compliance/InformEmail/TestEmail | Compliance/InformEmail | Endpoint to send test email |
| GET | /v1/Compliance/RiskDashboard/AccountAlerts | Compliance/RiskDashboard | Returns risk dashboard account alerts |
| GET | /v1/Compliance/RiskDashboard/NonRegisteredStatesTile | Compliance/RiskDashboard | Returns risk dashboard non-registered states tile information |
| GET | /v1/Compliance/RiskDashboard/OutOfTolerance/{daysOut} | Compliance/RiskDashboard |  |
| GET | /v1/Compliance/RiskDashboard/OutOfToleranceDays | Compliance/RiskDashboard | Returns risk dashboard settings |
| GET | /v1/Compliance/RiskDashboard/RiskTiles | Compliance/RiskDashboard | Returns list of data to populate risk/suitability tiles |
| GET | /v1/Compliance/RiskDashboard/Settings | Compliance/RiskDashboard | Returns risk dashboard settings |
| PUT | /v1/Compliance/RiskDashboard/Settings | Compliance/RiskDashboard | Returns risk dashboard settings |
| GET | /v1/Configuration/{configuration} | Configuration/{configuration} |  |
| GET | /v1/Configuration/raw/{configuration} | Configuration/raw |  |
| GET | /v1/Confirm/ABCompare | Confirm/ABCompare | Gets the differences in AB format comparison for a specified date range. And optionally filter by signed off status. |
| PUT | /v1/Confirm/ABCompare | Confirm/ABCompare |  |
| POST | /v1/Confirm/AccountRestore/Simple | Confirm/AccountRestore | Returns a list data for account restores based on account numbers |
| GET | /v1/Confirm/AccountRestoreBatch | Confirm/AccountRestoreBatch | Gets the list of Account Restore Batches |
| POST | /v1/Confirm/AccountRestoreBatch | Confirm/AccountRestoreBatch | Creates an Account Restore batch |
| GET | /v1/Confirm/AccountRestoreBatch/{accountRestoreId} | Confirm/AccountRestoreBatch | Returns a list of Account Restore Details for a given restore id |
| PUT | /v1/Confirm/AccountRestoreBatch/Action/Retry/{accountRestoreId} | Confirm/AccountRestoreBatch | Resets the status of the Restore Batch to New to be reprocessed |
| GET | /v1/Confirm/Alternative/AssetValuation | Confirm/Alternative | Get all Asset Valuation |
| PUT | /v1/Confirm/Alternative/AssetValuation | Confirm/Alternative | Simple dto update |
| DELETE | /v1/Confirm/Alternative/AssetValuation/{assetId}/{asOfDate} | Confirm/Alternative | Used to delete an existing asset valuation. Upon successful deletion a 204 will be returned. |
| PUT | /v1/Confirm/Alternative/AssetValuation/{assetId}/{asOfDate} | Confirm/Alternative | Simple dto update |
| PUT | /v1/Confirm/Alternative/AssetValuation/Action/Delete | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/CommitmentLedger | Confirm/Alternative | Get all Commitmen tLedger |
| GET | /v1/Confirm/Alternative/CommitmentLedger/{key} | Confirm/Alternative | Gets the Commitment Ledger that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/Alternative/Equity/ActivityTypes | Confirm/Alternative | Get all Asset Valuation |
| GET | /v1/Confirm/Alternative/Equity/FundingTypes | Confirm/Alternative | Get all Asset Valuation |
| GET | /v1/Confirm/Alternative/Equity/ValuationStatuses | Confirm/Alternative | Gets all valuation statuses |
| GET | /v1/Confirm/Alternative/ExpectedReturn | Confirm/Alternative | Get all ExpectedReturn |
| POST | /v1/Confirm/Alternative/ExpectedReturn | Confirm/Alternative | Adds a new ExpectedReturn to the database. |
| GET | /v1/Confirm/Alternative/ExpectedReturn/Products/{productKey} | Confirm/Alternative | Get all ExpectedReturn |
| GET | /v1/Confirm/Alternative/ExpectedReturn/Products/{productKey}/DateStart/{startDate} | Confirm/Alternative | Gets the ExpectedReturn that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/Alternative/ExpectedReturn/Products/{productKey}/DateStart/{startDate} | Confirm/Alternative | Updates the ExpectedReturn that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/Alternative/InvestmentPlatform/AssetHistory/{assetId} | Confirm/Alternative | Gets Asset Transaction History and Valuation History. |
| GET | /v1/Confirm/Alternative/ProductTransaction | Confirm/Alternative | Get all Product Transaction |
| POST | /v1/Confirm/Alternative/ProductTransaction | Confirm/Alternative | Adds a new Product Transaction to the database. |
| DELETE | /v1/Confirm/Alternative/ProductTransaction/{key} | Confirm/Alternative | Used to delete an existing Product Transaction. Upon successful deletion a 204 will be returned. |
| GET | /v1/Confirm/Alternative/ProductTransaction/{key} | Confirm/Alternative | Gets the Product Transaction that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/Alternative/ProductTransaction/{key} | Confirm/Alternative | Updates the Product Transaction that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/Alternative/ProductTransaction/TransactionPreview | Confirm/Alternative | Get a Preview of Transaction changes |
| GET | /v1/Confirm/Alternative/ProductValuation | Confirm/Alternative | Get all Product Valuation |
| POST | /v1/Confirm/Alternative/ProductValuation | Confirm/Alternative | Adds a new Product Valuation to the database. |
| DELETE | /v1/Confirm/Alternative/ProductValuation/{key} | Confirm/Alternative | Used to delete an existing Product Valuation. Upon successful deletion a 204 will be returned. |
| GET | /v1/Confirm/Alternative/ProductValuation/{key} | Confirm/Alternative | Gets the Product Valuation that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/Alternative/ProductValuation/{key} | Confirm/Alternative | Updates the Product Valuation that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/Alternative/ProductValuation/ValuationPreview | Confirm/Alternative | Get a Preview of Valuation changes |
| POST | /v1/Confirm/Alternative/ValidateImport/Assets | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/ValidateImport/Assets/Templates/Csv | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/ValidateImport/Assets/Templates/Xls | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/ValidateImport/Assets/Templates/Xlsx | Confirm/Alternative |  |
| POST | /v1/Confirm/Alternative/ValidateImport/AssetValuation | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/ValidateImport/AssetValuation/Templates/Csv | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/ValidateImport/AssetValuation/Templates/Xls | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/ValidateImport/AssetValuation/Templates/Xlsx | Confirm/Alternative |  |
| POST | /v1/Confirm/Alternative/ValidateImport/AssetValuation/Update | Confirm/Alternative |  |
| POST | /v1/Confirm/Alternative/ValidateImport/Transactions | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/ValidateImport/Transactions/Templates/Csv | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/ValidateImport/Transactions/Templates/Xls | Confirm/Alternative |  |
| GET | /v1/Confirm/Alternative/ValidateImport/Transactions/Templates/Xlsx | Confirm/Alternative |  |
| GET | /v1/Confirm/CorporateAction/Processing | Confirm/CorporateAction | Get all Corporate Action Processes The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Confirm/CorporateAction/Processing | Confirm/CorporateAction | Adds a new Corporate Action Extension to the database. |
| DELETE | /v1/Confirm/CorporateAction/Processing/{key} | Confirm/CorporateAction | Deletes the CorpActionProcessing record. If the record ProcessStatus is not new or the record is associated to Task Queue Records a 403 will be thrown. |
| GET | /v1/Confirm/CorporateAction/Processing/{key} | Confirm/CorporateAction | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/CorporateAction/Processing/{key} | Confirm/CorporateAction | TO BE REMOVED Updates the desired CorpActionProcessing record.  If the passed key and CorpActionProcessing ID do not match, a 400 will be thrown. |
| PUT | /v1/Confirm/CorporateAction/Processing/{key}/Action/ProcessTask | Confirm/CorporateAction | Perform a Corporate Action task |
| GET | /v1/Confirm/CorporateAction/Processing/Detail | Confirm/CorporateAction | Get all Corporate Action Processes, including Corporate Action Details The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| PUT | /v1/Confirm/CorporateAction/Processing/Detail/{key} | Confirm/CorporateAction | Updates the desired CorpActionProcessing record.  Returns the Corporate Action Processing with Details If the passed key and CorpActionProcessing ID do not match, a 400 will be thrown. |
| GET | /v1/Confirm/CorporateAction/Processing/Status | Confirm/CorporateAction | Checks task status of each database |
| GET | /v1/Confirm/CorporateAction/Processing/Status/Counts | Confirm/CorporateAction | Returns a count of all Complete, Pending, Skipped Processing Tasks. |
| GET | /v1/Confirm/CorporateAction/ProcessingType | Confirm/CorporateAction | Get all Corporate Action Processing Types The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Confirm/CorporateAction/ProcessingType | Confirm/CorporateAction | This endpoint has been deprecated.  It previously added a new Corporate Action Processing Type to the database. Due to the need to update database processes to process new corporate action processing types, these have to be added to the database via script. |
| GET | /v1/Confirm/CorporateAction/ProcessingType/{key} | Confirm/CorporateAction | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/CorporateAction/ProcessingType/{key} | Confirm/CorporateAction | This endpoint has been deprecated.  It previously updated the Corporate Action Extension that has the provided key. Due to the need to update database processes to process new corporate action processing types, these have to be updated via script. |
| GET | /v1/Confirm/CorporateAction/TaskQueueSkipped | Confirm/CorporateAction | Get all Corporate Action Task Queue Skipped The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Confirm/CorporateAction/TaskQueueSkipped | Confirm/CorporateAction | Adds a new Corporate Action Task Queue Skipped record to the database. |
| GET | /v1/Confirm/CorporateAction/TaskQueueSkipped/{key} | Confirm/CorporateAction | Get Corporate Action Task Queue Skipped by key |
| PUT | /v1/Confirm/CorporateAction/TaskQueueSkipped/{key} | Confirm/CorporateAction | Updates a Corporate Action Task Queue Skipped record |
| GET | /v1/Confirm/CorporateAction/Transactions/V2 | Confirm/CorporateAction |  |
| GET | /v1/Confirm/CustomImportFiles | Confirm/CustomImportFiles | Gets a list of custom import files that the logged in user has access to. |
| GET | /v1/Confirm/CustomImportFiles/{key} | Confirm/CustomImportFiles | Gets the custom import file that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/CustomImportFiles/History | Confirm/CustomImportFiles | Gets a list of custom import files that the logged in user has access to that are historic and were created within the last month. |
| GET | /v1/Confirm/CustomImportFiles/Processing | Confirm/CustomImportFiles | Gets a list of custom import files that the logged in user has access to that are being processed. |
| GET | /v1/Confirm/CustomImports | Confirm/CustomImports | Gets a list of custom imports that the logged in user has access to. |
| GET | /v1/Confirm/CustomImports/{key} | Confirm/CustomImports | Gets the custom import that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/DatabaseBackupFileRestore | Confirm/DatabaseBackupFileRestore |  |
| POST | /v1/Confirm/DatabaseBackupFileRestore | Confirm/DatabaseBackupFileRestore |  |
| GET | /v1/Confirm/DataQueryEntityExcludes | Confirm/DataQueryEntityExcludes | Gets a list of Data Query Entity Excludes that the logged in user has access to. |
| POST | /v1/Confirm/DataQueryEntityExcludes | Confirm/DataQueryEntityExcludes | Used to create a new Data Query Entity Exclude. Upon successful creation the created data is returned. |
| DELETE | /v1/Confirm/DataQueryEntityExcludes/{key} | Confirm/DataQueryEntityExcludes | Deletes Data Query Entity Exclude provided in the key. |
| GET | /v1/Confirm/DataQueryEntityExcludes/{key} | Confirm/DataQueryEntityExcludes | Gets the Data Query Entity Excludes that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/DataQueryEntityExcludes/{key} | Confirm/DataQueryEntityExcludes | Used to update an existing Data Query Entity Excludes. Upon successful modification a 200 will be returned. |
| PUT | /v1/Confirm/DataQueryEntityExcludes/Action/Delete | Confirm/DataQueryEntityExcludes |  |
| GET | /v1/Confirm/DownloadFiles | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFiles/{downloadFileId}/Details | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/{downloadFileId}/Details | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/{key} | Confirm/DownloadFiles | Gets the download file detail record for the download file with the provided key. |
| PUT | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/{key} | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/Action/FindReplace | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/Action/NewUndo | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/Action/Prefix | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/Action/Proper | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/Action/Undo | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/Action/VerifyApply | Confirm/DownloadFiles |  |
| POST | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/List | Confirm/DownloadFiles | Gets the download file detail records for the download file with the provided keys. |
| POST | /v1/Confirm/DownloadFiles/{downloadFileId}/Details/List/Id | Confirm/DownloadFiles | Gets the download file detail records for the download file with the provided keys. |
| GET | /v1/Confirm/DownloadFiles/{downloadFileId}/Download | Confirm/DownloadFiles | Used download the raw file for the download file specified. |
| GET | /v1/Confirm/DownloadFiles/{key} | Confirm/DownloadFiles | Gets the download file that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Confirm/DownloadFiles/{key}/Positions/Import | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/Action/ConfirmDetails | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFiles/Action/Download/{sessionId} | Confirm/DownloadFiles |  |
| POST | /v1/Confirm/DownloadFiles/Action/DownloadFiles | Confirm/DownloadFiles | Downloads zip file with the set of files selected. |
| POST | /v1/Confirm/DownloadFiles/Action/DownloadMany | Confirm/DownloadFiles | Downloads several confirmation files across one or more advisor databases |
| GET | /v1/Confirm/DownloadFiles/Action/DownloadTestFiles | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/Action/ExcludeDetails | Confirm/DownloadFiles |  |
| POST | /v1/Confirm/DownloadFiles/Action/ImportFile | Confirm/DownloadFiles | Import file |
| POST | /v1/Confirm/DownloadFiles/Action/ImportFiles | Confirm/DownloadFiles | Import file |
| POST | /v1/Confirm/DownloadFiles/Action/ImportFilesByDownloadSources | Confirm/DownloadFiles | Imports the files by download sources asynchronous. |
| PUT | /v1/Confirm/DownloadFiles/Action/ResetPositionFile/{downloadFileId} | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFiles/Details | Confirm/DownloadFiles |  |
| POST | /v1/Confirm/DownloadFiles/Details | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFiles/Details/Records | Confirm/DownloadFiles | Get Download Records By FileId, RecordId, And RecordType |
| DELETE | /v1/Confirm/DownloadFiles/ExclusionReason | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFiles/ExclusionReason | Confirm/DownloadFiles |  |
| POST | /v1/Confirm/DownloadFiles/ExclusionReason | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFiles/FileImports | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFiles/FileImports/Counts | Confirm/DownloadFiles |  |
| POST | /v1/Confirm/DownloadFiles/Positions/CreateTrans | Confirm/DownloadFiles |  |
| POST | /v1/Confirm/DownloadFiles/Positions/Transactions | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/RecordType/{recordType}/Details | Confirm/DownloadFiles |  |
| POST | /v1/Confirm/DownloadFiles/RecordType/{recordType}/Details/List | Confirm/DownloadFiles | Gets the download file detail records for the provided keys of the given record type. |
| GET | /v1/Confirm/DownloadFiles/Simple | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFiles/SleeveColumnData | Confirm/DownloadFiles |  |
| PUT | /v1/Confirm/DownloadFiles/SleeveColumnData | Confirm/DownloadFiles |  |
| POST | /v1/Confirm/DownloadFiles/SleeveData | Confirm/DownloadFiles |  |
| GET | /v1/Confirm/DownloadFormat/DownloadSubFormatSchedulerDefault/{formatId} | Confirm/DownloadFormat | Gets the Download Format Source Default that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Confirm/DownloadFormat/DownloadSubFormatSchedulerDefault/BulkUpdate | Confirm/DownloadFormat | Updates all Scheduler Default SubFormats |
| POST | /v1/Confirm/DownloadFormat/DownloadSubFormatSchedulerDefault/DeleteCostBasisRows | Confirm/DownloadFormat | Deletes rows from DownloadSubFormatSchedulerDefaults based on the input parameters which must be cost basis rows |
| GET | /v1/Confirm/DownloadFormats | Confirm/DownloadFormats | Gets a list of Download Formats that the logged in user has access to. |
| POST | /v1/Confirm/DownloadFormats | Confirm/DownloadFormats | Creates a new Download Format. |
| GET | /v1/Confirm/DownloadFormats/{key} | Confirm/DownloadFormats | Gets the Download Format that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/DownloadFormats/{key} | Confirm/DownloadFormats |  |
| GET | /v1/Confirm/DownloadFormats/{key}/Markup | Confirm/DownloadFormats | Gets the XML from the Download Format that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/DownloadFormats/{key}/Markup | Confirm/DownloadFormats | Used to update an existing Download Format's XML. Upon successful modification a 200 will be returned. |
| PUT | /v1/Confirm/DownloadFormats/{key}/Rectype | Confirm/DownloadFormats | Updates the rectype asynchronous. |
| PUT | /v1/Confirm/DownloadFormats/{key}/Rectype/{versionCode} | Confirm/DownloadFormats | Updates the rectype asynchronous. |
| GET | /v1/Confirm/DownloadFormats/{key}/SubTypesSimple | Confirm/DownloadFormats | Gets a list of download format sub types by format key asynchronous. |
| GET | /v1/Confirm/DownloadFormats/{key}/SubTypesSimpleWithDefault | Confirm/DownloadFormats | Gets a list of download format sub types by format key asynchronous including the default 0 value |
| GET | /v1/Confirm/DownloadFormats/Simple | Confirm/DownloadFormats |  |
| GET | /v1/Confirm/DownloadFormats/Verbose | Confirm/DownloadFormats |  |
| GET | /v1/Confirm/DownloadFormats/Verbose/{key} | Confirm/DownloadFormats |  |
| PUT | /v1/Confirm/DownloadFormats/Verbose/{key} | Confirm/DownloadFormats |  |
| GET | /v1/Confirm/DownloadFormatSourceDefault | Confirm/DownloadFormatSourceDefault | Gets a list of Download Format Source Default that the logged in user has access to. |
| POST | /v1/Confirm/DownloadFormatSourceDefault | Confirm/DownloadFormatSourceDefault | Insert Download Format Source Default |
| GET | /v1/Confirm/DownloadFormatSourceDefault/{key} | Confirm/DownloadFormatSourceDefault | Gets the Download Format Source Default that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/DownloadFormatSourceDefault/{key} | Confirm/DownloadFormatSourceDefault | Update Download Format Source Default |
| PUT | /v1/Confirm/DownloadFormatSourceDefault/{key}/{subtypeId} | Confirm/DownloadFormatSourceDefault | Update Download Format Source Default |
| PUT | /v1/Confirm/DownloadFormatSourceDefault/BulkUpdate | Confirm/DownloadFormatSourceDefault |  |
| POST | /v1/Confirm/DownloadFormatSourceDefault/KeyFile/{key} | Confirm/DownloadFormatSourceDefault | Adds the SFTP key file. |
| POST | /v1/Confirm/DownloadFormatSourceDefault/KeyFile/{key}/{subtypeId} | Confirm/DownloadFormatSourceDefault | Adds the SFTP key file. |
| GET | /v1/Confirm/DownloadFormatSourceDefault/Subtypes/{formatId} | Confirm/DownloadFormatSourceDefault | Gets the download format source defaults by format. |
| GET | /v1/Confirm/DownloadFormatVersion/{formatId} | Confirm/DownloadFormatVersion | Gets a list of Download Formats that the logged in user has access to. |
| GET | /v1/Confirm/DownloadFormatVersion/{formatId}/AlClient | Confirm/DownloadFormatVersion | Get a list of download Format versions set for each alClient |
| POST | /v1/Confirm/DownloadFormatVersion/{formatId}/AlClient | Confirm/DownloadFormatVersion | Save format version for each alClient |
| DELETE | /v1/Confirm/DownloadMap/{key} | Confirm/DownloadMap | Delete a mapping. |
| PUT | /v1/Confirm/DownloadMap/{key} | Confirm/DownloadMap | Update download mapping. |
| GET | /v1/Confirm/DownloadMap/Account/{key} | Confirm/DownloadMap | Get all mappings using the download source of an account. |
| POST | /v1/Confirm/DownloadMap/Account/{key} | Confirm/DownloadMap | Create new mapping based on the download source of the account. |
| GET | /v1/Confirm/DownloadMap/Common | Confirm/DownloadMap |  |
| POST | /v1/Confirm/DownloadMap/Common | Confirm/DownloadMap | Adds a new common download map to the database. |
| DELETE | /v1/Confirm/DownloadMap/Common/{key} | Confirm/DownloadMap | Used to delete an existing common download map. Upon successful deletion a 204 will be returned. |
| GET | /v1/Confirm/DownloadMap/Common/{key} | Confirm/DownloadMap | Gets the common download map that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/DownloadMap/Common/{key} | Confirm/DownloadMap | Updates the common download map that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/DownloadMap/Firm | Confirm/DownloadMap |  |
| POST | /v1/Confirm/DownloadMap/Firm | Confirm/DownloadMap |  |
| PUT | /v1/Confirm/DownloadMap/List | Confirm/DownloadMap | Update a list of mappings |
| GET | /v1/Confirm/DownloadMap/Local | Confirm/DownloadMap | Get all local download maps The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Confirm/DownloadMap/Local | Confirm/DownloadMap | Adds a new local download map to the database. |
| DELETE | /v1/Confirm/DownloadMap/Local/{key} | Confirm/DownloadMap | Used to delete an existing local download map. Upon successful deletion a 204 will be returned. |
| GET | /v1/Confirm/DownloadMap/Local/{key} | Confirm/DownloadMap | Gets the local download map that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/DownloadMap/Local/{key} | Confirm/DownloadMap | Updates the local download map that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/DownloadMap/Tables | Confirm/DownloadMap | Get a list of orion tables used in download mappings. |
| GET | /v1/Confirm/DownloadMap/Tables/{tableName} | Confirm/DownloadMap | Get available options for the specified table |
| GET | /v1/Confirm/DownloadPositionProcess | Confirm/DownloadPositionProcess | Gets all the sleeve rules from tblDownloadSleeveRules. |
| PUT | /v1/Confirm/DownloadPositionProcess/Save | Confirm/DownloadPositionProcess | Saves the sleeve json arrays to userDefinedData. |
| GET | /v1/Confirm/DownloadScrubAutomation | Confirm/DownloadScrubAutomation | Gets all the sleeve rules from tblDownloadSleeveRules. |
| PUT | /v1/Confirm/DownloadScrubAutomation/Save | Confirm/DownloadScrubAutomation | Saves the sleeve json arrays to userDefinedData. |
| GET | /v1/Confirm/DownloadSourceNote | Confirm/DownloadSourceNote | Returns a list of Download Source Notes |
| PUT | /v1/Confirm/DownloadSourceNote/Upsert/{downloadSourceNoteType} | Confirm/DownloadSourceNote | Will either create or update a given download source note depending if one already exists or not |
| GET | /v1/Confirm/DownloadSources | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/{id} | Confirm/DownloadSources |  |
| DELETE | /v1/Confirm/DownloadSources/{key} | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Audit | Confirm/DownloadSources | Retrieves the unencrypted columns from DownloadSourceHistory in order to view them properly for troubleshooting and debugging PIs |
| PUT | /v1/Confirm/DownloadSources/List/Delete | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Properties | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Recon | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Schedules | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Schedules/Logs/Messages | Confirm/DownloadSources |  |
| PUT | /v1/Confirm/DownloadSources/Schedules/RunNow/{key} | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Simple | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Simple/Active | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Verbose | Confirm/DownloadSources |  |
| POST | /v1/Confirm/DownloadSources/Verbose | Confirm/DownloadSources | Create Download Source |
| PUT | /v1/Confirm/DownloadSources/Verbose | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Verbose/{key} | Confirm/DownloadSources |  |
| PUT | /v1/Confirm/DownloadSources/Verbose/{key} | Confirm/DownloadSources |  |
| POST | /v1/Confirm/DownloadSources/Verbose/Duplicate | Confirm/DownloadSources |  |
| POST | /v1/Confirm/DownloadSources/Verbose/KeyFile/{key} | Confirm/DownloadSources | Adds the SFTP key file asynchronous. |
| POST | /v1/Confirm/DownloadSources/Verbose/List | Confirm/DownloadSources |  |
| POST | /v1/Confirm/DownloadSources/Verbose/List/Id | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadSources/Verbose/New | Confirm/DownloadSources |  |
| GET | /v1/Confirm/DownloadTextModification | Confirm/DownloadTextModification |  |
| POST | /v1/Confirm/DownloadTextModification | Confirm/DownloadTextModification | Adds the asynchronous. |
| PUT | /v1/Confirm/DownloadTextModification | Confirm/DownloadTextModification | Updates the asynchronous. |
| GET | /v1/Confirm/DownloadTextModification/ManipulationTypes | Confirm/DownloadTextModification | Gets all but SmartProper, 3. |
| GET | /v1/Confirm/DuplicateAccountMapping | Confirm/DuplicateAccountMapping | Gets All Duplicate Account Mappings in the advisors database |
| POST | /v1/Confirm/DuplicateAccountMapping | Confirm/DuplicateAccountMapping | Upsert Duplicate Account Mappings |
| POST | /v1/Confirm/DuplicateAccountMapping/Delete | Confirm/DuplicateAccountMapping |  |
| GET | /v1/Confirm/Exclusions | Confirm/Exclusions | Gets the specified account number. |
| POST | /v1/Confirm/Exclusions | Confirm/Exclusions | Creates a new confirmgroup record, and returns the new record in the location header. |
| DELETE | /v1/Confirm/Exclusions/{key} | Confirm/Exclusions | Deletes the specified key. |
| GET | /v1/Confirm/Exclusions/{key} | Confirm/Exclusions | Gets the ConfirmGroup that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/Exclusions/{key} | Confirm/Exclusions | Update the exclusion record |
| PUT | /v1/Confirm/Exclusions/Action/AdvisorNotes | Confirm/Exclusions | Update Advisor Notes on the specified exclusion records |
| PUT | /v1/Confirm/Exclusions/Action/Delete | Confirm/Exclusions |  |
| GET | /v1/Confirm/Exclusions/CommonExclusions | Confirm/Exclusions | Gets all common download exclusions. |
| GET | /v1/Confirm/Exclusions/CommonExclusions/{id} | Confirm/Exclusions | Gets all common download exclusions. |
| POST | /v1/Confirm/Exclusions/CommonExclusions/Actions/Create | Confirm/Exclusions | Creates the download exclude common entity asynchronous. |
| PUT | /v1/Confirm/Exclusions/CommonExclusions/Actions/Delete | Confirm/Exclusions |  |
| PUT | /v1/Confirm/Exclusions/CommonExclusions/Actions/Update/{id} | Confirm/Exclusions | Update the exclusion record |
| GET | /v1/Confirm/Exclusions/Current | Confirm/Exclusions | Returns Download Exclusion Records |
| GET | /v1/Confirm/ExclusionSync | Confirm/ExclusionSync | Returns a list of recon job statuses. |
| GET | /v1/Confirm/ExclusionSync/{key} | Confirm/ExclusionSync | Get ExclusionSyncDto Sync by key |
| PUT | /v1/Confirm/ExclusionSync/Action/SignOff | Confirm/ExclusionSync | Sign off ExclusionSync |
| GET | /v1/Confirm/FileExports | Confirm/FileExports |  |
| GET | /v1/Confirm/FileExports/DownloadFile | Confirm/FileExports | Gets the file by identifier. |
| GET | /v1/Confirm/Groups | Confirm/Groups |  |
| POST | /v1/Confirm/Groups | Confirm/Groups | Creates a new confirmgroup record, and returns the new record in the location header. |
| GET | /v1/Confirm/Groups/{confirmGroupKey}/DataQueries | Confirm/Groups |  |
| DELETE | /v1/Confirm/Groups/{confirmGroupKey}/DataQueries/{reportKey} | Confirm/Groups |  |
| GET | /v1/Confirm/Groups/{confirmGroupKey}/DataQueries/{reportKey} | Confirm/Groups |  |
| POST | /v1/Confirm/Groups/{confirmGroupKey}/DataQueries/{reportKey} | Confirm/Groups |  |
| POST | /v1/Confirm/Groups/{confirmGroupKey}/DataQueries/List | Confirm/Groups |  |
| PUT | /v1/Confirm/Groups/{confirmGroupKey}/DataQueries/List | Confirm/Groups |  |
| DELETE | /v1/Confirm/Groups/{key} | Confirm/Groups |  |
| GET | /v1/Confirm/Groups/{key} | Confirm/Groups | Gets the ConfirmGroup that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/Groups/{key} | Confirm/Groups | Updates an existing confirmgroup record. |
| GET | /v1/Confirm/Groups/{key}/Overview | Confirm/Groups |  |
| GET | /v1/Confirm/Groups/{key}/RefreshData | Confirm/Groups |  |
| PUT | /v1/Confirm/Groups/Action/Delete | Confirm/Groups |  |
| POST | /v1/Confirm/Groups/DataQueries/List | Confirm/Groups |  |
| PUT | /v1/Confirm/Groups/DataQueries/List | Confirm/Groups |  |
| POST | /v1/Confirm/Groups/DataQuery | Confirm/Groups | Creates a new confirmgroup record, and returns the new record in the location header. |
| GET | /v1/Confirm/Groups/Simple | Confirm/Groups | Returns a simple Id/Name for all Confirm Group records |
| GET | /v1/Confirm/HeldAway/Accounts | Confirm/HeldAway | Gets Held Away Accounts. |
| GET | /v1/Confirm/HeldAway/Accounts/AssetValueConfirmError | Confirm/HeldAway |  |
| GET | /v1/Confirm/HeldAway/Accounts/Transactions | Confirm/HeldAway |  |
| PUT | /v1/Confirm/HeldAway/Action/AcceptableConfirmError | Confirm/HeldAway | Change Acceptable heldAways value |
| POST | /v1/Confirm/HeldAway/Action/RefreshConfirmErrors | Confirm/HeldAway | Refreshes Confirm error counts for the requested accounts. Limited to no more than 20 accounts at a time |
| POST | /v1/Confirm/HeldAway/Action/UpdateExcludedFromPositionOnly | Confirm/HeldAway |  |
| GET | /v1/Confirm/HeldAway/Assets | Confirm/HeldAway | Gets Held Away Assets. |
| GET | /v1/Confirm/HeldAway/AssetValueConfirmError | Confirm/HeldAway | Gets Held Away asset value changes with asset confirm errors. Account Id or Asset Id is required. |
| GET | /v1/Confirm/HeldAway/AssetValues | Confirm/HeldAway | Gets all asset values. |
| GET | /v1/Confirm/HeldAway/Counts | Confirm/HeldAway | Gets Held Away counts. |
| POST | /v1/Confirm/HeldAway/CreateTransactions | Confirm/HeldAway | Used to create transactions and assets if need. |
| PUT | /v1/Confirm/HeldAway/DownloadTransToTransaction | Confirm/HeldAway | Used to create transaction from the download tran. |
| GET | /v1/Confirm/HeldAway/Transactions | Confirm/HeldAway | Gets Held Away transactions with asset confirm errors. Account Id or Asset Id is required. |
| GET | /v1/Confirm/HeldAway/TransactionTypes | Confirm/HeldAway | Gets Held Away transactions types and their offsets. |
| GET | /v1/Confirm/InterfaceReconciliations | Confirm/InterfaceReconciliations | Gets a list of interface reconciliations that the logged in user has access to. |
| GET | /v1/Confirm/InterfaceReconciliations/{downloadSourceId}/{createDate} | Confirm/InterfaceReconciliations | Gets the interface reconciliation that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/InterfaceReconciliations/{downloadSourceId}/SourceName | Confirm/InterfaceReconciliations | Returns the download source name using the download source id provided. |
| GET | /v1/Confirm/InterfaceReconciliations/Action/SendReconCompleteNotification | Confirm/InterfaceReconciliations |  |
| POST | /v1/Confirm/InterfaceReconciliations/Action/SendReconCompleteNotification | Confirm/InterfaceReconciliations |  |
| GET | /v1/Confirm/InterfaceReconciliations/Counts | Confirm/InterfaceReconciliations | Returns summary counts of unconfirmed records. |
| GET | /v1/Confirm/InterfaceReconciliations/Status | Confirm/InterfaceReconciliations | Returns the current reconcillation status. |
| GET | /v1/Confirm/InterfaceSyncs | Confirm/InterfaceSyncs | Returns a list of recon interface  syncs. |
| GET | /v1/Confirm/InterfaceSyncs/{key} | Confirm/InterfaceSyncs | Get interface Sync by key |
| PUT | /v1/Confirm/InterfaceSyncs/Action/SignOff | Confirm/InterfaceSyncs | Sign off InterfaceSyncs |
| GET | /v1/Confirm/InterfaceSyncs/Files | Confirm/InterfaceSyncs |  |
| GET | /v1/Confirm/localexclusion | Confirm/localexclusion |  |
| GET | /v1/Confirm/localexclusion/AdvisorNumber | Confirm/localexclusion |  |
| PUT | /v1/Confirm/localexclusion/List/Delete | Confirm/localexclusion |  |
| PUT | /v1/Confirm/localexclusion/List/Upsert | Confirm/localexclusion |  |
| GET | /v1/Confirm/MissingPriceSyncs | Confirm/MissingPriceSyncs | Returns a list of recon job statuses. |
| GET | /v1/Confirm/MissingPriceSyncs/{key} | Confirm/MissingPriceSyncs | Get MissingPriceSyncs by key |
| PUT | /v1/Confirm/MissingPriceSyncs/Action/PriceNote | Confirm/MissingPriceSyncs | Update Price Notes |
| PUT | /v1/Confirm/MissingPriceSyncs/Action/SignOff | Confirm/MissingPriceSyncs | Sign off MissingPriceSyncs |
| GET | /v1/Confirm/Overview | Confirm/Overview | Gets the confirm overview records the current user has access to. |
| GET | /v1/Confirm/Overview/AccountsNotInFile | Confirm/Overview | Get all confirm overview where account not in file |
| PUT | /v1/Confirm/Overview/AccountsNotInFile/Action/RefreshData | Confirm/Overview | Refresh data for Accounts Not In File confirm overview dashboard |
| PUT | /v1/Confirm/Overview/AccountsNotInFile/Action/SignOff | Confirm/Overview | Sign off dashboards |
| PUT | /v1/Confirm/Overview/Action/Delete | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/FixShares005/{effectiveDate} | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/NewUndo/Records | Confirm/Overview | Undo Apply for download files using new recon services |
| PUT | /v1/Confirm/Overview/Action/NewUndoMany | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/NewVerifyApply | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/NewVerifyApply/Records | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/ReConfirm | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/RefreshData | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/RefreshDatabaseData | Confirm/Overview | Takes an array of database Ids, a start and end date, and updates the Confirm Overview data with the current information for that database within those dates (confirmed counts, not confirmed counts ect.) |
| PUT | /v1/Confirm/Overview/Action/ReprocessFiles | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/ReprocessFiles/NewConfirmReprocessHandling | Confirm/Overview | Reprocess Files that are 2.0 and 1.0 also handles them in bulk |
| PUT | /v1/Confirm/Overview/Action/SignOff | Confirm/Overview | Sign off overviews |
| PUT | /v1/Confirm/Overview/Action/SleeveFixSmallBalancePositions | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/Undo/Records | Confirm/Overview | Undo Apply for download files |
| PUT | /v1/Confirm/Overview/Action/UndoMany | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/VerifyApply | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/Action/VerifyApply/Records | Confirm/Overview |  |
| POST | /v1/Confirm/Overview/CheckStatus | Confirm/Overview |  |
| GET | /v1/Confirm/Overview/CheckStatus/{batchId} | Confirm/Overview | Gets the status of batch processing record for the batchId provided. |
| POST | /v1/Confirm/Overview/CheckStatus/Universal | Confirm/Overview | Handles both s3(correlationIds) and remote(pkbatchprocessing) statuses when inputed will return the status of those batchProcessing records |
| GET | /v1/Confirm/Overview/DataAudits | Confirm/Overview | Get all confirm overview where account not in file |
| PUT | /v1/Confirm/Overview/DataAudits/Action/RefreshData | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/DataAudits/Action/SignOff | Confirm/Overview | Sign off dashboards |
| POST | /v1/Confirm/Overview/DataAudits/List | Confirm/Overview |  |
| POST | /v1/Confirm/Overview/DataAudits/List/Id | Confirm/Overview |  |
| GET | /v1/Confirm/Overview/ExclusionTable | Confirm/Overview | Get all confirm overview where account not in file |
| PUT | /v1/Confirm/Overview/ExclusionTable/Action/RefreshData | Confirm/Overview | Refresh data for Exclusion Tables confirm overview dashboard |
| PUT | /v1/Confirm/Overview/ExclusionTable/Action/SignOff | Confirm/Overview | Sign off dashboards |
| POST | /v1/Confirm/Overview/ForGroup | Confirm/Overview |  |
| GET | /v1/Confirm/Overview/InformRecon | Confirm/Overview | Gets a list of Inform Reconciliation Records |
| GET | /v1/Confirm/Overview/InformRecon/{key}/Transactions/v2 | Confirm/Overview | Get Recon Transaction Details Grid |
| PUT | /v1/Confirm/Overview/InformRecon/Action/SignOff/V2 | Confirm/Overview | Adds current user signoff to reconciliation records passed Skips records that are already signed off |
| PUT | /v1/Confirm/Overview/InformRecon/Transactions/Action/Dividend/V2 | Confirm/Overview | Change Transaction Recon Status to Confirmed and update Transaction type to 'Dividends/Interest/Fees' |
| PUT | /v1/Confirm/Overview/InformRecon/Transactions/Action/UpdateStatus/V2/{status} | Confirm/Overview | Change Transaction Recon Status |
| PUT | /v1/Confirm/Overview/InformRecon/Transactions/V2/{key} | Confirm/Overview | Update Inform Transaction Skips records that are already signed off |
| POST | /v1/Confirm/Overview/List | Confirm/Overview | Returns a list of Confirm Overviews that are found for the list of Id's posted in the message body. |
| POST | /v1/Confirm/Overview/List/Id | Confirm/Overview | Returns a list of Confirm Overviews that are found for the list of Id's posted in the message body. |
| GET | /v1/Confirm/Overview/ManualExclusions | Confirm/Overview | Get all confirm overview where account not in file |
| PUT | /v1/Confirm/Overview/ManualExclusions/Action/RefreshData | Confirm/Overview | Refresh data for Manual Exclusions confirm overview dashboard |
| PUT | /v1/Confirm/Overview/ManualExclusions/Action/SignOff | Confirm/Overview | Sign off dashboards |
| GET | /v1/Confirm/Overview/MissingFiles | Confirm/Overview | Return all confirm overviews that are missing files. |
| PUT | /v1/Confirm/Overview/MissingFiles/Action/RefreshData | Confirm/Overview | Refresh data for Missing Files confirm overview dashboard |
| PUT | /v1/Confirm/Overview/MissingFiles/Action/SignOff | Confirm/Overview | Sign off dashboards |
| GET | /v1/Confirm/Overview/Notes | Confirm/Overview | Get all notes based on filter values |
| POST | /v1/Confirm/Overview/Notes | Confirm/Overview | Create new confirm overview note |
| DELETE | /v1/Confirm/Overview/Notes/{key} | Confirm/Overview | Delete a note |
| GET | /v1/Confirm/Overview/Notes/{key} | Confirm/Overview | Get confirm overview note by key |
| PUT | /v1/Confirm/Overview/Notes/{key} | Confirm/Overview |  |
| POST | /v1/Confirm/Overview/Notes/List | Confirm/Overview | Create new confirm overview notes |
| GET | /v1/Confirm/Overview/OrionVision | Confirm/Overview | Gets a list of Inform Reconciliation Records |
| GET | /v1/Confirm/Overview/ScheduledJobs | Confirm/Overview | Get all confirm overview where account not in file |
| PUT | /v1/Confirm/Overview/ScheduledJobs/Action/RefreshData | Confirm/Overview | Refresh data for Schedule Jobs confirm overview dashboard |
| PUT | /v1/Confirm/Overview/ScheduledJobs/Action/Reschedule | Confirm/Overview |  |
| PUT | /v1/Confirm/Overview/ScheduledJobs/Action/SignOff | Confirm/Overview | Sign off dashboards |
| GET | /v1/Confirm/Overview/Summary | Confirm/Overview | Gets summary counts for download files. |
| GET | /v1/Confirm/ReconJobStatuses | Confirm/ReconJobStatuses | Returns a list of recon job statuses. |
| GET | /v1/Confirm/RecordTypes/Simple | Confirm/RecordTypes | Returns the ID and Name of File Record Types that can be imported to the orion system. |
| GET | /v1/Confirm/Results | Confirm/Results | Get all Confirm Group Data Query Results |
| POST | /v1/Confirm/Results | Confirm/Results | Adds a new Confirm Group Data Query Result to the database. |
| GET | /v1/Confirm/Results/{key} | Confirm/Results | Gets the Confirm Group Data Query Result that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/Results/{key} | Confirm/Results | Updates the Confirm Group Data Query Result that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/Rules | Confirm/Rules | Gets all of the rules. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Confirm/Rules | Confirm/Rules | Create new Rule |
| DELETE | /v1/Confirm/Rules/{key} | Confirm/Rules |  |
| GET | /v1/Confirm/Rules/{key} | Confirm/Rules | Get Rule by key |
| PUT | /v1/Confirm/Rules/{key} | Confirm/Rules | Update Rule |
| GET | /v1/Confirm/SchedulerMaintenance | Confirm/SchedulerMaintenance | Gets all of the scheduler Maintenance items targets. |
| PUT | /v1/Confirm/SchedulerMaintenance | Confirm/SchedulerMaintenance | Update scheduler maintenance item |
| GET | /v1/Confirm/SchedulerMaintenance/{key} | Confirm/SchedulerMaintenance | Get scheduler maintenance by key |
| PUT | /v1/Confirm/SchedulerMaintenance/{key} | Confirm/SchedulerMaintenance | Update scheduler maintenance item |
| GET | /v1/Confirm/SignOffs | Confirm/SignOffs | Gets a list of Sign Off that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Confirm/SignOffs/{key} | Confirm/SignOffs | Gets the Sign Off that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Confirm/SignOffs/Action/SignOff | Confirm/SignOffs |  |
| GET | /v1/Confirm/SignOffs/Simple | Confirm/SignOffs | Gets a simple list of Sign Off that the logged in user has access to. |
| GET | /v1/Confirm/SleeveSettings | Confirm/SleeveSettings | Gets all the sleeve rules from tblDownloadSleeveRules. |
| PUT | /v1/Confirm/SleeveSettings/Save | Confirm/SleeveSettings | Saves the sleeve json arrays to userDefinedData. |
| GET | /v1/Confirm/StatusTypes | Confirm/StatusTypes | Gets all of the status types. |
| GET | /v1/Confirm/SyncDashboard | Confirm/SyncDashboard | Gets all of the sync types. |
| GET | /v1/Confirm/SyncDashboard/Counts | Confirm/SyncDashboard | Gets all of the sync error counts for each day. |
| GET | /v1/Confirm/SyncTypes | Confirm/SyncTypes | Gets all of the sync types. |
| POST | /v1/Confirm/TaxCenter/Action/Reviewed | Confirm/TaxCenter | Flip reviewed flag |
| GET | /v1/Confirm/TaxCenter/Counts | Confirm/TaxCenter |  |
| GET | /v1/Confirm/TaxCenter/DownloadSourceSummary | Confirm/TaxCenter |  |
| POST | /v1/Confirm/TaxCenter/Errors/List | Confirm/TaxCenter | Return a list of errors by ids |
| GET | /v1/Confirm/TaxCenter/GetTaxErrorAudit | Confirm/TaxCenter |  |
| POST | /v1/Confirm/TaxCenter/UpdateTaxErrorAudit | Confirm/TaxCenter |  |
| GET | /v1/Confirm/TaxError | Confirm/TaxError | Gets the Tax Errors |
| PUT | /v1/Confirm/TaxError/Realized/{key}/AcquiredDate | Confirm/TaxError | Updates A Realized AssetCostBasis's AcquiredDate |
| PUT | /v1/Confirm/TaxError/Realized/{key}/CostAmt | Confirm/TaxError | Updates A Realized AssetCostBasis's Cost Amount |
| GET | /v1/Confirm/TaxError/Realized/Filter | Confirm/TaxError | Get Realized Errors |
| PUT | /v1/Confirm/TaxError/Unrealized/{key}/AcquiredDate | Confirm/TaxError | Updates an unrealized AssetCostCustodian's AcquiredDate |
| PUT | /v1/Confirm/TaxError/Unrealized/{key}/CostAmt | Confirm/TaxError | Updates an unrealized AssetCostCustodian's CostAmount based on existing units and acquired date |
| GET | /v1/Confirm/TaxError/Unrealized/Filter | Confirm/TaxError | Get Unrealized Errors |
| POST | /v1/Confirm/TaxError/UpdateReviewed/List | Confirm/TaxError | Gets the Tax Errors |
| GET | /v1/Confirm/UploadFormats | Confirm/UploadFormats | Gets a list of Upload Formats that the logged in user has access to. |
| GET | /v1/Confirm/UploadFormats/{key} | Confirm/UploadFormats | Gets the Upload Format that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Confirm/UploadTarget | Confirm/UploadTarget | Gets all of the upload targets. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Confirm/UploadTarget | Confirm/UploadTarget | Create upload target |
| DELETE | /v1/Confirm/UploadTarget/{key} | Confirm/UploadTarget |  |
| GET | /v1/Confirm/UploadTarget/{key} | Confirm/UploadTarget | Get Upload Target by key |
| PUT | /v1/Confirm/UploadTarget/{key} | Confirm/UploadTarget | Update Upload Target |
| PUT | /v1/Confirm/UploadTarget/Action/Delete | Confirm/UploadTarget |  |
| GET | /v1/Dashboards/Cards/Card | Dashboards/Cards | Retrieve card by card type and name |
| GET | /v1/Dashboards/Cards/QueryStudio | Dashboards/Cards | Retrieve card by card type and name |
| PUT | /v1/Dashboards/Cards/Settings | Dashboards/Cards |  |
| GET | /v1/Dashboards/Cards/Simple | Dashboards/Cards |  |
| GET | /v1/DataMaintenance/DataProvider/Setup | DataMaintenance/DataProvider |  |
| POST | /v1/DataMaintenance/DataProvider/Setup | DataMaintenance/DataProvider |  |
| PUT | /v1/DataMaintenance/DataProvider/Setup | DataMaintenance/DataProvider |  |
| DELETE | /v1/DataMaintenance/DataProvider/Setup/{id} | DataMaintenance/DataProvider |  |
| GET | /v1/DataMaintenance/DataProvider/Setup/{id} | DataMaintenance/DataProvider |  |
| PUT | /v1/DataMaintenance/DataProvider/Setup/{id} | DataMaintenance/DataProvider |  |
| GET | /v1/DataMaintenance/DataProvider/Setup/RepAccess | DataMaintenance/DataProvider |  |
| GET | /v1/DataMaintenance/DataProvider/Setup/RepAccess/{dataProviderSetupId} | DataMaintenance/DataProvider |  |
| POST | /v1/DataMaintenance/DataProvider/Setup/RepAccess/{dataProviderSetupId} | DataMaintenance/DataProvider |  |
| GET | /v1/DataMaintenance/DataProvider/Setup/RepAccess/{dataProviderSetupId}/AvailableRepCodes | DataMaintenance/DataProvider |  |
| GET | /v1/DataMaintenance/DataProvider/Setup/RepAccess/{dataProviderSetupId}/Reps | DataMaintenance/DataProvider |  |
| GET | /v1/DataMaintenance/DataProvider/Setup/RepAccess/{dataProviderSetupId}/SummaryCounts | DataMaintenance/DataProvider |  |
| DELETE | /v1/DataMaintenance/DataProvider/Setup/RepAccess/{repAccessId} | DataMaintenance/DataProvider |  |
| PUT | /v1/DataMaintenance/DataProvider/Setup/RepAccess/{repAccessId} | DataMaintenance/DataProvider |  |
| POST | /v1/DataMaintenance/DataProvider/Setup/RepAccess/RequestAccess/{repAccessId} | DataMaintenance/DataProvider |  |
| POST | /v1/DataMaintenance/DataProvider/Setup/RepAccess/ValidateAccountCodes/{dataProviderSetupId}/{repAccessId} | DataMaintenance/DataProvider |  |
| GET | /v1/DataMaintenance/DataProvider/SetupType | DataMaintenance/DataProvider | Returns a list of all Data Provider Setup Types user has access to |
| POST | /v1/DataMaintenance/DataProvider/SetupType | DataMaintenance/DataProvider |  |
| PUT | /v1/DataMaintenance/DataProvider/SetupType | DataMaintenance/DataProvider |  |
| DELETE | /v1/DataMaintenance/DataProvider/SetupType/{id} | DataMaintenance/DataProvider |  |
| GET | /v1/DataMaintenance/DataProvider/SetupType/{key} | DataMaintenance/DataProvider | returns a single Data Provider Setup Type by its key |
| POST | /v1/Email/Clients | Email/Clients | Used to email one message to a number of provided clients. |
| GET | /v1/FileImport/{key}/File | FileImport/{key} |  |
| DELETE | /v1/FileImport/Instance/{instanceId} | FileImport/Instance | Delete the file import instance records. Does not delete the blobs |
| GET | /v1/FileImport/Instance/{instanceId}/Files | FileImport/Instance | Given an instance id, return a list of associated documents |
| POST | /v1/FileImport/Instance/Files/UpdateViewStatus | FileImport/Instance | Update the status for the files to make them hidden or viewable to clients |
| GET | /v1/FileImport/Instance/List | FileImport/Instance | Get list of all file import instances |
| GET | /v1/FileImport/Log/{filename} | FileImport/Log | Used to download a previously generated log export. |
| POST | /v1/FileImport/Upload | FileImport/Upload | This endpoint is no longer supported. Please use FileImport/Upload/New instead |
| POST | /v1/FileImport/Upload/{sessionId} | FileImport/Upload | This is no longer supported. Use FileImport/Upload/New then FileImport/Upload/File |
| GET | /v1/FileImport/Upload/{sessionId}/Log | FileImport/Upload | This is no longer supported. Use FileImport/Upload/New then FileImport/Upload/File then FileImport/Upload/GenerateLog |
| POST | /v1/FileImport/Upload/File | FileImport/Upload |  |
| POST | /v1/FileImport/Upload/GenerateLog | FileImport/Upload |  |
| POST | /v1/FileImport/Upload/New | FileImport/Upload |  |
| GET | /v1/Fuse/Config/Categories | Fuse/Config |  |
| GET | /v1/Fuse/Config/Categories/{categoryId} | Fuse/Config |  |
| GET | /v1/Fuse/Config/Environments/{environment}/PartnerApps/{partnerAppId}/WebhookUrlRoutes | Fuse/Config |  |
| GET | /v1/Fuse/Config/Integrations | Fuse/Config |  |
| POST | /v1/Fuse/Config/Integrations | Fuse/Config | Adds a new integration for the current user, and the specified partner app, to the database. |
| DELETE | /v1/Fuse/Config/Integrations/{integrationId} | Fuse/Config |  |
| PUT | /v1/Fuse/Config/Integrations/{integrationId} | Fuse/Config |  |
| GET | /v1/Fuse/Config/Integrations/{integrationId}/Categories | Fuse/Config |  |
| GET | /v1/Fuse/Config/Integrations/{integrationId}/Image | Fuse/Config |  |
| GET | /v1/Fuse/Config/Integrations/{integrationId}/SmallImage | Fuse/Config |  |
| GET | /v1/Fuse/Config/PartnerApps/{partnerAppId}/Categories | Fuse/Config |  |
| GET | /v1/Fuse/Config/RegisteredApps | Fuse/Config |  |
| POST | /v1/Fuse/Notifications/TDA | Fuse/Notifications |  |
| GET | /v1/Fuse/PartnerApps/{partnerAppId}/SmallImage | Fuse/PartnerApps |  |
| POST | /v1/Fuse/Slack/OutgoingWebhook/Users/{userIntegrationGuid}/Notifications | Fuse/Slack |  |
| POST | /v1/Fuse/Slack/Slash/Users/{userIntegrationGuid}/Notifications | Fuse/Slack |  |
| GET | /v1/Fuse/Users/{userIntegrationGuid}/Notifications | Fuse/Users |  |
| POST | /v1/Fuse/Users/{userIntegrationGuid}/Notifications | Fuse/Users |  |
| PUT | /v1/Fuse/Users/{userIntegrationGuid}/Notifications | Fuse/Users |  |
| GET | /v1/Fuse/Users/{userIntegrationGuid}/Notifications/{notificationId} | Fuse/Users |  |
| PUT | /v1/Fuse/Users/{userIntegrationGuid}/Notifications/{notificationId} | Fuse/Users |  |
| POST | /v1/Fuse/Users/{userIntegrationGuid}/Notifications/Redtail | Fuse/Users | Creates a notification for a user about a Redtail event for account, activity, or contact changes. |
| POST | /v1/Fuse/Users/{userIntegrationGuid}/Notifications/ShareFile | Fuse/Users | Creates a notification from ShareFile webhook callbacks. |
| GET | /v1/Global/CorporateActions | Global/CorporateActions | Gets a list of corporate actions that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Global/CorporateActions | Global/CorporateActions | Used to create a new corporate action. Upon successful creation a 201 will be returned with the location of the nearly created corporate action. |
| PUT | /v1/Global/CorporateActions | Global/CorporateActions | Used to bulk update a list of existing corporate actions. |
| DELETE | /v1/Global/CorporateActions/{key} | Global/CorporateActions | Used to delete an existing corporate action. Upon successful deletion a 204 will be returned. |
| GET | /v1/Global/CorporateActions/{key} | Global/CorporateActions | Gets the corporate action that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Global/CorporateActions/{key} | Global/CorporateActions | Used to update an existing corporate action. Upon successful modification a 200 will be returned. |
| PUT | /v1/Global/CorporateActions/Action/Delete | Global/CorporateActions |  |
| GET | /v1/Global/CorporateActions/Processing | Global/CorporateActions | Gets Corporate Action Processing Records. |
| GET | /v1/Global/CorporateActions/Processing/{key} | Global/CorporateActions | Gets Corporate Action Processing Record |
| GET | /v1/Global/CorporateActions/Search | Global/CorporateActions | Returns a list of Corporate Actions filtered by name |
| GET | /v1/Global/CorporateActions/Search/{search} | Global/CorporateActions | Returns a list of Corporate Actions filtered by name |
| GET | /v1/Global/CorporateActions/Verbose | Global/CorporateActions |  |
| POST | /v1/Global/CorporateActions/Verbose | Global/CorporateActions | Create a new corporate action |
| PUT | /v1/Global/CorporateActions/Verbose | Global/CorporateActions | Used to bulk update a list of existing CorporateActions |
| GET | /v1/Global/CorporateActions/Verbose/{key} | Global/CorporateActions |  |
| PUT | /v1/Global/CorporateActions/Verbose/{key} | Global/CorporateActions | Used to update an existing CorporateAction |
| POST | /v1/Global/CorporateActions/Verbose/List | Global/CorporateActions |  |
| POST | /v1/Global/CorporateActions/Verbose/List/Id | Global/CorporateActions |  |
| GET | /v1/Global/CorporateActions/Verbose/New | Global/CorporateActions |  |
| GET | /v1/Global/Custodians/Simple | Global/Custodians |  |
| GET | /v1/Global/Dividends | Global/Dividends | Gets a list of dividends that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Global/Dividends | Global/Dividends | Used to create a new dividend. Upon successful creation a 201 will be returned with the location of the nearly created dividend. |
| PUT | /v1/Global/Dividends | Global/Dividends |  |
| DELETE | /v1/Global/Dividends/{key} | Global/Dividends | Used to delete an existing dividend. Upon successful deletion a 204 will be returned. |
| GET | /v1/Global/Dividends/{key} | Global/Dividends | Gets the dividend that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Global/Dividends/{key} | Global/Dividends | Used to update an existing dividend. Upon successful modification a 200 will be returned. |
| PUT | /v1/Global/Dividends/Action/Delete | Global/Dividends |  |
| GET | /v1/Global/DownloadSymbols/{key} | Global/DownloadSymbols | Gets the download symbol that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Global/DownloadSymbols/Full/Product | Global/DownloadSymbols | Gets the full download symbol records for a given product ID |
| GET | /v1/Global/DownloadSymbols/Full/Product/{productId} | Global/DownloadSymbols | Gets the full download symbol records for a given product ID |
| GET | /v1/Global/DownloadSymbols/Product | Global/DownloadSymbols | Get all download symbols for the product |
| GET | /v1/Global/DownloadSymbols/Product/{productId} | Global/DownloadSymbols | Get all download symbols for the product |
| GET | /v1/Global/FundFamilies | Global/FundFamilies | Gets a list of fund families that the logged in user has access to. |
| GET | /v1/Global/FundFamilies/{key} | Global/FundFamilies | Gets the fund families that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Global/FundFamilies/Simple | Global/FundFamilies | Gets a simple list of fund families that the logged in user has access to. |
| GET | /v1/Global/FundFamilies/Simple/Search | Global/FundFamilies | Gets a simple list of fund families that the logged in user has access to where the fund family name begin with the search string or Id is exact match. |
| GET | /v1/Global/FundFamilies/Simple/Search/{search} | Global/FundFamilies | Gets a simple list of fund families that the logged in user has access to where the fund family name begin with the search string or Id is exact match. |
| PUT | /v1/Global/FundFamilies/Update | Global/FundFamilies | Update fund family |
| GET | /v1/Global/Prices/Review/{productId} | Global/Prices |  |
| GET | /v1/Global/Prices/Review/{productId}/Statistics | Global/Prices |  |
| GET | /v1/Global/Products | Global/Products | Gets a list of global products that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Global/Products/{key} | Global/Products | Gets the global product that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Global/Products/{key}/SubHolding | Global/Products | Gets the subholding information for the global product that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Global/Products/Combine | Global/Products |  |
| POST | /v1/Global/Products/Combine | Global/Products | Adds a new Product Combine request to the database. |
| GET | /v1/Global/Products/Core/{productId} | Global/Products | Returns the core global product based on a global product id |
| GET | /v1/Global/Products/DividendTypes/Simple | Global/Products |  |
| GET | /v1/Global/Products/ISIN/Validate | Global/Products | Check if a specified ISIN is valid |
| POST | /v1/Global/Products/List | Global/Products |  |
| POST | /v1/Global/Products/List/DownloadSymbol | Global/Products | Get list of global products by DownloadSymbol Null attributes will be excluded from the payload |
| POST | /v1/Global/Products/List/Id | Global/Products |  |
| POST | /v1/Global/Products/List/Ticker | Global/Products | Get list of global products with the supplied tickers. |
| GET | /v1/Global/Products/PriceFactors | Global/Products | Gets a list of price factors that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Global/Products/PriceFactors | Global/Products | Used to create a new price factor. Upon successful creation a 201 will be returned with the location of the nearly created price factor. |
| PUT | /v1/Global/Products/PriceFactors | Global/Products |  |
| DELETE | /v1/Global/Products/PriceFactors/{productId}/{factorDate} | Global/Products | Used to delete an existing price factor. Upon successful deletion a 204 will be returned. |
| PUT | /v1/Global/Products/PriceFactors/{productId}/{factorDate} | Global/Products | Used to update an existing price factor. Upon successful modification a 200 will be returned. |
| GET | /v1/Global/Products/PriceFactors/{productId}/{priceDate} | Global/Products | Gets the price factor that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Global/Products/PriceFactors/Action/Delete | Global/Products | Deletes every price factor provided in the list of ids where the Id is formatted as {ProductId}/{FactorDate}. |
| GET | /v1/Global/Products/Prices | Global/Products |  |
| POST | /v1/Global/Products/Prices | Global/Products | Used to create a new global price. Upon successful creation a 201 will be returned with the location of the nearly created global price. |
| DELETE | /v1/Global/Products/Prices/{productId}/{custodianCommonId}/{priceDate} | Global/Products | Used to delete an existing global price. Upon successful deletion a 204 will be returned. |
| GET | /v1/Global/Products/Prices/{productId}/{custodianCommonId}/{priceDate} | Global/Products | Gets the global price that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Global/Products/Prices/{productId}/{custodianCommonId}/{priceDate} | Global/Products | Used to update an existing global price. Upon successful modification a 200 will be returned. |
| GET | /v1/Global/Products/Prices/{productId}/{custodianCommonId}/{priceDate}/Audits | Global/Products | Gets the audits for the price specified. |
| PUT | /v1/Global/Products/Prices/Action/Delete | Global/Products |  |
| POST | /v1/Global/Products/Prices/CopyPrices/{copyToProductId} | Global/Products | Copies Global prices from one product to another product |
| POST | /v1/Global/Products/Prices/MovePrices/{moveToProductId} | Global/Products | Moves Global prices from one product to another product |
| GET | /v1/Global/Products/Simple/Search | Global/Products |  |
| GET | /v1/Global/Products/SubTypes/Simple | Global/Products | <param name="alternativeOnly">Optional. Default: null. If true only alternative ProductSubType will be returned.  If false only none alternative ProductSubType will be returned.</param> |
| GET | /v1/Global/Products/SymbolExists | Global/Products | Gets whether a product with {symbol} as its ticker or download symbol exists. |
| GET | /v1/Global/Products/SymbolExists/{symbol} | Global/Products | Gets whether a product with {symbol} as its ticker or download symbol exists. Symbol does not support special characters, use the GET SymbolExists with symbol queryParam |
| GET | /v1/Global/Products/Verbose | Global/Products |  |
| POST | /v1/Global/Products/Verbose | Global/Products | Create product |
| PUT | /v1/Global/Products/Verbose | Global/Products |  |
| GET | /v1/Global/Products/Verbose/{key} | Global/Products |  |
| PUT | /v1/Global/Products/Verbose/{key} | Global/Products |  |
| POST | /v1/Global/Products/Verbose/List | Global/Products |  |
| POST | /v1/Global/Products/Verbose/List/Id | Global/Products |  |
| POST | /v1/Global/Products/Verbose/Many | Global/Products | Creates one or more global products. Creates one or more local products if provided. |
| GET | /v1/Global/Products/Verbose/New | Global/Products |  |
| GET | /v1/Global/ServiceTeamMembers | Global/ServiceTeamMembers | Returns a list of ervice team members. |
| POST | /v1/Global/ServiceTeamMembers | Global/ServiceTeamMembers | Create Service Team Member |
| DELETE | /v1/Global/ServiceTeamMembers/{key} | Global/ServiceTeamMembers | Delete the Service Team Member |
| GET | /v1/Global/ServiceTeamMembers/{key} | Global/ServiceTeamMembers | Gets the Service Team Member that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Global/ServiceTeamMembers/{key} | Global/ServiceTeamMembers | Update the Service Team Member |
| PUT | /v1/Global/ServiceTeamMembers/Action/Delete | Global/ServiceTeamMembers |  |
| GET | /v1/Global/ServiceTeamMembers/AllAnalystDatabaseAssignments | Global/ServiceTeamMembers | Gets all of the Analyst Database Assignments |
| GET | /v1/Global/ServiceTeamMembers/UserManagers | Global/ServiceTeamMembers | Get User Managers for Service Team Member |
| GET | /v1/Global/ServiceTeams | Global/ServiceTeams |  |
| GET | /v1/Global/ServiceTeams/Simple | Global/ServiceTeams |  |
| GET | /v1/Global/StatesMunicipalBondTax | Global/StatesMunicipalBondTax | Gets a list of StateMunicipalBondTax that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Global/StatesMunicipalBondTax/{addressStateId}/{issueStateId} | Global/StatesMunicipalBondTax | Gets the StatesMunicipalBondTax that has the provided Address State Id and Issue State Id. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Global/StatesMunicipalBondTax/{addressStateId}/{issueStateId} | Global/StatesMunicipalBondTax | Used to update a Stat eMunicipal Bond Tax. Upon successful modification a 200 will be returned. |
| PUT | /v1/Global/StatesMunicipalBondTax/Action/MakeTaxable | Global/StatesMunicipalBondTax |  |
| PUT | /v1/Global/StatesMunicipalBondTax/Action/MakeTaxExempt | Global/StatesMunicipalBondTax |  |
| POST | /v1/Global/StaticFiles | Global/StaticFiles |  |
| GET | /v1/Global/StaticFiles/{fileType} | Global/StaticFiles | Gets a list of specific static documents. |
| POST | /v1/Global/StaticFiles/{fileType} | Global/StaticFiles | Adds a new advisor file. |
| DELETE | /v1/Global/StaticFiles/{fileType}/{fileId} | Global/StaticFiles | Deletes the specific file with the blobId provided which is an advisor file. |
| GET | /v1/Global/StaticFiles/{fileType}/{fileId} | Global/StaticFiles | Gets the raw data of the specific file with the blobId provided which is an advisor file. |
| GET | /v1/Global/StaticFiles/{key} | Global/StaticFiles |  |
| GET | /v1/Global/SubHoldings/Simple | Global/SubHoldings |  |
| POST | /v1/Global/UserFeedback/Response | Global/UserFeedback | Saves a user feedback response. |
| POST | /v1/Homepage/Action/DataSources/{dataSourceId} | Homepage/Action |  |
| GET | /v1/Homepage/Beneficiaries | Homepage/Beneficiaries |  |
| GET | /v1/Homepage/Dashboards | Homepage/Dashboards |  |
| POST | /v1/Homepage/Dashboards | Homepage/Dashboards |  |
| PUT | /v1/Homepage/Dashboards/{dashboardId} | Homepage/Dashboards |  |
| POST | /v1/Homepage/Dashboards/{dashboardId}/Cards/{cardId} | Homepage/Dashboards |  |
| DELETE | /v1/Homepage/Dashboards/{dashboardId}/DashboardCards/{dashboardCardId} | Homepage/Dashboards | Remove card from dashboard. |
| POST | /v1/Homepage/Dashboards/{dashboardId}/DashboardCards/{dashboardCardId}/Clone | Homepage/Dashboards | Clone existing card within the dashboard. |
| DELETE | /v1/Homepage/Dashboards/{id} | Homepage/Dashboards |  |
| GET | /v1/Homepage/Dashboards/{id} | Homepage/Dashboards |  |
| GET | /v1/Homepage/Dashboards/{id}/ForDeletion | Homepage/Dashboards |  |
| GET | /v1/Homepage/Dashboards/Cards/{id} | Homepage/Dashboards |  |
| PUT | /v1/Homepage/Dashboards/Cards/{id} | Homepage/Dashboards |  |
| POST | /v1/Homepage/Dashboards/Cards/WorkflowAssistantDemo | Homepage/Dashboards |  |
| POST | /v1/Homepage/Dashboards/DataSources | Homepage/Dashboards |  |
| DELETE | /v1/Homepage/Dashboards/DataSources/{key} | Homepage/Dashboards |  |
| GET | /v1/Homepage/Dashboards/DataSources/{key} | Homepage/Dashboards |  |
| PUT | /v1/Homepage/Dashboards/DataSources/{key} | Homepage/Dashboards |  |
| GET | /v1/Homepage/Dashboards/PortfolioView/SearchHistories | Homepage/Dashboards |  |
| POST | /v1/Homepage/Dashboards/PortfolioView/SearchHistories | Homepage/Dashboards |  |
| POST | /v1/Homepage/Performance | Homepage/Performance | Gets combined database performance (from cache) and benchmark performance using representative IDs and benchmark info |
| GET | /v1/Homepage/PortfolioTree | Homepage/PortfolioTree | Get a List of Assets with properties that can be used to show allocation by groupings. |
| GET | /v1/Homepage/PortfolioTree/PortfolioGroup | Homepage/PortfolioTree | Get a List of Assets with properties that can be used to show allocation by groupings. |
| PUT | /v1/Homepage/PortfolioView/{dashboardId} | Homepage/PortfolioView |  |
| DELETE | /v1/Homepage/PortfolioView/{id} | Homepage/PortfolioView |  |
| POST | /v1/Homepage/PortfolioView/CacheDataSource | Homepage/PortfolioView |  |
| GET | /v1/Homepage/PortfolioView/CachedData/{keyString} | Homepage/PortfolioView |  |
| GET | /v1/Homepage/PortfolioView/MeetingAgenda/{keyString} | Homepage/PortfolioView |  |
| POST | /v1/Homepage/PortfolioView/MeetingAgenda/Cache | Homepage/PortfolioView |  |
| POST | /v1/Homepage/PortfolioViews | Homepage/PortfolioViews |  |
| GET | /v1/Homepage/Roles/Dashboards/Simple | Homepage/Roles |  |
| GET | /v1/Homepage/Roles/PortfolioView/Simple | Homepage/Roles |  |
| GET | /v1/Homepage/Setting | Homepage/Setting | Returns Portfolio View Firm Settings |
| PUT | /v1/Homepage/UserDashboard/{dashboardId} | Homepage/UserDashboard |  |
| POST | /v1/Homepage/Users/Dashboards/DefaultDashboard | Homepage/Users |  |
| GET | /v1/Homepage/Users/Dashboards/GetGlobalDashboardsAsync | Homepage/Users |  |
| GET | /v1/Homepage/Users/Dashboards/Simple | Homepage/Users |  |
| GET | /v1/Integration/Certs | Integration/Certs |  |
| GET | /v1/Integration/RolesForCode/{code} | Integration/RolesForCode | Gets details about the privilege specified by the {code}, along with the Roles used by the firm. |
| GET | /v1/Integration/RolesForKey/{key} | Integration/RolesForKey | Gets details about the privilege specified by the {key}, along with the Roles used by the firm. |
| POST | /v1/Integration/UpdateRoles | Integration/UpdateRoles | Updates the roles for a specified integration privilege. |
| GET | /v1/Integrations/AdviceWorks/AdvisorId/{orionRepId} | Integrations/AdviceWorks |  |
| GET | /v1/Integrations/AdviceWorks/GetClientDetail/{clientId} | Integrations/AdviceWorks |  |
| GET | /v1/Integrations/AdviceWorks/GetClientDetailRaw/{clientId} | Integrations/AdviceWorks |  |
| GET | /v1/Integrations/AdviceWorks/GetToken | Integrations/AdviceWorks |  |
| POST | /v1/Integrations/AdviceWorks/ReserveAccount | Integrations/AdviceWorks |  |
| POST | /v1/Integrations/AdviceWorks/ReserveAccountRaw | Integrations/AdviceWorks |  |
| POST | /v1/Integrations/AdviceWorks/Search | Integrations/AdviceWorks |  |
| POST | /v1/Integrations/AdviceWorks/SearchRaw | Integrations/AdviceWorks |  |
| POST | /v1/Integrations/AdvisorCloudStorage/{provider}/Credentials | Integrations/AdvisorCloudStorage | Used to save cloud storage credentials. Each provider has a different representation of credentials that must be posted as json in the message body. |
| PUT | /v1/Integrations/AdvisorCloudStorage/{provider}/Credentials | Integrations/AdvisorCloudStorage | Used to save cloud storage credentials. Each provider has a different representation of credentials that must be posted as json in the message body. |
| GET | /v1/Integrations/AdvisorCloudStorage/{provider}/Redirect | Integrations/AdvisorCloudStorage | Used to automatically redirect the user's browser to the appropriate cloud storage provider's oauth page. |
| POST | /v1/Integrations/AdvisorCloudStorage/Action/Share/{filepath} | Integrations/AdvisorCloudStorage | Used to generate a share link to a file in cloud storage. |
| GET | /v1/Integrations/AdvisorCloudStorage/Browse/{filepath} | Integrations/AdvisorCloudStorage | Used to browse folders and view file meta data from cloud storage. |
| DELETE | /v1/Integrations/AdvisorCloudStorage/Credentials | Integrations/AdvisorCloudStorage | Used to remove previously saved cloud storage credentials. |
| DELETE | /v1/Integrations/AdvisorCloudStorage/Data/{filepath} | Integrations/AdvisorCloudStorage | Used to delete a file from cloud storage. |
| GET | /v1/Integrations/AdvisorCloudStorage/Data/{filepath} | Integrations/AdvisorCloudStorage | Used to download a file from cloud storage. |
| POST | /v1/Integrations/AdvisorCloudStorage/Data/{filepath} | Integrations/AdvisorCloudStorage | Used to upload a file to cloud storage. |
| GET | /v1/Integrations/AdvisorCloudStorage/List | Integrations/AdvisorCloudStorage | Used to get list of configured cloud storage providers. |
| GET | /v1/Integrations/AdvisoryWorld/AssetFactSheet/{modelAggId} | Integrations/AdvisoryWorld | Get asset fact sheet for a ModelAgg. |
| GET | /v1/Integrations/AdvisoryWorld/Configuration | Integrations/AdvisoryWorld | Retrieves AdvisoryWorld Integration details. |
| PUT | /v1/Integrations/AdvisoryWorld/Configuration | Integrations/AdvisoryWorld | Saves AdvisoryWorld integration settings. |
| GET | /v1/Integrations/AdvisoryWorld/IPSBuilderSection/Model | Integrations/AdvisoryWorld | Get Ips Builder section by Model |
| GET | /v1/Integrations/AdvisoryWorld/IPSBuilderSection/ModelAgg | Integrations/AdvisoryWorld | Get ips builder section info by Model Agg |
| GET | /v1/Integrations/AdvisoryWorld/ManagerFactSheet/{modelAggId} | Integrations/AdvisoryWorld | Get asset fact sheet for a ModelAgg. |
| GET | /v1/Integrations/AdvisoryWorld/ModelFactSheet/{key} | Integrations/AdvisoryWorld | Get asset fact sheet for a Strategy. |
| POST | /v1/Integrations/AdvisoryWorld/Proposal/Activate | Integrations/AdvisoryWorld | Accept proposal to apply changes through sleeving, Connect, or Eclipse <param name="proposal">Proposal object</param><param name="cancellationToken">CancellationToken</param> |
| POST | /v1/Integrations/AdvisoryWorld/Proposal/CompatableModelAttributes/List | Integrations/AdvisoryWorld | Accept a list of modelagg ids to return the proposal compatibility for each model <param name="modelaggs">List of model agg ids</param><param name="cancellationToken"></param> |
| GET | /v1/Integrations/AdvisoryWorld/Proposal/Portfolio | Integrations/AdvisoryWorld | Accept parameters to return an aggregated list of accounts for accepting proposal <param name="ct">CancellationToken</param><param name="registrationId">registrationId int</param><param name="accountId">accountId int</param><param name="portfolioId">portfolioId int?</param> |
| GET | /v1/Integrations/AdvisoryWorld/Redirect | Integrations/AdvisoryWorld | Method to redirect to AdvisoryWorld SSO QuickStart |
| POST | /v1/Integrations/AdvisoryWorld/Remove | Integrations/AdvisoryWorld | Sets up Blaze integration for the current user. |
| POST | /v1/Integrations/AdvisoryWorld/Reports/CompariScan/{reportName} | Integrations/AdvisoryWorld | Gets a compari scan report from Advisory World for the allocations provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/CompariScan/Account/{accountId}/Model/{modelId} | Integrations/AdvisoryWorld | Gets a compari scan report from Advisory World for the specific account provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/CompariScan/Client/{clientId}/Model/{modelId} | Integrations/AdvisoryWorld | Gets a compari scan report from Advisory World for the specific client provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/CompariScan/Registration/{registrationId}/Model/{modelId} | Integrations/AdvisoryWorld | Gets a compari scan report from Advisory World for the specific registration provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| POST | /v1/Integrations/AdvisoryWorld/Reports/DetailedAnalytics/{reportName} | Integrations/AdvisoryWorld | Gets a detailed analytics report from Advisory World for the allocations provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/DetailedAnalytics/Account/{accountId} | Integrations/AdvisoryWorld | Gets a detailed analytics report from Advisory World for the specific account provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/DetailedAnalytics/Client/{clientId} | Integrations/AdvisoryWorld | Gets a detailed analytics report from Advisory World for the specific client provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/DetailedAnalytics/Model/{modelId} | Integrations/AdvisoryWorld | Gets a detailed analytics report from Advisory World for the specific model provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/DetailedAnalytics/Registration/{registrationId} | Integrations/AdvisoryWorld | Gets a detailed analytics report from Advisory World for the specific registration provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| POST | /v1/Integrations/AdvisoryWorld/Reports/HoldingScan/{reportName} | Integrations/AdvisoryWorld | Gets a holding scan report from Advisory World for the allocations provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/HoldingScan/Account/{accountId} | Integrations/AdvisoryWorld | Gets a holding scan report from Advisory World for the specific account provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/HoldingScan/Asset/{assetId} | Integrations/AdvisoryWorld | Gets a holding scan report from Advisory World for the specific asset provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/HoldingScan/Client/{clientId} | Integrations/AdvisoryWorld | Gets a holding scan report from Advisory World for the specific client provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/HoldingScan/Model/{modelId} | Integrations/AdvisoryWorld | Gets a holding scan report from Advisory World for the specific model provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| GET | /v1/Integrations/AdvisoryWorld/Reports/HoldingScan/Registration/{registrationId} | Integrations/AdvisoryWorld | Gets a holding scan report from Advisory World for the specific registration provided. If the response is 500 an error occured  and details of the error should be returned. If the response is 200 the location header is where the generated report can be retrieved. |
| PUT | /v1/Integrations/AdvisoryWorld/RiskScore | Integrations/AdvisoryWorld | Get risk score for Sleeve Strategy. |
| PUT | /v1/Integrations/AdvisoryWorld/RiskScoreModel | Integrations/AdvisoryWorld | Get risk score for ModelAggs. |
| GET | /v1/Integrations/AdvisoryWorld/Run/{filename} | Integrations/AdvisoryWorld | Used to download a previously generated report pdf. |
| POST | /v1/Integrations/AdvisoryWorld/Setup | Integrations/AdvisoryWorld | Sets up AdvisoryWorld integration for the current user. |
| POST | /v1/Integrations/AdvisoryWorld/SetupComplete | Integrations/AdvisoryWorld | Stores AdvisoryWorld integration completed remotely for the current user. |
| GET | /v1/Integrations/AdvisoryWorld/SSOUrl | Integrations/AdvisoryWorld | Method to build an AdvisoryWorld SSO link |
| PUT | /v1/Integrations/AdvisoryWorld/UpdateModelAggRiskScore | Integrations/AdvisoryWorld | Update risk score for ModelAggs that have been added or edited in the past 24hrs. |
| GET | /v1/Integrations/Advizr/Action/SAML | Integrations/Advizr |  |
| POST | /v1/Integrations/Advizr/Actions/Remove | Integrations/Advizr | Removes the Schwab integration for the current user. |
| POST | /v1/Integrations/Advizr/Actions/Setup | Integrations/Advizr |  |
| GET | /v1/Integrations/Advizr/ApexAccount | Integrations/Advizr |  |
| POST | /v1/Integrations/Advizr/ApexAccount | Integrations/Advizr |  |
| POST | /v1/Integrations/Advizr/ApexAccounts | Integrations/Advizr |  |
| GET | /v1/Integrations/Advizr/FinancialPlan/{clientId}/3DRiskProfile | Integrations/Advizr |  |
| GET | /v1/Integrations/Advizr/FinancialPlan/{clientId}/ActionSteps | Integrations/Advizr |  |
| GET | /v1/Integrations/Advizr/FinancialPlan/{clientId}/BeFi20 | Integrations/Advizr |  |
| GET | /v1/Integrations/Advizr/FinancialPlan/{clientId}/ProbabilityOfSuccess/{planType} | Integrations/Advizr | Returns the monte carlo result for the current or proposed financial plan. |
| GET | /v1/Integrations/Advizr/FinancialPlan/{clientId}/ProtectLiveDream | Integrations/Advizr | Returns the protect, live, dream for a household. |
| GET | /v1/Integrations/Advizr/FinancialPlan/{clientId}/RetirementAssets/{planType} | Integrations/Advizr | Returns the retirement assets chart data for the current or proposed financial plan. |
| GET | /v1/Integrations/Advizr/FinancialPlan/{clientId}/suggestions | Integrations/Advizr |  |
| GET | /v1/Integrations/Advizr/FinancialPlan/{clientId}/Summary/{planType} | Integrations/Advizr | Returns the plan summary goals for the current or proposed financial plan. |
| POST | /v1/Integrations/Advizr/FinancialPlan/Decumulation | Integrations/Advizr | Returns the protect, live, dream for a household. |
| GET | /v1/Integrations/Advizr/GetConfig | Integrations/Advizr |  |
| GET | /v1/Integrations/Advizr/NetWorth/{clientId} | Integrations/Advizr | List all net worth data for a client. |
| GET | /v1/Integrations/Advizr/Onboarding/AllFirms | Integrations/Advizr | Lists all on-boarded firms that meet the specified search criteria. |
| GET | /v1/Integrations/Advizr/Onboarding/Firm | Integrations/Advizr | Returns the on-boarded organization of the specified external firm id. |
| GET | /v1/Integrations/Advizr/Onboarding/Firm/Advisors | Integrations/Advizr | Lists all on-boarded advisors of the specified external firm id. |
| GET | /v1/Integrations/Advizr/Onboarding/Firm/Households | Integrations/Advizr | Lists all on-boarded households of the specified external firm id. |
| GET | /v1/Integrations/Advizr/Onboarding/Goals/{householdId} | Integrations/Advizr |  |
| GET | /v1/Integrations/Advizr/Onboarding/Households | Integrations/Advizr | Returns households for logged in user (id). |
| POST | /v1/Integrations/Advizr/Onboarding/OrionPlanningNewHouseholdId | Integrations/Advizr |  |
| GET | /v1/Integrations/Advizr/Onboarding/PlaidAccounts/{clientId} | Integrations/Advizr | Returns all Advizr Plaid Accounts. |
| GET | /v1/Integrations/Advizr/Onboarding/RTQ/{advizrHouseholdId}/Ally/{alliedHouseholdId} | Integrations/Advizr | Returns all Advizr Risk Tolerance Questionaire. |
| POST | /v1/Integrations/Advizr/ProbabilityOfSuccess | Integrations/Advizr |  |
| POST | /v1/Integrations/Advizr/SendEmail | Integrations/Advizr | <note>             This is only invoked from the FE if TOS is unchecked             REF: advizrWizard.js                 <code>vm.partnerApp.sendemail = vm.partnerApp.acceptedTOS === false;</code></note> |
| POST | /v1/Integrations/Akoya/App | Integrations/Akoya |  |
| GET | /v1/Integrations/Akoya/Configuration | Integrations/Akoya | Retrieves Akoya Integration details. |
| PUT | /v1/Integrations/Akoya/Configuration | Integrations/Akoya | Saves Akoya integration settings. |
| POST | /v1/Integrations/Akoya/DeleteAndRevokeTokens | Integrations/Akoya |  |
| GET | /v1/Integrations/Akoya/EditToken | Integrations/Akoya | Edit Akoya Token |
| GET | /v1/Integrations/Akoya/GetAkoya | Integrations/Akoya | Akoya - Financial Institution Dumb endpoint. |
| GET | /v1/Integrations/Akoya/GetAkoyaImage | Integrations/Akoya | Call this with financialInstitution currently supported are these three mikomo,transamerica, fidelity |
| GET | /v1/Integrations/Akoya/GetAkoyaLinkedAccounts | Integrations/Akoya | Get Akoya Linked Accounts pass in get settings |
| GET | /v1/Integrations/Akoya/GetAkoyaToken | Integrations/Akoya | Get Akoya Token |
| GET | /v1/Integrations/Akoya/GetToken | Integrations/Akoya | Used to get token from Akoya. |
| PUT | /v1/Integrations/Akoya/Institution | Integrations/Akoya | Updates the institution and options asynchronous. |
| GET | /v1/Integrations/Akoya/Institution/AlClient/Ids | Integrations/Akoya | Gets available databases by comma separatedList query string param |
| GET | /v1/Integrations/Akoya/Institution/AlClient/Search | Integrations/Akoya | Gets available databases by search text |
| GET | /v1/Integrations/Akoya/Institutions | Integrations/Akoya | Get list of all the institutions |
| GET | /v1/Integrations/Akoya/Legacy/Institution | Integrations/Akoya | Returns all institutions with Image |
| GET | /v1/Integrations/Akoya/Redirect | Integrations/Akoya | Redirects the caller to a URL to authenticate with Akoya. |
| GET | /v1/Integrations/Akoya/RefreshAkoyaToken | Integrations/Akoya | Refresh Akoya Token |
| GET | /v1/Integrations/Akoya/Revoke | Integrations/Akoya | Revoke Token |
| GET | /v1/Integrations/Akoya/Revoke/{institution} | Integrations/Akoya | Revoke Akoya Refresh Token. |
| PUT | /v1/Integrations/Akoya/SetAkoyaLinkedAccounts | Integrations/Akoya | Set Akoya Linked Accounts pass in set settings |
| PUT | /v1/Integrations/Akoya/Token/Household | Integrations/Akoya | Updates the ClientId/HouseholdId on an akoya token |
| GET | /v1/Integrations/Apex/Account | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Account/{id} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/AccountsDisposition | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/ACHRelationship/{id}/{type}/{direction} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/AutomatedAccount | Integrations/Apex |  |
| POST | /v1/Integrations/Apex/AutomatedAccount | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Download/{snapId} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/File/{apexAccountNumber} | Integrations/Apex |  |
| POST | /v1/Integrations/Apex/Investigation | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Investigation/{accountRequestId} | Integrations/Apex |  |
| DELETE | /v1/Integrations/Apex/Investigation/{sketchId} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Mapping | Integrations/Apex |  |
| POST | /v1/Integrations/Apex/Mapping/{id}/{accountName} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Message/{apexAccountNumber} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/NewMessages/{apexAccountNumber} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/RepBranchCode | Integrations/Apex |  |
| POST | /v1/Integrations/Apex/RepBranchCode | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/RepBranchCode/Client/{clientId} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Setup/Firm | Integrations/Apex |  |
| POST | /v1/Integrations/Apex/Setup/Firm | Integrations/Apex |  |
| DELETE | /v1/Integrations/Apex/Setup/Firm/{alClientId} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Setup/HighWatermark/{alClientId} | Integrations/Apex |  |
| POST | /v1/Integrations/Apex/Setup/HighWatermark/{alClientId} | Integrations/Apex |  |
| PUT | /v1/Integrations/Apex/Setup/HighWatermark/{alClientId} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Setup/SystemConfig/{alClientId} | Integrations/Apex |  |
| POST | /v1/Integrations/Apex/Setup/SystemConfig/{alClientId} | Integrations/Apex |  |
| PUT | /v1/Integrations/Apex/Setup/SystemConfig/{alClientId} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Setup/TestSettings | Integrations/Apex |  |
| POST | /v1/Integrations/Apex/Setup/TestSettings | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Setup/UserConfig/{alClientId} | Integrations/Apex |  |
| POST | /v1/Integrations/Apex/Setup/UserConfig/{alClientId} | Integrations/Apex |  |
| PUT | /v1/Integrations/Apex/Setup/UserConfig/{alClientId} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Transaction | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/Transaction/{accountId} | Integrations/Apex |  |
| GET | /v1/Integrations/Apex/TransactionDisposition | Integrations/Apex |  |
| GET | /v1/Integrations/Apps/Management/PartnerApps | Integrations/Apps |  |
| GET | /v1/Integrations/Apps/Management/PartnerApps/{partnerAppId} | Integrations/Apps |  |
| GET | /v1/Integrations/Apps/Management/PartnerApps/{partnerAppId}/Whitelist | Integrations/Apps |  |
| POST | /v1/Integrations/Apps/Management/PartnerApps/{partnerAppId}/Whitelist | Integrations/Apps |  |
| PUT | /v1/Integrations/Apps/Management/PartnerApps/{partnerAppId}/Whitelist | Integrations/Apps |  |
| DELETE | /v1/Integrations/Apps/Management/PartnerApps/{partnerAppId}/Whitelist/{whitelistEntryId} | Integrations/Apps |  |
| GET | /v1/Integrations/Ascent/Redirect | Integrations/Ascent | Return the URL to the Ascent page, with an authorization token. |
| POST | /v1/Integrations/AssetMap/Actions/Remove | Integrations/AssetMap | Removes the AssetMap integration for the current firm. |
| POST | /v1/Integrations/AssetMap/Actions/Setup | Integrations/AssetMap | Adds the AssetMap integration for the current firm. |
| GET | /v1/Integrations/AssetMap/GetConfigurations | Integrations/AssetMap |  |
| GET | /v1/Integrations/AssetMap/GetLoginToken | Integrations/AssetMap | Gets a login token from Asset-Map. |
| GET | /v1/Integrations/AssetMap/GetToken | Integrations/AssetMap | Gets an authentication token from Asset-Map. |
| GET | /v1/Integrations/AssetMap/Redirect | Integrations/AssetMap | Gets the redirect URL for the user to authenticate with Asset-Map. |
| GET | /v1/Integrations/AssetMap/SaveToken | Integrations/AssetMap | Used to get token from Fidelity. |
| GET | /v1/Integrations/Astro/Account/{accountId}/InvestmentStrategySetting | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/Account/{accountId}/InvestorPreference | Integrations/Astro |  |
| GET | /v1/Integrations/Astro/Accounts/{accountId} | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/Accounts/{accountId} | Integrations/Astro |  |
| GET | /v1/Integrations/Astro/Accounts/{accountId}/Accounts | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/Accounts/{accountId}/Holdings | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/Accounts/{accountId}/Optimizer | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/Accounts/{accountId}/Optimizer/Enable/{enable} | Integrations/Astro |  |
| GET | /v1/Integrations/Astro/Accounts/{accountId}/Template | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/AssetRestrictions | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/AstroSyncAfterTaxReport | Integrations/Astro | Get Astro after Tax Reporting Metrics |
| GET | /v1/Integrations/Astro/BenchmarkDetail | Integrations/Astro | Returns benchmark detail per template or accountId |
| GET | /v1/Integrations/Astro/Benchmarks | Integrations/Astro |  |
| GET | /v1/Integrations/Astro/Benchmarks/{benchmarkId}/Templates | Integrations/Astro |  |
| GET | /v1/Integrations/Astro/Clients/{clientId}/Accounts | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/CreateOrders | Integrations/Astro | Accept a list of orders, validate the orders and then create the orders based on an entity option in either eclipse or tom. |
| GET | /v1/Integrations/Astro/ESG/Restriction/Securities | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/HoldingRestriction/ValidateImport | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/Prospect/Holdings | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/Prospect/Holdings/Validate | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/Prospect/UpdateHoldings/{accountId} | Integrations/Astro |  |
| GET | /v1/Integrations/Astro/Registrations/{regId}/Accounts | Integrations/Astro |  |
| POST | /v1/Integrations/Astro/SubmitOptimization/{accountId} | Integrations/Astro |  |
| GET | /v1/Integrations/Astro/SubReport/{accountId} | Integrations/Astro | Returns the summary, gain/loss, top ten, and sector percentage data for the Astro subReport. |
| GET | /v1/Integrations/Astro/TaxSchedules/{accountId} | Integrations/Astro |  |
| GET | /v1/Integrations/Astro/TaxSchedules/Year/{year} | Integrations/Astro |  |
| GET | /v1/Integrations/Astro/Templates/Simple | Integrations/Astro |  |
| POST | /v1/Integrations/Axos/GetToken | Integrations/Axos |  |
| PUT | /v1/Integrations/Axos/GetToken | Integrations/Axos |  |
| GET | /v1/Integrations/Axos/RefreshToken | Integrations/Axos |  |
| GET | /v1/Integrations/Axos/Statement/Download | Integrations/Axos |  |
| GET | /v1/Integrations/Axos/Statements | Integrations/Axos |  |
| GET | /v1/Integrations/Axos/TaxForm/Download | Integrations/Axos |  |
| GET | /v1/Integrations/Axos/TaxForms | Integrations/Axos |  |
| GET | /v1/Integrations/BasisCode/Action/SAML | Integrations/BasisCode |  |
| GET | /v1/Integrations/BizEquity/Action/SAML | Integrations/BizEquity |  |
| POST | /v1/Integrations/BizEquity/Actions/Remove | Integrations/BizEquity | Removes the AssetMap integration for the current firm. |
| POST | /v1/Integrations/BizEquity/Actions/Setup | Integrations/BizEquity | Adds the AssetMap integration for the current firm. |
| GET | /v1/Integrations/BizEquity/BizUser | Integrations/BizEquity |  |
| PUT | /v1/Integrations/BizEquity/BizUser | Integrations/BizEquity |  |
| GET | /v1/Integrations/BizEquity/Redirect | Integrations/BizEquity |  |
| POST | /v1/Integrations/BlackRock/Actions/Remove | Integrations/BlackRock | Removes the AssetMap integration for the current firm. |
| POST | /v1/Integrations/BlackRock/Actions/Setup | Integrations/BlackRock | Adds the AssetMap integration for the current firm. |
| GET | /v1/Integrations/BlackRock/Analyzer/{modelId} | Integrations/BlackRock |  |
| POST | /v1/Integrations/BlackRock/AssignModel | Integrations/BlackRock | Evaluate the ids and assign the community model to the appropriate record. |
| POST | /v1/Integrations/BlackRock/CoriIncome | Integrations/BlackRock | Gets the income from BlackRock iRetire based on inputs.  if the inputs are left null, then defaults will be used. |
| GET | /v1/Integrations/BlackRock/iRetireSSO | Integrations/BlackRock |  |
| POST | /v1/Integrations/BlackRock/ModelName | Integrations/BlackRock | Sets the modelName on the passed in portfolioId |
| GET | /v1/Integrations/BlackRock/Redirect | Integrations/BlackRock |  |
| GET | /v1/Integrations/Blaze/Configuration | Integrations/Blaze | Gets the configuration data for Blaze for the current user. |
| POST | /v1/Integrations/Blaze/Remove | Integrations/Blaze | Removes the Blaze integration for the current user. |
| POST | /v1/Integrations/Blaze/RescheduleJob | Integrations/Blaze | Update a job schedule for Blaze for the current user. |
| POST | /v1/Integrations/Blaze/RunJobNow | Integrations/Blaze | Runs the job schedule for Blaze for the current user. |
| POST | /v1/Integrations/Blaze/ScheduleJob | Integrations/Blaze | Schedules a job schedule for Blaze for the current user. |
| POST | /v1/Integrations/Blaze/Setup | Integrations/Blaze | Sets up Blaze integration for the current user. |
| POST | /v1/Integrations/Blaze/UnscheduleJob | Integrations/Blaze | Removes the job schedule for Blaze for the current user. |
| DELETE | /v1/Integrations/BluePay/{key} | Integrations/BluePay | Used to save Credit Card information to Blue Pay |
| POST | /v1/Integrations/BluePay/{key}/StoreACHInfo | Integrations/BluePay | Used to save ACH information to Blue Pay |
| POST | /v1/Integrations/BluePay/{key}/StoreCreditCard | Integrations/BluePay | Used to save Credit Card information to Blue Pay |
| GET | /v1/Integrations/BluePay/Configuration | Integrations/BluePay | Retrieves Bluepay Integration details. |
| PUT | /v1/Integrations/BluePay/Configuration | Integrations/BluePay | Saves BluePay integration settings. |
| POST | /v1/Integrations/BluePay/Notify | Integrations/BluePay | Notification from Bluepay that data has been processed |
| POST | /v1/Integrations/BluePay/NotifyTest | Integrations/BluePay | Notification for testing fake BluePay messages |
| GET | /v1/Integrations/ByAllAccounts/Configuration | Integrations/ByAllAccounts | Retrieves ByAllAccounts Integration details. |
| PUT | /v1/Integrations/ByAllAccounts/Configuration | Integrations/ByAllAccounts | Saves ByAllAccounts integration settings. |
| GET | /v1/Integrations/ByAllAccounts/CreateAdvisorCreds | Integrations/ByAllAccounts | Creates new advisor level creds |
| GET | /v1/Integrations/ByAllAccounts/CreateInvestorCreds | Integrations/ByAllAccounts | Creates new investor level creds |
| DELETE | /v1/Integrations/ByAllAccounts/Delete/{baaId}/Account/{baaAccountId} | Integrations/ByAllAccounts | Delete Account from the UI without using the IFrame. |
| GET | /v1/Integrations/ByAllAccounts/GetAccountsAndHoldings | Integrations/ByAllAccounts | Get the Account and Holdings for the User. |
| GET | /v1/Integrations/ByAllAccounts/GetAggregatedAccountData | Integrations/ByAllAccounts | Get the Account and Holdings for the User. |
| GET | /v1/Integrations/ByAllAccounts/Holding/Investor/{key} | Integrations/ByAllAccounts |  |
| GET | /v1/Integrations/ByAllAccounts/SSO | Integrations/ByAllAccounts |  |
| GET | /v1/Integrations/ByAllAccounts/SSOToken | Integrations/ByAllAccounts | Get the SSO Token. Do not create advisor or investor creds |
| GET | /v1/Integrations/CAIS/InsightUrl | Integrations/CAIS |  |
| GET | /v1/Integrations/CapitalNetwork/SSO | Integrations/CapitalNetwork |  |
| GET | /v1/Integrations/Cetera/CRDBD | Integrations/Cetera |  |
| GET | /v1/Integrations/Cetera/SFCase | Integrations/Cetera |  |
| POST | /v1/Integrations/Cetera/SFCase | Integrations/Cetera |  |
| GET | /v1/Integrations/Cheetah/Configuration | Integrations/Cheetah | Retrieves Cheetah Integration details. |
| PUT | /v1/Integrations/Cheetah/Configuration | Integrations/Cheetah | Saves Cheetah integration settings. |
| GET | /v1/Integrations/ChicagoClearing/Configuration | Integrations/ChicagoClearing | Gets the configuration data for ChicagoClearing for the current user. |
| POST | /v1/Integrations/ChicagoClearing/Remove | Integrations/ChicagoClearing | Removes the ChicagoClearing integration for the current user. |
| POST | /v1/Integrations/ChicagoClearing/RescheduleJob | Integrations/ChicagoClearing | Update a job schedule for ChicagoClearing for the current user. |
| POST | /v1/Integrations/ChicagoClearing/RunJobNow | Integrations/ChicagoClearing | Runs the job schedule for ChicagoClearing for the current user. |
| POST | /v1/Integrations/ChicagoClearing/ScheduleJob | Integrations/ChicagoClearing | Schedules a job schedule for ChicagoClearing for the current user. |
| POST | /v1/Integrations/ChicagoClearing/Setup | Integrations/ChicagoClearing | Set up ChicagoClearing integration for the current user. |
| POST | /v1/Integrations/ChicagoClearing/UnscheduleJob | Integrations/ChicagoClearing | Removes the job schedule for ChicagoClearing for the current user. |
| GET | /v1/Integrations/CleverDome/Configuration | Integrations/CleverDome | Retrieves CleverDome Integration details. |
| PUT | /v1/Integrations/CleverDome/Configuration | Integrations/CleverDome | Saves CleverDome integration settings. |
| GET | /v1/Integrations/CleverDome/Configuration/Test | Integrations/CleverDome | Checks to see if CleverDome integration has been setup for this database. |
| POST | /v1/Integrations/CloudStorage/{provider}/Action/Share/{filepath} | Integrations/CloudStorage | Used to generate a share link to a file in cloud storage. |
| GET | /v1/Integrations/CloudStorage/{provider}/Browse/{filepath} | Integrations/CloudStorage | Used to browse folders and view file meta data from cloud storage. |
| DELETE | /v1/Integrations/CloudStorage/{provider}/Credentials | Integrations/CloudStorage | Used to remove previously saved cloud storage credentials. |
| POST | /v1/Integrations/CloudStorage/{provider}/Credentials | Integrations/CloudStorage | Used to save cloud storage credentials. Each provider has a different representation of credentials that must be posted as json in the message body. |
| PUT | /v1/Integrations/CloudStorage/{provider}/Credentials | Integrations/CloudStorage | Used to save cloud storage credentials. Each provider has a different representation of credentials that must be posted as json in the message body. |
| DELETE | /v1/Integrations/CloudStorage/{provider}/Data/{filepath} | Integrations/CloudStorage | Used to delete a file from cloud storage. |
| GET | /v1/Integrations/CloudStorage/{provider}/Data/{filepath} | Integrations/CloudStorage | Used to download a file from cloud storage. |
| POST | /v1/Integrations/CloudStorage/{provider}/Data/{filepath} | Integrations/CloudStorage | Used to upload a file to cloud storage. |
| GET | /v1/Integrations/CloudStorage/{provider}/FileById/{itemId} | Integrations/CloudStorage | Used to download a file from cloud storage. |
| GET | /v1/Integrations/CloudStorage/{provider}/Redirect | Integrations/CloudStorage | Used to automatically redirect the user's browser to the appropriate cloud storage provider's oauth page. |
| GET | /v1/Integrations/CloudStorage/List | Integrations/CloudStorage | Used to get list of configured cloud storage providers. |
| GET | /v1/Integrations/Communities/Custodians/List | Integrations/Communities |  |
| GET | /v1/Integrations/Communities/DailySyncLogDetails/{key} | Integrations/Communities | Get daily sync log by processLogId for Communities |
| GET | /v1/Integrations/Communities/DailySyncLogs | Integrations/Communities | Get daily sync logs for Communities |
| GET | /v1/Integrations/Communities/ManagerFactSheet/{modelId} | Integrations/Communities | Get the model fact sheet from v2 communities |
| GET | /v1/Integrations/Communities/ModelAllocationHistory/{id} | Integrations/Communities | Get Model Allocation History by model Id |
| GET | /v1/Integrations/Communities/Models | Integrations/Communities | Gets community models. |
| GET | /v1/Integrations/Communities/Models/{key} | Integrations/Communities | Returns the Community model that has the given {key}.  If the specified model does not exist, or isn't accessible to the logged in user, an HTTP 404 status code is returned. |
| PUT | /v1/Integrations/Communities/Models/{key} | Integrations/Communities | Updates the community model that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Integrations/Communities/Models/AssignedToAccounts/Validate | Integrations/Communities |  |
| GET | /v1/Integrations/Communities/Models/CountModelsNeedingRebalance | Integrations/Communities | Gets community models. |
| POST | /v1/Integrations/Communities/Models/List | Integrations/Communities | Returns the models that have the given {keys}. |
| POST | /v1/Integrations/Communities/Models/OutsourceModelInfo | Integrations/Communities |  |
| GET | /v1/Integrations/Communities/Models/Simple | Integrations/Communities | Gets community models. |
| POST | /v1/Integrations/Communities/Models/SimpleList | Integrations/Communities | Get Model information by Community Model Id's |
| POST | /v1/Integrations/Communities/ModelUpdate | Integrations/Communities | Create, Update, Delete sync of Models from Communities to Orion Connect. |
| GET | /v1/Integrations/Communities/Performance/{modelId} | Integrations/Communities | Community Model Performance |
| POST | /v1/Integrations/Communities/Personal/GetPersonalDataForSync | Integrations/Communities |  |
| GET | /v1/Integrations/Communities/ProductExclusions/Sync | Integrations/Communities |  |
| GET | /v1/Integrations/Communities/Products/Sync | Integrations/Communities |  |
| PUT | /v1/Integrations/Communities/RemoveRebalanceRequestedDate/{key} | Integrations/Communities | Removes the rebalance requested date from the community model |
| POST | /v1/Integrations/Communities/Reports/StrategistAumReport | Integrations/Communities |  |
| POST | /v1/Integrations/Communities/Reports/StrategistFlowReport | Integrations/Communities |  |
| GET | /v1/Integrations/Communities/StrategistTiers | Integrations/Communities |  |
| PUT | /v1/Integrations/Communities/UpdateRebalanceExecutionRequestedDate | Integrations/Communities |  |
| GET | /v1/Integrations/Configuration/{app}/Client | Integrations/Configuration | Returns the integration information for the specified ClientId. |
| PUT | /v1/Integrations/Configuration/{app}/Client | Integrations/Configuration |  |
| GET | /v1/Integrations/Configuration/{app}/Firm | Integrations/Configuration | Returns the integration information for the current Firm the user is logged into. This is helpful for saving firm specific integration information. |
| PUT | /v1/Integrations/Configuration/{app}/Firm | Integrations/Configuration | Updates the Firm level integration Information. |
| GET | /v1/Integrations/Configuration/{app}/Profile | Integrations/Configuration | Returns the integraton information for the Profile. A profile is a User / Firm combination.  Some users have access to more than one firm. |
| PUT | /v1/Integrations/Configuration/{app}/Profile | Integrations/Configuration |  |
| GET | /v1/Integrations/Configuration/{app}/System | Integrations/Configuration | Returns integration information at a System Level (system level = all orion firms and databases). This is helpful for and Orion Id, or a URL that would not change from one firm to another. |
| PUT | /v1/Integrations/Configuration/{app}/System | Integrations/Configuration | Updates the config information for the System Level |
| GET | /v1/Integrations/Configuration/{app}/User | Integrations/Configuration | Returns integration information for the currently logged in user (if userId=null) or the supplied userid. |
| PUT | /v1/Integrations/Configuration/{app}/User | Integrations/Configuration | Updates the integration information for the User. |
| GET | /v1/Integrations/CustodialIntegrator/AkoyaAccounts | Integrations/CustodialIntegrator | Get all AkoyaAccounts. |
| GET | /v1/Integrations/CustodialIntegrator/AkoyaAccounts/{key} | Integrations/CustodialIntegrator | Gets the AkoyaAccount that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/AkoyaAccounts/{key} | Integrations/CustodialIntegrator | Updates the AkoyaAccount that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Integrations/CustodialIntegrator/AkoyaAccounts/Logs | Integrations/CustodialIntegrator | Gets Account Logs from the database. {     akoyaAccountId=123ABC     startDate=10-19-2023     endDate=10-29-2023 } |
| GET | /v1/Integrations/CustodialIntegrator/AkoyaAccounts/Simple | Integrations/CustodialIntegrator | Gets Akoya Accounts simple object |
| GET | /v1/Integrations/CustodialIntegrator/AkoyaGlobalSymbols | Integrations/CustodialIntegrator | Get all AkoyaGlobalSymbols. |
| POST | /v1/Integrations/CustodialIntegrator/AkoyaGlobalSymbols | Integrations/CustodialIntegrator |  |
| POST | /v1/Integrations/CustodialIntegrator/AkoyaGlobalSymbols/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/AkoyaGlobalSymbols/Institutions | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/ByAllAccounts | Integrations/CustodialIntegrator | Get all ByAllAccounts. |
| POST | /v1/Integrations/CustodialIntegrator/ByAllAccounts | Integrations/CustodialIntegrator | Adds a new ByAllAccount to the database. |
| GET | /v1/Integrations/CustodialIntegrator/ByAllAccounts/{key} | Integrations/CustodialIntegrator | Gets the ByAllAccount that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllAccounts/{key} | Integrations/CustodialIntegrator | Updates the ByAllAccount that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllAccounts/Action/Backdate | Integrations/CustodialIntegrator | Backdates a list of ByAllAccounts to the specified date. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllAccounts/Action/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/ByAllGlobalSymbols | Integrations/CustodialIntegrator | Get all ByAllGlobalSymbols. |
| POST | /v1/Integrations/CustodialIntegrator/ByAllGlobalSymbols | Integrations/CustodialIntegrator | Adds a new ByAllGlobalSymbol to the database. |
| GET | /v1/Integrations/CustodialIntegrator/ByAllGlobalSymbols/{key} | Integrations/CustodialIntegrator | Gets the ByAllGlobalSymbol that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllGlobalSymbols/{key} | Integrations/CustodialIntegrator | Updates the ByAllGlobalSymbol that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllGlobalSymbols/Action/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/ByAllLocalSymbols | Integrations/CustodialIntegrator | Get all ByAllLocalSymbols. |
| POST | /v1/Integrations/CustodialIntegrator/ByAllLocalSymbols | Integrations/CustodialIntegrator | Adds a new ByAllLocalSymbol to the database. |
| GET | /v1/Integrations/CustodialIntegrator/ByAllLocalSymbols/{key} | Integrations/CustodialIntegrator | Gets the ByAllLocalSymbol that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllLocalSymbols/{key} | Integrations/CustodialIntegrator | Updates the ByAllLocalSymbol that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllLocalSymbols/Action/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/ByAllNoteMappings | Integrations/CustodialIntegrator | Get all ByAllByAllNoteMappings. |
| POST | /v1/Integrations/CustodialIntegrator/ByAllNoteMappings | Integrations/CustodialIntegrator | Adds a new ByAllNoteMapping to the database. |
| GET | /v1/Integrations/CustodialIntegrator/ByAllNoteMappings/{key} | Integrations/CustodialIntegrator | Gets the ByAllNoteMapping that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllNoteMappings/{key} | Integrations/CustodialIntegrator | Updates the ByAllNoteMapping that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllNoteMappings/Action/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/ByAllOffsetSymbol | Integrations/CustodialIntegrator | Get all Offset Symbols. |
| POST | /v1/Integrations/CustodialIntegrator/ByAllOffsetSymbol | Integrations/CustodialIntegrator | Create new Offset Symbol |
| GET | /v1/Integrations/CustodialIntegrator/ByAllOffsetSymbol/{key} | Integrations/CustodialIntegrator | Get Offset Symbol by key. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllOffsetSymbol/{key} | Integrations/CustodialIntegrator | Update Offset Symbol by key |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllOffsetSymbol/Action/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/ByAllTreatments | Integrations/CustodialIntegrator | Get all ByAllTreatments. |
| POST | /v1/Integrations/CustodialIntegrator/ByAllTreatments | Integrations/CustodialIntegrator | Adds a new ByAllTreatment to the database. |
| GET | /v1/Integrations/CustodialIntegrator/ByAllTreatments/{key} | Integrations/CustodialIntegrator | Gets the ByAllTreatment that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllTreatments/{key} | Integrations/CustodialIntegrator | Updates the ByAllTreatment that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/ByAllTreatments/Action/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/ByAllTreatmentTypes | Integrations/CustodialIntegrator | Get all ByAllTreatmentTypes. |
| GET | /v1/Integrations/CustodialIntegrator/PlaidAccounts | Integrations/CustodialIntegrator | Gets all of the Plaid accounts. |
| GET | /v1/Integrations/CustodialIntegrator/PlaidAccounts/{key} | Integrations/CustodialIntegrator | Gets the PlaidAccount that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/PlaidAccounts/{key} | Integrations/CustodialIntegrator | Updates the PlaidAccount that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Integrations/CustodialIntegrator/PlaidNoteMappings | Integrations/CustodialIntegrator | Get all PlaidNoteMappings. |
| POST | /v1/Integrations/CustodialIntegrator/PlaidNoteMappings | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/PlaidNoteMappings/{key} | Integrations/CustodialIntegrator | Gets the PlaidNoteMapping that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/PlaidNoteMappings/{key} | Integrations/CustodialIntegrator | Updates the PlaidNoteMapping that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/PlaidNoteMappings/Action/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/PlaidSecurityMappings | Integrations/CustodialIntegrator | Get all PlaidSecurityMappings. |
| POST | /v1/Integrations/CustodialIntegrator/PlaidSecurityMappings | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/PlaidSecurityMappings/{key} | Integrations/CustodialIntegrator | Gets the PlaidSecurityMapping that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/PlaidSecurityMappings/{key} | Integrations/CustodialIntegrator | Updates the PlaidSecurityMapping that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/PlaidSecurityMappings/Action/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/PlaidUnitBalanceOverrides | Integrations/CustodialIntegrator | Get all PlaidUnitBalanceOverrides. |
| POST | /v1/Integrations/CustodialIntegrator/PlaidUnitBalanceOverrides | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/CustodialIntegrator/PlaidUnitBalanceOverrides/{key} | Integrations/CustodialIntegrator | Gets the PlaidUnitBalanceOverride that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/PlaidUnitBalanceOverrides/{key} | Integrations/CustodialIntegrator | Updates the PlaidUnitBalanceOverride that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/CustodialIntegrator/PlaidUnitBalanceOverrides/Action/Delete | Integrations/CustodialIntegrator |  |
| GET | /v1/Integrations/Custodian/Account/{accountId} | Integrations/Custodian |  |
| GET | /v1/Integrations/Custodian/Account/{accountId}/FidelityType | Integrations/Custodian |  |
| GET | /v1/Integrations/Custodian/Client/{clientId} | Integrations/Custodian |  |
| GET | /v1/Integrations/Custodian/Document | Integrations/Custodian |  |
| GET | /v1/Integrations/Custodian/Document/{custodian}/{documentType} | Integrations/Custodian | Returns the document. |
| GET | /v1/Integrations/Custodian/Document/{custodian}/{documentType}/{id} | Integrations/Custodian | Returns the document. |
| GET | /v1/Integrations/Custodian/Document/Client/{clientId} | Integrations/Custodian | This is the starting point for getting Client Custodian Documents. |
| GET | /v1/Integrations/Custodian/Document/Client/BrinkerTest/{clientId} | Integrations/Custodian |  |
| GET | /v1/Integrations/Custodian/Document/Custodian/{custodian}/Client/{orionClientId} | Integrations/Custodian | Get documents for by custodian and client Id |
| GET | /v1/Integrations/CustodianDashboard/Account/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/AccountBalance/Account/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/Auth/Account/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/costbasis/positions/Account/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/costbasis/transactions/Account/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/Documents/Account/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/Documents/Account/{accountId}/DocumentType/{documentType} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/Positions/Account/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/RefreshToken | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/SI/AccountId/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/SI/Details/AccountId/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/SI/Details/ByDetailId/{detailId}/master/{masterAccount}/account/{account} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDashboard/Transactions/Account/{accountId} | Integrations/CustodianDashboard |  |
| GET | /v1/Integrations/CustodianDocuments/Advisor/Account/{accountId} | Integrations/CustodianDocuments |  |
| GET | /v1/Integrations/CustodianDocuments/Advisor/Client/{clientId} | Integrations/CustodianDocuments |  |
| GET | /v1/Integrations/CustodianDocuments/Advisor/Custodian/{custodian}/Account/{accountId} | Integrations/CustodianDocuments |  |
| GET | /v1/Integrations/CustodianDocuments/Advisor/Custodian/{custodian}/Client/{clientId} | Integrations/CustodianDocuments |  |
| GET | /v1/Integrations/CustodianDocuments/Advisor/Download/{custodian}/{documentType}/{id} | Integrations/CustodianDocuments |  |
| GET | /v1/Integrations/DataTransmissionService/CurrentUser | Integrations/DataTransmissionService |  |
| GET | /v1/Integrations/DataTransmissionService/GoldmanSachs/Beneficiaries | Integrations/DataTransmissionService |  |
| GET | /v1/Integrations/DataTransmissionService/GoldmanSachs/RMD | Integrations/DataTransmissionService |  |
| GET | /v1/Integrations/DataTransmissionService/GoldmanSachs/SsoSignInUrl | Integrations/DataTransmissionService | Gets the vendor sign-in URL for Inbound SSO (Part B). Use after Part A authorization to open vendor portal in new tab. |
| GET | /v1/Integrations/DataTransmissionService/GoldmanSachs/SsoUrl | Integrations/DataTransmissionService | Gets the URL to initiate Goldman Sachs SSO (Part A - Authorize). Redirect user to this URL to start OAuth. |
| GET | /v1/Integrations/DataTransmissionService/GoldmanSachs/TokenEstablished | Integrations/DataTransmissionService | Checks if the current user has completed Goldman Sachs OAuth and has a token established. |
| GET | /v1/Integrations/Dimensional/Action/SAML | Integrations/Dimensional |  |
| DELETE | /v1/Integrations/Docusign/DeleteDocusignLogin | Integrations/Docusign | Uses callback code to get IntegrationInfo for DocuSign. |
| GET | /v1/Integrations/Docusign/GetEnvelope | Integrations/Docusign | Get Account information. |
| GET | /v1/Integrations/Docusign/GetToken | Integrations/Docusign | Uses callback code to get IntegrationInfo for DocuSign. |
| GET | /v1/Integrations/Docusign/GetUserInfo | Integrations/Docusign | Exchanges refresh token for new access token. |
| GET | /v1/Integrations/Docusign/Logins | Integrations/Docusign | Get the Account logins for the user. |
| GET | /v1/Integrations/Docusign/Redirect | Integrations/Docusign | Uses DocuSign to add new account. |
| GET | /v1/Integrations/Docusign/RefreshToken | Integrations/Docusign | Exchanges refresh token for new access token. |
| POST | /v1/Integrations/Docusign/SaveEnvelope | Integrations/Docusign | Uses callback code to get IntegrationInfo for DocuSign. |
| PUT | /v1/Integrations/Docusign/SaveIntegrationInfo | Integrations/Docusign | Uses callback code to get IntegrationInfo for DocuSign. |
| POST | /v1/Integrations/Docusign/Sign/Selfservice | Integrations/Docusign |  |
| POST | /v1/Integrations/DPL/AcceptTos | Integrations/DPL |  |
| GET | /v1/Integrations/DPL/IsEnabled | Integrations/DPL |  |
| GET | /v1/Integrations/DPL/TosStatus | Integrations/DPL |  |
| GET | /v1/Integrations/DPL/WidgetConfig | Integrations/DPL |  |
| GET | /v1/Integrations/Eclipse/Accounts/{accountId}/Holdings | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Accounts/External/{externalAccountId} | Integrations/Eclipse | Return the Eclipse account based on OC account and firm ids |
| POST | /v1/Integrations/Eclipse/Actions/InitiateV2ImportOnEclipse | Integrations/Eclipse | Initiates the Import Process on EclipseV2 |
| POST | /v1/Integrations/Eclipse/Actions/StartExtract | Integrations/Eclipse | This was the endpoint for starting the V1 Import process. It has been deprecated and will most likely be completely removed in a future update. For now, it will return '400-BadRequest' with appropriate messaging to indicate future intent. |
| POST | /v1/Integrations/Eclipse/Actions/StartExtractV2 | Integrations/Eclipse | Starts the Eclipse extract, which notifies eclipse the extract is starting, loads the file into S3, then notifies eclipse the extract is complete. |
| PUT | /v1/Integrations/Eclipse/Actions/UpdateSleevePortfolio/{regId}/{firmId} | Integrations/Eclipse | Sync sleeve changes from Orion to Eclipse. |
| GET | /v1/Integrations/Eclipse/ClientPortal/{accountId}/CashInfo | Integrations/Eclipse | Get cash info for an account from eclipse given an orion account id |
| GET | /v1/Integrations/Eclipse/ClientPortal/Account/{accountId}/TradedToday | Integrations/Eclipse | Get all the current trade orders from eclipse |
| GET | /v1/Integrations/Eclipse/ClientPortal/Allocations/{accountId}/{modelAggId} | Integrations/Eclipse | Get model allocations |
| PUT | /v1/Integrations/Eclipse/ClientPortal/DeleteTradeInstance | Integrations/Eclipse | Client portal originally used TradeRequestInstancesController, ActionDisable().  Not really supposed to delete it, just disable apparently. Not sure that's an option. i know this looks bad, i'm not on trading. |
| POST | /v1/Integrations/Eclipse/ClientPortal/GenerateTrades | Integrations/Eclipse | Generates trades of any type based on the instructions in the tradeDefinition provided in the request body. This needs some cleaning up based on swagger api |
| POST | /v1/Integrations/Eclipse/ClientPortal/Rebalance/{portfolioId} | Integrations/Eclipse | Rebalance the portfolio. With TOM, it rebalances by account thru client portal |
| POST | /v1/Integrations/Eclipse/ClientPortal/ValidateTrades | Integrations/Eclipse | Validate trades against eclipse v2 /api/v2/TradeOrder/Trades/Action/Validate |
| POST | /v1/Integrations/Eclipse/CreateOrders | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/CreatePendingTransactions | Integrations/Eclipse | Create pending transactions from orders that were created in Eclipse |
| POST | /v1/Integrations/Eclipse/DeleteTransactions | Integrations/Eclipse | Delete transactions that are linked to orders deleted in Eclipse |
| GET | /v1/Integrations/Eclipse/Firms | Integrations/Eclipse | Returns all the Eclipse firms in AdviosrLynx |
| POST | /v1/Integrations/Eclipse/Firms | Integrations/Eclipse | Creates new Eclipse Firm in the OAS Database |
| DELETE | /v1/Integrations/Eclipse/Firms/{key} | Integrations/Eclipse | Deletes the existing Sleeve Strategy |
| GET | /v1/Integrations/Eclipse/Firms/{key} | Integrations/Eclipse | Returns all the Eclipse Firm AlClient information in AdviosrLynx |
| PUT | /v1/Integrations/Eclipse/Firms/{key} | Integrations/Eclipse | Edit Eclipse Firm and Eclipse Firm AlClient |
| GET | /v1/Integrations/Eclipse/Firms/ByAlClientId/{key} | Integrations/Eclipse | Returns all the Eclipse Firm AlClient information in AdviosrLynx |
| GET | /v1/Integrations/Eclipse/Firms/DefaultByAlClientId/{key} | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/Firms/SetDefaultEclipseFirmForAlClient | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Households/{clientId}/Portfolios | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Households/{clientId}/TradeOrder/Instances | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/Instances/{instanceId}/UpdateStatus | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/ModelAssignment | Integrations/Eclipse | Update model assignment for accounts, and sets/update portfolio allocation information. |
| GET | /v1/Integrations/Eclipse/Models/{modelId} | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Models/{modelId}/Allocations | Integrations/Eclipse |  |
| DELETE | /v1/Integrations/Eclipse/Models/{modelId}/Portfolios/{portfolioId} | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/Models/{modelId}/Portfolios/{portfolioId} | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Models/Search | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/ModelUpdate | Integrations/Eclipse | Create, Update, Delete sync of Models from Eclipse to Orion |
| GET | /v1/Integrations/Eclipse/Portfolio/CustodialInformation | Integrations/Eclipse | Returns information about the accounts and or sleeves associated to the account.  LastRebance, PendingModelChange, TradingInProcess ect. |
| PUT | /v1/Integrations/Eclipse/Portfolio/Portfolios/Update | Integrations/Eclipse | Updates the portfolio trade blocked field. |
| POST | /v1/Integrations/Eclipse/PortfolioAssignment | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/PortfolioAssignment/InitiateSync | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/Portfolios | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Portfolios/{entity}/{entityId} | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Portfolios/{portfolioId} | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Portfolios/{portfolioId}/Allocations | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Portfolios/{portfolioId}/Holdings | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Portfolios/{portfolioId}/Pending/Model | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/Portfolios/{portfolioId}/Rebalance | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Portfolios/{portfolioId}/V2Allocations | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/Portfolios/ByOrionAccount/Rebalance | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Privileges | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Securities/Search | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Securities/Search/{resultsCount} | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/TradeAnalysisReports | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/TradeOrder/Distributions | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/TradeOrder/Instances/{tradeOrderInstanceId}/Trades | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/TradeOrder/Trades | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/TradeOrder/Trades/Validate | Integrations/Eclipse |  |
| DELETE | /v1/Integrations/Eclipse/TradeOrders/Instances/{tradeOrderInstanceId} | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Trading/RaiseCash/Methods | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/Trading/SpendCash/Methods | Integrations/Eclipse |  |
| POST | /v1/Integrations/Eclipse/UpdateDoNotTrade | Integrations/Eclipse | With the release of the Multi-Trade Block Feature, this endpoint will no longer be used. |
| POST | /v1/Integrations/Eclipse/UpdateSma | Integrations/Eclipse |  |
| GET | /v1/Integrations/Eclipse/User/Privileges | Integrations/Eclipse |  |
| GET | /v1/Integrations/Element/AccountId/{accountId} | Integrations/Element |  |
| GET | /v1/Integrations/Element/household/{householdId}/workflows | Integrations/Element |  |
| GET | /v1/Integrations/Element/RiskToleranceQuestionnaire/email/{clientId}/{registrationId} | Integrations/Element |  |
| POST | /v1/Integrations/Element/RiskToleranceQuestionnaire/Retake | Integrations/Element |  |
| GET | /v1/Integrations/Element/SSO/BrinkerInstance | Integrations/Element |  |
| GET | /v1/Integrations/Element/SSO/OPSInstance | Integrations/Element |  |
| GET | /v1/Integrations/Element/SSO/Prospects | Integrations/Element |  |
| GET | /v1/Integrations/Element/SSO/TownsquareInstance | Integrations/Element |  |
| GET | /v1/Integrations/Element/UseSFCommunities | Integrations/Element |  |
| POST | /v1/Integrations/ElementTrading/Accounts/Sleeve/Rebalance | Integrations/ElementTrading |  |
| GET | /v1/Integrations/ElementTrading/Eclipse/Firm/{firmId}/Models | Integrations/ElementTrading | Gets a list of all eclipse models associated with a rep |
| GET | /v1/Integrations/ElementTrading/Eclipse/Firm/Cache | Integrations/ElementTrading |  |
| GET | /v1/Integrations/ElementTrading/Eclipse/Registrations/{registrationId}/Account | Integrations/ElementTrading |  |
| GET | /v1/Integrations/ElementTrading/Entity/{entityType}/{entityId}/RiskScoreModel | Integrations/ElementTrading |  |
| GET | /v1/Integrations/ElementTrading/Registrations/{registrationId}/EclipsePreferences | Integrations/ElementTrading | See Domains -> RepExpTrading -> TradingPreferencesController |
| POST | /v1/Integrations/ElementTrading/Registrations/{registrationId}/EclipsePreferences | Integrations/ElementTrading | See Domains -> Trading -> RepExpTrading -> TradingPreferencesController |
| GET | /v1/Integrations/ElementTrading/Reps/{repId}/ModelAggs/Minimal | Integrations/ElementTrading |  |
| POST | /v1/Integrations/ElementTrading/Tickers/NonExisting/Search | Integrations/ElementTrading |  |
| GET | /v1/Integrations/eMoney/Client/{clientId}/AssetHoldings/{resourceId} | Integrations/eMoney | Gets holding information for a specific product for a specific client from eMoney. |
| GET | /v1/Integrations/eMoney/Client/{clientId}/plans/{planId}/goals | Integrations/eMoney | Gets the goals for a specific plan for a client from eMoney. |
| GET | /v1/Integrations/eMoney/Client/{clientId}/plans/{planId}/projection/goalfunding/{goalId} | Integrations/eMoney | Gets goal funding for a specific clients plan from eMoney. |
| GET | /v1/Integrations/eMoney/Client/NetWorth | Integrations/eMoney | Gets specific client's Networth from eMoney. |
| GET | /v1/Integrations/eMoney/Client/Plan/Assets | Integrations/eMoney | Gets a specific plan's assets for a client from eMoney. |
| GET | /v1/Integrations/eMoney/GetClients | Integrations/eMoney |  |
| GET | /v1/Integrations/eMoney/SSO | Integrations/eMoney |  |
| GET | /v1/Integrations/eMoney/SSO/Client/{clientId} | Integrations/eMoney |  |
| GET | /v1/Integrations/eMoney/SSO/ClientPortal/{clientId} | Integrations/eMoney |  |
| GET | /v1/Integrations/Experian/AdditionSubscriberData | Integrations/Experian |  |
| POST | /v1/Integrations/Experian/AddMember | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/AlertReports | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/CreditReportData | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/CyberAgent | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/Delete | Integrations/Experian |  |
| POST | /v1/Integrations/Experian/DeleteMember | Integrations/Experian |  |
| POST | /v1/Integrations/Experian/Enroll | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/GetCreditscore | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/GetEnrollment | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/GetIDVerification | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/GetSubProfile | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/LoadMembers | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/OrderCreditReport | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/OrderCreditScore | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/OrderReport | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/ProductDisplay | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/SOASearch | Integrations/Experian |  |
| POST | /v1/Integrations/Experian/SOAUpdate | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/SSNTrace | Integrations/Experian |  |
| POST | /v1/Integrations/Experian/SubmitIDVerification | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/ThinLoad | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/UpdateAlertReports | Integrations/Experian |  |
| GET | /v1/Integrations/Experian/UpdateDisclosure | Integrations/Experian |  |
| GET | /v1/Integrations/FCS/Action/FocusSAML | Integrations/FCS |  |
| GET | /v1/Integrations/FCS/CheckSettings | Integrations/FCS |  |
| GET | /v1/Integrations/FCS/FocusUser | Integrations/FCS |  |
| PUT | /v1/Integrations/FCS/FocusUser | Integrations/FCS |  |
| GET | /v1/Integrations/FCS/GetLoanRequest | Integrations/FCS |  |
| GET | /v1/Integrations/Fidelity/AccountPositions | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/AccountTrxHistory | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/AcctBalance | Integrations/Fidelity | quoteCode can have three values 	R - Real-time Price - Price obtained at the time of the request. 	D - Delayed Price - Price refreshed between 15-30 minutes; depending on the type of security/exchange. 	C - Closing Price - Price as of the prior days close.    (Looks like you need permission to run this for Closing) Ind -   	intra - Return ""Intraday"" values in the response. 	recent - Return best available ""Recent"" values in the response. 	close - Return ""Close"" values in the response. (Looks like you need permission to run this for Closing) |
| GET | /v1/Integrations/Fidelity/ClientDocuments/Traceroute/{clientId} | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/ClientDocumentToken/Client/{clientId} | Integrations/Fidelity | A list of all the Clients Tokens for this Client |
| POST | /v1/Integrations/Fidelity/ClientDocumentToken/Client/{clientId} | Integrations/Fidelity | Adds a new Client to Fidelity Documents |
| DELETE | /v1/Integrations/Fidelity/ClientDocumentToken/Client/{clientId}/{opaqueId} | Integrations/Fidelity | Deletes opaqueId for this client with this ID. |
| GET | /v1/Integrations/Fidelity/ClientDocumentToken/Refresh/Client/{clientId} | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/Configuration | Integrations/Fidelity | Retrieves Akoya Integration details. |
| PUT | /v1/Integrations/Fidelity/Configuration | Integrations/Fidelity | Saves Akoya integration settings. |
| GET | /v1/Integrations/Fidelity/Configuration/Cert | Integrations/Fidelity |  |
| PUT | /v1/Integrations/Fidelity/Configuration/Cert | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/Echotest | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/GetInvestorAlertMessages | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/GetSubscriberAlertMessagesCount | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/GetSubscriberAlertsMessages | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/GetUserAlertMessagesCount | Integrations/Fidelity |  |
| POST | /v1/Integrations/Fidelity/NewPortfolio/Pending | Integrations/Fidelity | Gets pending accounts from Akoya for the specified client. |
| POST | /v1/Integrations/Fidelity/PreGen | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/Streetscape/Redirect | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/Streetscape/SSO | Integrations/Fidelity | Connects through a single-sign-on (SSO) to Streetscape. |
| GET | /v1/Integrations/Fidelity/Streetscape/Token | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/Wealthscape/Redirect | Integrations/Fidelity |  |
| GET | /v1/Integrations/Fidelity/Wealthscape/SSO | Integrations/Fidelity | Connects through a single-sign-on (SSO) to Wealthscape. |
| GET | /v1/Integrations/Fidelity/Wealthscape/Token | Integrations/Fidelity |  |
| GET | /v1/Integrations/FinaMetrica/SSO | Integrations/FinaMetrica |  |
| POST | /v1/Integrations/FinMason/Actions/Remove | Integrations/FinMason | Removes the Fin Mason integration for the current firm. |
| POST | /v1/Integrations/FinMason/Actions/Setup | Integrations/FinMason | Adds the Fin Mason integration for the current firm. |
| GET | /v1/Integrations/FinMason/MonteCarloInput | Integrations/FinMason | Get the data for a FinMason MonteCarlo chart for a client. |
| POST | /v1/Integrations/FinMason/ProxyPerformance/{asOfDate} | Integrations/FinMason |  |
| POST | /v1/Integrations/Flourish/CreateUser | Integrations/Flourish | Creates a Client Household along with one or two Client Users as members. Each Household member is sent an invitation to join Flourish as soon as they are created. <note> This creates and sends an Invite  (Stauts = INVITED), and is the only endpoint that AUTOMATICALLY INVITES (other flows require Advisor intervention) </note> |
| GET | /v1/Integrations/Flourish/GetMenuValues | Integrations/Flourish |  |
| GET | /v1/Integrations/Flourish/GetToken | Integrations/Flourish | This is the second part of the Oauth process. The redirect Url we give to Flourish will call this endpoint with the given Authorization Code given to use by Flourish. An Access and Refresh token is given in return. Access token has a lifetime of 15 mins and the refresh token lives for 90 days.  We save the json object in the app link detail table under the users profile. <para>     Invoked from flourish-credentials.html  </para> |
| POST | /v1/Integrations/Flourish/Invite/{userId} | Integrations/Flourish | Resends the email invitation for a Client User that is NOT yet <code>ACTIVE</code>&gt; (i.e. the Client User has not yet signed up with Flourish |
| POST | /v1/Integrations/Flourish/Invite-and-Apply | Integrations/Flourish | Creates a Client Household along with one or two Client Users as members. The response includes a Flourish URL that should be opened for the advisor to prefill information about the Cash account on behalf of the client. Each Household member will be sent an invitation to join Flourish after the application prefill is completed. <note> This requries Advisor action to complete the process. Status <code>CREATED</code> until the advisor completes the process and transitions to <code>INVITED</code></note> |
| GET | /v1/Integrations/Flourish/InviteClient/{clientId} | Integrations/Flourish | Resends the email invitation for a Client User that is NOT yet <code>ACTIVE</code>&gt; (i.e. the Client User has not yet signed up with Flourish A Flourish User must have already been <code>CREATED</code> or <code>INVITED</code> to "RESEND* an INVITE |
| POST | /v1/Integrations/Flourish/InviteContact | Integrations/Flourish | Creates a contact that can be invited to Flourish at a later time.This fully delegates the invite experience to Flourish <note> This DOES NOT AUTOMATICALLY CREATE a USER. This flow requires advisor action. UserId and State are conditional     - UserId and Status are returned if the email already exists in Flourish     - otherwise both are null </note> |
| GET | /v1/Integrations/Flourish/Rates | Integrations/Flourish | Returns the current interest rates paid by Flourish Cash along with their effective dates. Returns the default Flourish cash rates if the request is unauthenticated.If the request is authenticated to an advisor, returns the advisor's firm custom rates if applicable (or default). By default, there is one interest rate tier for each schedule type (single, joint, institutional). For firms with custom rates,  rates can be broken into multiple tiers with different rates, with the interest rate paid for a Flourish Cash account  being determined by which tier range the account balance falls in. |
| GET | /v1/Integrations/Flourish/Redirect | Integrations/Flourish | Starts the Oauth process to Flourish, will need a Username and Password for a user on their system, plus a provided secret from Flourish to use with an OTP provider. |
| GET | /v1/Integrations/Flourish/RefreshToken | Integrations/Flourish | This process can be manually fired off before an of the api call to Flourish or the process can be referenced to make sure. The users access token is valid. When using the refresh token, the system is given back a new Access and Refresh token.  We save the json object in the app link detail table under the users profile. |
| POST | /v1/Integrations/Flourish/SearchbyEmails | Integrations/Flourish | Search by email for users associated with this advisor. |
| POST | /v1/Integrations/Flourish/SearchbyUserids | Integrations/Flourish | the request payload for userIds defines array of string...but they're actually integers..... |
| POST | /v1/Integrations/Flourish/UpdateTosStatus | Integrations/Flourish |  |
| GET | /v1/Integrations/Flourish/UserInfo/{userid} | Integrations/Flourish | Returns a user's personal information and account information. |
| GET | /v1/Integrations/Flourish/Users | Integrations/Flourish | Lists the users associated with the advisor. The API is paginated and will return a maximum of 1000 records. You can get results from the next page by passing the last ID previously returned on the previous page. |
| GET | /v1/Integrations/FPAlpha/GetToken | Integrations/FPAlpha | This is called from fp-alpha-credentials.html after initial OAuth redirect from FP Alpha with {code}     and the original <code>state</code> from {!:GetRedirectUrl} |
| GET | /v1/Integrations/FPAlpha/Redirect | Integrations/FPAlpha |  |
| GET | /v1/Integrations/FPAlpha/RefreshToken | Integrations/FPAlpha |  |
| GET | /v1/Integrations/FPAlpha/SyncClient/{clientId} | Integrations/FPAlpha | Add FPAlpha Client <note>     FP Alpha hanldes update or add process </note> |
| GET | /v1/Integrations/FPAlpha/UserToken | Integrations/FPAlpha |  |
| POST | /v1/Integrations/HiddenLevers/Astro/RepManaged | Integrations/HiddenLevers |  |
| POST | /v1/Integrations/HiddenLevers/Client | Integrations/HiddenLevers |  |
| PUT | /v1/Integrations/HiddenLevers/Client/{key} | Integrations/HiddenLevers |  |
| PUT | /v1/Integrations/HiddenLevers/ClientRiskScore/{key} | Integrations/HiddenLevers | Update the clients Risk Score In client Suitability. |
| PUT | /v1/Integrations/HiddenLevers/CreateClient | Integrations/HiddenLevers |  |
| POST | /v1/Integrations/HiddenLevers/ElementNewHousehold | Integrations/HiddenLevers |  |
| GET | /v1/Integrations/HiddenLevers/GetSurveyResults | Integrations/HiddenLevers |  |
| GET | /v1/Integrations/HiddenLevers/Iframe/RiskProfile | Integrations/HiddenLevers |  |
| GET | /v1/Integrations/HiddenLevers/Iframe/StressTest | Integrations/HiddenLevers |  |
| GET | /v1/Integrations/HiddenLevers/ProposalPayload | Integrations/HiddenLevers |  |
| POST | /v1/Integrations/HiddenLevers/RiskProfile | Integrations/HiddenLevers |  |
| GET | /v1/Integrations/HiddenLevers/RiskRewardScores | Integrations/HiddenLevers |  |
| GET | /v1/Integrations/HiddenLevers/SSOPayload | Integrations/HiddenLevers |  |
| POST | /v1/Integrations/HiddenLevers/StressTest | Integrations/HiddenLevers |  |
| GET | /v1/Integrations/HiddenLevers/StressTest/Account/{accountId} | Integrations/HiddenLevers |  |
| GET | /v1/Integrations/HiddenLevers/StressTest/Client/{clientId} | Integrations/HiddenLevers |  |
| GET | /v1/Integrations/HiddenLevers/SyncData/Portfolios | Integrations/HiddenLevers | Gets a simple list of assets, with specific data for the HiddenLevers data sync, for portfolios portfolio. |
| GET | /v1/Integrations/Instream/Clients/{key}/Plans | Integrations/Instream |  |
| GET | /v1/Integrations/Instream/Clients/{key}/Plans/{planId} | Integrations/Instream |  |
| GET | /v1/Integrations/Instream/Clients/{key}/Plans/{planId}/MatrixSummary | Integrations/Instream |  |
| GET | /v1/Integrations/Instream/Clients/{key}/Plans/Primary | Integrations/Instream |  |
| GET | /v1/Integrations/Instream/Clients/{key}/Plans/StaticContent | Integrations/Instream |  |
| GET | /v1/Integrations/Instream/Clients/{key}/Plans/Summary | Integrations/Instream |  |
| GET | /v1/Integrations/Instream/Clients/{key}/Profile | Integrations/Instream |  |
| GET | /v1/Integrations/Instream/Clients/{key}/Token | Integrations/Instream |  |
| GET | /v1/Integrations/IntegrationSync | Integrations/IntegrationSync |  |
| GET | /v1/Integrations/Intuit/Enrollments | Integrations/Intuit | Get all enrollments currently setup in Intuit |
| GET | /v1/Integrations/iRebal | Integrations/iRebal | Get iRebal export files information |
| PUT | /v1/Integrations/iRebal/Action/Schedule | Integrations/iRebal | Schedule iRebal Export |
| GET | /v1/Integrations/iRebal/Configuration | Integrations/iRebal | Gets the configuration data for iRebal for the current user. |
| GET | /v1/Integrations/iRebal/Download | Integrations/iRebal | Download iRebal Export files as one Zip file. |
| POST | /v1/Integrations/iRebal/Remove | Integrations/iRebal | Removes the iRebal integration for the current user. |
| POST | /v1/Integrations/iRebal/RescheduleJob | Integrations/iRebal | Update a job schedule for iRebal for the current user. |
| POST | /v1/Integrations/iRebal/RunJobNow | Integrations/iRebal | Runs the job schedule for iRebal for the current user. |
| POST | /v1/Integrations/iRebal/ScheduleJob | Integrations/iRebal | Schedules an job schedule for iRebal for the current user. |
| POST | /v1/Integrations/iRebal/Setup | Integrations/iRebal | Sets up iRebal integration for the current user. |
| GET | /v1/Integrations/iRebal/Status | Integrations/iRebal | Get iRebal export status |
| POST | /v1/Integrations/iRebal/UnscheduleJob | Integrations/iRebal | Removes the job schedule for iRebal for the current user. |
| GET | /v1/Integrations/Junxure/SSO | Integrations/Junxure |  |
| GET | /v1/Integrations/LaserApp/Accounts/{accountId}/Forms | Integrations/LaserApp | Returns a list of forms available for the specified criteria. |
| POST | /v1/Integrations/LaserApp/Accounts/{accountId}/Submit | Integrations/LaserApp |  |
| GET | /v1/Integrations/LaserApp/Configuration | Integrations/LaserApp | Retrieves LaserApp Integration details. |
| PUT | /v1/Integrations/LaserApp/Configuration | Integrations/LaserApp | Saves laserapp integration settings. |
| GET | /v1/Integrations/LaserApp/Configuration/Test | Integrations/LaserApp | Checks to see if laserapp integration has been setup for this database. |
| GET | /v1/Integrations/LaserApp/Forms | Integrations/LaserApp | Returns a list of forms available from LaserApp. |
| GET | /v1/Integrations/LaserApp/Forms/{key} | Integrations/LaserApp | Gets the form that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/LaserApp/Forms/{key} | Integrations/LaserApp |  |
| GET | /v1/Integrations/LaserApp/Forms/Search | Integrations/LaserApp |  |
| GET | /v1/Integrations/LaserApp/Forms/Search/{search} | Integrations/LaserApp |  |
| POST | /v1/Integrations/LaserApp/PostBackFromLaserApp | Integrations/LaserApp | This endpoint is called from the LaserApp application, to post the filled out PDF, and xml form data back for Orion to store in the Accounts Documents. |
| PUT | /v1/Integrations/LexisNexis/Actions/Approve | Integrations/LexisNexis | Approves a list of Search Results matching a set of IDs, with the provided reason. |
| POST | /v1/Integrations/LexisNexis/Actions/Remove | Integrations/LexisNexis | Disconnects the integration for the firm. |
| POST | /v1/Integrations/LexisNexis/Actions/RunNow | Integrations/LexisNexis | Runs an on-demand query of all active accounts and sends the data to the LexisNexis batch server. |
| POST | /v1/Integrations/LexisNexis/Actions/Setup | Integrations/LexisNexis | Connects the integration for the firm. |
| GET | /v1/Integrations/LexisNexis/Configuration | Integrations/LexisNexis | Get the configuration of the LexisNexis integration partner app. |
| PUT | /v1/Integrations/LexisNexis/Configuration | Integrations/LexisNexis |  |
| GET | /v1/Integrations/LexisNexis/Results | Integrations/LexisNexis | Get all of the searches that the authorized user can read. |
| GET | /v1/Integrations/LexisNexis/Results/Details/{searchResultId} | Integrations/LexisNexis |  |
| GET | /v1/Integrations/LexisNexis/Searches | Integrations/LexisNexis | Get all of the search results that the authorized user can read. Can filter by a specific search result by passing the searchId as a query parameter. |
| GET | /v1/Integrations/Marketor/SSO | Integrations/Marketor |  |
| GET | /v1/Integrations/MFE/ModelSearch | Integrations/MFE |  |
| POST | /v1/Integrations/MFE/ModelSearch/Compare | Integrations/MFE |  |
| POST | /v1/Integrations/MFE/ModelSearch/Compare/Stats | Integrations/MFE |  |
| GET | /v1/Integrations/MFE/ModelSearch/GridData | Integrations/MFE |  |
| GET | /v1/Integrations/Mindflash/Redirect | Integrations/Mindflash | Find custom URL for Mindflash/Ascent app and use it for redirect if it exists, otherwise use generic. |
| GET | /v1/Integrations/MindTouchCls/Redirect | Integrations/MindTouchCls |  |
| GET | /v1/Integrations/MoneyGuidePro/Configuration | Integrations/MoneyGuidePro | Retrieves MoneyGuidePro Integration details. |
| PUT | /v1/Integrations/MoneyGuidePro/Configuration | Integrations/MoneyGuidePro | Saves MoneyGuidePro integration settings. |
| GET | /v1/Integrations/MoneyGuidePro/Configuration/Client | Integrations/MoneyGuidePro | Retrieves MoneyGuidePro Integration details. |
| POST | /v1/Integrations/MoneyGuidePro/Configuration/Client | Integrations/MoneyGuidePro | Saves MoneyGuidePro Client-level integration settings. |
| PUT | /v1/Integrations/MoneyGuidePro/Configuration/Client | Integrations/MoneyGuidePro | Saves MoneyGuidePro Client-level integration settings. |
| GET | /v1/Integrations/MoneyGuidePro/Household/{clientId} | Integrations/MoneyGuidePro | Get the household data for the specified client ID, and return it as an MGPHouseholdInfo object. <para> Rep level calls may throw SQL timeouts. See {useAltRepQuery} for alternative. </para> |
| GET | /v1/Integrations/MoneyGuidePro/InsurancePolicies/Client/{clientId} | Integrations/MoneyGuidePro | Used to download the MoneyGuidePro Insurance Policies |
| GET | /v1/Integrations/MoneyGuidePro/MonteCarloMeter/Client/{clientId} | Integrations/MoneyGuidePro | Used to download the MoneyGuidePro Monte Carlo Dial. |
| GET | /v1/Integrations/MoneyGuidePro/Networth/Client/{clientId} | Integrations/MoneyGuidePro | Used to download the MoneyGuidePro Networth |
| GET | /v1/Integrations/MoneyGuidePro/PlanSummary/Client/{clientId} | Integrations/MoneyGuidePro | Used to download the MoneyGuidePro Plan Summary |
| POST | /v1/Integrations/MoneyGuidePro/PlanSummary/Client/{clientId} | Integrations/MoneyGuidePro |  |
| POST | /v1/Integrations/MoneyGuidePro/Remove | Integrations/MoneyGuidePro | Sets up MoneyGuidePro integration for the current user. |
| GET | /v1/Integrations/MoneyGuidePro/Settings | Integrations/MoneyGuidePro |  |
| PUT | /v1/Integrations/MoneyGuidePro/Settings | Integrations/MoneyGuidePro |  |
| POST | /v1/Integrations/MoneyGuidePro/Setup | Integrations/MoneyGuidePro | Sets up MoneyGuidePro integration for the current user. |
| GET | /v1/Integrations/MoneyGuidePro/SSO/AccessPlan/{clientId} | Integrations/MoneyGuidePro |  |
| GET | /v1/Integrations/MoneyGuidePro/SSO/Client/{clientId} | Integrations/MoneyGuidePro |  |
| POST | /v1/Integrations/NewAccount | Integrations/NewAccount |  |
| GET | /v1/Integrations/NewAccount/{accountId}/StreetScape | Integrations/NewAccount |  |
| GET | /v1/Integrations/NewAccount/{accountId}/WealthScape | Integrations/NewAccount |  |
| POST | /v1/Integrations/NewAccount/Custodians/{custodianGuid}/UploadDocuments | Integrations/NewAccount |  |
| GET | /v1/Integrations/NewAccount/DocumentTypes | Integrations/NewAccount |  |
| GET | /v1/Integrations/NewAccount/Fidelity/{accountId}/{location} | Integrations/NewAccount |  |
| POST | /v1/Integrations/NewAccount/FormsData | Integrations/NewAccount |  |
| GET | /v1/Integrations/NewAccount/FormsData/{accountGlobalId} | Integrations/NewAccount |  |
| GET | /v1/Integrations/NewAccount/Pershing/{accountNumber} | Integrations/NewAccount |  |
| POST | /v1/Integrations/NewAccount/Schwab | Integrations/NewAccount |  |
| POST | /v1/Integrations/NewAccount/UploadPershingDocuments | Integrations/NewAccount |  |
| PUT | /v1/Integrations/Notifications/Action/UpdateStatus | Integrations/Notifications |  |
| GET | /v1/Integrations/Onboarding/ConversionSources | Integrations/Onboarding | Get all ConversionSources. |
| POST | /v1/Integrations/Onboarding/ConversionSources | Integrations/Onboarding | Adds a new ConversionSource to the database. |
| GET | /v1/Integrations/Onboarding/ConversionSources/{key} | Integrations/Onboarding | Gets the ConversionSource that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/Onboarding/ConversionSources/{key} | Integrations/Onboarding | Updates the ConversionSource that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Integrations/Onboarding/ConversionSources/checkprogress | Integrations/Onboarding |  |
| POST | /v1/Integrations/Onboarding/ConversionSources/chunkCreate | Integrations/Onboarding |  |
| GET | /v1/Integrations/Onboarding/ConversionSources/Types | Integrations/Onboarding | Get all ConversionTypes. |
| POST | /v1/integrations/openai/chat/completions | integrations/openai |  |
| POST | /v1/integrations/openai/portfolioview/{clientId}/meetingagenda | integrations/openai |  |
| GET | /v1/Integrations/OrionElement/AssetFactSheet/{modelId} | Integrations/OrionElement | Get the manager fact sheet from v2 communities |
| GET | /v1/Integrations/OrionElement/BlendedAssetFactSheet/{id} | Integrations/OrionElement | Get the manager fact sheet from v2 communities |
| GET | /v1/Integrations/Paperwork/Accounts/{accountId}/Forms | Integrations/Paperwork | Returns a list of forms available for the specified account.  Paperwork is mapped to the Accounts Custodian, BD, MgmtStyle, AccountType, Rep, and Subadvisor. |
| GET | /v1/Integrations/Paperwork/Forms/{key} | Integrations/Paperwork | Gets the form that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Integrations/Paperwork/Forms/{key} | Integrations/Paperwork |  |
| GET | /v1/Integrations/Paperwork/Forms/Mapped | Integrations/Paperwork | Returns a list of forms available for the specified criteria.  Paperwork is mapped to the Accounts Custodian, BD, MgmtStyle (Platform), AccountType, Rep, and Subadvisor. |
| GET | /v1/Integrations/Paperwork/Forms/Search | Integrations/Paperwork | Searches the forms libarary for documents titled with the specified text. |
| GET | /v1/Integrations/Paperwork/Forms/Search/{search} | Integrations/Paperwork | Searches the forms libarary for documents titled with the specified text. |
| GET | /v1/Integrations/Pershing/Action/SAML | Integrations/Pershing |  |
| GET | /v1/Integrations/Pershing/HistoricalActivities | Integrations/Pershing |  |
| GET | /v1/Integrations/Pershing/IntradayActivities | Integrations/Pershing |  |
| GET | /v1/Integrations/Pershing/IntradayHoldings | Integrations/Pershing |  |
| GET | /v1/Integrations/Pershing/NetX360User | Integrations/Pershing |  |
| PUT | /v1/Integrations/Pershing/NetX360User | Integrations/Pershing |  |
| GET | /v1/Integrations/Pershing/PershingClientPortalDocuments | Integrations/Pershing |  |
| GET | /v1/Integrations/Pershing/PriorDayBalances | Integrations/Pershing |  |
| GET | /v1/Integrations/Pershing/PriorDayHoldings | Integrations/Pershing |  |
| GET | /v1/Integrations/Pershing/RegistrationTypes | Integrations/Pershing |  |
| GET | /v1/Integrations/Pershing/TransferableHoldings | Integrations/Pershing |  |
| POST | /v1/Integrations/Pershing/UploadPDFDocument | Integrations/Pershing | This operation uploads a document to Pershing NetX360 or to Albridge Document Management and Workflows. If you are uploading multiple documents, you must initiate a separate request for each document. This operation uses a multi-part request to send metadata along with the uploaded document. Request Data Required. {   "authToken": "",   "userId": "",   "busFuncCode": "",   "busFuncDocType": "",   "accountNumber": "",   "documentName": "" } A single request file is required. |
| GET | /v1/Integrations/Plaid/Accounts | Integrations/Plaid | Get Accounts for an item |
| GET | /v1/Integrations/Plaid/Accounts/{clientId} | Integrations/Plaid | Get Plaid Accounts that are not assigned an Account Number. For use with UI |
| GET | /v1/Integrations/Plaid/AccountsBalance | Integrations/Plaid | Get Accounts Balance |
| GET | /v1/Integrations/Plaid/Auth | Integrations/Plaid | Get Auth Status |
| GET | /v1/Integrations/Plaid/Configuration | Integrations/Plaid | Retrieves Plaid Integration details. |
| PUT | /v1/Integrations/Plaid/Configuration | Integrations/Plaid | Saves Plaid integration settings. |
| DELETE | /v1/Integrations/Plaid/DeleteItem | Integrations/Plaid | Delete an Item given Plaid Item ID |
| GET | /v1/Integrations/Plaid/GetAllCategories | Integrations/Plaid | Get all Categories data from Plaid. This will return category_id, group, and hierarchy |
| GET | /v1/Integrations/Plaid/GetAllData | Integrations/Plaid | Get all Items data for particular access token. This will returns  transactions, investment transactions, and investments holding consolidate with one JSON response |
| GET | /v1/Integrations/Plaid/GetAllInstitutions | Integrations/Plaid | Get All Institutions |
| GET | /v1/Integrations/Plaid/GetAllPlaidItemsForUser | Integrations/Plaid | Get All Plaid Items user can see |
| GET | /v1/Integrations/Plaid/GetInstitutionByID | Integrations/Plaid | Get Institution By ID |
| GET | /v1/Integrations/Plaid/GetInstitutionByName | Integrations/Plaid | Get Institution By Name |
| GET | /v1/Integrations/Plaid/ItemRefresh | Integrations/Plaid | Get Item Refresh |
| GET | /v1/Integrations/Plaid/Items | Integrations/Plaid | This is responsible for create a new item from a given public token |
| GET | /v1/Integrations/Plaid/LinkTokens | Integrations/Plaid | This operation creates a link token for a new connection or updates an existing connection with plaid. It takes four parameters appName (required), isInform(required), householdID optional(defaults to correlationID) and optional itemID for update |
| GET | /v1/Integrations/Plaid/OtherInfo | Integrations/Plaid | Get other info JSON |
| PUT | /v1/Integrations/Plaid/OtherInfo | Integrations/Plaid | Store other info JSON |
| GET | /v1/Integrations/Plaid/Processor | Integrations/Plaid | Used to create a token suitable for sending to one of Plaid's partners to enable integrations. Possible values for processor are Possible values: dwolla, galileo, modern_treasury, ocrolus, prime_trust, vesta, drivewealth, vopay, achq, check,  checkbook, circle, sila_money, rize, svb_api, unit, wyre, lithic, alpaca, astra, moov, treasury_prime, marqeta, checkout, solid,  highnote, apex_clearing, gusto |
| PUT | /v1/Integrations/Plaid/SaveItem | Integrations/Plaid | Save Accounts accessToken for item |
| GET | /v1/Integrations/Plaid/Status | Integrations/Plaid | Get Item Status |
| GET | /v1/Integrations/Quantum/Jobs | Integrations/Quantum | Retrieves list of quantum print jobs. |
| PUT | /v1/Integrations/Quantum/Jobs | Integrations/Quantum |  |
| POST | /v1/Integrations/Quik/Accounts/{accountId}/Forms/Viewer | Integrations/Quik | Returns the HTML Forms Viewer Page |
| POST | /v1/Integrations/Quik/Advisors/{alClientId}/Accounts/{accountId}/Forms/Viewer/Submit | Integrations/Quik | Accepts the Form Post from the Quik Viewer |
| POST | /v1/Integrations/Quik/Advisors/{alClientId}/Entity/{entityId}/EntityEnum/{entityEnum}/Forms/Viewer/DocuSign | Integrations/Quik | Accepts the Form Post from the Quik Viewer providing the DocuSign Envelope Id |
| POST | /v1/Integrations/Quik/Advisors/{alClientId}/Entity/{entityId}/EntityEnum/{entityEnum}/Forms/Viewer/Save | Integrations/Quik | Accepts the Form Post from the Quik Viewer and saves the POST for later processing |
| DELETE | /v1/Integrations/Quik/Configuration | Integrations/Quik | Deletes Quik integration settings. |
| GET | /v1/Integrations/Quik/Configuration | Integrations/Quik | Retrieves Quik Integration details. |
| POST | /v1/Integrations/Quik/Configuration | Integrations/Quik | Saves Quik integration settings. |
| PUT | /v1/Integrations/Quik/Configuration | Integrations/Quik | Saves Quik integration settings. |
| GET | /v1/Integrations/Quik/Configuration/Default | Integrations/Quik | Retrieves Quik Integration details. |
| GET | /v1/Integrations/Quik/Configuration/Test | Integrations/Quik | Checks to see if Quik integration has been setup for this database. |
| GET | /v1/Integrations/Quik/Dealers | Integrations/Quik | Returns a list of all dealers |
| POST | /v1/Integrations/Quik/Dealers | Integrations/Quik | Saves a list of available form owners ( dealers ) for a customer |
| GET | /v1/Integrations/Quik/Dealers/Accounts/{accountId} | Integrations/Quik | Returns a comma seperated list of dealers ( form owners ) for an account |
| GET | /v1/Integrations/Quik/DocuSign/Envelopes/Accounts/{accountId} | Integrations/Quik | Returns a DocuSign envelopes for an acccount. |
| GET | /v1/Integrations/Quik/DocuSign/Envelopes/Entity/{entityId}/EntityEnum/{entityEnum} | Integrations/Quik | Returns a DocuSign envelope with status for an entityId and EntityEnum. |
| POST | /v1/Integrations/Quik/DocuSign/Token | Integrations/Quik | Returns a DocuSign OAuth Token |
| POST | /v1/Integrations/Quik/FormData/{quikIntegrationId}/Accounts/{accountId}/Forms/Viewer | Integrations/Quik | Returns the HTML Forms Viewer Page |
| GET | /v1/Integrations/Quik/FormData/Accounts/{accountId} | Integrations/Quik | Returns a FormData for an acccount. |
| GET | /v1/Integrations/Quik/FormGroups | Integrations/Quik |  |
| POST | /v1/Integrations/Quik/FormGroups | Integrations/Quik |  |
| PUT | /v1/Integrations/Quik/FormGroups | Integrations/Quik |  |
| DELETE | /v1/Integrations/Quik/FormGroups/{formGroupId} | Integrations/Quik |  |
| GET | /v1/Integrations/Quik/FormGroups/{formGroupId} | Integrations/Quik |  |
| POST | /v1/Integrations/Quik/FormGroups/{formGroupId}/Entity/{entityId}/EntityEnum/{entityEnum}/Forms/Viewer | Integrations/Quik | Returns the Url of the Viewer Page |
| POST | /v1/Integrations/Quik/FormGroups/{formGroupId}/Forms | Integrations/Quik |  |
| GET | /v1/Integrations/Quik/FormGroups/Accounts/{accountId} | Integrations/Quik |  |
| GET | /v1/Integrations/Quik/FormGroups/Name/{name} | Integrations/Quik |  |
| GET | /v1/Integrations/Quik/FormGroups/Search | Integrations/Quik |  |
| GET | /v1/Integrations/Quik/Forms/Custodians/{custodianCode} | Integrations/Quik | Returns a list of forms available from Quik for the passed in custodian. |
| GET | /v1/Integrations/Quik/Forms/Dealers | Integrations/Quik | Returns a list of forms available from Quik for the passed in custodian. |
| DELETE | /v1/Integrations/Quik/Forms/FormData/{quikIntegrationId} | Integrations/Quik |  |
| GET | /v1/Integrations/Quik/Forms/FormData/{quikIntegrationId} | Integrations/Quik | Returns a list of forms available from Quik for the passed in custodian. |
| POST | /v1/Integrations/Quik/Forms/PreviewUrl | Integrations/Quik | Sets the preview link on the Form object. |
| GET | /v1/Integrations/Quik/Forms/Search | Integrations/Quik | Returns a list of forms available from Quik for the passed in search criterial and dealerIdCsv. |
| GET | /v1/Integrations/Quik/Reps/{repId}/NewAccounts | Integrations/Quik |  |
| GET | /v1/Integrations/Quik/User | Integrations/Quik | Returns the user for the logged in entity |
| GET | /v1/Integrations/Quik/Users | Integrations/Quik | Returns a list of users for the customer |
| POST | /v1/Integrations/Quik/Users | Integrations/Quik | Adds or Updates a list of users for the customer |
| PUT | /v1/Integrations/Redtail/Action/ConnectUser | Integrations/Redtail | Connects a Redtail user to an Orion user, enabling or disabling automatic 2-way sync. |
| POST | /v1/Integrations/Redtail/Actions/Remove | Integrations/Redtail | Disconnects the integration for the firm. |
| POST | /v1/Integrations/Redtail/Actions/Setup | Integrations/Redtail | Connects the integration for the firm. |
| GET | /v1/Integrations/Redtail/Configuration | Integrations/Redtail | Retrieves Redtail Integration details. |
| PUT | /v1/Integrations/Redtail/Configuration | Integrations/Redtail | Saves Redtail integration settings. |
| GET | /v1/Integrations/Redtail/SSO | Integrations/Redtail |  |
| GET | /v1/Integrations/RightCapital/SSO | Integrations/RightCapital |  |
| PUT | /v1/Integrations/RiskAlyze/Accounts/{key} | Integrations/RiskAlyze |  |
| PUT | /v1/Integrations/RiskAlyze/AccountUpsert | Integrations/RiskAlyze |  |
| POST | /v1/Integrations/RiskAlyze/Allocations | Integrations/RiskAlyze | The endpoint is to get Nitrogen scores as the user is building out a model for a client. As ticker and allocations are passed to the endpoint the user will be updated with new scores. |
| GET | /v1/Integrations/RiskAlyze/Clients | Integrations/RiskAlyze | Gets all Clients from Nitrogen. |
| GET | /v1/Integrations/RiskAlyze/Clients/{key} | Integrations/RiskAlyze | Gets a Client from Nitrogen. |
| PUT | /v1/Integrations/RiskAlyze/Clients/{key} | Integrations/RiskAlyze | Updates the risk score for a Nitrogen Client. |
| GET | /v1/Integrations/RiskAlyze/Clients/{key}/Analysis | Integrations/RiskAlyze | Gets a Client and associated analysis data from Nitrogen. |
| GET | /v1/Integrations/RiskAlyze/Clients/{key}/Token | Integrations/RiskAlyze | Gets the token for a Client from Nitrogen. |
| POST | /v1/Integrations/RiskAlyze/Clients/ImplementProposed | Integrations/RiskAlyze | Calls out to Nitrogen with the currently logged in user sso, and Implements the Proposed portfolio for the specified client Id. This can be called when a new client is created in the Orion System, to create a link into the Nitrogen system. |
| GET | /v1/Integrations/RiskAlyze/Clients/ProposalRedirect | Integrations/RiskAlyze | Checks for an existing client based on integration mappings, and updates or creates a new Nitrogen client. |
| GET | /v1/Integrations/RiskAlyze/Configuration | Integrations/RiskAlyze | Returns configuration settings for Nitrogen integration. |
| PUT | /v1/Integrations/RiskAlyze/Configuration | Integrations/RiskAlyze | Updates Nitrogen configuration information. |
| GET | /v1/Integrations/RiskAlyze/GetToken | Integrations/RiskAlyze | Used to get token from Nitrogen. |
| GET | /v1/Integrations/RiskAlyze/Redirect | Integrations/RiskAlyze | Used to automatically redirect the user's browser to Nitrogen's OAuth page. |
| POST | /v1/Integrations/RiskAlyze/Remove | Integrations/RiskAlyze | Removes Nitrogen integration from the current user's firm. |
| GET | /v1/Integrations/RiskAlyze/Representatives/{key}/DefaultSchedules | Integrations/RiskAlyze | Get list of default fee schedules for the representative |
| POST | /v1/Integrations/RiskAlyze/Response | Integrations/RiskAlyze |  |
| GET | /v1/Integrations/RiskAlyze/RetirementRedirect | Integrations/RiskAlyze |  |
| POST | /v1/Integrations/RiskAlyze/Setup | Integrations/RiskAlyze | Sets up the Nitrogen integration for an advisory firm. |
| GET | /v1/Integrations/RiskAlyze/StoredUserToken | Integrations/RiskAlyze | Returns configuration settings for Nitrogen integration. |
| POST | /v1/Integrations/RiskScores/AddNewAccountScore | Integrations/RiskScores |  |
| POST | /v1/Integrations/RiskScores/AddNewAccountScores | Integrations/RiskScores |  |
| POST | /v1/Integrations/RiskScores/AddNewClientScore | Integrations/RiskScores | Add new client score data |
| POST | /v1/Integrations/RiskScores/AddNewClientScores | Integrations/RiskScores | Add multiple client scores data |
| GET | /v1/Integrations/RiskScores/CurrentAccountScore/{accountId} | Integrations/RiskScores | Need to configure new privilege to work with {OAS.WebApi.Code.Attributes.EndpointAuthorizeAttribute} for Read access... |
| GET | /v1/Integrations/RiskScores/CurrentClientScore/{clientId} | Integrations/RiskScores | Need to configure new privilege to work with {OAS.WebApi.Code.Attributes.EndpointAuthorizeAttribute} for Read access... |
| DELETE | /v1/Integrations/RiskScores/DeleteAccountScore/{accountId} | Integrations/RiskScores |  |
| DELETE | /v1/Integrations/RiskScores/DeleteClientScore/{clientId} | Integrations/RiskScores |  |
| PUT | /v1/Integrations/RiskScores/UpdateCurrentAccountScore | Integrations/RiskScores | Update account score |
| PUT | /v1/Integrations/RiskScores/UpdateCurrentClientScore | Integrations/RiskScores | Update client (hh) score |
| GET | /v1/Integrations/SaleMove/Cobrowse/{externalId}/Launch | Integrations/SaleMove | Method to redirect to Cobrowse session |
| GET | /v1/Integrations/SaleMove/Cobrowse/{externalId}/Online | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/Cobrowse/HasPrivilege | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/Cobrowse/Operator | Integrations/SaleMove |  |
| POST | /v1/Integrations/SaleMove/Cobrowse/Operator | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/Cobrowse/Rep | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/Cobrowse/SiteId | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/GliaRepChatSupport | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/GliaServiceTeam | Integrations/SaleMove |  |
| POST | /v1/Integrations/SaleMove/GliaServiceTeam/Add | Integrations/SaleMove |  |
| DELETE | /v1/Integrations/SaleMove/GliaServiceTeam/Delete/{serviceTeamId} | Integrations/SaleMove |  |
| PUT | /v1/Integrations/SaleMove/GliaServiceTeam/Update/{serviceTeamId} | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/Operator/{userId} | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/Operator/{userId}/Firm/{alClientId} | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/OrionSiteId | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/Premier | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/PremierQueues | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/Queues | Integrations/SaleMove |  |
| GET | /v1/Integrations/SaleMove/SiteId/{alClientId} | Integrations/SaleMove |  |
| POST | /v1/Integrations/SaleMove/SiteId/{alClientId} | Integrations/SaleMove |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/Action/CommunitySAML | Integrations/Salesforce | our Orion Support App SSO poorly named endpoint. |
| GET | /v1/Integrations/Salesforce/OrionConnect/Action/ElementSAML | Integrations/Salesforce | our support App SSO for Element |
| GET | /v1/Integrations/Salesforce/OrionConnect/Action/InvoiceSso | Integrations/Salesforce | SSO SF Orion Invoicing Experience |
| GET | /v1/Integrations/Salesforce/OrionConnect/Action/SAML | Integrations/Salesforce | Our Custom SSO to other org Salesforce |
| GET | /v1/Integrations/Salesforce/OrionConnect/ChatContext | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/Compare | Integrations/Salesforce | Looks up a record in salesforce, and orion, and returns the values for that record from both systems. |
| PUT | /v1/Integrations/Salesforce/OrionConnect/Compare | Integrations/Salesforce | Syncs Orion with the salesforce values. |
| GET | /v1/Integrations/Salesforce/OrionConnect/Config | Integrations/Salesforce |  |
| POST | /v1/Integrations/Salesforce/OrionConnect/Config | Integrations/Salesforce |  |
| PUT | /v1/Integrations/Salesforce/OrionConnect/Config | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/DataSync/Settings/{alClientId}/{repIds} | Integrations/Salesforce |  |
| POST | /v1/Integrations/Salesforce/OrionConnect/DeltaSync/{entity}/{key} | Integrations/Salesforce | Triggers delta sync |
| GET | /v1/Integrations/Salesforce/OrionConnect/GetUpdatedUsersSync/{daysPriorToday} | Integrations/Salesforce | Gets users with updated details given `daysPriorToday` days prior to today |
| GET | /v1/Integrations/Salesforce/OrionConnect/ImplementationSummary | Integrations/Salesforce | Calls to salesforce to pull back implementation information to feed the implementation Gantt chart and page. |
| GET | /v1/Integrations/Salesforce/OrionConnect/Namespace | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/PassThrough/{path} | Integrations/Salesforce |  |
| POST | /v1/Integrations/Salesforce/OrionConnect/PassThrough/{path} | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/Projects | Integrations/Salesforce | Calls to salesforce to pull back implementation information to feed the implementation Gantt chart and page. |
| GET | /v1/Integrations/Salesforce/OrionConnect/Projects/{projectId} | Integrations/Salesforce | Calls to salesforce to pull back implementation information to feed the implementation Gantt chart and page. |
| POST | /v1/Integrations/Salesforce/OrionConnect/Redirect | Integrations/Salesforce | Return redirect url. |
| POST | /v1/Integrations/Salesforce/OrionConnect/SetIdentity | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SetupIntegration | Integrations/Salesforce |  |
| POST | /v1/Integrations/Salesforce/OrionConnect/SetupIntegration | Integrations/Salesforce |  |
| DELETE | /v1/Integrations/Salesforce/OrionConnect/SetupIntegration/{id} | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SetupIntegration/{id} | Integrations/Salesforce |  |
| PUT | /v1/Integrations/Salesforce/OrionConnect/SetupIntegration/{id} | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SetupIntegration/OrgId/{orgId} | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases | Integrations/Salesforce |  |
| POST | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases | Integrations/Salesforce |  |
| DELETE | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/{caseNumber} | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/{caseNumber} | Integrations/Salesforce |  |
| PATCH | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/{caseNumber} | Integrations/Salesforce | updates case objects to salesforce tied to the specified case number. |
| GET | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/{caseNumber}/Attachments | Integrations/Salesforce |  |
| POST | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/{caseNumber}/Attachments/{fileName} | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/{caseNumber}/Messages | Integrations/Salesforce | Gets message objects back from salesforce tied to the specified case number. |
| POST | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/{caseNumber}/Messages | Integrations/Salesforce |  |
| POST | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/Export | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/Picklists | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Cases/Search | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Contact/{email} | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Contacts | Integrations/Salesforce | Gets authorized contacts with access to Orion Support back from salesforce tied to the advisor. |
| GET | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Projects | Integrations/Salesforce | Get a list of projects for the current advisornumber. |
| POST | /v1/Integrations/Salesforce/OrionConnect/SocialAPI/Projects/{projectId}/Attachments/{fileName} | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SSOSessionId | Integrations/Salesforce | Logs user into salesforce to the specified page. |
| POST | /v1/Integrations/Salesforce/OrionConnect/Sync | Integrations/Salesforce | Triggers full sync |
| GET | /v1/Integrations/Salesforce/OrionConnect/SyncFromOrion/{alClientId}/{firmOrgId} | Integrations/Salesforce | Triggers a sync job in Hangfire, passing parameters in the URI instead of a body. May not be used after initial testing from Salesforce. |
| GET | /v1/Integrations/Salesforce/OrionConnect/SyncFromOrion/TestRep | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SyncHistory | Integrations/Salesforce | Returns recent Salesforce sync history with pagination support. |
| GET | /v1/Integrations/Salesforce/OrionConnect/SyncJobState/{jobId} | Integrations/Salesforce | Gets the {Hangfire.Storage.StateData} of the Hangfire job matching the provided ID. |
| GET | /v1/Integrations/Salesforce/OrionConnect/SyncJobStatus/{jobId} | Integrations/Salesforce |  |
| GET | /v1/Integrations/Salesforce/OrionConnect/SyncPerformance | Integrations/Salesforce | Returns average performance metrics per object for full syncs within the specified timeframe. Calculates averages grouped by time period (day/week/month/year) and object type for completed full syncs only. |
| GET | /v1/Integrations/Salesforce/OrionConnect/SyncStatus | Integrations/Salesforce | Returns the most recent Salesforce sync entry with child objects. This endpoint is optimized for fast performance and frequent polling to monitor current sync status. |
| GET | /v1/Integrations/Salesforce/OrionConnect/TestChatter | Integrations/Salesforce | Calls to salesforce to pull back implementation information to feed the implementation Gantt chart and page. |
| GET | /v1/Integrations/SalesforceSync/Setup | Integrations/SalesforceSync |  |
| POST | /v1/Integrations/SalesforceSync/Setup | Integrations/SalesforceSync |  |
| DELETE | /v1/Integrations/SalesforceSync/Setup/{id} | Integrations/SalesforceSync |  |
| GET | /v1/Integrations/SAML/CAIS | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/CAISWM | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/DPL | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/iCapital | Integrations/SAML |  |
| POST | /v1/Integrations/SAML/SamlServices/AddOrUpdateSamlPartner | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/CheckSamlUpdatePrivilege | Integrations/SAML | Check if user can perform SAML updates (certificates, etc) |
| GET | /v1/Integrations/SAML/SamlServices/GetClientGlobalId/{houseHoldGlobalId} | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetExpiringCertificates/{interval}/{duration} | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetMappedUser | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetPartnerDatabases | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetPartnerInfo | Integrations/SAML | Step 1: After <code>SamlResponse</code> is received and parsed, obtain PartnerInfo from <code>Saml.Issuer.NameIdentifier</code> |
| GET | /v1/Integrations/SAML/SamlServices/GetSamlConfig | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetSamlConfigByCertSerial | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetSamlConfigByCertThumbprint | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetSamlConfigByIssuer | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetSamlConfigByPartnerId | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetServiceCredentials | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/GetUserProfiles | Integrations/SAML |  |
| POST | /v1/Integrations/SAML/SamlServices/SaveMappedUser | Integrations/SAML |  |
| GET | /v1/Integrations/SAML/SamlServices/Test | Integrations/SAML |  |
| GET | /v1/Integrations/SchwabAlliance/Action/SAML | Integrations/SchwabAlliance |  |
| GET | /v1/Integrations/SchwabAlliance/GetAccountBlockNumbers | Integrations/SchwabAlliance |  |
| GET | /v1/Integrations/SchwabAlliance/GetConfig | Integrations/SchwabAlliance |  |
| GET | /v1/Integrations/SchwabAlliance/GetToken | Integrations/SchwabAlliance |  |
| GET | /v1/Integrations/SchwabAlliance/Redirect | Integrations/SchwabAlliance |  |
| GET | /v1/Integrations/SchwabAlliance/RefreshToken | Integrations/SchwabAlliance |  |
| POST | /v1/Integrations/SchwabAlliance/ReserveAccountBlockNumbers | Integrations/SchwabAlliance |  |
| GET | /v1/Integrations/SchwabAlliance/ServiceAccount | Integrations/SchwabAlliance |  |
| POST | /v1/Integrations/SchwabAlliance/ServiceAccount | Integrations/SchwabAlliance |  |
| GET | /v1/Integrations/SchwabAlliance/ServiceAccount/AllTokens | Integrations/SchwabAlliance |  |
| POST | /v1/Integrations/SchwabAlliance/ServiceAccount/Delete | Integrations/SchwabAlliance |  |
| GET | /v1/Integrations/SchwabAlliance/UserToken | Integrations/SchwabAlliance |  |
| GET | /v1/Integrations/SchwabBatch/Beneficiaries | Integrations/SchwabBatch |  |
| GET | /v1/Integrations/SchwabBatch/GetRmdEnrollment | Integrations/SchwabBatch |  |
| GET | /v1/Integrations/SchwabBatch/RMD | Integrations/SchwabBatch |  |
| GET | /v1/Integrations/SchwabBatch/RmdEnroll | Integrations/SchwabBatch |  |
| GET | /v1/Integrations/SchwabBatch/RmdUnEnroll | Integrations/SchwabBatch |  |
| POST | /v1/Integrations/SchwabServiceRequest/{householdId}/UpdateAddress | Integrations/SchwabServiceRequest | Method to update address in Schwab |
| POST | /v1/Integrations/SchwabServiceRequest/Create | Integrations/SchwabServiceRequest | Method send a request to Schwab Request Center. |
| POST | /v1/Integrations/SchwabServiceRequest/CreateV2 | Integrations/SchwabServiceRequest |  |
| GET | /v1/Integrations/SchwabServiceRequest/test | Integrations/SchwabServiceRequest |  |
| GET | /v1/Integrations/SchwabServiceRequest/Topics | Integrations/SchwabServiceRequest | Method to request center topics picklist |
| GET | /v1/Integrations/SchwabServiceRequest/TopicsV2 | Integrations/SchwabServiceRequest |  |
| GET | /v1/Integrations/SchwabSII/Accounts/{accountId}/Preferences/CostBasis | Integrations/SchwabSII | Method to retrieve Account CostBasis Preferences from Schwab SII |
| GET | /v1/Integrations/SchwabSII/Accounts/{accountId}/RealizedGainLoss | Integrations/SchwabSII | Method to retrieve Account Realized Gain Loss information from Schwab Rest API |
| POST | /v1/Integrations/SchwabSII/Accounts/{accountId}/Report/PDF | Integrations/SchwabSII | Method to retrieve Account Report PDF from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Accounts/{accountId}/Report/PDF/{sessionId} | Integrations/SchwabSII | Method to retrieve Account Report PDF from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Accounts/{accountId}/Reports | Integrations/SchwabSII | Method to retrieve Account Reports from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Accounts/{accountId}/TransactionDetail | Integrations/SchwabSII | Method to retrieve Account Profile from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Accounts/{accountId}/Transactions | Integrations/SchwabSII | Method to retrieve Account Profile from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Accounts/{accountId}/UnrealizedGainLoss | Integrations/SchwabSII | Method to retrieve Account Unrealized Gain Loss Information from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Accounts/{accountId}/UnrealizedGainLoss/{positionId}/Lots | Integrations/SchwabSII | Method to retrieve Account Unrealized Gain Loss Lot Information from Schwab Rest API |
| POST | /v1/Integrations/SchwabSII/Actions/Remove | Integrations/SchwabSII | Removes the Schwab integration for the current user. |
| POST | /v1/Integrations/SchwabSII/Actions/Setup | Integrations/SchwabSII |  |
| GET | /v1/Integrations/SchwabSII/EnrollmentStatus | Integrations/SchwabSII | Method to retrieve Enrollment Status with Schwab SII |
| GET | /v1/Integrations/SchwabSII/Rest/Accounts/{accountId}/Alerts | Integrations/SchwabSII | Method to retrieve Account Alerts from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Rest/Accounts/{accountId}/Balances | Integrations/SchwabSII | Method to retrieve Account Balances from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Rest/Accounts/{accountId}/Positions | Integrations/SchwabSII | Method to retrieve Account Positions from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Rest/Accounts/{accountId}/Profile | Integrations/SchwabSII | Method to retrieve Account Profile from Schwab Rest API |
| GET | /v1/Integrations/SchwabSII/Rest/GetSACToken | Integrations/SchwabSII | Method to retrieve SAC token for SSO |
| GET | /v1/Integrations/SchwabSII/SSO | Integrations/SchwabSII | New implementations should call Ssov2Connection |
| GET | /v1/Integrations/SchwabSII/SsoV2/{landingPage} | Integrations/SchwabSII | Modernized SSO v2 Flow |
| GET | /v1/Integrations/SchwabSII/TestConnection | Integrations/SchwabSII | Method to test the connectivity with Schwab SII |
| GET | /v1/Integrations/SchwabSII/Unenroll | Integrations/SchwabSII | Method to retrieve Enrollment Status with Schwab SII |
| GET | /v1/Integrations/SchwabSII/UserAuthorization | Integrations/SchwabSII | Method to retrieve User Authorization from Schwab. Uses latest OAuth |
| GET | /v1/Integrations/SchwabSII/UserAuthorization/Action/LogOut | Integrations/SchwabSII | Method to retrieve LogOut User Authorization from Schwab SII |
| GET | /v1/Integrations/SchwabSII/UserAuthorization/Token | Integrations/SchwabSII | Method to retrieve User Authorization Token from Schwab SII |
| GET | /v1/Integrations/SchwabStatus/AlertsV2 | Integrations/SchwabStatus |  |
| POST | /v1/Integrations/SchwabStatus/AlertsV2/Details | Integrations/SchwabStatus |  |
| GET | /v1/Integrations/SchwabStatus/AlertsV2/Details/{detailId} | Integrations/SchwabStatus |  |
| GET | /v1/Integrations/SchwabStatus/AlertsV2/ForceRefresh | Integrations/SchwabStatus |  |
| GET | /v1/Integrations/SchwabStatus/Limit/{limit}/Skip/{skip} | Integrations/SchwabStatus |  |
| GET | /v1/Integrations/SchwabStatus/OPS/Limit/{limit}/Skip/{skip} | Integrations/SchwabStatus | Note: Timeouts will occur if requested dataset is too large. Take note of {startDate}, {endDate}, and {firstPageOnly} |
| POST | /v1/Integrations/SchwabStatus/OTP | Integrations/SchwabStatus |  |
| GET | /v1/Integrations/SchwabStatus/StatusV2/OPS | Integrations/SchwabStatus | This is v2 of the current implementation of the AS Status API.     While the current endpoint accepts ski/take, it is not actually implemented.     A separate end endpoint is being created to support pagination {M:OAS.WebApi.Domains.Integrations.SchwabStatusController.GetPagedStatusV2OpsAsync(System.Int32,System.Int32,System.Nullable{System.DateTime},System.Nullable{System.DateTime},System.Boolean,System.Boolean,System.String,System.Threading.CancellationToken)} |
| GET | /v1/Integrations/SchwabStatus/StatusV2/OPS/Events | Integrations/SchwabStatus |  |
| GET | /v1/Integrations/SchwabStatus/StatusV2/OPS/Limit/{limit}/Skip/{skip} | Integrations/SchwabStatus | Proxy for AS Status POST: /stat-feed/status-objects |
| GET | /v1/Integrations/SchwabStatus/TestCert | Integrations/SchwabStatus |  |
| GET | /v1/Integrations/ShareFile/Configuration | Integrations/ShareFile | Gets the configuration data for ShareFile for the current user. |
| POST | /v1/Integrations/ShareFile/Remove | Integrations/ShareFile | Sets up ShareFile integration for the current user. |
| POST | /v1/Integrations/ShareFile/Setup | Integrations/ShareFile | Sets up ShareFile integration for the current user. |
| GET | /v1/Integrations/SmartIQ/SSO | Integrations/SmartIQ |  |
| GET | /v1/Integrations/SmartIQ/UserSync | Integrations/SmartIQ |  |
| POST | /v1/Integrations/Support/IpRestrictions | Integrations/Support |  |
| PUT | /v1/Integrations/Support/IpRestrictions | Integrations/Support |  |
| GET | /v1/Integrations/Support/IpRestrictions/{AlClient} | Integrations/Support |  |
| DELETE | /v1/Integrations/Support/IpRestrictions/{alClientId} | Integrations/Support |  |
| GET | /v1/Integrations/Support/IsContactUsV2Enabled | Integrations/Support |  |
| POST | /v1/Integrations/Support/PartnerApp | Integrations/Support |  |
| PUT | /v1/Integrations/Support/PartnerApp | Integrations/Support |  |
| DELETE | /v1/Integrations/Support/PartnerApp/{partnerappId} | Integrations/Support |  |
| GET | /v1/Integrations/Support/PartnerApp/{partnerappId} | Integrations/Support |  |
| GET | /v1/Integrations/SyncHistory | Integrations/SyncHistory |  |
| GET | /v1/Integrations/TDAmeritrade/Accounts | Integrations/TDAmeritrade | Method to retrive Account data for all Accounts linked to the user |
| GET | /v1/Integrations/TDAmeritrade/Accounts/{accountId} | Integrations/TDAmeritrade | Method to retrive Account data for the Account |
| GET | /v1/Integrations/TDAmeritrade/Accounts/{accountId}/Alerts | Integrations/TDAmeritrade | Method to retrive Account Alerts from TD Ameritrade |
| GET | /v1/Integrations/TDAmeritrade/Accounts/{accountId}/Balances | Integrations/TDAmeritrade | Method to retrive Account Balances from TD Ameritrade |
| GET | /v1/Integrations/TDAmeritrade/Accounts/{accountId}/Extended | Integrations/TDAmeritrade | Method to retrive Account data for the Account |
| GET | /v1/Integrations/TDAmeritrade/Accounts/{accountId}/Positions | Integrations/TDAmeritrade | Method to retrive Account Positions from TD Ameritrade |
| GET | /v1/Integrations/TDAmeritrade/Accounts/{accountId}/Transactions | Integrations/TDAmeritrade | Method to retrive Account Transactions from TD Ameritrade |
| GET | /v1/Integrations/TDAmeritrade/Action/StartSSO | Integrations/TDAmeritrade |  |
| GET | /v1/Integrations/TDAmeritrade/AdvancedAlerts/Configuration | Integrations/TDAmeritrade | Returns configuration settings for Advanced Alerts integration. |
| PUT | /v1/Integrations/TDAmeritrade/AdvancedAlerts/Configuration | Integrations/TDAmeritrade | Updates Advanced Alerts configuration information. |
| GET | /v1/Integrations/TDAmeritrade/CheckUser | Integrations/TDAmeritrade | Method to check user |
| POST | /v1/Integrations/TDAmeritrade/User | Integrations/TDAmeritrade | Method to save user's credentials |
| GET | /v1/Integrations/TDAmeritrade/VeoOneUser | Integrations/TDAmeritrade | Method to check user |
| PUT | /v1/Integrations/TDAmeritrade/VeoOneUser | Integrations/TDAmeritrade | Method to save user's credentials |
| GET | /v1/Integrations/Tolerisk/GetToken | Integrations/Tolerisk | Used to get token from Fidelity. |
| GET | /v1/Integrations/Tolerisk/Redirect | Integrations/Tolerisk |  |
| GET | /v1/Integrations/Tolerisk/SaveOrionToken | Integrations/Tolerisk |  |
| PUT | /v1/Integrations/TRX/Action/Schedule | Integrations/TRX | Schedule TRX Export |
| GET | /v1/Integrations/TRX/Configuration | Integrations/TRX | Retrieves trx Integration details. |
| PUT | /v1/Integrations/TRX/Configuration | Integrations/TRX | Saves trx integration settings. |
| GET | /v1/Integrations/TRX/Configuration/Test | Integrations/TRX | Checks to see if trx integration has been setup for this database. |
| GET | /v1/Integrations/TRX/ModelComplianceClass/{key} | Integrations/TRX | Get asset category from TRX |
| GET | /v1/Integrations/TRX/ModelComplianceSubClass/{key} | Integrations/TRX | Get asset class from TRX |
| GET | /v1/Integrations/Vanilla/Action/SAML | Integrations/Vanilla |  |
| GET | /v1/Integrations/Vanilla/GetToken | Integrations/Vanilla |  |
| GET | /v1/Integrations/Vanilla/Redirect | Integrations/Vanilla |  |
| GET | /v1/Integrations/Vanilla/RefreshToken | Integrations/Vanilla |  |
| GET | /v1/Integrations/Vision/Health | Integrations/Vision |  |
| GET | /v1/Integrations/Vision/SourceDestination | Integrations/Vision |  |
| GET | /v1/Integrations/Vision/SSO | Integrations/Vision |  |
| GET | /v1/Integrations/WealthAccess/{clientId}/IFrame/Url | Integrations/WealthAccess |  |
| GET | /v1/Integrations/WealthAccess/Configuration | Integrations/WealthAccess |  |
| PUT | /v1/Integrations/WealthAccess/Configuration | Integrations/WealthAccess |  |
| POST | /v1/Integrations/WealthAccess/Remove | Integrations/WealthAccess |  |
| POST | /v1/Integrations/WealthAccess/Setup | Integrations/WealthAccess |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByManager/Account/{accountId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByManager/Client/{clientId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByManager/Registration/{registrationId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByPropertyType/Account/{accountId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByPropertyType/Client/{clientId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByPropertyType/Registration/{registrationId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByRegion/Account/{accountId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByRegion/Client/{clientId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByRegion/Registration/{registrationId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByRisk/Account/{accountId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByRisk/Client/{clientId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByRisk/Registration/{registrationId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByYear/Account/{accountId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByYear/Client/{clientId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/ByYear/Registration/{registrationId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/Summary/Account/{accountId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/Summary/Client/{clientId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/Allocation/Summary/Registration/{registrationId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/PrivateAssetSummary/Account/{accountId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/PrivateAssetSummary/Client/{clientId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/PrivateAssetSummary/Registration/{registrationId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/PrivateInvestmentPerformance/Account/{accountId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/PrivateInvestmentPerformance/Client/{clientId} | Integrations/WealthSite |  |
| POST | /v1/Integrations/WealthSite/PrivateInvestmentPerformance/Registration/{registrationId} | Integrations/WealthSite |  |
| GET | /v1/Integrations/YahooFinance/Options/{ticker} | Integrations/YahooFinance |  |
| GET | /v1/Integrations/YahooFinance/Quote/{contractSymbol} | Integrations/YahooFinance |  |
| GET | /v1/MarketProperties/BullBearDates | MarketProperties/BullBearDates | Get a list of Bull Bear Dates that the logged in user has access to see. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/MarketProperties/BullBearDates/{key} | MarketProperties/BullBearDates | Gets the Bull Bear Dates that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Mobile/Clients/{key}/Accounts/Menu | Mobile/Clients | Gets the account menu for the specified if one exists. If none exists a 404 will be thrown. |
| GET | /v1/Mobile/Clients/{key}/Allocation | Mobile/Clients | Gets the allocation groups of the client with the specified key. The allocation grouping is defined by the mobile setting "MobileValueViewTypeAccount". |
| GET | /v1/Mobile/Clients/{key}/AumOverTime | Mobile/Clients | Gets a list of Aum data representative of the last year for the client with the specified key. |
| GET | /v1/Mobile/Clients/{key}/Rep | Mobile/Clients | Gets a the representative assigned to the client with the specified key, which the logged in user has access to. |
| GET | /v1/Mobile/Clients/{key}/Rep/Photo | Mobile/Clients | Gets the representative's photo if one exists. If none exists a 404 will be thrown. |
| GET | /v1/Mobile/Clients/{key}/Representative | Mobile/Clients | Gets a the representative assigned to the client with the specified key, which the logged in user has access to. |
| GET | /v1/Mobile/Clients/{key}/Representative/Photo | Mobile/Clients | Gets the representative's photo if one exists. If none exists a 404 will be thrown. |
| GET | /v1/Mobile/Clients/{key}/Snapshot | Mobile/Clients | Gets a list of accounts that fall below the client with the specified key, which the logged in user has access to. The list includes additional accounts. The value provided is for today. |
| GET | /v1/Mobile/Clients/{key}/Snapshot/{groupId}/Assets | Mobile/Clients | Gets a list of assets that fall within the account with the specified key, which the logged in user has access to. |
| GET | /v1/Mobile/Clients/First | Mobile/Clients | Gets the first client that the logged in user has access to that has value ordered by last name. |
| GET | /v1/Mobile/Clients/Search | Mobile/Clients | Gets a simple list of clients that are active and have value that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string. |
| GET | /v1/Mobile/Clients/Search/{search} | Mobile/Clients | Gets a simple list of clients that are active and have value that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string. |
| POST | /v1/Mobile/Register/PushNotification | Mobile/Register | Used to create mobile tokens for push notifications. If token already exists, a 200 Ok will be returned else 201 Created will be returned. |
| GET | /v1/Monitor | Monitor |  |
| POST | /v1/OrionStored/Compare | OrionStored/Compare | Run an Orion Stored Cost Basis compare process for a list of assets. |
| GET | /v1/OrionStored/Compare/{key} | OrionStored/Compare | Get the results of an asynchronous Orion Stored Cost Basis compare process for a list of assets. |
| POST | /v1/OrionStored/Compare/Start | OrionStored/Compare | Starts an asynchronous Orion Stored Cost Basis compare process for a list of assets. |
| POST | /v1/OrionStored/RunAsset/{assetID} | OrionStored/RunAsset |  |
| GET | /v1/Performance/AttributionAssignment/EntityLevel/{entityLevel} | Performance/AttributionAssignment | Gets a list of attribution assignments that the logged in user has access to. |
| PUT | /v1/Performance/AttributionAssignment/EntityLevel/{entityLevel} | Performance/AttributionAssignment | Update assigned attributions by entity level |
| GET | /v1/Performance/AttributionDetails | Performance/AttributionDetails | Gets a list of attribution details that the logged in user has access to. |
| POST | /v1/Performance/AttributionDetails | Performance/AttributionDetails | Used to create a new attribution detail. |
| DELETE | /v1/Performance/AttributionDetails/{key} | Performance/AttributionDetails | Used to delete an existing attribution detail. Upon successful deletion a 204 will be returned. |
| GET | /v1/Performance/AttributionDetails/{key} | Performance/AttributionDetails | Gets the attribution detail that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Performance/AttributionDetails/{key} | Performance/AttributionDetails | Used to update an existing attribution detail. Upon successful modification a 200 will be returned. |
| GET | /v1/Performance/AttributionDetails/Benchmark/{key} | Performance/AttributionDetails | Gets the attribution detail that has the provided benchmark key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Performance/AttributionDetails/New | Performance/AttributionDetails | Gets the attribution detail that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Performance/AttributionDetails/Simple | Performance/AttributionDetails | Gets a simple list of attribution details that the logged in user has access to. |
| GET | /v1/Performance/Batch | Performance/Batch | Gets a list of performance Batches that the logged in user has access to. |
| DELETE | /v1/Performance/Batch/{key} | Performance/Batch | Deletes a performance Batch. |
| GET | /v1/Performance/Batch/{key} | Performance/Batch | Gets the performance Batches with the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Performance/Batch/{performanceBatchId}/Details | Performance/Batch | Gets a list of details for the provided performance batch id that the logged in user has access to pivotted based on the timeframe. |
| POST | /v1/Performance/Batch/{performanceBatchId}/Details/ByEntities | Performance/Batch | Gets a list of details for the provided performance batch id that the logged in user has access to pivotted based on the entities. |
| GET | /v1/Performance/Batch/{performanceBatchId}/Entities | Performance/Batch | Gets a list of entities for the provided performance batch id that the logged in user has access to. |
| DELETE | /v1/Performance/Batch/{performanceBatchId}/Entities/Action/Generate | Performance/Batch | Used to stop batch generation. |
| POST | /v1/Performance/Batch/{performanceBatchId}/Entities/Action/Generate | Performance/Batch | Used generate the performance data of the batch. |
| POST | /v1/Performance/Batch/{performanceBatchId}/Entities/Action/Reset | Performance/Batch | Used to reset some of the entities in the performance batch. |
| POST | /v1/Performance/Batch/{sourcePerformanceBatchId}/Details/Compare | Performance/Batch | Compare Two Batches |
| GET | /v1/Performance/Batch/Action/ConcurrentEntityExecutionInfo | Performance/Batch |  |
| POST | /v1/Performance/Batch/Action/RefreshConcurrentEntityExecutionLimit | Performance/Batch |  |
| GET | /v1/Performance/Batch/Verbose | Performance/Batch |  |
| POST | /v1/Performance/Batch/Verbose | Performance/Batch | Create new Performance Batch |
| GET | /v1/Performance/Batch/Verbose/{key} | Performance/Batch |  |
| PUT | /v1/Performance/Batch/Verbose/{key}/Description | Performance/Batch | Batch Description for Performance Batch. |
| POST | /v1/Performance/Batch/Verbose/{performanceBatchId}/Copy | Performance/Batch | Create a Copy of a Performance Batch for Compare Purposes |
| GET | /v1/Performance/Batch/Verbose/New | Performance/Batch |  |
| GET | /v1/Performance/Compare | Performance/Compare | Gets a list of performance compares that the logged in user has access to. |
| POST | /v1/Performance/Compare | Performance/Compare | Used to create a new performance compare. Must include details of items to be compared. |
| DELETE | /v1/Performance/Compare/{key} | Performance/Compare | Deletes a performance compare. |
| GET | /v1/Performance/Compare/{key} | Performance/Compare | Gets the performance compares with the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Performance/Compare/{performanceCompareId}/Details | Performance/Compare |  |
| GET | /v1/Performance/Compare/{performanceCompareId}/Details/{key} | Performance/Compare | Gets the performance compare detail with the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Performance/Compare/{performanceCompareId}/Details/Action/ChangeActionStatus | Performance/Compare | Used to change the action status of the details in the performance comparison. |
| DELETE | /v1/Performance/Compare/{performanceCompareId}/Details/Action/Generate | Performance/Compare | Used to stop comparison generation. |
| POST | /v1/Performance/Compare/{performanceCompareId}/Details/Action/Generate | Performance/Compare | Used to update the system generate info for some or all of the details. Details that already have a data generated will be ignored. |
| POST | /v1/Performance/Compare/{performanceCompareId}/Details/Action/Reset | Performance/Compare | Used to reset some of the details in the performance comparison. |
| POST | /v1/Performance/Compare/{performanceCompareId}/Details/Notes | Performance/Compare | Gets the notes for the performance compare detail records provided. |
| GET | /v1/Performance/Compare/{performanceCompareId}/Details/Timeframe | Performance/Compare |  |
| POST | /v1/Performance/Compare/ValidateImport/Details | Performance/Compare | Takes an xlsx, xls, or csv file as multipart content. The file needs either an account id column (named  "account id", "accountid", "pkaccount", "acct id", or "acctid") or an account number column (named "account number", or "acct number"). The file will be processed and returned as a list signifying the id or number provided. If the account  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| GET | /v1/Performance/Compare/ValidateImport/Details/Templates/Csv | Performance/Compare |  |
| GET | /v1/Performance/Compare/ValidateImport/Details/Templates/Xls | Performance/Compare |  |
| GET | /v1/Performance/Compare/ValidateImport/Details/Templates/Xlsx | Performance/Compare |  |
| POST | /v1/Performance/Maintenance/EclipseInfo/Action/Run | Performance/Maintenance |  |
| POST | /v1/Performance/Maintenance/InvalidAssetValueChangeCheck/Action/Run | Performance/Maintenance |  |
| DELETE | /v1/Performance/Maintenance/ModelAggBenchmarkProxyMaintain/Blends | Performance/Maintenance |  |
| POST | /v1/Performance/Maintenance/PriceDifferenceCheck/Action/Run | Performance/Maintenance |  |
| POST | /v1/Performance/Maintenance/Status | Performance/Maintenance |  |
| GET | /v1/Performance/Overview | Performance/Overview |  |
| POST | /v1/Performance/Overview | Performance/Overview | Returns Overview Performance.  Overview performance is "stored" performance.  It is updated once per day with pre-defined periods and settings. |
| POST | /v1/Performance/Overview/Action/Run | Performance/Overview |  |
| POST | /v1/Performance/Overview/Multiple/Action/Run | Performance/Overview |  |
| GET | /v1/Performance/StoredPerformanceImport | Performance/StoredPerformanceImport |  |
| POST | /v1/Performance/StoredPerformanceImport | Performance/StoredPerformanceImport |  |
| DELETE | /v1/Performance/StoredPerformanceImport/{key} | Performance/StoredPerformanceImport |  |
| GET | /v1/Performance/StoredPerformanceImport/{key} | Performance/StoredPerformanceImport |  |
| PUT | /v1/Performance/StoredPerformanceImport/{key} | Performance/StoredPerformanceImport |  |
| PUT | /v1/Performance/StoredPerformanceImport/Entities | Performance/StoredPerformanceImport |  |
| POST | /v1/Performance/StoredPerformanceImport/Entities/Actions/GenerationStatus/Reset | Performance/StoredPerformanceImport |  |
| POST | /v1/Performance/StoredPerformanceImport/Entities/Actions/GenerationStatus/Reset/All/{storedPerformanceImportId} | Performance/StoredPerformanceImport |  |
| POST | /v1/Performance/StoredPerformanceImport/Entities/Actions/Notes/Update | Performance/StoredPerformanceImport |  |
| GET | /v1/Performance/StoredPerformanceImport/Entities/ByStoredPerformanceImportEntityID/{storedPerformanceImportEntityId} | Performance/StoredPerformanceImport |  |
| GET | /v1/Performance/StoredPerformanceImport/Entities/ByStoredPerformanceImportID/{storedPerformanceImportId} | Performance/StoredPerformanceImport |  |
| POST | /v1/Performance/StoredPerformanceImport/GetDataTable | Performance/StoredPerformanceImport |  |
| POST | /v1/Performance/StoredPerformanceImport/Upload | Performance/StoredPerformanceImport |  |
| GET | /v1/Portfolio/AccountCancellationSubjects | Portfolio/AccountCancellationSubjects | Gets a simple list of account cancellation types that the logged in user has access to. |
| POST | /v1/Portfolio/AccountCancellationSubjects | Portfolio/AccountCancellationSubjects | Used to create a new account cancellation type. Upon successful creation a 201 will be returned with the location of the nearly created account cancellation type. |
| GET | /v1/Portfolio/AccountCustodialInfo | Portfolio/AccountCustodialInfo | Gets the records of changes between the received Custodian Name File information and the Orion system, based on the provided filter options.  This can include records in any of the change states, including declined or approved records. |
| POST | /v1/Portfolio/AccountCustodialInfo | Portfolio/AccountCustodialInfo | Apply changes based on the ChangeStatus for the AccountId and FieldName for the change record, as well as applicable Registration/Household records. |
| GET | /v1/Portfolio/AccountCustodialInfo/Active | Portfolio/AccountCustodialInfo | Gets the records of changes between the received Custodian Name File information and the Orion system. It will only return records that are in the pending state or records that have been modified today |
| GET | /v1/Portfolio/Accounts | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/{accountId}/Changes/Action/Delete | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/{accountId}/DailyAnnuityValue/{asOfDate} | Portfolio/Accounts | Get latest annuity value for all accounts that has annuity value. |
| PATCH | /v1/Portfolio/Accounts/{accountId}/ModelAgg/{modelAggId} | Portfolio/Accounts | Assign a model aggregate to an account. |
| GET | /v1/Portfolio/Accounts/{accountId}/ModelTolerance | Portfolio/Accounts | Returns a comparison of an Account to its Assigned Model Targets. |
| GET | /v1/Portfolio/Accounts/{accountId}/TaxLot | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/{accountNumber} | Portfolio/Accounts | Gets the account that has the provided Custodial Account Number. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Accounts/{key} | Portfolio/Accounts | Gets the account that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Accounts/{key} | Portfolio/Accounts | Simple dto update |
| PUT | /v1/Portfolio/Accounts/{key}/Action/MoveToRegistration/{registrationId} | Portfolio/Accounts | Move account from one registration to another |
| DELETE | /v1/Portfolio/Accounts/{key}/Action/UndoConversion | Portfolio/Accounts | Undo Account Conversion by key Sample Request POST /Portfolio/Accounts/:key/Action/UndoConversion |
| GET | /v1/Portfolio/Accounts/{key}/Assets | Portfolio/Accounts | Gets a list of assets that fall within the account with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Accounts/{key}/Assets/{asOfDate} | Portfolio/Accounts | Gets a list of assets that fall within the account with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Accounts/{key}/Assets/Value | Portfolio/Accounts | Gets a simple list of assets (including aum for today) that fall within the account with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Accounts/{key}/Assets/Value/{asOfDate} | Portfolio/Accounts | Gets a simple list of assets (including aum for the end of the date specified) that fall within the account with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Accounts/{key}/Audits | Portfolio/Accounts | Gets a list of account Audit items |
| GET | /v1/Portfolio/Accounts/{key}/AumOverTime | Portfolio/Accounts | Gets a list of Aum data representative of the range provided for the account with the specified key. |
| GET | /v1/Portfolio/Accounts/{key}/AumOverTime/Simple | Portfolio/Accounts | Same as AumOverTime, except it is faster (simpler) because it does not support all the report options, it simply returns a sum of all assets with value over a time period. |
| POST | /v1/Portfolio/Accounts/{key}/Calculate/InceptionDate | Portfolio/Accounts | Used to calculate the appropriate inception date for the provided account. |
| GET | /v1/Portfolio/Accounts/{key}/Changes | Portfolio/Accounts | Gets a list of account changes for the account with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Accounts/{key}/Changes/New | Portfolio/Accounts | Gets a template object for creating a new account change for the account with the specified key, which the logged in user has access to. |
| POST | /v1/Portfolio/Accounts/{key}/Changes/New | Portfolio/Accounts | Used to create new account change records. |
| PUT | /v1/Portfolio/Accounts/{key}/ClearCancelationDate | Portfolio/Accounts | Clear account cancelation date |
| GET | /v1/Portfolio/Accounts/{key}/CustomIndex | Portfolio/Accounts | Get full set of Account's Custom Index data |
| GET | /v1/Portfolio/Accounts/{key}/Documents | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/{key}/Documents | Portfolio/Accounts |  |
| DELETE | /v1/Portfolio/Accounts/{key}/Documents/{fileId} | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/{key}/Documents/{fileId} | Portfolio/Accounts | Gets a file for the account with the specified key and the file with the specified key. |
| PUT | /v1/Portfolio/Accounts/{key}/Documents/{fileId} | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/{key}/Documents/{fileId}/Download | Portfolio/Accounts | Gets the raw data of the specific file with the blobId provided which is associated to the account with the specified key. |
| PUT | /v1/Portfolio/Accounts/{key}/Documents/Action/MoveToAccount/{accountId} | Portfolio/Accounts | Move documents to different account |
| GET | /v1/Portfolio/Accounts/{key}/NetAmountInvested | Portfolio/Accounts | Gets a list of Aum data representative of the range provided for all account with the specified key. Also returns a list of data to show the net amount invested overtime. |
| GET | /v1/Portfolio/Accounts/{key}/Performance | Portfolio/Accounts | Used to verbosely return performance. Has the ability to return account performance, benchmark performance, and statistical data for the account over a number of date ranges. |
| GET | /v1/Portfolio/Accounts/{key}/Performance/{grouping} | Portfolio/Accounts | Used to verbosely return performance. Has the ability to return grouped account performance, benchmark performance, and statistical data for the account over a number of date ranges. |
| GET | /v1/Portfolio/Accounts/{key}/Performance/Interval | Portfolio/Accounts | Used to return interval performance. Has the ability to return account performance in sequential intervals over a number the date range specified. |
| GET | /v1/Portfolio/Accounts/{key}/Performance/Interval/{grouping} | Portfolio/Accounts | Used to return interval performance. Has the ability to return grouped account performance in sequential intervals over a number the date range specified. |
| GET | /v1/Portfolio/Accounts/{key}/Performance/Summary | Portfolio/Accounts | Used to return summary performance. Has the ability to return performance for the account over a number of date ranges. |
| GET | /v1/Portfolio/Accounts/{key}/Performance/Summary/{grouping} | Portfolio/Accounts | Used to return summary performance. Has the ability to return grouped account performance for the account over a number of date ranges. |
| GET | /v1/Portfolio/Accounts/{key}/RmdCalculation | Portfolio/Accounts | Method to get RMD calculation for the account |
| PUT | /v1/Portfolio/Accounts/{key}/RmdCalculation | Portfolio/Accounts | Update items associated with RMD dashboard for the account |
| GET | /v1/Portfolio/Accounts/{key}/Simple | Portfolio/Accounts | Gets the simple account that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Accounts/{key}/Transactions | Portfolio/Accounts |  |
| PUT | /v1/Portfolio/Accounts/{key}/UpdateEclipseSMA | Portfolio/Accounts | Used when Astro Enabled is changed on the Eclipse side for non-sleeved accounts. |
| GET | /v1/Portfolio/Accounts/{key}/UserDefinedFields | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/{key}/Value | Portfolio/Accounts | Gets the simple account (including aum for the end of today) that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Accounts/{key}/Value/{asOfDate} | Portfolio/Accounts | Gets the simple account (including aum for the end of the date specified) that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Accounts/AccountInformation/Banking/{repId} | Portfolio/Accounts | Collects the banking information for a given Reps active accounts This information is provided by the recon process that pulls this information from the tenants |
| GET | /v1/Portfolio/Accounts/AccountInformation/Beneficiaries/{repId} | Portfolio/Accounts | Collects the beneificiary information for a given Reps accounts This information is provided by the recon process that pulls this information from the tenants |
| GET | /v1/Portfolio/Accounts/AccountInformation/Rmd/{repId} | Portfolio/Accounts | Retrieves RMD information for the accounts tied to a given rep id. |
| GET | /v1/Portfolio/Accounts/AccountInformation/Systematics/{repId} | Portfolio/Accounts | Collects the systematics information for a given Reps accounts This information is provided by the recon process that pulls this information from the tenants |
| GET | /v1/Portfolio/Accounts/AccountManagers | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/AccountsForConvertAccount | Portfolio/Accounts | Gets accounts for convert account feature Sample Request     GET /Portfolio/Accounts/AccountsForConvertAccount?clientId=123&amp;accountId=456 Sample Response  [     {         "id": 123,         "fundName": "Test",         "acctCode": "Testcode"     } ] |
| POST | /v1/Portfolio/Accounts/Action/AssignToSelfDirected | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/Action/ConvertAccount | Portfolio/Accounts | Converts an account Sample Request POST /Portfolio/Accounts/Action/ConvertAccount {     "convertDate": "2024-11-04",     "copyAssets": true,     "copyBillingInst": true,     "copySwp": true,     "copyTrans": true,     "fromAccountId": 123,     "oldAcctActive": false,     "overwriteAcctNum": 1 } |
| PUT | /v1/Portfolio/Accounts/Action/Delete | Portfolio/Accounts |  |
| PUT | /v1/Portfolio/Accounts/Action/Merge | Portfolio/Accounts | Takes a list of old and new account ids and merges the old account into the new account.  The old account is then deleted. |
| POST | /v1/Portfolio/Accounts/Action/Restore | Portfolio/Accounts | Restores account[s]. |
| PUT | /v1/Portfolio/Accounts/Action/UndoCancel/{key}/{restore} | Portfolio/Accounts | Undo a cancelation of an account. |
| POST | /v1/Portfolio/Accounts/Action/UpdateCashModelForFees | Portfolio/Accounts |  |
| PUT | /v1/Portfolio/Accounts/action/updateDoNotTrade | Portfolio/Accounts | Update Account DoNotTrade settings from Eclipse |
| POST | /v1/Portfolio/Accounts/Changes/New | Portfolio/Accounts | Used to create new account change records across a number of accounts. |
| GET | /v1/Portfolio/Accounts/Grid | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/GroupNumbers | Portfolio/Accounts | Gets a simple list of account group numbers that the logged in user has access to. The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Accounts/List | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/List/AccountNumber | Portfolio/Accounts | Get a list of accounts for an array of AccountNumbers. |
| POST | /v1/Portfolio/Accounts/List/Id | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/ListCounts | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/NewPortfolio | Portfolio/Accounts | Gets a list of accounts that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Accounts/NewPortfolio | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/NewPortfolio/{key} | Portfolio/Accounts | Gets the account that has the provided key. |
| PUT | /v1/Portfolio/Accounts/NewPortfolio/{key} | Portfolio/Accounts | Simple dto update |
| POST | /v1/Portfolio/Accounts/NewPortfolio/ByAll/Pending | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/NewPortfolio/Client/{clientId}/ByAll/Investor/{key} | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/NewPortfolio/Counts | Portfolio/Accounts | Get counts for new accounts UI left navigation. |
| GET | /v1/Portfolio/Accounts/NewPortfolio/Counts/Header | Portfolio/Accounts | Get counts for new accounts UI page header. |
| POST | /v1/Portfolio/Accounts/NewPortfolio/List | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/NewPortfolio/List/AccountNumber | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/NewPortfolio/List/Id | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/NewPortfolio/New | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/Number/{accountNumber} | Portfolio/Accounts | Gets the account that has the provided Custodial Account Number. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Accounts/OrionCustomIndexing/ClientInformation | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/OrionCustomIndexing/ClientInformation/Action/Run | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/OrionCustomIndexing/ClientInformation/Calculate | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/OrionCustomIndexing/ClientInformation/Csv | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/OutOfTolerance | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/OutOfTolerance/List | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/qs | Portfolio/Accounts | Gets a list of accounts returned by a Query Studio Query in the provided Dashboard Card ID. |
| GET | /v1/Portfolio/Accounts/Rep/{repId}/RmdSummary | Portfolio/Accounts | Endpoint to get rep rmd summary information for Insight rep tile |
| GET | /v1/Portfolio/Accounts/RmdCalculation | Portfolio/Accounts | Gets a list Rmd Calculaions. |
| POST | /v1/Portfolio/Accounts/RmdCalculation/Actions/MailMerge | Portfolio/Accounts | Upload a word file to be merged. |
| GET | /v1/Portfolio/Accounts/RmdCalculation/Actions/MailMerge/{filename} | Portfolio/Accounts | Used to download a previously generated mail merge. |
| POST | /v1/Portfolio/Accounts/RmdCalculation/Actions/Recalc | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/RmdCalculation/Update | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/RmdCalculationCounts | Portfolio/Accounts | Endpoint to get counts for all filters |
| GET | /v1/Portfolio/Accounts/Search/Advanced | Portfolio/Accounts | Gets a list of accounts that the logged in user has access to filtered by supplied search parameters. |
| GET | /v1/Portfolio/Accounts/Search/Advanced/Count | Portfolio/Accounts | Gets a count of accounts that the logged in user has access to filtered by supplied search parameters. |
| GET | /v1/Portfolio/Accounts/Simple | Portfolio/Accounts | Gets a simple list of accounts that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Accounts/Simple/List | Portfolio/Accounts | Gets a simple list of accounts that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Accounts/Simple/List/AccountNumber | Portfolio/Accounts | Get a list of simple accounts for an array of AccountNumbers. |
| POST | /v1/Portfolio/Accounts/Simple/List/Id | Portfolio/Accounts | Gets a simple list of accounts that match one of the keys in the provided list. |
| GET | /v1/Portfolio/Accounts/Simple/Search | Portfolio/Accounts | Gets a simple list of accounts that the logged in user has access to where the account number or outside Id begin with the search string or the Id is the search string. |
| GET | /v1/Portfolio/Accounts/Simple/Search/{search} | Portfolio/Accounts | Gets a simple list of accounts that the logged in user has access to where the account number or outside Id begin with the search string or the Id is the search string. |
| GET | /v1/Portfolio/Accounts/Simple/Search/Number | Portfolio/Accounts | Gets a simple list of accounts that the logged in user has access to where the account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Simple/Search/Number/{search} | Portfolio/Accounts | Gets a simple list of accounts that the logged in user has access to where the account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Simple/Search/OutsideId | Portfolio/Accounts | Gets a simple list of accounts that the logged in user has access to where the outside id exactly matches the search string. |
| GET | /v1/Portfolio/Accounts/Simple/Search/OutsideId/{search} | Portfolio/Accounts | Gets a simple list of accounts that the logged in user has access to where the outside id exactly matches the search string. |
| GET | /v1/Portfolio/Accounts/Simple/Search/SecondaryNumber | Portfolio/Accounts | Gets a simple list of accounts that the logged in user has access to where the secondary account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Simple/Search/SecondaryNumber/{search} | Portfolio/Accounts | Gets a simple list of accounts that the logged in user has access to where the secondary account number contains the search string. |
| POST | /v1/Portfolio/Accounts/SyncToEclipse | Portfolio/Accounts | Attempt to Sync multiple OC accounts to Eclipse. Account Id's will be matched with Eclipse firms, and if a match is found will be added to the partial extract table in the OC firm Database. If the account is sleeved, only the RegistrationId will be added telling the  partial import proccess to sync the entire registration. |
| PUT | /v1/Portfolio/Accounts/UpdateDoNotTradeAndSma/{key} | Portfolio/Accounts | Update Account SMA and DoNotTrade settings from Eclipse |
| GET | /v1/Portfolio/Accounts/Value | Portfolio/Accounts | Gets a simple list of accounts (including aum for today) that the logged in user has access to. |
| GET | /v1/Portfolio/Accounts/Value/{asOfDate} | Portfolio/Accounts | Gets a simple list of accounts (including aum for the end of the date specified) that the logged in user has access to. |
| POST | /v1/Portfolio/Accounts/Value/{asOfDate}/List | Portfolio/Accounts | Gets a simple list of accounts that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Accounts/Value/{asOfDate}/List/Id | Portfolio/Accounts | Gets a simple list of accounts that match one of the keys in the provided list. |
| GET | /v1/Portfolio/Accounts/Value/{asOfDate}/Search | Portfolio/Accounts | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the account number or outside Id begin with the search string or the Id is the search string. |
| GET | /v1/Portfolio/Accounts/Value/{asOfDate}/Search/{search} | Portfolio/Accounts | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the account number or outside Id begin with the search string or the Id is the search string. |
| GET | /v1/Portfolio/Accounts/Value/{asOfDate}/Search/Number | Portfolio/Accounts | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Value/{asOfDate}/Search/Number/{search} | Portfolio/Accounts | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Value/{asOfDate}/Search/OutsideId | Portfolio/Accounts | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the outside id exactly matches the search string. |
| GET | /v1/Portfolio/Accounts/Value/{asOfDate}/Search/OutsideId/{search} | Portfolio/Accounts | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the outside id exactly matches the search string. |
| GET | /v1/Portfolio/Accounts/Value/{asOfDate}/Search/SecondaryNumber | Portfolio/Accounts | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the secondary account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Value/{asOfDate}/Search/SecondaryNumber/{search} | Portfolio/Accounts | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the secondary account number contains the search string. |
| POST | /v1/Portfolio/Accounts/Value/List | Portfolio/Accounts | Gets a simple list of accounts that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Accounts/Value/List/Async | Portfolio/Accounts | Gets a simple list of accounts that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Accounts/Value/List/Id | Portfolio/Accounts | Gets a simple list of accounts that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Accounts/Value/List/Id/Async | Portfolio/Accounts | Gets a simple list of accounts that match one of the keys in the provided list. |
| GET | /v1/Portfolio/Accounts/Value/Search | Portfolio/Accounts | Gets a simple list of accounts (including aum for today) that the logged in user has access to where the account number or outside Id begin with the search string or the Id is the search string. |
| GET | /v1/Portfolio/Accounts/Value/Search/{search} | Portfolio/Accounts | Gets a simple list of accounts (including aum for today) that the logged in user has access to where the account number or outside Id begin with the search string or the Id is the search string. |
| GET | /v1/Portfolio/Accounts/Value/Search/Number | Portfolio/Accounts | Gets a simple list of accounts (including aum for today) that the logged in user has access to where the account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Value/Search/Number/{search} | Portfolio/Accounts | Gets a simple list of accounts (including aum for today) that the logged in user has access to where the account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Value/Search/OutsideId | Portfolio/Accounts | Gets a simple list of accounts (including aum for today) that the logged in user has access to where the outside id exactly matches the search string. |
| GET | /v1/Portfolio/Accounts/Value/Search/OutsideId/{search} | Portfolio/Accounts | Gets a simple list of accounts (including aum for today) that the logged in user has access to where the outside id exactly matches the search string. |
| GET | /v1/Portfolio/Accounts/Value/Search/SecondaryNumber | Portfolio/Accounts | Gets a simple list of accounts (including aum for today) that the logged in user has access to where the secondary account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Value/Search/SecondaryNumber/{search} | Portfolio/Accounts | Gets a simple list of accounts (including aum for today) that the logged in user has access to where the secondary account number contains the search string. |
| GET | /v1/Portfolio/Accounts/Verbose | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/Verbose | Portfolio/Accounts | Create new account for existing registration |
| PUT | /v1/Portfolio/Accounts/Verbose | Portfolio/Accounts | Update accounts. |
| GET | /v1/Portfolio/Accounts/Verbose/{key} | Portfolio/Accounts |  |
| PUT | /v1/Portfolio/Accounts/Verbose/{key} | Portfolio/Accounts |  |
| PUT | /v1/Portfolio/Accounts/Verbose/{key}/ModelingInfo | Portfolio/Accounts | Used to save models without actually associating the account to these models. |
| POST | /v1/Portfolio/Accounts/Verbose/List | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/Verbose/List/AccountNumber | Portfolio/Accounts |  |
| POST | /v1/Portfolio/Accounts/Verbose/List/Id | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/Verbose/New | Portfolio/Accounts |  |
| GET | /v1/Portfolio/Accounts/Verbose/Number/{accountNumber} | Portfolio/Accounts |  |
| GET | /v1/Portfolio/AccountStatuses | Portfolio/AccountStatuses | Get all account statuses |
| GET | /v1/Portfolio/ALClientOps | Portfolio/ALClientOps | Gets all Client OPS. |
| POST | /v1/Portfolio/ALClientOps | Portfolio/ALClientOps | Create a new OPS record cor a client |
| PUT | /v1/Portfolio/ALClientOps | Portfolio/ALClientOps | Update multiple clients OPS. |
| DELETE | /v1/Portfolio/ALClientOps/{key} | Portfolio/ALClientOps | Delete an OPS for a client. |
| GET | /v1/Portfolio/ALClientOps/{key} | Portfolio/ALClientOps | Gets Client OPS by key passed in. |
| PUT | /v1/Portfolio/ALClientOps/{key} | Portfolio/ALClientOps | Update an OPS for a client. |
| PUT | /v1/Portfolio/ALClientOps/Action/Delete | Portfolio/ALClientOps | Deletes multiple clients OPS. Returns a list of deleted items |
| GET | /v1/Portfolio/AssetLevelStrategies | Portfolio/AssetLevelStrategies | Returns a list of all the asset level strategies that the logged in user has access to. |
| POST | /v1/Portfolio/AssetLevelStrategies | Portfolio/AssetLevelStrategies |  |
| PUT | /v1/Portfolio/AssetLevelStrategies | Portfolio/AssetLevelStrategies |  |
| DELETE | /v1/Portfolio/AssetLevelStrategies/{key} | Portfolio/AssetLevelStrategies | Delete asset level strategy |
| GET | /v1/Portfolio/AssetLevelStrategies/{key} | Portfolio/AssetLevelStrategies | Get asset level strategy by key |
| PUT | /v1/Portfolio/AssetLevelStrategies/{key} | Portfolio/AssetLevelStrategies |  |
| PUT | /v1/Portfolio/AssetLevelStrategies/Action/AutoAssign | Portfolio/AssetLevelStrategies |  |
| GET | /v1/Portfolio/AssetLevelStrategies/Simple | Portfolio/AssetLevelStrategies | Gets a simple list of asset level strategies that the logged in user has access to. |
| GET | /v1/Portfolio/Assets | Portfolio/Assets |  |
| GET | /v1/Portfolio/Assets/{key} | Portfolio/Assets | Gets the asset that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Assets/{key} | Portfolio/Assets | Simple dto update |
| PUT | /v1/Portfolio/Assets/{key}/Action/MoveToAccount/{accountId} | Portfolio/Assets | Move asset to different account |
| GET | /v1/Portfolio/Assets/{key}/Price | Portfolio/Assets |  |
| GET | /v1/Portfolio/Assets/{key}/Price/{asOfDate} | Portfolio/Assets |  |
| GET | /v1/Portfolio/Assets/{key}/Prices/Historical | Portfolio/Assets | Gets the price history of an asset |
| GET | /v1/Portfolio/Assets/{key}/Transactions | Portfolio/Assets |  |
| GET | /v1/Portfolio/Assets/{key}/Value | Portfolio/Assets | Gets the simple assets (including aum for the end of today) that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Assets/{key}/Value/{asOfDate} | Portfolio/Assets | Gets the simple assets (including aum for the end of the date specified) that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/Assets/{prodId}/BuyOptionShares | Portfolio/Assets |  |
| POST | /v1/Portfolio/Assets/{prodId}/SellOptionShares | Portfolio/Assets |  |
| PUT | /v1/Portfolio/Assets/Action/Delete | Portfolio/Assets | Deletes every asset provided in the list of ids. |
| PUT | /v1/Portfolio/Assets/Action/RemoveHistorical | Portfolio/Assets | Remove the _Hist for every asset provided in the list of ids |
| GET | /v1/Portfolio/Assets/Alternative | Portfolio/Assets | Gets a list of alternative assets The return is not limited to pages. Although you can use $top and $skip to page through data, our recommended best practice can be found on the Orion Developer Portal. <param name="clientId">Optional. Default: null. When provided only assets for the clientId specified are returned.</param><param name="registrationId">Optional. Default: null. When provided only assets for the registrationId specified are returned.</param><param name="accountId">Optional. Default: null. When provided only assets for the accountId specified are returned.</param><param name="productId">Optional. Default: null. When provided only assets for the productId specified are returned.</param><param name="assetId">Optional. Default: null. When provided only assets for the assetId specified are returned.</param><param name="asOfDate">Optional.  Default: null.  If provided the value of the asset on that date will be returned.</param><param name="includeCostBasis">Optional.  Default: null.  If provided the asset details will include cost basis data.</param> |
| GET | /v1/Portfolio/Assets/AssetExclusion/{key} | Portfolio/Assets |  |
| GET | /v1/Portfolio/Assets/Historical | Portfolio/Assets | Gets any assets where the account number ends with _hist. |
| POST | /v1/Portfolio/Assets/List | Portfolio/Assets | Returns a list of Assets that are found for the list of Id's posted in the message body. |
| POST | /v1/Portfolio/Assets/List/AccountId | Portfolio/Assets | Returns a list of Assets that are found for the list of AccountId's posted in the message body. |
| POST | /v1/Portfolio/Assets/List/Id | Portfolio/Assets | Returns a list of Assets that are found for the list of Id's posted in the message body. |
| POST | /v1/Portfolio/Assets/ListCounts | Portfolio/Assets |  |
| GET | /v1/Portfolio/Assets/Simple | Portfolio/Assets | Gets a simple list of assets for a given portfolio. |
| GET | /v1/Portfolio/Assets/Simple/Search | Portfolio/Assets | Gets a simple list of assets by the search criteria. |
| GET | /v1/Portfolio/Assets/Simple/Search/{search} | Portfolio/Assets | Gets a simple list of assets by the search criteria. |
| GET | /v1/Portfolio/Assets/Value | Portfolio/Assets | Gets a simple list of assets (including aum for today) that the logged in user has access to. |
| GET | /v1/Portfolio/Assets/Value/{asOfDate} | Portfolio/Assets | Gets a simple list of assets (including aum for the end of the date specified) that the logged in user has access to. |
| POST | /v1/Portfolio/Assets/Value/{asOfDate}/List | Portfolio/Assets | Gets a simple list of assets that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Assets/Value/{asOfDate}/List/Id | Portfolio/Assets | Gets a simple list of assets that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Assets/Value/List | Portfolio/Assets | Gets a simple list of assets that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Assets/Value/List/Id | Portfolio/Assets | Gets a simple list of assets that match one of the keys in the provided list. |
| GET | /v1/Portfolio/Assets/Verbose | Portfolio/Assets |  |
| POST | /v1/Portfolio/Assets/Verbose | Portfolio/Assets | Create asset |
| PUT | /v1/Portfolio/Assets/Verbose | Portfolio/Assets | Update multiple assets |
| GET | /v1/Portfolio/Assets/Verbose/{key} | Portfolio/Assets |  |
| PUT | /v1/Portfolio/Assets/Verbose/{key} | Portfolio/Assets | Update single asset |
| GET | /v1/Portfolio/Assets/Verbose/ByProduct/{key} | Portfolio/Assets |  |
| GET | /v1/Portfolio/Assets/Verbose/CopyHistoricalData | Portfolio/Assets |  |
| POST | /v1/Portfolio/Assets/Verbose/List | Portfolio/Assets |  |
| POST | /v1/Portfolio/Assets/Verbose/List/Id | Portfolio/Assets |  |
| GET | /v1/Portfolio/Assets/Verbose/New | Portfolio/Assets |  |
| POST | /v1/Portfolio/Assets/Verbose/New | Portfolio/Assets | Create multiple assets |
| GET | /v1/Portfolio/AvailableAccountNumbers/Next | Portfolio/AvailableAccountNumbers | Gets the next available account number. Each time this endpoint is called the account number that is returned is marked as being used and will not be returned again. |
| GET | /v1/Portfolio/Benchmarks | Portfolio/Benchmarks | Gets a list of benchmarks that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Benchmarks/{key}/{bmType} | Portfolio/Benchmarks | Gets the benchmark that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Benchmarks/Simple | Portfolio/Benchmarks | Gets a simple list of benchmarks that the logged in user has access to. |
| GET | /v1/Portfolio/Benchmarks/Simple/Search | Portfolio/Benchmarks | Gets a simple list of benchmarks that the logged in user has access to where the name contains the search string. |
| GET | /v1/Portfolio/Benchmarks/Simple/Search/{search} | Portfolio/Benchmarks | Gets a simple list of benchmarks that the logged in user has access to where the name contains the search string. |
| GET | /v1/Portfolio/BondRatings | Portfolio/BondRatings | Gets a list of bond ratings that the logged in user has access to. |
| POST | /v1/Portfolio/BondRatings | Portfolio/BondRatings | Used to create a new bond rating. Upon successful creation a 201 will be returned with the location of the newly created bond rating. |
| DELETE | /v1/Portfolio/BondRatings/{key} | Portfolio/BondRatings | Used to delete an existing bond rating. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/BondRatings/{key} | Portfolio/BondRatings | Gets the bond rating that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/BondRatings/{key} | Portfolio/BondRatings | Used to update an existing bond rating. Upon successful modification a 200 will be returned. |
| GET | /v1/Portfolio/BondRatings/Simple | Portfolio/BondRatings | Gets a simple list of bond ratings that the logged in user has access to. |
| GET | /v1/Portfolio/BrokerDealers | Portfolio/BrokerDealers | Gets a list of broker/dealers that the logged in user has access to. |
| PUT | /v1/Portfolio/BrokerDealers/{additionalContactId}/SSNTaxId | Portfolio/BrokerDealers | Retrieve or update SSN for addtional contact. |
| GET | /v1/Portfolio/BrokerDealers/{key} | Portfolio/BrokerDealers | Gets the broker/dealer that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/BrokerDealers/{key}/Documents | Portfolio/BrokerDealers |  |
| POST | /v1/Portfolio/BrokerDealers/{key}/Documents | Portfolio/BrokerDealers |  |
| DELETE | /v1/Portfolio/BrokerDealers/{key}/Documents/{fileId} | Portfolio/BrokerDealers |  |
| GET | /v1/Portfolio/BrokerDealers/{key}/Documents/{fileId} | Portfolio/BrokerDealers | Gets a file for the broker/dealer with the specified key and the file with the specified key. |
| PUT | /v1/Portfolio/BrokerDealers/{key}/Documents/{fileId} | Portfolio/BrokerDealers |  |
| GET | /v1/Portfolio/BrokerDealers/{key}/Documents/{fileId}/Download | Portfolio/BrokerDealers | Gets the raw data of the specific file with the blobId provided which is associated to the broker/dealer with the specified key. |
| GET | /v1/Portfolio/BrokerDealers/{key}/ReportImage | Portfolio/BrokerDealers | Gets the representative's report image if one exists. If none exists a 404 will be thrown. |
| GET | /v1/Portfolio/BrokerDealers/{key}/Simple | Portfolio/BrokerDealers | Gets the simple broker/dealer that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/BrokerDealers/{key}/UserDefinedFields | Portfolio/BrokerDealers |  |
| PUT | /v1/Portfolio/BrokerDealers/Action/Delete | Portfolio/BrokerDealers |  |
| PUT | /v1/Portfolio/BrokerDealers/Action/RecalculateAUMData | Portfolio/BrokerDealers | Endpoint to recalculate AUM data for a broker/dealer |
| GET | /v1/Portfolio/BrokerDealers/Simple | Portfolio/BrokerDealers | Gets a simple list of broker/dealers that the logged in user has access to. |
| POST | /v1/Portfolio/BrokerDealers/Simple/List | Portfolio/BrokerDealers |  |
| POST | /v1/Portfolio/BrokerDealers/Simple/List/Id | Portfolio/BrokerDealers |  |
| GET | /v1/Portfolio/BrokerDealers/Simple/Search | Portfolio/BrokerDealers | Gets a simple list of broker dealers that the logged in user has access to where the broker dealers first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/BrokerDealers/Simple/Search/{search} | Portfolio/BrokerDealers | Gets a simple list of broker dealers that the logged in user has access to where the broker dealers first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/BrokerDealers/Value | Portfolio/BrokerDealers | Gets a simple list of broker/dealers (including aum for today) that the logged in user has access to. <param name="hasValue">Optional. When provided will only return broker/dealers that have value (true) or don't have value (false).</param> |
| GET | /v1/Portfolio/BrokerDealers/Value/{asOfDate} | Portfolio/BrokerDealers | Gets a simple list of broker/dealers (including aum for the end of the date specified) that the logged in user has access to. |
| GET | /v1/Portfolio/BrokerDealers/Verbose | Portfolio/BrokerDealers |  |
| POST | /v1/Portfolio/BrokerDealers/Verbose | Portfolio/BrokerDealers | Create new broker/dealer. |
| PUT | /v1/Portfolio/BrokerDealers/Verbose | Portfolio/BrokerDealers |  |
| GET | /v1/Portfolio/BrokerDealers/Verbose/{key} | Portfolio/BrokerDealers |  |
| PUT | /v1/Portfolio/BrokerDealers/Verbose/{key} | Portfolio/BrokerDealers |  |
| PUT | /v1/Portfolio/BrokerDealers/Verbose/{key}/SSNTaxId | Portfolio/BrokerDealers | Retrieve or update SSN for broker dealer. |
| POST | /v1/Portfolio/BrokerDealers/Verbose/List | Portfolio/BrokerDealers |  |
| POST | /v1/Portfolio/BrokerDealers/Verbose/List/Id | Portfolio/BrokerDealers |  |
| GET | /v1/Portfolio/BrokerDealers/Verbose/New | Portfolio/BrokerDealers |  |
| GET | /v1/Portfolio/BusinessLines | Portfolio/BusinessLines | Gets a list of business lines that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/BusinessLines | Portfolio/BusinessLines | Used to create a new business line. Upon successful creation a 201 will be returned with the location of the nearly created business line. |
| DELETE | /v1/Portfolio/BusinessLines/{key} | Portfolio/BusinessLines | Used to delete an existing business line. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/BusinessLines/{key} | Portfolio/BusinessLines | Gets the business line that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/BusinessLines/{key} | Portfolio/BusinessLines | Used to update an existing business line. Upon successful modification a 200 will be returned. |
| PUT | /v1/Portfolio/BusinessLines/Action/Delete | Portfolio/BusinessLines |  |
| GET | /v1/Portfolio/BusinessLines/Simple | Portfolio/BusinessLines | Gets a simple list of business lines that the logged in user has access to. |
| GET | /v1/Portfolio/ClientCategories | Portfolio/ClientCategories | Gets a simple list of client categories that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/ClientCategories/Simple | Portfolio/ClientCategories | Gets a simple list of client categories that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/ClientChanges/{clientId} | Portfolio/ClientChanges | Gets a list of client changes for specific client id. |
| PUT | /v1/Portfolio/ClientChanges/{clientId} | Portfolio/ClientChanges | Updates a list of client changes for specific client id. |
| GET | /v1/Portfolio/Clients | Portfolio/Clients | Gets a list of clients that the logged in user has access to.  The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| PUT | /v1/Portfolio/Clients/{clientId}/HouseholdMembers/{householdMemberId}/SSNTaxId | Portfolio/Clients | Retrieve or update SSN for household member. |
| GET | /v1/Portfolio/Clients/{clientId}/ModelTolerance | Portfolio/Clients | Returns a comparison of an Registration to its Assigned Model Targets. |
| GET | /v1/Portfolio/Clients/{clientId}/PortfolioGroupChanges | Portfolio/Clients | Gets a list of portfolio group changes that the logged in user has access to. |
| GET | /v1/Portfolio/Clients/{clientId}/PortfolioGroups | Portfolio/Clients | Gets portfolio groups for a specific client. |
| POST | /v1/Portfolio/Clients/{clientId}/PortfolioGroups | Portfolio/Clients | Create a portfolio group for a specific client. |
| PUT | /v1/Portfolio/Clients/{clientId}/PortfolioGroups | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/{clientId}/RegistrationRepPayouts | Portfolio/Clients | Retrieves registration rep payouts for the given client ID |
| GET | /v1/Portfolio/Clients/{clientId}/Registrations/Simple | Portfolio/Clients |  |
| PUT | /v1/Portfolio/Clients/{clientkey}/PortfolioGroups/{key} | Portfolio/Clients | Update the portfolio group has the provided key. |
| PUT | /v1/Portfolio/Clients/{clientkey}/PortfolioGroups/Action/Delete | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/{key} | Portfolio/Clients | Gets the client that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Clients/{key} | Portfolio/Clients | Simple dto update |
| GET | /v1/Portfolio/Clients/{key}/{fileType} | Portfolio/Clients | Obsolete. Will be removed after the June 2014 build. Use Portfolio/Clients/{key:int}/Documents instead. |
| GET | /v1/Portfolio/Clients/{key}/{fileType}/{fileId} | Portfolio/Clients | Obsolete. Will be removed after the June 2014 build. Use Portfolio/Clients/{key:int}/Documents/{fileId:int} instead. |
| GET | /v1/Portfolio/Clients/{key}/Accounts | Portfolio/Clients | Gets a list of accounts that fall below the client with the specified key, which the logged in user has access to. By default the list does not include additional accounts. |
| GET | /v1/Portfolio/Clients/{key}/Accounts/AumOverTime | Portfolio/Clients | Gets a list of Aum data representative of the range provided for all the accounts within the client with the specified key. |
| GET | /v1/Portfolio/Clients/{key}/Accounts/ModelAggs/Simple | Portfolio/Clients | Gets a list of Model Aggregate records that are used by the selected client in active accounts. |
| GET | /v1/Portfolio/Clients/{key}/Accounts/NetAmountInvested | Portfolio/Clients | Gets a list of Aum data representative of the range provided for all the accounts within the client with the specified key. Also returns a list of data to show the net amount invested overtime. |
| GET | /v1/Portfolio/Clients/{key}/Accounts/Simple | Portfolio/Clients | Gets a list of simple accounts that fall below the client with the specified key, which the logged in user has access to. By default the list does not include additional accounts. |
| GET | /v1/Portfolio/Clients/{key}/Accounts/Value | Portfolio/Clients | Gets a simple list of accounts (including aum for today) that fall below the client with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Clients/{key}/Accounts/Value/{asOfDate} | Portfolio/Clients | Gets a simple list of accounts (including aum for the end of the date specified) that fall below the client with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Clients/{key}/AdditionalAccounts | Portfolio/Clients | Gets a list of additional accounts that are assigned to the client with the specified key, which the logged in user has access to. |
| POST | /v1/Portfolio/Clients/{key}/AdditionalAccounts | Portfolio/Clients |  |
| DELETE | /v1/Portfolio/Clients/{key}/AdditionalAccounts/{additionalAccountId} | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/{key}/AdditionalRepresentativesPercent | Portfolio/Clients | Gets additional representative with percent by id |
| GET | /v1/Portfolio/Clients/{key}/Assets | Portfolio/Clients | Gets a list of assets that fall below the client with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Clients/{key}/Assets/{asOfDate} | Portfolio/Clients | Gets a list of assets that fall below the client with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Clients/{key}/AumOverTime | Portfolio/Clients | Gets a list of Aum data representative of the range provided for the client with the specified key. |
| GET | /v1/Portfolio/Clients/{key}/BalanceSheet | Portfolio/Clients | Get balance sheets for the client |
| PUT | /v1/Portfolio/Clients/{key}/BalanceSheet | Portfolio/Clients | Update client's balance sheets. |
| GET | /v1/Portfolio/Clients/{key}/BalanceSheet/ByAllAccounts/Refresh | Portfolio/Clients | Add, edit or remove ByAllAccounts data on the Balance Sheets. |
| GET | /v1/Portfolio/Clients/{key}/BalanceSheet/Category | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/{key}/Bills | Portfolio/Clients | Gets a list of bills that fall below the client with the specified key, which the logged in user has access to. |
| POST | /v1/Portfolio/Clients/{key}/Calculate/InceptionDate | Portfolio/Clients | Used to calculate the appropriate inception date for the provided client. |
| GET | /v1/Portfolio/Clients/{key}/ClientPortalRedirect | Portfolio/Clients | Returns a 302 Redirect with the ClientPortal SSO.  The current user must have access to the client, and the client must have a "User" setup for the client portal. |
| GET | /v1/Portfolio/Clients/{key}/Documents | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/{key}/Documents | Portfolio/Clients |  |
| DELETE | /v1/Portfolio/Clients/{key}/Documents/{fileId} | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/{key}/Documents/{fileId} | Portfolio/Clients | Gets a file for the client with the specified key and the file with the specified key. |
| PUT | /v1/Portfolio/Clients/{key}/Documents/{fileId} | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/{key}/Documents/{fileId}/Download | Portfolio/Clients | Gets the raw data of the specific file with the blobId provided which is associated to the client with the specified key. |
| PUT | /v1/Portfolio/Clients/{key}/Documents/Action/MoveToClient/{clientId} | Portfolio/Clients | Move documents to different household |
| GET | /v1/Portfolio/Clients/{key}/GoalTracking | Portfolio/Clients | Returns goal summary and performance info for all accounts in the household |
| DELETE | /v1/Portfolio/Clients/{key}/Integrations/{app} | Portfolio/Clients | Deletes the integration information for the specified integration application, and for the specified ClientId. |
| GET | /v1/Portfolio/Clients/{key}/Integrations/{app} | Portfolio/Clients | Retreives the Intgration information for the specified integration partner application for the specified client id. |
| PUT | /v1/Portfolio/Clients/{key}/Integrations/{app} | Portfolio/Clients | Updates the specified Clients integration information for the specified partner app. |
| GET | /v1/Portfolio/Clients/{key}/NetAmountInvested | Portfolio/Clients | Gets a list of Aum data representative of the range provided for all the client with the specified key. Also returns a list of data to show the net amount invested overtime. |
| GET | /v1/Portfolio/Clients/{key}/Performance | Portfolio/Clients | Used to verbosely return performance. Has the ability to return client performance, benchmark performance, and statistical data for the client over a number of date ranges. |
| GET | /v1/Portfolio/Clients/{key}/Performance/{grouping} | Portfolio/Clients | Used to verbosely return performance. Has the ability to return grouped client performance, benchmark performance, and statistical data for the client over a number of date ranges. |
| GET | /v1/Portfolio/Clients/{key}/Performance/Interval | Portfolio/Clients | Used to return interval performance. Has the ability to return client performance in sequential intervals over a number the date range specified. |
| GET | /v1/Portfolio/Clients/{key}/Performance/Interval/{grouping} | Portfolio/Clients | Used to return interval performance. Has the ability to return grouped client performance in sequential intervals over a number the date range specified. |
| GET | /v1/Portfolio/Clients/{key}/Performance/Summary | Portfolio/Clients | Used to return summary performance. Has the ability to return performance for the client over a number of date ranges. |
| GET | /v1/Portfolio/Clients/{key}/Performance/Summary/{grouping} | Portfolio/Clients | Used to return summary performance. Has the ability to return grouped client performance for the client over a number of date ranges. |
| GET | /v1/Portfolio/Clients/{key}/PortfolioTree | Portfolio/Clients | Gets a tree representation of the client with the key provided. Also includes the registrations within that client and the accounts within those registrations. |
| GET | /v1/Portfolio/Clients/{key}/Registrations | Portfolio/Clients | Gets a list of registrations that fall below the client with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Clients/{key}/RepSimple | Portfolio/Clients | Gets representative simple of the client with the key provided. |
| GET | /v1/Portfolio/Clients/{key}/RmdCalculations | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/{key}/Simple | Portfolio/Clients | Gets the simple client that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Clients/{key}/SSNTaxId | Portfolio/Clients | Retrieve or update SSN for client. |
| GET | /v1/Portfolio/Clients/{key}/Transactions | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/{key}/UnderlyingCounts | Portfolio/Clients | Gets the underlying counts for the client with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Clients/{key}/UserDefinedFields | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/{key}/Value | Portfolio/Clients | Gets the simple client (including aum for the end of today) that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Clients/{key}/Value/{asOfDate} | Portfolio/Clients | Gets the simple client (including aum for the end of the date specified) that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Clients/Action/Cancel | Portfolio/Clients | Cancels the Entire household, or specified accounts within the household |
| PUT | /v1/Portfolio/Clients/Action/Delete | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/Action/ToggleRiskAlerts | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/Action/ValidateRepresentatives/{clientId} | Portfolio/Clients | Validates the representatives list for a client Sample Request POST Portfolio/Clients/Action/ValidateRepresentatives/123     [         {         "clientId": 123,         "createdBy": "test.user",         "createdDate": "2024-11-27",         "editedBy": "test.user",         "editedDate": "2024-11-27",         "endDate": "9999-12-31",         "id": 1,         "isActive": true,         "isCurrentRecord": true,         "isPrimary": true,         "isStartRecord": true,         "isSystemGenerated": false,         "isValid": null,         "notes": null,         "payoutRate": 1,         "representativeId": 1,         "representativeTitleId": null,         "simpleRep":             {             "id": 1,             "isActive": true,             "name": "test, rep",             "number": "123"             },         "startDate": "1900-01-01",         "validationMessage": null         }     ] |
| GET | /v1/Portfolio/Clients/Grid | Portfolio/Clients | Gets a list of clients that the logged in user has access to.  The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Clients/List | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/List/Accounts | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/List/Accounts/Id | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/List/Id | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/List/PortfolioTrees | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/ListCounts | Portfolio/Clients |  |
| PUT | /v1/Portfolio/Clients/PortfolioGroupChanges | Portfolio/Clients | Update list of portfolio group change. |
| DELETE | /v1/Portfolio/Clients/PortfolioGroupChanges/{key} | Portfolio/Clients | Delete the portfolio group change that has the provided key. |
| GET | /v1/Portfolio/Clients/PortfolioGroupChanges/{key} | Portfolio/Clients | Gets the portfolio group change that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Clients/PortfolioGroupChanges/{key} | Portfolio/Clients | Update portfolio group change that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Clients/PortfolioGroups/{key} | Portfolio/Clients | Gets the portfolio group that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Clients/PortfolioTree | Portfolio/Clients | Gets a tree representation of the client with the key provided. Also includes the registrations within that client and the accounts within those registrations. |
| GET | /v1/Portfolio/Clients/qs | Portfolio/Clients | Gets a list of clients returned by a Query Studio Query in the provided Dashboard Card ID |
| GET | /v1/Portfolio/Clients/Search/Advanced | Portfolio/Clients | Gets a list of clients that the logged in user has access to filtered by supplied search parameters. |
| GET | /v1/Portfolio/Clients/Search/Advanced/Count | Portfolio/Clients | Gets a count of clients that the logged in user has access to filtered by supplied search parameters. |
| GET | /v1/Portfolio/Clients/Simple | Portfolio/Clients | Gets a simple list of clients that the logged in user has access to.  The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Clients/Simple/List | Portfolio/Clients | Gets a simple list of clients that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Clients/Simple/List/Id | Portfolio/Clients | Gets a simple list of clients that match one of the keys in the provided list. |
| GET | /v1/Portfolio/Clients/Simple/Search | Portfolio/Clients | Gets a simple list of clients that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/Clients/Simple/Search/{search} | Portfolio/Clients | Gets a simple list of clients that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/Clients/Simple/Search/LastName | Portfolio/Clients | Gets a simple list of clients that the logged in user has access to where the clients lastname begins with the search string. |
| GET | /v1/Portfolio/Clients/Simple/Search/LastName/{search} | Portfolio/Clients | Gets a simple list of clients that the logged in user has access to where the clients lastname begins with the search string. |
| GET | /v1/Portfolio/Clients/Value | Portfolio/Clients | Gets a simple list of clients (including aum for today) that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Clients/Value/{asOfDate} | Portfolio/Clients | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Clients/Value/{asOfDate}/Search | Portfolio/Clients | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string. |
| GET | /v1/Portfolio/Clients/Value/{asOfDate}/Search/{search} | Portfolio/Clients | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string. |
| GET | /v1/Portfolio/Clients/Value/{asOfDate}/Search/LastName | Portfolio/Clients | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the clients lastname begins with the search string. |
| GET | /v1/Portfolio/Clients/Value/{asOfDate}/Search/LastName/{search} | Portfolio/Clients | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the clients lastname begins with the search string. |
| GET | /v1/Portfolio/Clients/Value/Search | Portfolio/Clients | Gets a simple list of clients (including aum for today) that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string. |
| GET | /v1/Portfolio/Clients/Value/Search/{search} | Portfolio/Clients | Gets a simple list of clients (including aum for today) that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string. |
| GET | /v1/Portfolio/Clients/Value/Search/LastName | Portfolio/Clients | Gets a simple list of clients (including aum for today) that the logged in user has access to where the clients lastname begins with the search string. |
| GET | /v1/Portfolio/Clients/Value/Search/LastName/{search} | Portfolio/Clients | Gets a simple list of clients (including aum for today) that the logged in user has access to where the clients lastname begins with the search string. |
| GET | /v1/Portfolio/Clients/Verbose | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/Verbose | Portfolio/Clients | Create client |
| PUT | /v1/Portfolio/Clients/Verbose | Portfolio/Clients | Update clients |
| GET | /v1/Portfolio/Clients/Verbose/{key} | Portfolio/Clients |  |
| PATCH | /v1/Portfolio/Clients/Verbose/{key} | Portfolio/Clients | Allows part of the client to be updated |
| PUT | /v1/Portfolio/Clients/Verbose/{key} | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/Verbose/HouseholdBills/{key} | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/Verbose/List | Portfolio/Clients |  |
| POST | /v1/Portfolio/Clients/Verbose/List/Id | Portfolio/Clients |  |
| GET | /v1/Portfolio/Clients/Verbose/New | Portfolio/Clients |  |
| GET | /v1/Portfolio/CompareTool/{entityType}/{entityId} | Portfolio/CompareTool |  |
| GET | /v1/Portfolio/CompareTool/AccountIds/{entityType}/{entityId} | Portfolio/CompareTool |  |
| GET | /v1/Portfolio/CorporateActionNotifications | Portfolio/CorporateActionNotifications |  |
| GET | /v1/Portfolio/CorporateActionNotifications/{corpActionProcessId}/accounts | Portfolio/CorporateActionNotifications |  |
| PUT | /v1/Portfolio/CostBasis/Queue/AccountList/Create | Portfolio/CostBasis | Creates Orion Stored Cost Basis Queues for all the assets for the given list of accounts |
| PUT | /v1/Portfolio/CostBasis/Queue/AssetList/Create | Portfolio/CostBasis | Creates Orion Stored Cost Basis Queues for a list of assets |
| GET | /v1/Portfolio/CostBasis/Queue/List | Portfolio/CostBasis | Gets the list of Orion Stored Cost Basis Queue that the user has access to |
| GET | /v1/Portfolio/Counts | Portfolio/Counts | Endpoint to get counts for all filters |
| GET | /v1/Portfolio/CrmDocuments/Categories | Portfolio/CrmDocuments |  |
| GET | /v1/Portfolio/CustodianRealized | Portfolio/CustodianRealized | TODO |
| POST | /v1/Portfolio/CustodianRealized | Portfolio/CustodianRealized |  |
| GET | /v1/Portfolio/CustodianRealized/{key} | Portfolio/CustodianRealized | Gets the custodian realized lot that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/CustodianRealized/{key} | Portfolio/CustodianRealized |  |
| PUT | /v1/Portfolio/CustodianRealized/Action/Delete | Portfolio/CustodianRealized |  |
| GET | /v1/Portfolio/Custodians | Portfolio/Custodians | Gets a list of custodians that the logged in user has access to. |
| GET | /v1/Portfolio/Custodians/{key} | Portfolio/Custodians | Gets the custodian that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Custodians/{key}/Accounts | Portfolio/Custodians | Gets a list of accounts that fall below the custodian with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Custodians/{key}/Accounts/Value | Portfolio/Custodians | Gets a simple list of accounts (including aum for today) that fall below the custodian with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Custodians/{key}/Accounts/Value/{asOfDate} | Portfolio/Custodians | Gets a simple list of accounts (including aum for the end of the date specified) that fall below the custodian with the specified key, which the logged in user has access to. |
| PUT | /v1/Portfolio/Custodians/CheckCutoffTimes | Portfolio/Custodians | Compares the current time to the custodian cutoff time in the entity options and returns and warning message if the current time is later than the cutoff time plus buffer of 5 minutes. Added all of the rights that are also used with any of the calls to generate trades because after generate trades in called, this call is made.  This call shouldn't fail at that point. |
| GET | /v1/Portfolio/Custodians/global | Portfolio/Custodians |  |
| GET | /v1/Portfolio/Custodians/Simple | Portfolio/Custodians | Gets a simple list of custodians that the logged in user has access to. |
| GET | /v1/Portfolio/Custodians/Simple/Search | Portfolio/Custodians | Search for specific custodians |
| GET | /v1/Portfolio/Custodians/Simple/Search/{search} | Portfolio/Custodians | Search for specific custodians |
| GET | /v1/Portfolio/Custodians/Value | Portfolio/Custodians | Gets a simple list of custodians (including aum for today) that the logged in user has access to. |
| GET | /v1/Portfolio/Custodians/Value/{asOfDate} | Portfolio/Custodians | Gets a simple list of custodians (including aum for the end of the date specified) that the logged in user has access to. |
| GET | /v1/Portfolio/Custodians/Verbose | Portfolio/Custodians |  |
| POST | /v1/Portfolio/Custodians/Verbose | Portfolio/Custodians | Create a custodian |
| PUT | /v1/Portfolio/Custodians/Verbose | Portfolio/Custodians |  |
| DELETE | /v1/Portfolio/Custodians/Verbose/{key} | Portfolio/Custodians | Used to delete an existing custodian. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/Custodians/Verbose/{key} | Portfolio/Custodians |  |
| PUT | /v1/Portfolio/Custodians/Verbose/{key} | Portfolio/Custodians |  |
| POST | /v1/Portfolio/Custodians/Verbose/List | Portfolio/Custodians |  |
| POST | /v1/Portfolio/Custodians/Verbose/List/Id | Portfolio/Custodians |  |
| GET | /v1/Portfolio/Custodians/Verbose/New | Portfolio/Custodians |  |
| GET | /v1/Portfolio/CustodianUnRealized | Portfolio/CustodianUnRealized | TODO |
| POST | /v1/Portfolio/CustodianUnRealized | Portfolio/CustodianUnRealized |  |
| GET | /v1/Portfolio/CustodianUnRealized/{key} | Portfolio/CustodianUnRealized | Gets the custodian unrealized lot that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/CustodianUnRealized/{key} | Portfolio/CustodianUnRealized |  |
| PUT | /v1/Portfolio/CustodianUnRealized/Action/Delete | Portfolio/CustodianUnRealized |  |
| GET | /v1/Portfolio/CustodianUnRealized/Verbose | Portfolio/CustodianUnRealized |  |
| POST | /v1/Portfolio/CustodianUnRealized/Verbose | Portfolio/CustodianUnRealized |  |
| DELETE | /v1/Portfolio/CustodianUnRealized/Verbose/{key} | Portfolio/CustodianUnRealized | Used to delete an existing Custodian Unrealized. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/CustodianUnRealized/Verbose/{key} | Portfolio/CustodianUnRealized |  |
| PUT | /v1/Portfolio/CustodianUnRealized/Verbose/{key} | Portfolio/CustodianUnRealized |  |
| POST | /v1/Portfolio/Element/NewAccount/{newAccountId}/NewAccountNewPortfolio | Portfolio/Element |  |
| POST | /v1/Portfolio/Element/NewAccount/{newAccountId}/NewAccountRegistration | Portfolio/Element |  |
| POST | /v1/Portfolio/Element/NewHousehold/{newHouseholdId}/blob | Portfolio/Element |  |
| GET | /v1/Portfolio/Element/NewHousehold/{newHouseholdId}/blob/{blobId} | Portfolio/Element |  |
| GET | /v1/Portfolio/Esg/Restriction/Securities/{categoryId} | Portfolio/Esg |  |
| DELETE | /v1/Portfolio/FundFamilies | Portfolio/FundFamilies | Remove a collection of fund family from current database. |
| GET | /v1/Portfolio/FundFamilies | Portfolio/FundFamilies | Gets a list of fund families that the logged in user has access to. |
| POST | /v1/Portfolio/FundFamilies | Portfolio/FundFamilies | Add fund families to current database. |
| DELETE | /v1/Portfolio/FundFamilies/{key} | Portfolio/FundFamilies | Remove fund family from current database. |
| GET | /v1/Portfolio/FundFamilies/{key} | Portfolio/FundFamilies | Gets the fund families that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/FundFamilies/{key}/Accounts | Portfolio/FundFamilies | Gets a list of accounts that fall below the fund family with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/FundFamilies/{key}/Accounts/Value | Portfolio/FundFamilies | Gets a simple list of accounts (including aum for today) that fall below the fund family with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/FundFamilies/{key}/Accounts/Value/{asOfDate} | Portfolio/FundFamilies | Gets a simple list of accounts (including aum for the end of the date specified) that fall below the fund family with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/FundFamilies/{key}/CustodianTradeFileFormats | Portfolio/FundFamilies | Gets a list of custodian trade file formats assigned to the fund family. |
| GET | /v1/Portfolio/FundFamilies/{key}/UserDefinedFields | Portfolio/FundFamilies |  |
| GET | /v1/Portfolio/FundFamilies/CollectFmtSimple | Portfolio/FundFamilies | Gets a simple list of collection formats that the logged in user has access to. |
| GET | /v1/Portfolio/FundFamilies/CollectMethodSimple | Portfolio/FundFamilies | Gets a simple list of collection formats that the logged in user has access to. |
| POST | /v1/Portfolio/FundFamilies/Create | Portfolio/FundFamilies | Saves new FundFamily |
| GET | /v1/Portfolio/FundFamilies/EndResultTradeFormats | Portfolio/FundFamilies | Gets a list of trade formats with end results that the logged in user has access to. |
| GET | /v1/Portfolio/FundFamilies/EndResultTradeFormats/Simple | Portfolio/FundFamilies | Gets a simple list of trade formats with end results that the logged in user has access to. Often used for dropdowns. |
| GET | /v1/Portfolio/FundFamilies/Simple | Portfolio/FundFamilies | Gets a simple list of fund families that the logged in user has access to. |
| GET | /v1/Portfolio/FundFamilies/Simple/Search | Portfolio/FundFamilies | Gets a simple list of fund families. |
| GET | /v1/Portfolio/FundFamilies/Simple/Search/{search} | Portfolio/FundFamilies | Gets a simple list of fund families. |
| GET | /v1/Portfolio/FundFamilies/TradeFormats/Simple | Portfolio/FundFamilies | Gets a simple list of trade formats that the logged in user has access to. Often used for dropdowns. |
| PUT | /v1/Portfolio/FundFamilies/Update | Portfolio/FundFamilies | Update fund family |
| GET | /v1/Portfolio/FundFamilies/Value | Portfolio/FundFamilies | Gets a simple list of fund families (including aum for today) that the logged in user has access to. |
| GET | /v1/Portfolio/FundFamilies/Value/{asOfDate} | Portfolio/FundFamilies | Gets a simple list of fund families (including aum for the end of the date specified) that the logged in user has access to. |
| GET | /v1/Portfolio/Genders | Portfolio/Genders | Gets a simple list of genders that the logged in user has access to. |
| GET | /v1/Portfolio/Genders/Simple | Portfolio/Genders | Gets a simple list of genders that the logged in user has access to. |
| GET | /v1/Portfolio/Goals | Portfolio/Goals | Update a goal. |
| POST | /v1/Portfolio/Goals | Portfolio/Goals | Create new goal. |
| DELETE | /v1/Portfolio/Goals/{key} | Portfolio/Goals | Delete goal by id. |
| GET | /v1/Portfolio/Goals/{key} | Portfolio/Goals | Find goal by id. |
| PUT | /v1/Portfolio/Goals/{key} | Portfolio/Goals | Update an existing goal. |
| GET | /v1/Portfolio/Goals/Types | Portfolio/Goals | Return goal types. |
| GET | /v1/Portfolio/HouseholdMemberTypes | Portfolio/HouseholdMemberTypes | Gets a list of household member types. |
| GET | /v1/Portfolio/IndexBlends | Portfolio/IndexBlends | Gets a list of index blends that the logged in user has access to. |
| POST | /v1/Portfolio/IndexBlends | Portfolio/IndexBlends | Used to create a new index blend. |
| DELETE | /v1/Portfolio/IndexBlends/{key} | Portfolio/IndexBlends | Used to delete an existing index blend. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/IndexBlends/{key} | Portfolio/IndexBlends | Gets the index blend that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/IndexBlends/{key} | Portfolio/IndexBlends | Used to update an existing index blend. Upon successful modification a 200 will be returned. |
| GET | /v1/Portfolio/IndexBlends/{key}/DateRanges | Portfolio/IndexBlends |  |
| GET | /v1/Portfolio/IndexBlends/{key}/Intervals | Portfolio/IndexBlends |  |
| GET | /v1/Portfolio/IndexBlends/Simple | Portfolio/IndexBlends | Gets a simple list of index blends that the logged in user has access to. |
| GET | /v1/Portfolio/InvestmentObjectives | Portfolio/InvestmentObjectives |  |
| PUT | /v1/Portfolio/InvestmentObjectives | Portfolio/InvestmentObjectives |  |
| DELETE | /v1/Portfolio/InvestmentObjectives/{key} | Portfolio/InvestmentObjectives |  |
| GET | /v1/Portfolio/InvestmentObjectives/Simple | Portfolio/InvestmentObjectives | Method to get all investment objectives |
| GET | /v1/Portfolio/InvestmentObjectives/Verbose | Portfolio/InvestmentObjectives |  |
| POST | /v1/Portfolio/InvestmentObjectives/Verbose | Portfolio/InvestmentObjectives | Create new investment objectives. |
| PUT | /v1/Portfolio/InvestmentObjectives/Verbose | Portfolio/InvestmentObjectives | Update multiple Investment Objectives |
| GET | /v1/Portfolio/InvestmentObjectives/Verbose/{key} | Portfolio/InvestmentObjectives |  |
| PUT | /v1/Portfolio/InvestmentObjectives/Verbose/{key} | Portfolio/InvestmentObjectives |  |
| GET | /v1/Portfolio/InvestmentObjectives/Verbose/New | Portfolio/InvestmentObjectives |  |
| GET | /v1/Portfolio/Locale | Portfolio/Locale | Get all Locales |
| GET | /v1/Portfolio/Locale/Available | Portfolio/Locale |  |
| GET | /v1/Portfolio/Locale/Simple | Portfolio/Locale |  |
| GET | /v1/Portfolio/Managers | Portfolio/Managers | Get all Managers |
| POST | /v1/Portfolio/Managers | Portfolio/Managers | Adds a new Manager to the database. |
| DELETE | /v1/Portfolio/Managers/{key} | Portfolio/Managers | Deletes the specified Manager from the database. |
| GET | /v1/Portfolio/Managers/{key} | Portfolio/Managers | Gets the Manager that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Managers/{key} | Portfolio/Managers | Updates the Manager that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Managers/Simple | Portfolio/Managers | Get all Managers |
| GET | /v1/Portfolio/MatrixB50 | Portfolio/MatrixB50 |  |
| PUT | /v1/Portfolio/MatrixB50/List/UpdateStatus | Portfolio/MatrixB50 |  |
| GET | /v1/Portfolio/MatrixB50/Status | Portfolio/MatrixB50 |  |
| GET | /v1/Portfolio/NoteCategories | Portfolio/NoteCategories | Gets a list of note categories for the entity provided |
| GET | /v1/Portfolio/OfacChecks | Portfolio/OfacChecks | Gets a list of OFAC check records that the logged in user has access to. |
| GET | /v1/Portfolio/OfacChecks/{key} | Portfolio/OfacChecks | Gets the ofac check that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/OfacChecks/Actions/SetStatus | Portfolio/OfacChecks |  |
| GET | /v1/Portfolio/OfacFiles/DownloadOfacFiles | Portfolio/OfacFiles | Download OFAC Files from to https://www.treasury.gov/resource-center/sanctions/SDN-List/Pages/default.aspx |
| GET | /v1/Portfolio/OrionRealized | Portfolio/OrionRealized | TODO |
| POST | /v1/Portfolio/OrionRealized | Portfolio/OrionRealized |  |
| GET | /v1/Portfolio/OrionRealized/{key} | Portfolio/OrionRealized | Gets the orion realized lot that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/OrionRealized/{key} | Portfolio/OrionRealized |  |
| PUT | /v1/Portfolio/OrionRealized/Action/Delete | Portfolio/OrionRealized |  |
| GET | /v1/Portfolio/OrionUnrealized | Portfolio/OrionUnrealized | TODO |
| POST | /v1/Portfolio/OrionUnrealized | Portfolio/OrionUnrealized |  |
| GET | /v1/Portfolio/OrionUnrealized/{key} | Portfolio/OrionUnrealized | Gets the orion unrealized lot that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/OrionUnrealized/{key} | Portfolio/OrionUnrealized |  |
| PUT | /v1/Portfolio/OrionUnrealized/Action/Delete | Portfolio/OrionUnrealized |  |
| GET | /v1/Portfolio/ParentCategories | Portfolio/ParentCategories | Gets a list of parent categories that the logged in user has access to. |
| POST | /v1/Portfolio/ParentCategories | Portfolio/ParentCategories |  |
| DELETE | /v1/Portfolio/ParentCategories/{key} | Portfolio/ParentCategories |  |
| GET | /v1/Portfolio/ParentCategories/{key} | Portfolio/ParentCategories |  |
| PUT | /v1/Portfolio/ParentCategories/{key} | Portfolio/ParentCategories |  |
| GET | /v1/Portfolio/Participants/Simple | Portfolio/Participants |  |
| GET | /v1/Portfolio/PlanAdministrators | Portfolio/PlanAdministrators |  |
| POST | /v1/Portfolio/PlanAdministrators | Portfolio/PlanAdministrators |  |
| DELETE | /v1/Portfolio/PlanAdministrators/{key} | Portfolio/PlanAdministrators |  |
| GET | /v1/Portfolio/PlanAdministrators/{key} | Portfolio/PlanAdministrators |  |
| PUT | /v1/Portfolio/PlanAdministrators/{key} | Portfolio/PlanAdministrators |  |
| PUT | /v1/Portfolio/PlanAdministrators/Action/Delete | Portfolio/PlanAdministrators |  |
| GET | /v1/Portfolio/PlanAdministrators/Simple | Portfolio/PlanAdministrators | Gets a simple list of plans that the logged in user has access to. |
| GET | /v1/Portfolio/Plans | Portfolio/Plans | Gets a list of plans that the logged in user has access to. |
| GET | /v1/Portfolio/Plans/{key} | Portfolio/Plans | Gets the plan that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Plans/{planId}/Sponsor/SSNTaxId | Portfolio/Plans | Update plan summary tax id. |
| GET | /v1/Portfolio/Plans/Qualified/{registrationTypeId} | Portfolio/Plans | Gets a simple list of qualified plans that the logged in user has access to. |
| GET | /v1/Portfolio/Plans/Search | Portfolio/Plans | Gets a list of plans that the logged in user has access to where the plan name begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/Plans/Search/{search} | Portfolio/Plans | Gets a list of plans that the logged in user has access to where the plan name begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/Plans/Simple | Portfolio/Plans | Gets a simple list of plans that the logged in user has access to. |
| GET | /v1/Portfolio/Plans/Verbose | Portfolio/Plans |  |
| POST | /v1/Portfolio/Plans/Verbose | Portfolio/Plans | Create a plan |
| PUT | /v1/Portfolio/Plans/Verbose | Portfolio/Plans | Update a list of plan summary. |
| DELETE | /v1/Portfolio/Plans/Verbose/{key} | Portfolio/Plans | Used to delete an existing plan. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/Plans/Verbose/{key} | Portfolio/Plans |  |
| PUT | /v1/Portfolio/Plans/Verbose/{key} | Portfolio/Plans | Update plan summary |
| POST | /v1/Portfolio/Plans/Verbose/List | Portfolio/Plans |  |
| POST | /v1/Portfolio/Plans/Verbose/List/Id | Portfolio/Plans |  |
| GET | /v1/Portfolio/Plans/Verbose/New | Portfolio/Plans |  |
| GET | /v1/Portfolio/PlanSponsors/Simple | Portfolio/PlanSponsors |  |
| GET | /v1/Portfolio/Platforms | Portfolio/Platforms | Gets a list of platforms that the logged in user has access to. |
| POST | /v1/Portfolio/Platforms | Portfolio/Platforms | Used to create a new platform. Upon successful creation a 201 will be returned with the location of the newly created platform. |
| DELETE | /v1/Portfolio/Platforms/{key} | Portfolio/Platforms | Used to delete an existing product platform. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/Platforms/{key} | Portfolio/Platforms | Gets the platform that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Platforms/{key} | Portfolio/Platforms | Used to update an existing product platform. Upon successful modification a 200 will be returned. |
| GET | /v1/Portfolio/Platforms/{key}/Accounts | Portfolio/Platforms | Gets a list of accounts that fall below the platform with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Platforms/{key}/Accounts/Value | Portfolio/Platforms | Gets a simple list of accounts (including aum for today) that fall below the platform with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Platforms/{key}/Accounts/Value/{asOfDate} | Portfolio/Platforms | Gets a simple list of accounts (including aum for the end of the date specified) that fall below the platform with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Platforms/Search | Portfolio/Platforms |  |
| GET | /v1/Portfolio/Platforms/Search/{search} | Portfolio/Platforms |  |
| GET | /v1/Portfolio/Platforms/Simple | Portfolio/Platforms | Gets a simple list of platforms that the logged in user has access to. |
| GET | /v1/Portfolio/Platforms/Value | Portfolio/Platforms | Gets a simple list of platforms (including aum for today) that the logged in user has access to. |
| GET | /v1/Portfolio/Platforms/Value/{asOfDate} | Portfolio/Platforms | Gets a simple list of platforms (including aum for the end of the date specified) that the logged in user has access to. |
| GET | /v1/Portfolio/PlatformTypes | Portfolio/PlatformTypes | Gets a list of platform typess that the logged in user has access to. |
| GET | /v1/Portfolio/PlatformTypes/Simple | Portfolio/PlatformTypes |  |
| GET | /v1/Portfolio/PortfolioAudit/Cache/{key}/LastRefreshDate | Portfolio/PortfolioAudit |  |
| GET | /v1/Portfolio/PortfolioGroupAutomation | Portfolio/PortfolioGroupAutomation | Get the Portfolio Group Automation Configuration for the current identity |
| POST | /v1/Portfolio/PortfolioGroupAutomation | Portfolio/PortfolioGroupAutomation | Create or update the Portfolio Group Automation Configuration for the current identity |
| POST | /v1/Portfolio/PortfolioGroupAutomation/Run | Portfolio/PortfolioGroupAutomation | Run the Portfolio Group Assignment Automation Job for the current identity client |
| POST | /v1/Portfolio/PortfolioGroupAutomation/Run/Household/{householdId} | Portfolio/PortfolioGroupAutomation | Run the Portfolio Group Assignment Automation Job single household |
| GET | /v1/Portfolio/PortfolioGroups | Portfolio/PortfolioGroups | Gets a list of portfolio groups that the logged in user has access to. |
| POST | /v1/Portfolio/PortfolioGroups | Portfolio/PortfolioGroups |  |
| DELETE | /v1/Portfolio/PortfolioGroups/{key} | Portfolio/PortfolioGroups |  |
| GET | /v1/Portfolio/PortfolioGroups/{key} | Portfolio/PortfolioGroups | Gets the portfolio group that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/PortfolioGroups/{key} | Portfolio/PortfolioGroups |  |
| GET | /v1/Portfolio/PortfolioGroups/{key}/Accounts | Portfolio/PortfolioGroups | Gets a list of registrations that fall below the portfolio group with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/PortfolioGroups/{key}/Assets | Portfolio/PortfolioGroups | Gets a list of asset that fall below the portfolio group with the specified key, which the logged in user has access to. |
| POST | /v1/Portfolio/PortfolioGroups/{key}/Calculate/InceptionDate | Portfolio/PortfolioGroups | Used to calculate the appropriate inception date for the provided portfolio group. |
| GET | /v1/Portfolio/PortfolioGroups/{key}/Clients | Portfolio/PortfolioGroups | Gets a list of clients that fall below the portfolio group with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/PortfolioGroups/{key}/NetAmountInvested | Portfolio/PortfolioGroups |  |
| GET | /v1/Portfolio/PortfolioGroups/{key}/Registrations | Portfolio/PortfolioGroups | Gets a list of registrations that fall below the portfolio group with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/PortfolioGroups/{key}/Simple | Portfolio/PortfolioGroups | Gets the simple portfolio group that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/PortfolioGroups/{key}/Transactions | Portfolio/PortfolioGroups | Gets a list of registrations that fall below the portfolio group with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/PortfolioGroups/{key}/UserDefinedFields | Portfolio/PortfolioGroups |  |
| GET | /v1/Portfolio/PortfolioGroups/Search | Portfolio/PortfolioGroups | Gets a list of portfolio groups that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/PortfolioGroups/Search/{search} | Portfolio/PortfolioGroups | Gets a list of portfolio groups that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/PortfolioGroups/Simple | Portfolio/PortfolioGroups | Gets a simple list of portfolio groups that the logged in user has access to. |
| POST | /v1/Portfolio/PortfolioGroups/Simple/List | Portfolio/PortfolioGroups | Gets a simple list of portfolio groups that match one of the keys in the provided list. |
| POST | /v1/Portfolio/PortfolioGroups/Simple/List/Id | Portfolio/PortfolioGroups | Gets a simple list of portfolio groups that match one of the keys in the provided list. |
| GET | /v1/Portfolio/PortfolioGroups/Simple/Search | Portfolio/PortfolioGroups | Gets a simple list of clients that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/PortfolioGroups/Simple/Search/{search} | Portfolio/PortfolioGroups | Gets a simple list of clients that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/ProductCategories | Portfolio/ProductCategories | Gets a list of product categories that the logged in user has access to. |
| POST | /v1/Portfolio/ProductCategories | Portfolio/ProductCategories | Used to create a new product category. Upon successful creation a 201 will be returned with the location of the newly created product category. |
| DELETE | /v1/Portfolio/ProductCategories/{key} | Portfolio/ProductCategories | Used to delete an existing product category. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/ProductCategories/{key} | Portfolio/ProductCategories | Gets the product category that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/ProductCategories/{key} | Portfolio/ProductCategories | Used to update an existing product category. Upon successful modification a 200 will be returned. |
| PUT | /v1/Portfolio/ProductCategories/Action/EstablishColors | Portfolio/ProductCategories | Generates a random color for every product category that has no color. The ids of any product category affected is returned. |
| GET | /v1/Portfolio/ProductCategories/Simple | Portfolio/ProductCategories | Gets a simple list of product categories that the logged in user has access to. |
| GET | /v1/Portfolio/ProductCategories/Simple/Search | Portfolio/ProductCategories | Gets a simple list of portfolio classes by the search criteria. |
| GET | /v1/Portfolio/ProductCategories/Simple/Search/{search} | Portfolio/ProductCategories | Gets a simple list of portfolio classes by the search criteria. |
| GET | /v1/Portfolio/ProductCategories/Weighted | Portfolio/ProductCategories | Gets a list of weighted asset categories that the logged in user has access to. |
| POST | /v1/Portfolio/ProductCategories/Weighted | Portfolio/ProductCategories | Create weighted product categories |
| PUT | /v1/Portfolio/ProductCategories/Weighted | Portfolio/ProductCategories | Mass update product categories weights |
| DELETE | /v1/Portfolio/ProductCategories/Weighted/{key} | Portfolio/ProductCategories | Delete product category weight |
| GET | /v1/Portfolio/ProductCategories/Weighted/{key} | Portfolio/ProductCategories | Gets a list of weighted asset categories that the logged in user has access to. |
| PUT | /v1/Portfolio/ProductCategories/Weighted/{key} | Portfolio/ProductCategories | Update weighted product categories |
| GET | /v1/Portfolio/ProductCategories/Weighted/Products/{productId} | Portfolio/ProductCategories | Get all weighted asset categories by product |
| GET | /v1/Portfolio/ProductCategories/Weighted/Products/{productId}/Representative/{representativeId} | Portfolio/ProductCategories | Get all weighted asset categories by product and representative |
| GET | /v1/Portfolio/ProductClassAutoAssignOverride | Portfolio/ProductClassAutoAssignOverride | Gets a list of product class Auto Assign Overrides that the logged in user has access to. |
| POST | /v1/Portfolio/ProductClassAutoAssignOverride | Portfolio/ProductClassAutoAssignOverride |  |
| GET | /v1/Portfolio/ProductClassAutoAssignOverride/{providerId}/{abbreviation} | Portfolio/ProductClassAutoAssignOverride | Gets the product class Auto Assign Override that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/ProductClassAutoAssignOverride/List | Portfolio/ProductClassAutoAssignOverride | Gets the product class Auto Assign Overrides for the provided keys. |
| POST | /v1/Portfolio/ProductClassAutoAssignOverride/List/Id | Portfolio/ProductClassAutoAssignOverride | Gets the product class Auto Assign Overrides for the provided keys. |
| GET | /v1/Portfolio/ProductClassAutoAssignOverride/ProductClass/Simple | Portfolio/ProductClassAutoAssignOverride |  |
| GET | /v1/Portfolio/ProductClasses | Portfolio/ProductClasses | Gets a list of product classes that the logged in user has access to. |
| GET | /v1/Portfolio/ProductClasses/{key} | Portfolio/ProductClasses | Gets the product class that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/ProductClasses/{key}/Simple | Portfolio/ProductClasses | Gets the simple product class that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/ProductClasses/Action/EstablishColors | Portfolio/ProductClasses | Generates a random color for every product class that has no color. The ids of any product class affected is returned. |
| PUT | /v1/Portfolio/ProductClasses/Reset | Portfolio/ProductClasses |  |
| GET | /v1/Portfolio/ProductClasses/Simple | Portfolio/ProductClasses | Gets a simple list of productClasses that the logged in user has access to. |
| GET | /v1/Portfolio/ProductClasses/Simple/Search | Portfolio/ProductClasses | Gets a simple list of portfolio classes by the search criteria. |
| GET | /v1/Portfolio/ProductClasses/Simple/Search/{search} | Portfolio/ProductClasses | Gets a simple list of portfolio classes by the search criteria. |
| GET | /v1/Portfolio/ProductClasses/Verbose | Portfolio/ProductClasses |  |
| POST | /v1/Portfolio/ProductClasses/Verbose | Portfolio/ProductClasses | Create a product class |
| PUT | /v1/Portfolio/ProductClasses/Verbose | Portfolio/ProductClasses |  |
| DELETE | /v1/Portfolio/ProductClasses/Verbose/{key} | Portfolio/ProductClasses | Used to delete an existing product class. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/ProductClasses/Verbose/{key} | Portfolio/ProductClasses |  |
| PUT | /v1/Portfolio/ProductClasses/Verbose/{key} | Portfolio/ProductClasses |  |
| GET | /v1/Portfolio/ProductClasses/Verbose/CanDelete/{key} | Portfolio/ProductClasses | Gets a list of errors if a delete was attempted on the product class. |
| POST | /v1/Portfolio/ProductClasses/Verbose/List | Portfolio/ProductClasses |  |
| POST | /v1/Portfolio/ProductClasses/Verbose/List/Id | Portfolio/ProductClasses |  |
| GET | /v1/Portfolio/ProductClasses/Verbose/New | Portfolio/ProductClasses |  |
| GET | /v1/Portfolio/ProductClasses/Weighted | Portfolio/ProductClasses | Gets a list of weighted asset classes that the logged in user has access to. |
| POST | /v1/Portfolio/ProductClasses/Weighted | Portfolio/ProductClasses | Create weighted product classes |
| PUT | /v1/Portfolio/ProductClasses/Weighted | Portfolio/ProductClasses | Mass update product classes weights |
| DELETE | /v1/Portfolio/ProductClasses/Weighted/{key} | Portfolio/ProductClasses | Delete product class weight |
| GET | /v1/Portfolio/ProductClasses/Weighted/{key} | Portfolio/ProductClasses | Gets a list of weighted asset classes that the logged in user has access to. |
| PUT | /v1/Portfolio/ProductClasses/Weighted/{key} | Portfolio/ProductClasses | Update weighted product classes |
| GET | /v1/Portfolio/ProductClasses/Weighted/Products/{productId} | Portfolio/ProductClasses | Get all weighted asset classes by product |
| GET | /v1/Portfolio/ProductClasses/Weighted/Products/{productId}/Representative/{representativeId} | Portfolio/ProductClasses | Get all weighted asset classes by product and representative |
| GET | /v1/Portfolio/ProductDescriptionProvider/Assignments | Portfolio/ProductDescriptionProvider | Gets a list of product description provider assignments that the logged in user has access to. |
| PUT | /v1/Portfolio/ProductDescriptionProvider/Assignments | Portfolio/ProductDescriptionProvider |  |
| GET | /v1/Portfolio/ProductDescriptionProvider/Assignments/{key} | Portfolio/ProductDescriptionProvider | Gets the product description provider assignments for the product type provided. |
| PUT | /v1/Portfolio/ProductDescriptionProvider/Assignments/{key} | Portfolio/ProductDescriptionProvider |  |
| POST | /v1/Portfolio/ProductDescriptionProvider/Assignments/RunAutoAssignments | Portfolio/ProductDescriptionProvider |  |
| GET | /v1/Portfolio/ProductDescriptionProvider/Simple | Portfolio/ProductDescriptionProvider |  |
| GET | /v1/Portfolio/ProductExpenseRatio | Portfolio/ProductExpenseRatio | Gets a list of Product Expense Ratios |
| GET | /v1/Portfolio/Products | Portfolio/Products | Gets a list of local products that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Products/{key} | Portfolio/Products | Gets the local product that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/Products/AssetClassificationData | Portfolio/Products | Get a list of data for provided symbol. |
| GET | /v1/Portfolio/Products/BondCalls | Portfolio/Products | Gets a list of Product Bond Call Prices that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Products/BondCalls | Portfolio/Products | Used to create a new product bondCall. Upon successful creation a 201 will be returned with the location of the nearly created bond call. |
| PUT | /v1/Portfolio/Products/BondCalls | Portfolio/Products |  |
| DELETE | /v1/Portfolio/Products/BondCalls/{productId}/{callDate} | Portfolio/Products | Used to delete an existing bond call. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/Products/BondCalls/{productId}/{callDate} | Portfolio/Products | Gets the product/call date that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Products/BondCalls/{productId}/{callDate} | Portfolio/Products | Used to update an existing bond call. Upon successful modification a 200 will be returned. |
| PUT | /v1/Portfolio/Products/BondCalls/Action/Delete | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/BondCalls/List | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/Counts | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/Exclusions | Portfolio/Products | Gets a list of product entity exclusions that the logged in user has access to. The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Products/Exclusions | Portfolio/Products | Used to create a new Product Entity Exclusion. Upon successful creation a 201 will be returned with the location of the nearly created local price. |
| DELETE | /v1/Portfolio/Products/Exclusions/{key} | Portfolio/Products | Used to delete an existing Product Entity Exclusion. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/Products/Exclusions/{key} | Portfolio/Products | Gets the product entity exclusion that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Products/Exclusions/{key} | Portfolio/Products | Used to update an existing Product Entity Exclusion. Upon successful modification a 200 will be returned. |
| POST | /v1/Portfolio/Products/Exclusions/ByTickerList | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/Exclusions/EnMasse | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/Grid/Bond/New | Portfolio/Products | Get a list of Bond audit products that the logged in user has access to The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Products/Grid/New | Portfolio/Products | Get a list of products that the logged in user has access to The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Products/HoldingsData | Portfolio/Products | Get a list of Holdings data for provided symbol. |
| POST | /v1/Portfolio/Products/Import/Filter | Portfolio/Products | Allows uploading a list of products to be custom filtered by product ID or download symbol |
| POST | /v1/Portfolio/Products/List | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/List/Id | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/List/Id/Minimal | Portfolio/Products |  |
| PUT | /v1/Portfolio/Products/List/Id/OrionVision | Portfolio/Products | Updates Orion Vision Alternative Product Fields |
| POST | /v1/Portfolio/Products/List/Ticker | Portfolio/Products | Get a list of  products for an array of tickers. |
| GET | /v1/Portfolio/Products/NameMappingDST | Portfolio/Products | Get all PropertyTypes |
| POST | /v1/Portfolio/Products/NameMappingDST | Portfolio/Products | Adds a new PropertyType to the database. |
| DELETE | /v1/Portfolio/Products/NameMappingDST/{key} | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/NameMappingDST/{key} | Portfolio/Products | Gets the PropertyType that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Products/NameMappingDST/{key} | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/Prices/Local | Portfolio/Products | Gets a list of local prices that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Products/Prices/Local | Portfolio/Products | Used to create a new local price. Upon successful creation a 201 will be returned with the location of the nearly created local price. |
| PUT | /v1/Portfolio/Products/Prices/Local | Portfolio/Products |  |
| DELETE | /v1/Portfolio/Products/Prices/Local/{productId}/{priceDate} | Portfolio/Products | Used to delete an existing local price. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/Products/Prices/Local/{productId}/{priceDate} | Portfolio/Products | Gets the local price that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Products/Prices/Local/{productId}/{priceDate} | Portfolio/Products | Used to update an existing local price. Upon successful modification a 200 will be returned. |
| PUT | /v1/Portfolio/Products/Prices/Local/Action/Delete | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/Prices/Local/List | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/Prices/Local/List/Id | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/Search | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/Search/{search} | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/Simple/{key} | Portfolio/Products | Gets the local product that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/Products/Simple/List | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/Simple/List/Id | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/Verbose | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/Verbose | Portfolio/Products | Create new local product |
| PUT | /v1/Portfolio/Products/Verbose | Portfolio/Products |  |
| GET | /v1/Portfolio/Products/Verbose/{key} | Portfolio/Products |  |
| PUT | /v1/Portfolio/Products/Verbose/{key} | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/Verbose/List | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/Verbose/List/Id | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/Verbose/Many | Portfolio/Products | Creates one or more local products. |
| GET | /v1/Portfolio/Products/Verbose/New/{key} | Portfolio/Products |  |
| POST | /v1/Portfolio/Products/Weightings/Remove | Portfolio/Products |  |
| GET | /v1/Portfolio/ProductTypes/Simple | Portfolio/ProductTypes |  |
| GET | /v1/Portfolio/PropertyTypes | Portfolio/PropertyTypes | Get all PropertyTypes |
| POST | /v1/Portfolio/PropertyTypes | Portfolio/PropertyTypes | Adds a new PropertyType to the database. |
| DELETE | /v1/Portfolio/PropertyTypes/{key} | Portfolio/PropertyTypes | Deletes the specified PropertyType from the database. |
| GET | /v1/Portfolio/PropertyTypes/{key} | Portfolio/PropertyTypes | Gets the PropertyType that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/PropertyTypes/{key} | Portfolio/PropertyTypes | Updates the PropertyType that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/PropertyTypes/Simple | Portfolio/PropertyTypes | Get all PropertyTypes |
| GET | /v1/Portfolio/PropertyTypes/Weighted | Portfolio/PropertyTypes | Gets a list of weighted asset property types that the logged in user has access to. |
| POST | /v1/Portfolio/PropertyTypes/Weighted | Portfolio/PropertyTypes | Create weighted product property types |
| PUT | /v1/Portfolio/PropertyTypes/Weighted | Portfolio/PropertyTypes | Mass update product property types |
| DELETE | /v1/Portfolio/PropertyTypes/Weighted/{key} | Portfolio/PropertyTypes | Delete product property type |
| GET | /v1/Portfolio/PropertyTypes/Weighted/{key} | Portfolio/PropertyTypes | Gets a list of weighted asset property types that the logged in user has access to. |
| PUT | /v1/Portfolio/PropertyTypes/Weighted/{key} | Portfolio/PropertyTypes | Update weighted product property types |
| GET | /v1/Portfolio/PropertyTypes/Weighted/Products/{productId} | Portfolio/PropertyTypes | Get all weighted asset property types by product |
| GET | /v1/Portfolio/PropertyTypes/Weighted/Products/{productId}/Representative/{representativeId} | Portfolio/PropertyTypes | Get all weighted asset property types by product and representative |
| GET | /v1/Portfolio/QPENonManaged | Portfolio/QPENonManaged | Gets a list of qpenonmanaged that the logged in user has access to. |
| POST | /v1/Portfolio/QPENonManaged | Portfolio/QPENonManaged |  |
| DELETE | /v1/Portfolio/QPENonManaged/{key} | Portfolio/QPENonManaged |  |
| GET | /v1/Portfolio/QPENonManaged/{key} | Portfolio/QPENonManaged | Gets the qpenonmanaged that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/QPENonManaged/{key} | Portfolio/QPENonManaged |  |
| PUT | /v1/Portfolio/QPENonManaged/Action/Delete | Portfolio/QPENonManaged |  |
| GET | /v1/Portfolio/Regions | Portfolio/Regions | Get all Regions |
| POST | /v1/Portfolio/Regions | Portfolio/Regions | Adds a new Region to the database. |
| DELETE | /v1/Portfolio/Regions/{key} | Portfolio/Regions | Deletes the specified Region from the database. |
| GET | /v1/Portfolio/Regions/{key} | Portfolio/Regions | Gets the Region that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Regions/{key} | Portfolio/Regions | Updates the Region that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Regions/Simple | Portfolio/Regions | Get all Regions |
| GET | /v1/Portfolio/Regions/Weighted | Portfolio/Regions | Gets a list of weighted asset regions that the logged in user has access to. |
| POST | /v1/Portfolio/Regions/Weighted | Portfolio/Regions | Create weighted product regions |
| PUT | /v1/Portfolio/Regions/Weighted | Portfolio/Regions | Mass update product regions |
| DELETE | /v1/Portfolio/Regions/Weighted/{key} | Portfolio/Regions | Delete product region |
| GET | /v1/Portfolio/Regions/Weighted/{key} | Portfolio/Regions | Gets a list of weighted asset regions that the logged in user has access to. |
| PUT | /v1/Portfolio/Regions/Weighted/{key} | Portfolio/Regions | Update weighted product regions |
| GET | /v1/Portfolio/Regions/Weighted/Products/{productId} | Portfolio/Regions | Get all weighted asset regions by product |
| GET | /v1/Portfolio/Regions/Weighted/Products/{productId}/Representative/{representativeId} | Portfolio/Regions | Get all weighted asset regions by product and representative |
| GET | /v1/Portfolio/RegistrationChanges/{registrationId} | Portfolio/RegistrationChanges | Gets a list of registration changes for specific registration id. |
| PUT | /v1/Portfolio/RegistrationChanges/{registrationId} | Portfolio/RegistrationChanges | Updates a list of registration changes for specific registration id. |
| GET | /v1/Portfolio/Registrations | Portfolio/Registrations | Gets a list of registrations that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Registrations/{clientId}/Client/Payouts | Portfolio/Registrations |  |
| GET | /v1/Portfolio/Registrations/{key} | Portfolio/Registrations | Gets the registration that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Registrations/{key} | Portfolio/Registrations | Simple dto update |
| GET | /v1/Portfolio/Registrations/{key}/Accounts | Portfolio/Registrations | Obsolete. This endpoint may no longer exist at anytime after August 2016. Use Portfolio/Accounts/?registrationId={key}&amp;isActive={isActive} instead. |
| GET | /v1/Portfolio/Registrations/{key}/Accounts/Value | Portfolio/Registrations | Gets a simple list of accounts (including aum for today) that fall below the registration with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Registrations/{key}/Accounts/Value/{asOfDate} | Portfolio/Registrations | Gets a simple list of accounts (including aum for the end of the date specified) that fall below the registration with the specified key, which the logged in user has access to. |
| PUT | /v1/Portfolio/Registrations/{key}/Action/MoveToClient/{clientId} | Portfolio/Registrations | Move registration to different household |
| PUT | /v1/Portfolio/Registrations/{key}/Action/Split | Portfolio/Registrations | Splits the active, non-sleeved accounts in this registration into their own registration (each of which is a copy of this registartion). |
| GET | /v1/Portfolio/Registrations/{key}/AdditionalRepresentativesPercent | Portfolio/Registrations | Gets additional representative with percent by id |
| GET | /v1/Portfolio/Registrations/{key}/Assets | Portfolio/Registrations | Gets a list of assets that fall within the registration with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Registrations/{key}/Assets/{asOfDate} | Portfolio/Registrations | Gets a list of assets that fall within the registration with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Registrations/{key}/Assets/Value | Portfolio/Registrations | Gets a simple list of assets (including aum for today) that fall within the registration with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Registrations/{key}/Assets/Value/{asOfDate} | Portfolio/Registrations | Gets a simple list of assets (including aum for the end of the date specified) that fall within the registration with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Registrations/{key}/AumOverTime | Portfolio/Registrations | Gets a list of Aum data representative of the range provided for the registration with the specified key. |
| PUT | /v1/Portfolio/Registrations/{key}/Beneficiary/{beneficiaryId}/SSN | Portfolio/Registrations | Gets SSN for beneficiary |
| POST | /v1/Portfolio/Registrations/{key}/Calculate/InceptionDate | Portfolio/Registrations | Used to calculate the appropriate inception date for the provided registration. |
| GET | /v1/Portfolio/Registrations/{key}/CustomIndex | Portfolio/Registrations | Get full set of Registrations's Custom Index Input data |
| PUT | /v1/Portfolio/Registrations/{key}/DeceasedSSNTaxId | Portfolio/Registrations | Retrieve or update SSN for client. |
| GET | /v1/Portfolio/Registrations/{key}/FirstActiveAccount/Custodian/EntityOptions/Code/{code} | Portfolio/Registrations | Gets the specified entity option (by code) from the registrations first (lowest pk) active account's custodian. |
| GET | /v1/Portfolio/Registrations/{key}/NetAmountInvested | Portfolio/Registrations | Gets a list of Aum data representative of the range provided for registration with the specified key. Also returns a list of data to show the net amount invested overtime. |
| GET | /v1/Portfolio/Registrations/{key}/Performance | Portfolio/Registrations | Used to verbosely return performance. Has the ability to return account performance, benchmark performance, and statistical data for the registration over a number of date ranges. |
| GET | /v1/Portfolio/Registrations/{key}/Performance/{grouping} | Portfolio/Registrations | Used to verbosely return performance. Has the ability to return grouped account performance, benchmark performance, and statistical data for the registration over a number of date ranges. |
| GET | /v1/Portfolio/Registrations/{key}/Performance/Interval | Portfolio/Registrations | Used to return interval performance. Has the ability to return registration performance in sequential intervals over a number the date range specified. |
| GET | /v1/Portfolio/Registrations/{key}/Performance/Interval/{grouping} | Portfolio/Registrations | Used to return interval performance. Has the ability to return grouped registration performance in sequential intervals over a number the date range specified. |
| GET | /v1/Portfolio/Registrations/{key}/Performance/Summary | Portfolio/Registrations | Used to return summary performance. Has the ability to return performance for the registration over a number of date ranges. |
| GET | /v1/Portfolio/Registrations/{key}/Performance/Summary/{grouping} | Portfolio/Registrations | Used to return summary performance. Has the ability to return grouped account performance for the registration over a number of date ranges. |
| GET | /v1/Portfolio/Registrations/{key}/PortfolioTree | Portfolio/Registrations | Gets a tree representation of the registration with the key provided. Also includes the accounts within that registration. |
| GET | /v1/Portfolio/Registrations/{key}/Simple | Portfolio/Registrations | Gets the simple registration that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Registrations/{key}/SSNTaxId | Portfolio/Registrations | Retrieve or update SSN for client. |
| GET | /v1/Portfolio/Registrations/{key}/Transactions | Portfolio/Registrations |  |
| GET | /v1/Portfolio/Registrations/{key}/UnlinkedAccounts | Portfolio/Registrations | Gets unlinked accounts for a registration, optionally excluding accounts linked to a specific account. |
| GET | /v1/Portfolio/Registrations/{key}/UserDefinedFields | Portfolio/Registrations |  |
| GET | /v1/Portfolio/Registrations/{key}/Value | Portfolio/Registrations | Gets the simple registration (including aum for the end of today) that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Registrations/{key}/Value/{asOfDate} | Portfolio/Registrations | Gets the simple registration (including aum for the end of the date specified) that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Registrations/{registrationId}/ModelTolerance | Portfolio/Registrations | Returns a comparison of an Registration to its Assigned Model Targets. |
| PUT | /v1/Portfolio/Registrations/Action/Delete | Portfolio/Registrations |  |
| PUT | /v1/Portfolio/Registrations/Action/MoveToClient/{clientId} | Portfolio/Registrations | Move registration to different household |
| POST | /v1/Portfolio/Registrations/Action/ValidateRepPayouts/{registrationId} | Portfolio/Registrations | Used to validate registration representative payout overrides |
| GET | /v1/Portfolio/Registrations/Beneficiary/Relations | Portfolio/Registrations | Gets a simple list of beneficiary relations that the logged in user has access to. |
| GET | /v1/Portfolio/Registrations/Grid | Portfolio/Registrations | Gets a list of registrations that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Registrations/List | Portfolio/Registrations |  |
| POST | /v1/Portfolio/Registrations/List/Id | Portfolio/Registrations |  |
| POST | /v1/Portfolio/Registrations/ListCounts | Portfolio/Registrations |  |
| GET | /v1/Portfolio/Registrations/qs | Portfolio/Registrations | Gets a list of registrations returned by a Query Studio Query in the provided Dashboard Card ID |
| GET | /v1/Portfolio/Registrations/Search/Advanced | Portfolio/Registrations | Gets a list of registrations that the logged in user has access to filtered by supplied search parameters. |
| GET | /v1/Portfolio/Registrations/Search/Advanced/Count | Portfolio/Registrations | Gets a count of registrations that the logged in user has access to filtered by supplied search parameters. |
| GET | /v1/Portfolio/Registrations/Simple | Portfolio/Registrations | Gets a simple list of registrations that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/Registrations/Simple/List | Portfolio/Registrations | Gets a simple list of registrations that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Registrations/Simple/List/Id | Portfolio/Registrations | Gets a simple list of registrations that match one of the keys in the provided list. |
| GET | /v1/Portfolio/Registrations/Simple/Search | Portfolio/Registrations | Gets a simple list of registrations that the logged in user has access to where the registrations first name, or lastname begins with the search string or entityName contains the search string or Id is exact match. If the useContain parameter is set to false then the entityName will do a begins with search. |
| GET | /v1/Portfolio/Registrations/Simple/Search/{search} | Portfolio/Registrations | Gets a simple list of registrations that the logged in user has access to where the registrations first name, or lastname begins with the search string or entityName contains the search string or Id is exact match. If the useContain parameter is set to false then the entityName will do a begins with search. |
| GET | /v1/Portfolio/Registrations/Simple/Search/LastName | Portfolio/Registrations | Gets a simple list of registrations that the logged in user has access to where the registrations lastname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/Registrations/Simple/Search/LastName/{search} | Portfolio/Registrations | Gets a simple list of registrations that the logged in user has access to where the registrations lastname begins with the search string or Id is exact match. |
| POST | /v1/Portfolio/Registrations/SyncToEclipse | Portfolio/Registrations |  |
| POST | /v1/Portfolio/Registrations/Type | Portfolio/Registrations |  |
| DELETE | /v1/Portfolio/Registrations/Type/{key} | Portfolio/Registrations | Delete a registration type by ID |
| PUT | /v1/Portfolio/Registrations/Type/{key} | Portfolio/Registrations |  |
| GET | /v1/Portfolio/Registrations/Types | Portfolio/Registrations |  |
| GET | /v1/Portfolio/Registrations/Types/{key} | Portfolio/Registrations |  |
| GET | /v1/Portfolio/Registrations/Types/List | Portfolio/Registrations | Gets a list of registration types that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Registrations/Value | Portfolio/Registrations | Gets a simple list of registrations (including aum for today) that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Registrations/Value/{asOfDate} | Portfolio/Registrations | Gets a simple list of registrations (including aum for the end of the date specified) that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Registrations/Value/{asOfDate}/Search | Portfolio/Registrations | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the registrations first name, lastname, or entityname begins with the search string. |
| GET | /v1/Portfolio/Registrations/Value/{asOfDate}/Search/{search} | Portfolio/Registrations | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the registrations first name, lastname, or entityname begins with the search string. |
| GET | /v1/Portfolio/Registrations/Value/{asOfDate}/Search/LastName | Portfolio/Registrations | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the registrations lastname begins with the search string. |
| GET | /v1/Portfolio/Registrations/Value/{asOfDate}/Search/LastName/{search} | Portfolio/Registrations | Gets a simple list of clients (including aum for the end of the date specified) that the logged in user has access to where the registrations lastname begins with the search string. |
| GET | /v1/Portfolio/Registrations/Value/Search | Portfolio/Registrations | Gets a simple list of registrations (including aum for today) that the logged in user has access to where the registrations first name, lastname, or entityname begins with the search string. |
| GET | /v1/Portfolio/Registrations/Value/Search/{search} | Portfolio/Registrations | Gets a simple list of registrations (including aum for today) that the logged in user has access to where the registrations first name, lastname, or entityname begins with the search string. |
| GET | /v1/Portfolio/Registrations/Value/Search/LastName | Portfolio/Registrations | Gets a simple list of registrations (including aum for today) that the logged in user has access to where the registrations lastname begins with the search string. |
| GET | /v1/Portfolio/Registrations/Value/Search/LastName/{search} | Portfolio/Registrations | Gets a simple list of registrations (including aum for today) that the logged in user has access to where the registrations lastname begins with the search string. |
| GET | /v1/Portfolio/Registrations/Verbose | Portfolio/Registrations |  |
| POST | /v1/Portfolio/Registrations/Verbose | Portfolio/Registrations | Create a registration |
| PUT | /v1/Portfolio/Registrations/Verbose | Portfolio/Registrations |  |
| GET | /v1/Portfolio/Registrations/Verbose/{key} | Portfolio/Registrations |  |
| PUT | /v1/Portfolio/Registrations/Verbose/{key} | Portfolio/Registrations |  |
| PUT | /v1/Portfolio/Registrations/Verbose/{key}/Beneficiaries | Portfolio/Registrations | Update registration beneficiary information |
| POST | /v1/Portfolio/Registrations/Verbose/List | Portfolio/Registrations |  |
| POST | /v1/Portfolio/Registrations/Verbose/List/Id | Portfolio/Registrations |  |
| GET | /v1/Portfolio/Registrations/Verbose/New | Portfolio/Registrations |  |
| POST | /v1/Portfolio/ReportGroup/Clients | Portfolio/ReportGroup | Used to create a new report group client. Upon successful creation a 201 will be returned with the location of the nearly created client. |
| DELETE | /v1/Portfolio/ReportGroup/Clients/{key} | Portfolio/ReportGroup | Used to delete an existing report group client. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/ReportGroup/Clients/{key} | Portfolio/ReportGroup | Gets the report group clients that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/ReportGroup/Clients/{key} | Portfolio/ReportGroup | Used to update an existing report group client. Upon successful modification a 200 will be returned. |
| GET | /v1/Portfolio/ReportGroup/Clients/Simple | Portfolio/ReportGroup | Gets a list of report group clients (clients that either have no accounts assigned or only have additional accounts). |
| GET | /v1/Portfolio/RepresentativeChanges/{representativeId} | Portfolio/RepresentativeChanges | Gets a list of representative changes for specific representative id. |
| PUT | /v1/Portfolio/RepresentativeChanges/{representativeId} | Portfolio/RepresentativeChanges | Updates a list of representative changes for specific representative id. |
| GET | /v1/Portfolio/Representatives | Portfolio/Representatives | Gets a list of representatives that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Representatives/{key} | Portfolio/Representatives | Gets the representative that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Representatives/{key}/Accounts | Portfolio/Representatives | Gets a list of accounts that fall below the representative with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Representatives/{key}/Accounts/Value | Portfolio/Representatives | Gets a simple list of accounts (including aum for today) that fall below the representative with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Representatives/{key}/Accounts/Value/{asOfDate} | Portfolio/Representatives | Gets a simple list of accounts (including aum for the end of the date specified) that fall below the representative with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/Representatives/{key}/Clients/Simple/Search | Portfolio/Representatives | Gets a simple list of clients that the logged in user has access to where the clients first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/Representatives/{key}/Documents | Portfolio/Representatives |  |
| POST | /v1/Portfolio/Representatives/{key}/Documents | Portfolio/Representatives |  |
| DELETE | /v1/Portfolio/Representatives/{key}/Documents/{fileId} | Portfolio/Representatives |  |
| GET | /v1/Portfolio/Representatives/{key}/Documents/{fileId} | Portfolio/Representatives | Gets a file for the client with the specified key and the file with the specified key. |
| PUT | /v1/Portfolio/Representatives/{key}/Documents/{fileId} | Portfolio/Representatives |  |
| GET | /v1/Portfolio/Representatives/{key}/Documents/{fileId}/Download | Portfolio/Representatives | Gets the raw data of the specific file with the blobId provided which is associated to the client with the specified key. |
| PUT | /v1/Portfolio/Representatives/{key}/MakeDefault | Portfolio/Representatives | Sets the rep as the default. |
| GET | /v1/Portfolio/Representatives/{key}/ReportImage | Portfolio/Representatives | Gets the representative's report image if one exists. If none exists a 404 will be thrown. |
| GET | /v1/Portfolio/Representatives/{key}/Simple | Portfolio/Representatives | Gets the simple representative that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Representatives/{key}/SSNTaxId | Portfolio/Representatives | Retrieve or update SSN for representative. |
| GET | /v1/Portfolio/Representatives/{key}/Subadvisors | Portfolio/Representatives |  |
| GET | /v1/Portfolio/Representatives/{key}/UserDefinedFields | Portfolio/Representatives |  |
| POST | /v1/Portfolio/Representatives/Action/Delete | Portfolio/Representatives |  |
| PUT | /v1/Portfolio/Representatives/Action/RecalculateAUMData | Portfolio/Representatives | Endpoint to recalculate AUM data for a representative |
| POST | /v1/Portfolio/Representatives/Action/ValidateChangeHistory/{repId} | Portfolio/Representatives |  |
| GET | /v1/Portfolio/Representatives/Client/{key} | Portfolio/Representatives | Gets a simple list of representatives that matches the client key. |
| GET | /v1/Portfolio/Representatives/GetDefault | Portfolio/Representatives | Gets the default rep |
| GET | /v1/Portfolio/Representatives/Reptitles | Portfolio/Representatives |  |
| PUT | /v1/Portfolio/Representatives/Reptitles | Portfolio/Representatives |  |
| GET | /v1/Portfolio/Representatives/Simple | Portfolio/Representatives | Gets a simple list of representatives that the logged in user has access to. |
| POST | /v1/Portfolio/Representatives/Simple/List | Portfolio/Representatives | Gets a simple list of representatives that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Representatives/Simple/List/Id | Portfolio/Representatives | Gets a simple list of representatives that match one of the keys in the provided list. |
| GET | /v1/Portfolio/Representatives/Simple/Search | Portfolio/Representatives | Gets a simple list of representatives that the logged in user has access to where the representatives first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/Representatives/Simple/Search/{search} | Portfolio/Representatives | Gets a simple list of representatives that the logged in user has access to where the representatives first name, lastname, or entityname begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/Representatives/Value | Portfolio/Representatives | Gets a simple list of representatives (including aum for today) that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Representatives/Value/{asOfDate} | Portfolio/Representatives | Gets a simple list of representatives (including aum for the end of the date specified) that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Portfolio/Representatives/Verbose | Portfolio/Representatives |  |
| POST | /v1/Portfolio/Representatives/Verbose | Portfolio/Representatives | Create new representative. |
| PUT | /v1/Portfolio/Representatives/Verbose | Portfolio/Representatives |  |
| GET | /v1/Portfolio/Representatives/Verbose/{key} | Portfolio/Representatives |  |
| PUT | /v1/Portfolio/Representatives/Verbose/{key} | Portfolio/Representatives |  |
| POST | /v1/Portfolio/Representatives/Verbose/List | Portfolio/Representatives |  |
| POST | /v1/Portfolio/Representatives/Verbose/List/Id | Portfolio/Representatives |  |
| GET | /v1/Portfolio/Representatives/Verbose/New | Portfolio/Representatives |  |
| GET | /v1/Portfolio/ReturnObjectives | Portfolio/ReturnObjectives |  |
| PUT | /v1/Portfolio/ReturnObjectives | Portfolio/ReturnObjectives |  |
| GET | /v1/Portfolio/ReturnObjectives/Simple | Portfolio/ReturnObjectives | Method to get all return objectives |
| GET | /v1/Portfolio/Rias | Portfolio/Rias |  |
| POST | /v1/Portfolio/Rias | Portfolio/Rias |  |
| DELETE | /v1/Portfolio/Rias/{key} | Portfolio/Rias |  |
| GET | /v1/Portfolio/Rias/{key} | Portfolio/Rias |  |
| PUT | /v1/Portfolio/Rias/{key} | Portfolio/Rias |  |
| PUT | /v1/Portfolio/Rias/Action/Delete | Portfolio/Rias |  |
| GET | /v1/Portfolio/Rias/Simple | Portfolio/Rias |  |
| POST | /v1/Portfolio/Rias/Simple/List | Portfolio/Rias |  |
| POST | /v1/Portfolio/Rias/Simple/List/Id | Portfolio/Rias |  |
| GET | /v1/Portfolio/Rias/Simple/Search | Portfolio/Rias |  |
| GET | /v1/Portfolio/Rias/Simple/Search/{search} | Portfolio/Rias |  |
| GET | /v1/Portfolio/RiskCategories | Portfolio/RiskCategories | Gets a list of risk categories that the logged in user has access to. |
| GET | /v1/Portfolio/RiskCategories/{key} | Portfolio/RiskCategories | Gets the risk category that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/RiskCategories/Action/EstablishColors | Portfolio/RiskCategories | Generates a random color for every risk category that has no color. The ids of any risk category affected is returned. |
| GET | /v1/Portfolio/RiskCategories/Exclusions | Portfolio/RiskCategories | Gets a list of risk categories that the logged in user has access to. |
| GET | /v1/Portfolio/RiskCategories/Simple | Portfolio/RiskCategories | Gets a simple list of riskCategories that the logged in user has access to. |
| GET | /v1/Portfolio/RiskCategories/Simple/Search | Portfolio/RiskCategories | Gets a simple list of risk categories by the search criteria. |
| GET | /v1/Portfolio/RiskCategories/Simple/Search/{search} | Portfolio/RiskCategories | Gets a simple list of risk categories by the search criteria. |
| GET | /v1/Portfolio/RiskCategories/Value | Portfolio/RiskCategories | Gets a simple list of risk categories with most rescently cached value that the logged in user has access to. |
| GET | /v1/Portfolio/RiskCategories/Verbose | Portfolio/RiskCategories |  |
| POST | /v1/Portfolio/RiskCategories/Verbose | Portfolio/RiskCategories | Create a risk category |
| PUT | /v1/Portfolio/RiskCategories/Verbose | Portfolio/RiskCategories |  |
| DELETE | /v1/Portfolio/RiskCategories/Verbose/{key} | Portfolio/RiskCategories | Used to delete an existing risk category. Upon successful deletion a 204 will be returned. |
| GET | /v1/Portfolio/RiskCategories/Verbose/{key} | Portfolio/RiskCategories |  |
| PUT | /v1/Portfolio/RiskCategories/Verbose/{key} | Portfolio/RiskCategories |  |
| GET | /v1/Portfolio/RiskCategories/Verbose/CanDelete/{key} | Portfolio/RiskCategories | Gets a list of errors if a delete was attempted on the risk category |
| POST | /v1/Portfolio/RiskCategories/Verbose/List | Portfolio/RiskCategories |  |
| POST | /v1/Portfolio/RiskCategories/Verbose/List/Id | Portfolio/RiskCategories |  |
| GET | /v1/Portfolio/RiskCategories/Verbose/New | Portfolio/RiskCategories |  |
| GET | /v1/Portfolio/RiskCategoryAutoAssignOverride | Portfolio/RiskCategoryAutoAssignOverride | Gets a list of Risk Category Auto Assign Overrides that the logged in user has access to. |
| POST | /v1/Portfolio/RiskCategoryAutoAssignOverride | Portfolio/RiskCategoryAutoAssignOverride |  |
| GET | /v1/Portfolio/RiskCategoryAutoAssignOverride/{providerId}/{abbreviation} | Portfolio/RiskCategoryAutoAssignOverride | Gets the Risk Category Auto Assign Override that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/RiskCategoryAutoAssignOverride/List | Portfolio/RiskCategoryAutoAssignOverride | Gets the product classe Auto Assign Overrides for the provided keys. |
| POST | /v1/Portfolio/RiskCategoryAutoAssignOverride/List/Id | Portfolio/RiskCategoryAutoAssignOverride | Gets the product classe Auto Assign Overrides for the provided keys. |
| GET | /v1/Portfolio/RiskCategoryAutoAssignOverride/RiskCategory/Simple | Portfolio/RiskCategoryAutoAssignOverride |  |
| POST | /v1/Portfolio/SecurityClassification/Global/Assignments | Portfolio/SecurityClassification | Retrieves global security class assignment records |
| GET | /v1/Portfolio/SecurityClassification/Global/Derivations | Portfolio/SecurityClassification | Gets a list of Global Security Class Derivations. The return is limited to pages of 100000. Use $top and $skip in the query string to page through the data. Pass a combination of paremeters to filter the results. |
| POST | /v1/Portfolio/SecurityClassification/Global/Derivations | Portfolio/SecurityClassification | Creates a Global Security Class Derivation |
| DELETE | /v1/Portfolio/SecurityClassification/Global/Derivations/{securityClassificationMethodId}/{baseSecurityClassId}/{derivedSecurityClassId} | Portfolio/SecurityClassification | Delete a Global Security Class Derivation |
| GET | /v1/Portfolio/SecurityClassification/Global/Derivations/{securityClassificationMethodId}/{baseSecurityClassId}/{derivedSecurityClassId} | Portfolio/SecurityClassification | Gets a single Global Security Class Derivation |
| GET | /v1/Portfolio/SecurityClassification/Global/MethodAlClients | Portfolio/SecurityClassification | Gets a list of Security classification method AlClients global records. The return is limited to pages of 100000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/SecurityClassification/Global/MethodAlClients | Portfolio/SecurityClassification | Creates a new Security classification method alclient global. |
| DELETE | /v1/Portfolio/SecurityClassification/Global/MethodAlClients/{alClientId}/{methodGlobalId} | Portfolio/SecurityClassification | Deletes a Security classification method global by ID. |
| GET | /v1/Portfolio/SecurityClassification/Global/MethodAlClients/{alClientId}/{methodGlobalId} | Portfolio/SecurityClassification | Gets a Security classification method AlClients global record. The return is limited to pages of 100000. Use $top and $skip in the query string to page through the data. |
| PUT | /v1/Portfolio/SecurityClassification/Global/MethodAlClients/{methodGlobalId} | Portfolio/SecurityClassification | Adds/Updates/Deletes AlClient access for a Security Classification Method. |
| GET | /v1/Portfolio/SecurityClassification/Global/MethodRuleDataset | Portfolio/SecurityClassification | Returns the method rule data sets for global security classification rule configuration |
| GET | /v1/Portfolio/SecurityClassification/Global/Methods | Portfolio/SecurityClassification | Gets a list of Security classification method global data. The return is limited to pages of 100000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/SecurityClassification/Global/Methods | Portfolio/SecurityClassification | Creates a new Security classification method global. |
| GET | /v1/Portfolio/SecurityClassification/Global/Methods/{classificationMethodId}/MethodRules | Portfolio/SecurityClassification | Get a list of Security Classification Method Rules by Method ID. |
| POST | /v1/Portfolio/SecurityClassification/Global/Methods/{classificationMethodId}/MethodRules | Portfolio/SecurityClassification | Create a Security Classification Method Rules record by Classification Method ID. |
| PUT | /v1/Portfolio/SecurityClassification/Global/Methods/{classificationMethodId}/MethodRules | Portfolio/SecurityClassification | Bulk add/edit/deletes Security Classification Method Rules record by Classification Method ID. |
| DELETE | /v1/Portfolio/SecurityClassification/Global/Methods/{classificationMethodId}/MethodRules/{runOrder} | Portfolio/SecurityClassification | Deletes a Security Classification Method Rules record by Classification Method ID and RunOrder ID. |
| GET | /v1/Portfolio/SecurityClassification/Global/Methods/{classificationMethodId}/MethodRules/{runOrder} | Portfolio/SecurityClassification | Get a Security Classification Method Rules record by run order id. |
| PUT | /v1/Portfolio/SecurityClassification/Global/Methods/{classificationMethodId}/MethodRules/{runOrder} | Portfolio/SecurityClassification | Updates a Security Classification Method Rules record by Classification Method ID. |
| POST | /v1/Portfolio/SecurityClassification/Global/Methods/{classificationMethodId}/MethodRules/Preview/{impactedProducts} | Portfolio/SecurityClassification |  |
| DELETE | /v1/Portfolio/SecurityClassification/Global/Methods/{key} | Portfolio/SecurityClassification | Deletes a Security classification method global by ID. |
| GET | /v1/Portfolio/SecurityClassification/Global/Methods/{key} | Portfolio/SecurityClassification | Gets Security classification method global for a single record by key. |
| PUT | /v1/Portfolio/SecurityClassification/Global/Methods/{key} | Portfolio/SecurityClassification | Updates a new Security classification method global. |
| POST | /v1/Portfolio/SecurityClassification/Global/Methods/Actions/GlobalRecalculation/{key} | Portfolio/SecurityClassification |  |
| GET | /v1/Portfolio/SecurityClassification/Global/Methods/ListForLocal | Portfolio/SecurityClassification | Gets a list of Security classification method global data for local use. Returns active methods and respects restricted access based on the current user's AlClient. |
| GET | /v1/Portfolio/SecurityClassification/Global/Methods/Simple | Portfolio/SecurityClassification | Gets a list of Security classification method global simple data. |
| GET | /v1/Portfolio/SecurityClassification/Global/Methods/Verbose/{key} | Portfolio/SecurityClassification |  |
| PUT | /v1/Portfolio/SecurityClassification/Global/Methods/Verbose/{key} | Portfolio/SecurityClassification | Updates a verbose Security classification method global |
| GET | /v1/Portfolio/SecurityClassification/Global/Products | Portfolio/SecurityClassification | Retrieves all Security Classification Product Globals based on the provided filters. |
| DELETE | /v1/Portfolio/SecurityClassification/Global/Products/{classificationMethodId} | Portfolio/SecurityClassification | Deletes all weightings for a specific Classification Method. |
| PUT | /v1/Portfolio/SecurityClassification/Global/Products/{classificationMethodId} | Portfolio/SecurityClassification | Updates or inserts Security Classification Product Globals. |
| DELETE | /v1/Portfolio/SecurityClassification/Global/Products/{classificationMethodId}/{productId} | Portfolio/SecurityClassification | Deletes all weightings for a specific Classification Method and Product. |
| GET | /v1/Portfolio/SecurityClassification/Global/Products/{classificationMethodId}/{productId} | Portfolio/SecurityClassification | Retrieves the weightings for a specific Classification Method and Product. |
| PUT | /v1/Portfolio/SecurityClassification/Global/Products/{classificationMethodId}/{productId} | Portfolio/SecurityClassification | Updates or inserts Security Classification Product Globals. |
| POST | /v1/Portfolio/SecurityClassification/Global/Products/Import/Filter/{classificationMethodId} | Portfolio/SecurityClassification | Allows uploading a list of products to be custom filtered by product ID or download symbol |
| POST | /v1/Portfolio/SecurityClassification/Global/Products/Import/Upload/{classificationMethodId} | Portfolio/SecurityClassification | Allows uploading a list of products to be assigned to a classification method. |
| GET | /v1/Portfolio/SecurityClassification/Global/SecurityClasses | Portfolio/SecurityClassification | Gets a list of Security classification Security Class Data. The return is limited to pages of 100000. Use $top and $skip in the query string to page through the data. |
| DELETE | /v1/Portfolio/SecurityClassification/Global/SecurityClasses/{key} | Portfolio/SecurityClassification | Deletes a GLobal Security Class by ID. |
| GET | /v1/Portfolio/SecurityClassification/Global/SecurityClasses/{key} | Portfolio/SecurityClassification | Gets a Security classification Security Class by ID. |
| GET | /v1/Portfolio/SecurityClassification/Global/SecurityClasses/{key}/AssociatedRecordCounts | Portfolio/SecurityClassification | Get's a summary of associated record counts for a GLobal Security Class by ID. |
| PUT | /v1/Portfolio/SecurityClassification/Global/SecurityClasses/DeleteMany | Portfolio/SecurityClassification |  |
| GET | /v1/Portfolio/SecurityClassification/Global/SecurityClasses/Simple | Portfolio/SecurityClassification | Gets a list of Security classification Security Class simple entityu data. |
| POST | /v1/Portfolio/SecurityClassification/Global/SecurityClasses/Upsert | Portfolio/SecurityClassification | Upsert Create/Edits a list of Global Security Class records. |
| POST | /v1/Portfolio/SecurityClassification/Local/Assignments | Portfolio/SecurityClassification | Retrieves security class assignment records |
| GET | /v1/Portfolio/SecurityClassification/Local/Derivations | Portfolio/SecurityClassification | Gets a list of Local Security Class Derivations. The return is limited to pages of 100000. Use $top and $skip in the query string to page through the data. Pass a combination of paremeters to filter the results. |
| POST | /v1/Portfolio/SecurityClassification/Local/Derivations | Portfolio/SecurityClassification | Creates a Local Security Class Derivation |
| DELETE | /v1/Portfolio/SecurityClassification/Local/Derivations/{securityClassificationMethodId}/{baseSecurityClassId}/{derivedSecurityClassId} | Portfolio/SecurityClassification | Delete a Local Security Class Derivation |
| GET | /v1/Portfolio/SecurityClassification/Local/Derivations/{securityClassificationMethodId}/{baseSecurityClassId}/{derivedSecurityClassId} | Portfolio/SecurityClassification | Gets a single Local Security Class Derivation |
| GET | /v1/Portfolio/SecurityClassification/Local/MethodRuleDataset | Portfolio/SecurityClassification | Returns the method rule data sets for security classification rule configuration |
| GET | /v1/Portfolio/SecurityClassification/Local/Methods | Portfolio/SecurityClassification | Gets a list of Security classification method local data. The return is limited to pages of 100000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Portfolio/SecurityClassification/Local/Methods | Portfolio/SecurityClassification | Creates a new Security classification method Local. |
| GET | /v1/Portfolio/SecurityClassification/Local/Methods/{classificationMethodId}/MethodRules | Portfolio/SecurityClassification | Get a list of Security Classification Method Rules by Method ID. |
| POST | /v1/Portfolio/SecurityClassification/Local/Methods/{classificationMethodId}/MethodRules | Portfolio/SecurityClassification | Create a Security Classification Method Rules record by Classification Method ID. |
| PUT | /v1/Portfolio/SecurityClassification/Local/Methods/{classificationMethodId}/MethodRules | Portfolio/SecurityClassification | Bulk add/edit/deletes Security Classification Method Rules record by Classification Method ID. |
| DELETE | /v1/Portfolio/SecurityClassification/Local/Methods/{classificationMethodId}/MethodRules/{runOrder} | Portfolio/SecurityClassification | Deletes a Security Classification Method Rules record by Classification Method ID and RunOrder ID. |
| GET | /v1/Portfolio/SecurityClassification/Local/Methods/{classificationMethodId}/MethodRules/{runOrder} | Portfolio/SecurityClassification | Get a Security Classification Method Rules record by run order id. |
| PUT | /v1/Portfolio/SecurityClassification/Local/Methods/{classificationMethodId}/MethodRules/{runOrder} | Portfolio/SecurityClassification | Updates a Security Classification Method Rules record by Classification Method ID. |
| POST | /v1/Portfolio/SecurityClassification/Local/Methods/{classificationMethodId}/MethodRules/Preview/{impactedProducts} | Portfolio/SecurityClassification |  |
| DELETE | /v1/Portfolio/SecurityClassification/Local/Methods/{key} | Portfolio/SecurityClassification | Deletes a new Security classification method Local. |
| GET | /v1/Portfolio/SecurityClassification/Local/Methods/{key} | Portfolio/SecurityClassification | Gets Security classification method Local for a single record by key. |
| PUT | /v1/Portfolio/SecurityClassification/Local/Methods/{key} | Portfolio/SecurityClassification | Updates a new Security classification method Local. |
| GET | /v1/Portfolio/SecurityClassification/Local/Methods/{key}/AssociatedRecordCounts | Portfolio/SecurityClassification | Get's a summary of associated record counts for a Local Security Classification Method. |
| POST | /v1/Portfolio/SecurityClassification/Local/Methods/Actions/Recalculation/{key} | Portfolio/SecurityClassification | Recalculates classification methods on demand |
| POST | /v1/Portfolio/SecurityClassification/Local/Methods/MigrateSecurityClassification | Portfolio/SecurityClassification | Triggers a sync billing security classification job manually |
| GET | /v1/Portfolio/SecurityClassification/Local/Methods/MigrateSecurityClassificationValidation | Portfolio/SecurityClassification |  |
| GET | /v1/Portfolio/SecurityClassification/Local/Methods/ReportGrouping | Portfolio/SecurityClassification |  |
| GET | /v1/Portfolio/SecurityClassification/Local/Methods/Simple | Portfolio/SecurityClassification | Gets a list of Security classification method local simple data. |
| GET | /v1/Portfolio/SecurityClassification/Local/Methods/Verbose/{key} | Portfolio/SecurityClassification |  |
| PUT | /v1/Portfolio/SecurityClassification/Local/Methods/Verbose/{key} | Portfolio/SecurityClassification | Updates a verbose Security classification method local |
| GET | /v1/Portfolio/SecurityClassification/Local/ProductOverrides | Portfolio/SecurityClassification | Retrieves all Security Classification Product Override Locals based on the provided filters. |
| PUT | /v1/Portfolio/SecurityClassification/Local/ProductOverrides/{classificationMethodId} | Portfolio/SecurityClassification | Updates or inserts Security Classification Product Override Locals for a specific classification method. |
| DELETE | /v1/Portfolio/SecurityClassification/Local/ProductOverrides/{classificationMethodId}/{entityEnum}/{entityId} | Portfolio/SecurityClassification | Deletes all weightings for a specific Classification Method, Entity |
| PUT | /v1/Portfolio/SecurityClassification/Local/ProductOverrides/{classificationMethodId}/{entityEnum}/{entityId} | Portfolio/SecurityClassification | Updates or inserts Security Classification Product Override Locals for a specific method and entity. |
| DELETE | /v1/Portfolio/SecurityClassification/Local/ProductOverrides/{classificationMethodId}/{entityEnum}/{entityId}/{productId} | Portfolio/SecurityClassification | Deletes all weightings for a specific Classification Method, Entity, and Product. |
| GET | /v1/Portfolio/SecurityClassification/Local/ProductOverrides/{classificationMethodId}/{entityEnum}/{entityId}/{productId} | Portfolio/SecurityClassification | Retrieves the weightings for a specific Classification Method, Entity, and Product. |
| PUT | /v1/Portfolio/SecurityClassification/Local/ProductOverrides/{classificationMethodId}/{entityEnum}/{entityId}/{productId} | Portfolio/SecurityClassification | Updates or inserts Security Classification Product Override Locals for a specific method, entity, and product. |
| POST | /v1/Portfolio/SecurityClassification/Local/ProductOverrides/Import/Upload/{classificationMethodId}/{entityEnum}/{entityId} | Portfolio/SecurityClassification | Allows uploading a list of products to be assigned to a classification method for a specific entity. |
| GET | /v1/Portfolio/SecurityClassification/Local/Products | Portfolio/SecurityClassification | Retrieves all Security Classification Product Locals based on the provided filters. |
| DELETE | /v1/Portfolio/SecurityClassification/Local/Products/{classificationMethodId} | Portfolio/SecurityClassification | Deletes all weightings for a specific Classification Method . |
| PUT | /v1/Portfolio/SecurityClassification/Local/Products/{classificationMethodId} | Portfolio/SecurityClassification | Updates or inserts Security Classification Product Locals. |
| DELETE | /v1/Portfolio/SecurityClassification/Local/Products/{classificationMethodId}/{productId} | Portfolio/SecurityClassification | Deletes all weightings for a specific Classification Method and Product. |
| GET | /v1/Portfolio/SecurityClassification/Local/Products/{classificationMethodId}/{productId} | Portfolio/SecurityClassification | Retrieves the weightings for a specific Classification Method and Product. |
| PUT | /v1/Portfolio/SecurityClassification/Local/Products/{classificationMethodId}/{productId} | Portfolio/SecurityClassification | Updates or inserts Security Classification Product Locals. |
| POST | /v1/Portfolio/SecurityClassification/Local/Products/Import/Filter/{classificationMethodId} | Portfolio/SecurityClassification | Allows uploading a list of products to be custom filtered by product ID or download symbol |
| GET | /v1/Portfolio/SecurityClassification/Local/SecurityClasses | Portfolio/SecurityClassification | Gets a list of Security classification Security Class Data. The return is limited to pages of 100000. Use $top and $skip in the query string to page through the data. |
| DELETE | /v1/Portfolio/SecurityClassification/Local/SecurityClasses/{key} | Portfolio/SecurityClassification | Deletes a Security Class by ID. |
| GET | /v1/Portfolio/SecurityClassification/Local/SecurityClasses/{key} | Portfolio/SecurityClassification | Gets a Security classification Security Class by ID. |
| GET | /v1/Portfolio/SecurityClassification/Local/SecurityClasses/{key}/AssociatedRecordCounts | Portfolio/SecurityClassification | Get's a summary of associated record counts for a Security Class by ID. |
| PUT | /v1/Portfolio/SecurityClassification/Local/SecurityClasses/Action/EstablishColors | Portfolio/SecurityClassification | Upsert the Colors for all Security Class records. |
| PUT | /v1/Portfolio/SecurityClassification/Local/SecurityClasses/DeleteMany | Portfolio/SecurityClassification |  |
| GET | /v1/Portfolio/SecurityClassification/Local/SecurityClasses/Simple | Portfolio/SecurityClassification | Gets a list of Security classification Security Class simple entity data. |
| POST | /v1/Portfolio/SecurityClassification/Local/SecurityClasses/Upsert | Portfolio/SecurityClassification | Upsert Create/Edits a list of Security Class records. |
| GET | /v1/Portfolio/ShareClasses | Portfolio/ShareClasses | Gets a list of share classes that the logged in user has access to. |
| GET | /v1/Portfolio/ShareClasses/{key} | Portfolio/ShareClasses | Gets the share class that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/ShareClasses/Simple | Portfolio/ShareClasses | Gets a simple list of share classes that the logged in user has access to. |
| GET | /v1/Portfolio/SleeveTransfer/{entitySessionId} | Portfolio/SleeveTransfer | Gets a list of SleevedAssets filtered by the correlated entity level inside of the EntitySession table (filered by entitySessionId) |
| PUT | /v1/Portfolio/SleeveTransfer/Action/Transfer/{entitySessionId} | Portfolio/SleeveTransfer | Executes the transfers for the entered quanties for all the sleeves specified in transfers |
| GET | /v1/Portfolio/SleeveTransfer/Batch/List | Portfolio/SleeveTransfer | Gets the list of Sleeve Transfer Batches |
| GET | /v1/Portfolio/SleeveTransfer/Batch/Transactions/{batchId} | Portfolio/SleeveTransfer | Gets the list of Sleeve Transfer Batch Transactions |
| POST | /v1/Portfolio/SleeveTransfer/EntitySession/{entityType} | Portfolio/SleeveTransfer | Creates an entity session ID to associate selected ids for sleeve transfer lookup Sample Request POST /EntitySession/Account [1, 2, 3] |
| GET | /v1/Portfolio/SleeveTransfer/SleeveModel/{entitySessionId} | Portfolio/SleeveTransfer | Returns a full list of all models (really account sleeves) associated with the given EntitySessionId |
| GET | /v1/Portfolio/States | Portfolio/States | Gets a list of states that the logged in user has access to. |
| GET | /v1/Portfolio/States/{key} | Portfolio/States | Gets the state that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/States/Simple | Portfolio/States | Gets a simple list of states that the logged in user has access to. |
| GET | /v1/Portfolio/SubAdvisors | Portfolio/SubAdvisors | Gets a list of sub-advisors that the logged in user has access to. |
| GET | /v1/Portfolio/SubAdvisors/{key} | Portfolio/SubAdvisors | Gets the sub-advisor that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/SubAdvisors/{key}/Accounts | Portfolio/SubAdvisors | Gets a list of accounts that fall below the sub-advisor with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/SubAdvisors/{key}/Accounts/Value | Portfolio/SubAdvisors | Gets a simple list of accounts (including aum for today) that fall below the sub-advisor with the specified key, which the logged in user has access to. |
| GET | /v1/Portfolio/SubAdvisors/{key}/Accounts/Value/{asOfDate} | Portfolio/SubAdvisors | Gets a simple list of accounts (including aum for the end of the date specified) that fall below the sub-advisor with the specified key, which the logged in user has access to. |
| POST | /v1/Portfolio/SubAdvisors/{key}/Documents | Portfolio/SubAdvisors |  |
| DELETE | /v1/Portfolio/SubAdvisors/{key}/Documents/{fileId} | Portfolio/SubAdvisors |  |
| GET | /v1/Portfolio/SubAdvisors/{key}/Documents/{fileId} | Portfolio/SubAdvisors | Gets a file for the sub-advisor with the specified key and the file with the specified key. |
| PUT | /v1/Portfolio/SubAdvisors/{key}/Documents/{fileId} | Portfolio/SubAdvisors |  |
| GET | /v1/Portfolio/SubAdvisors/{key}/Documents/{fileId}/Download | Portfolio/SubAdvisors | Gets the raw data of the specific file with the blobId provided which is associated to the broker/dealer with the specified key. |
| PUT | /v1/Portfolio/SubAdvisors/Action/Delete | Portfolio/SubAdvisors |  |
| GET | /v1/Portfolio/SubAdvisors/Search | Portfolio/SubAdvisors | Gets a list of plans that the logged in user has access to where the plan name begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/SubAdvisors/Search/{search} | Portfolio/SubAdvisors | Gets a list of plans that the logged in user has access to where the plan name begins with the search string or Id is exact match. |
| GET | /v1/Portfolio/SubAdvisors/Simple | Portfolio/SubAdvisors |  |
| GET | /v1/Portfolio/SubAdvisors/Value | Portfolio/SubAdvisors | Gets a simple list of sub-advisors (including aum for today) that the logged in user has access to. |
| GET | /v1/Portfolio/SubAdvisors/Value/{asOfDate} | Portfolio/SubAdvisors | Gets a simple list of sub-advisors (including aum for the end of the date specified) that the logged in user has access to. |
| GET | /v1/Portfolio/SubAdvisors/Verbose | Portfolio/SubAdvisors |  |
| POST | /v1/Portfolio/SubAdvisors/Verbose | Portfolio/SubAdvisors | Create new sub-advisor |
| GET | /v1/Portfolio/SubAdvisors/Verbose/{key} | Portfolio/SubAdvisors |  |
| PUT | /v1/Portfolio/SubAdvisors/Verbose/{key} | Portfolio/SubAdvisors | Update sub-advisor |
| GET | /v1/Portfolio/SubAdvisors/Verbose/New | Portfolio/SubAdvisors |  |
| GET | /v1/Portfolio/SystematicAccount/{systematicAccountId}/Audit | Portfolio/SystematicAccount | Get audit for systematic account |
| GET | /v1/Portfolio/TaxLotAssignments | Portfolio/TaxLotAssignments | Get all of the |
| POST | /v1/Portfolio/TaxLotAssignments | Portfolio/TaxLotAssignments |  |
| PUT | /v1/Portfolio/TaxLotAssignments | Portfolio/TaxLotAssignments |  |
| DELETE | /v1/Portfolio/TaxLotAssignments/{key} | Portfolio/TaxLotAssignments | Deletes the existing TranTaxLot Entry |
| GET | /v1/Portfolio/TaxLotAssignments/{key} | Portfolio/TaxLotAssignments | Gets the TranTaxLot that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/TaxLotAssignments/{sellTransactionId}/AssetBuyTransactions/{transDate} | Portfolio/TaxLotAssignments | Gets a list transactions from the range provided for the asset with the specified key. |
| GET | /v1/Portfolio/TaxLotAssignments/GetCostBasis/{assetId} | Portfolio/TaxLotAssignments | Gets a list Tax Lots from the range provided for the asset with the specified key. |
| GET | /v1/Portfolio/TaxLotAssignments/List | Portfolio/TaxLotAssignments | Returns a list of Assets that are found for the list of Id's posted in the message body. |
| GET | /v1/Portfolio/TaxLotAssignments/List/Id | Portfolio/TaxLotAssignments | Returns a list of Assets that are found for the list of Id's posted in the message body. |
| GET | /v1/Portfolio/ThirdPartyAdministrators/Simple | Portfolio/ThirdPartyAdministrators |  |
| GET | /v1/Portfolio/TimeHorizons | Portfolio/TimeHorizons |  |
| PUT | /v1/Portfolio/TimeHorizons | Portfolio/TimeHorizons |  |
| GET | /v1/Portfolio/TimeHorizons/Simple | Portfolio/TimeHorizons | Method to get all time horizons |
| GET | /v1/Portfolio/Transactions | Portfolio/Transactions |  |
| PUT | /v1/Portfolio/Transactions | Portfolio/Transactions | Simple dto update |
| GET | /v1/Portfolio/Transactions/{key} | Portfolio/Transactions | Gets the transaction that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Portfolio/Transactions/{key} | Portfolio/Transactions | Simple dto update |
| PUT | /v1/Portfolio/Transactions/{key}/Action/MoveToAsset/{assetId} | Portfolio/Transactions | Move transaction to different asset |
| GET | /v1/Portfolio/Transactions/{key}/UserDefinedFields | Portfolio/Transactions |  |
| PUT | /v1/Portfolio/Transactions/Action/DAZLOverride | Portfolio/Transactions |  |
| PUT | /v1/Portfolio/Transactions/Action/Delete | Portfolio/Transactions |  |
| PUT | /v1/Portfolio/Transactions/Action/Delete/{key} | Portfolio/Transactions | Delete the transaction provided. |
| PUT | /v1/Portfolio/Transactions/Action/Delete/Eclipse | Portfolio/Transactions |  |
| POST | /v1/Portfolio/Transactions/Alternative | Portfolio/Transactions | Upsert a single alternative transaction |
| PUT | /v1/Portfolio/Transactions/Alternative/Action/StatusChange/{status} | Portfolio/Transactions |  |
| POST | /v1/Portfolio/Transactions/Alternative/List | Portfolio/Transactions | Upsert many transaction activities |
| PUT | /v1/Portfolio/Transactions/CorporateAction/List | Portfolio/Transactions | Update multiple transactions associated with a Corporate Action. |
| POST | /v1/Portfolio/Transactions/List | Portfolio/Transactions | Gets a list of transactions that match one of the keys in the provided list. |
| POST | /v1/Portfolio/Transactions/List/Id | Portfolio/Transactions | Gets a list of transactions that match one of the keys in the provided list. |
| GET | /v1/Portfolio/Transactions/Simple/Search | Portfolio/Transactions |  |
| GET | /v1/Portfolio/Transactions/ValidationForUnsleeving/{key} | Portfolio/Transactions | Unsleeving Process validation.  Checking for any transaction types other than 171(Internal Account Journal Out), 172(Internal Account Journal In) or orders |
| GET | /v1/Portfolio/Transactions/Verbose | Portfolio/Transactions |  |
| POST | /v1/Portfolio/Transactions/Verbose | Portfolio/Transactions | Create transaction |
| PUT | /v1/Portfolio/Transactions/Verbose | Portfolio/Transactions | Update multiple transactions |
| GET | /v1/Portfolio/Transactions/Verbose/{key} | Portfolio/Transactions |  |
| PUT | /v1/Portfolio/Transactions/Verbose/{key} | Portfolio/Transactions | Update single transaction |
| POST | /v1/Portfolio/Transactions/Verbose/Alternative | Portfolio/Transactions | Upsert a single alternative transaction and possible activity children |
| POST | /v1/Portfolio/Transactions/Verbose/Alternative/List | Portfolio/Transactions | Upsert many alternative transaction and their possible activity children |
| POST | /v1/Portfolio/Transactions/Verbose/List | Portfolio/Transactions |  |
| POST | /v1/Portfolio/Transactions/Verbose/List/Id | Portfolio/Transactions |  |
| GET | /v1/Portfolio/Transactions/Verbose/New | Portfolio/Transactions |  |
| POST | /v1/Portfolio/Transactions/Verbose/New | Portfolio/Transactions | Create transactions. |
| GET | /v1/Portfolio/TRInterfaceFormats/Simple | Portfolio/TRInterfaceFormats |  |
| POST | /v1/Portfolio/ValidateImport/Clients | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/FinancialPlanningFee | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/FinancialPlanningFee/List | Portfolio/ValidateImport | Used to create a new composite accounts. Upon successful creation the created data is returned. |
| GET | /v1/Portfolio/ValidateImport/FinancialPlanningFee/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/FinancialPlanningFee/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/FinancialPlanningFee/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/HypotheticalMonthlyPerformance | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/HypotheticalMonthlyPerformance/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/HypotheticalMonthlyPerformance/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/HypotheticalMonthlyPerformance/Templates/Xlsx | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard | Portfolio/ValidateImport | Get all Mcl Wizard Setps Items |
| POST | /v1/Portfolio/ValidateImport/MasterClientListWizard | Portfolio/ValidateImport | Takes an xlsx, xls, or csv file as multipart content. The file will be processed and returned. If the account valid, the "isValid" property will be true.  If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| DELETE | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key} | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key} | Portfolio/ValidateImport | Gets the Mcl Wizard Instance Item that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/Commit | Portfolio/ValidateImport | Commit the Mcl Wizard Instance data for provided key |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/Custodian | Portfolio/ValidateImport | Gets the Custodian errors within Mcl Wizard Instance key provided. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/EntityUpdate | Portfolio/ValidateImport | Update the Mcl Wizard RepId, RegistrationTypeId, CustodianId, or FundFamilyId Items for provided key |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/Export | Portfolio/ValidateImport | Gets an xlsx file representation of the composite report. |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/FundFamily | Portfolio/ValidateImport | Gets the Fund Family errors within Mcl Wizard Instance key provided . If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/Household | Portfolio/ValidateImport | Gets the Mcl Wizard Household Items that that need correction for the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/Household | Portfolio/ValidateImport | Update the Mcl Wizard Household Items for provided key |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/Registration | Portfolio/ValidateImport | Gets the Registration errors within Mcl Wizard Instance key provided . If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/Registration | Portfolio/ValidateImport | Update the Mcl Wizard Registration data for provided key |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/RegistrationType | Portfolio/ValidateImport | Gets the Registration Type errors within Mcl Wizard Instance key provided. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/Representative | Portfolio/ValidateImport | Gets the Representative errors within Mcl Wizard Instance key provided. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/ValidateImport/MasterClientListWizard/{key}/Summary | Portfolio/ValidateImport | Gets the Summary within Mcl Wizard Instance key provided . If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Portfolio/ValidateImport/MergeAccounts | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/MergeAccounts/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/MergeAccounts/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/MergeAccounts/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/NewPortfolio | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/NewPortfolio/Process | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/Participant | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/Participant/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/Participant/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/Participant/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/ProductCategoryWeighted | Portfolio/ValidateImport |  |
| PUT | /v1/Portfolio/ValidateImport/ProductCategoryWeighted/Import | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/ProductCategoryWeighted/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/ProductCategoryWeighted/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/ProductCategoryWeighted/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/ProductClassWeighted | Portfolio/ValidateImport |  |
| PUT | /v1/Portfolio/ValidateImport/ProductClassWeighted/Import | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/ProductClassWeighted/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/ProductClassWeighted/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/ProductClassWeighted/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/ProductsPricesLocal | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/ProductsPricesLocal/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/ProductsPricesLocal/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/ProductsPricesLocal/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/RMDUpdate | Portfolio/ValidateImport | Takes an xlsx, xls, or csv file as multipart content. The file needs either an account id column (named  "account id", "accountid", "pkaccount", "acct id", or "acctid") The file will be processed and returned as a list signifying the id or number provided. If the account valid, the "isValid" property will be true.  If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/Portfolio/ValidateImport/RMDUpdate/Process | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/Sloa | Portfolio/ValidateImport |  |
| PUT | /v1/Portfolio/ValidateImport/Sloa/Import | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/Sloa/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/Sloa/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/Sloa/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/StoredPerformance | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/StoredPerformance/ExportErrors | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/StoredPerformance/ExportErrors/{filename} | Portfolio/ValidateImport |  |
| PUT | /v1/Portfolio/ValidateImport/StoredPerformance/Import | Portfolio/ValidateImport |  |
| PUT | /v1/Portfolio/ValidateImport/StoredPerformance/Import/{cacheKey} | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/StoredPerformance/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/StoredPerformance/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/StoredPerformance/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/TargetAllocationAccount | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/TargetAllocationAccount/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/TargetAllocationAccount/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/TargetAllocationAccount/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/TargetAllocationClient | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/TargetAllocationClient/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/TargetAllocationClient/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/TargetAllocationClient/Templates/Xlsx | Portfolio/ValidateImport |  |
| POST | /v1/Portfolio/ValidateImport/TaxSchedules | Portfolio/ValidateImport | Takes an xlsx, xls, or csv file as multipart content. The file will be processed and returned. If the account valid, the "isValid" property will be true.  If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/Portfolio/ValidateImport/TaxSchedules/ProcessImport | Portfolio/ValidateImport | The method runs a buld insert to a temp table from the import file then runs a procedure that creates the household, registration, and accounts. |
| POST | /v1/Portfolio/ValidateImport/TaxSchedules/Revalidate | Portfolio/ValidateImport | Takes a List ValidateTaxScheduleDto. The dto will be processed and returned. If the account valid, the "isValid" property will be true.  If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/Portfolio/ValidateImport/Transaction | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/Transaction/Templates/Csv | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/Transaction/Templates/Xls | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/ValidateImport/Transaction/Templates/Xlsx | Portfolio/ValidateImport |  |
| GET | /v1/Portfolio/Wholesalers | Portfolio/Wholesalers | Gets a list of wholesaler that the logged in user has access to. |
| GET | /v1/Portfolio/Wholesalers/{key} | Portfolio/Wholesalers | Gets the wholesaler that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Portfolio/Wholesalers/{key}/Documents | Portfolio/Wholesalers |  |
| POST | /v1/Portfolio/Wholesalers/{key}/Documents | Portfolio/Wholesalers |  |
| DELETE | /v1/Portfolio/Wholesalers/{key}/Documents/{fileId} | Portfolio/Wholesalers |  |
| GET | /v1/Portfolio/Wholesalers/{key}/Documents/{fileId} | Portfolio/Wholesalers | Gets a file for the wholesaler with the specified key and the file with the specified key. |
| PUT | /v1/Portfolio/Wholesalers/{key}/Documents/{fileId} | Portfolio/Wholesalers |  |
| GET | /v1/Portfolio/Wholesalers/{key}/Documents/{fileId}/Download | Portfolio/Wholesalers | Gets the raw data of the specific file with the blobId provided which is associated to the wholesaler with the specified key. |
| GET | /v1/Portfolio/Wholesalers/{key}/UserDefinedFields | Portfolio/Wholesalers |  |
| PUT | /v1/Portfolio/Wholesalers/Action/Delete | Portfolio/Wholesalers |  |
| GET | /v1/Portfolio/Wholesalers/Simple | Portfolio/Wholesalers | Gets a simple list of wholesaler that the logged in user has access to. |
| GET | /v1/Portfolio/Wholesalers/Verbose | Portfolio/Wholesalers |  |
| POST | /v1/Portfolio/Wholesalers/Verbose | Portfolio/Wholesalers | Create new wholesaler. |
| PUT | /v1/Portfolio/Wholesalers/Verbose | Portfolio/Wholesalers |  |
| GET | /v1/Portfolio/Wholesalers/Verbose/{key} | Portfolio/Wholesalers |  |
| PUT | /v1/Portfolio/Wholesalers/Verbose/{key} | Portfolio/Wholesalers |  |
| PUT | /v1/Portfolio/Wholesalers/Verbose/{key}/SSNTaxId | Portfolio/Wholesalers | Retrieve or update SSN for wholesaler. |
| POST | /v1/Portfolio/Wholesalers/Verbose/List | Portfolio/Wholesalers |  |
| POST | /v1/Portfolio/Wholesalers/Verbose/List/Id | Portfolio/Wholesalers |  |
| GET | /v1/Portfolio/Wholesalers/Verbose/New | Portfolio/Wholesalers |  |
| GET | /v1/PortfolioDataSync/DataSharing/Sources | PortfolioDataSync/DataSharing | Returns all DataSharingSource rows that match our current logged in identity as the source or destination |
| POST | /v1/PortfolioDataSync/DataSharing/Sources | PortfolioDataSync/DataSharing | Creates a new row and adds it to the datasharingsource table |
| GET | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId} | PortfolioDataSync/DataSharing | Gets all DataSharingSources filtered by the DataSharingSourceId |
| PUT | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/Action/Deactivate | PortfolioDataSync/DataSharing | Marks a source as inactive (active = false) |
| PUT | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/Action/Description | PortfolioDataSync/DataSharing | Sets the description |
| PUT | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/Action/Reactivate | PortfolioDataSync/DataSharing | Activates a source |
| PUT | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/Action/UpdateFromSourceKeyAsync | PortfolioDataSync/DataSharing | Updates an existing row from a sourcekey |
| GET | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/Entities | PortfolioDataSync/DataSharing | Returns all DataSharingSource rows that match our current logged in identity as the source or destination |
| POST | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/Entities/Import | PortfolioDataSync/DataSharing | Inserts records based on imported file |
| PUT | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/Entities/Upsert | PortfolioDataSync/DataSharing |  |
| PUT | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/Entities/Upsert/Hypothetical | PortfolioDataSync/DataSharing |  |
| GET | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/EntityMapOverrides | PortfolioDataSync/DataSharing |  |
| PUT | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/EntityMapOverrides | PortfolioDataSync/DataSharing |  |
| GET | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/EntityMaps | PortfolioDataSync/DataSharing | Retrieves All entity maps for the current alclientid |
| PUT | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/EntityMaps | PortfolioDataSync/DataSharing |  |
| DELETE | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/NotificationSetting | PortfolioDataSync/DataSharing |  |
| GET | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/NotificationSetting | PortfolioDataSync/DataSharing |  |
| POST | /v1/PortfolioDataSync/DataSharing/Sources/{dataSharingSourceId}/NotificationSetting | PortfolioDataSync/DataSharing |  |
| GET | /v1/PortfolioDataSync/DataSharing/Sources/alClientId/{alClientId} | PortfolioDataSync/DataSharing | Gets all DataSharingSources filtered where the client or destination source match the passed in alClientId |
| GET | /v1/PortfolioDataSync/DataSharing/Sources/AllData | PortfolioDataSync/DataSharing | Get all rows unfilered for DataSharingSource |
| GET | /v1/PortfolioDataSync/DataSharing/Sources/dataSharingSourceUID/{dataSharingSourceUID} | PortfolioDataSync/DataSharing | Gets all DataSharingSources filtered by the dataSharingSourceUid or "sourcekey" |
| GET | /v1/PortfolioDataSync/DataSharing/Sources/EntityLink/IsActive | PortfolioDataSync/DataSharing |  |
| POST | /v1/Product/CreateProducts | Product/CreateProducts |  |
| GET | /v1/Public/Database/{dbKey}/ReportImage/{imageKey} | Public/Database |  |
| GET | /v1/Public/Database/{dbKey}/ReportPdf/{pdfKey} | Public/Database |  |
| GET | /v1/Public/Databases/{dbKey}/AdvisorImage | Public/Databases | Gets the advisor headshot image for the database with the provided guid. |
| GET | /v1/Public/Databases/{dbKey}/CustomColorsCss | Public/Databases |  |
| GET | /v1/Public/Databases/{dbKey}/Deliver/{sessionId}/Images/{imageId} | Public/Databases |  |
| GET | /v1/Public/Databases/{dbKey}/ReportImage | Public/Databases |  |
| GET | /v1/Public/Databases/{key} | Public/Databases | Gets the public information for the database with the provided guid. |
| GET | /v1/Public/Databases/{key}/Image | Public/Databases | Gets the logo image for the database with the provided guid. |
| GET | /v1/Public/Databases/{key}/Simple | Public/Databases | Gets the name for the database with the provided guid. |
| GET | /v1/Public/Partners/{partnerId} | Public/Partners | Gets public information of partner application, such as partner name, and product name. |
| GET | /v1/Public/Partners/{partnerId}/Image | Public/Partners | Gets the partner application image. |
| GET | /v1/Public/Partners/{partnerId}/SmallImage | Public/Partners | Gets the partner application image. |
| POST | /v1/Public/RequestForgotPassword/{key} | Public/RequestForgotPassword | Posts a request that the user has forgotten their password. |
| GET | /v1/Public/SecurityQuestion/{code} | Public/SecurityQuestion | Obsolete: Security questions and answers are no longer used. An empty string is returned for the security question. |
| GET | /v1/Public/SMS | Public/SMS |  |
| GET | /v1/Public/UrlShortener/{slug} | Public/UrlShortener |  |
| POST | /v1/Public/User/{key} | Public/User | Used to create a user login. |
| POST | /v1/QueryStudio/NaturalLanguage/AWS/CustomFields | QueryStudio/NaturalLanguage |  |
| POST | /v1/QueryStudio/NaturalLanguage/AWS/KnowledgeBase/Sync | QueryStudio/NaturalLanguage |  |
| POST | /v1/QueryStudio/NaturalLanguage/AWS/KnowledgeBase/SyncStatus/{jobId} | QueryStudio/NaturalLanguage |  |
| POST | /v1/QueryStudio/NaturalLanguage/AWS/QueryTags | QueryStudio/NaturalLanguage |  |
| POST | /v1/QueryStudio/NaturalLanguage/AWS/QueryTags/Source/{sourceId} | QueryStudio/NaturalLanguage |  |
| POST | /v1/QueryStudio/NaturalLanguage/QueryTags | QueryStudio/NaturalLanguage |  |
| GET | /v1/QueryStudio/Queries | QueryStudio/Queries |  |
| POST | /v1/QueryStudio/Queries | QueryStudio/Queries |  |
| PUT | /v1/QueryStudio/Queries | QueryStudio/Queries |  |
| GET | /v1/QueryStudio/Queries/{id}/AccessRules | QueryStudio/Queries |  |
| PUT | /v1/QueryStudio/Queries/{id}/AccessRules | QueryStudio/Queries |  |
| DELETE | /v1/QueryStudio/Queries/{queryId} | QueryStudio/Queries |  |
| GET | /v1/QueryStudio/Queries/{queryId} | QueryStudio/Queries |  |
| POST | /v1/QueryStudio/Queries/{queryId}/Export | QueryStudio/Queries |  |
| GET | /v1/QueryStudio/Queries/Download/{filename} | QueryStudio/Queries |  |
| POST | /v1/QueryStudio/Queries/Preview | QueryStudio/Queries |  |
| POST | /v1/QueryStudio/Queries/Run | QueryStudio/Queries |  |
| POST | /v1/QueryStudio/Queries/Summarize | QueryStudio/Queries |  |
| GET | /v1/QueryStudio/Queries/Summarize/{queryId} | QueryStudio/Queries |  |
| GET | /v1/QueryStudio/QueryTags | QueryStudio/QueryTags |  |
| POST | /v1/QueryStudio/QueryTags | QueryStudio/QueryTags |  |
| PUT | /v1/QueryStudio/QueryTags | QueryStudio/QueryTags |  |
| GET | /v1/QueryStudio/QueryTags/{queryTagId} | QueryStudio/QueryTags |  |
| POST | /v1/QueryStudio/QueryTags/Action/Category | QueryStudio/QueryTags |  |
| POST | /v1/QueryStudio/QueryTags/Action/IsActive | QueryStudio/QueryTags |  |
| POST | /v1/QueryStudio/QueryTags/CreateTagsFromTable | QueryStudio/QueryTags |  |
| GET | /v1/QueryStudio/QueryTagSources | QueryStudio/QueryTagSources |  |
| POST | /v1/QueryStudio/QueryTagSources | QueryStudio/QueryTagSources |  |
| PUT | /v1/QueryStudio/QueryTagSources | QueryStudio/QueryTagSources |  |
| DELETE | /v1/QueryStudio/QueryTagSources/{id} | QueryStudio/QueryTagSources |  |
| GET | /v1/QueryStudio/QueryTagSources/{id} | QueryStudio/QueryTagSources |  |
| GET | /v1/QueryStudio/RelatedColumns | QueryStudio/RelatedColumns |  |
| POST | /v1/QueryStudio/RelatedColumns | QueryStudio/RelatedColumns |  |
| DELETE | /v1/QueryStudio/RelatedColumns/{id} | QueryStudio/RelatedColumns |  |
| GET | /v1/QueryStudio/RelatedColumns/Columns | QueryStudio/RelatedColumns |  |
| POST | /v1/RepExpTrading/{entity}/{entityId}/PortfolioCompare/ModelDeviation | RepExpTrading/{entity} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Audit/Nonsleeve | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Audit/Sleeve | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/CustomIndexing | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/CustomIndexing/{hashKey}/Proposal | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/CustomIndexing/Astro/{templateName} | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/CustomIndexing/Astro/Settings | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/CustomIndexing/ModelAgg/Astro/{templateName} | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Eclipse/FirmToken | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/Account/{accountId}/Holdings | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/ManagementStyles | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/ManagementStyles/Simple | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/Model | RepExpTrading/{entityEnum} |  |
| PUT | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/Model/{modelAggId} | RepExpTrading/{entityEnum} |  |
| DELETE | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/Model/{modelId} | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/Model/SearchConfig | RepExpTrading/{entityEnum} | Returns the configuration for model entity  Used in Advisor Portal Sleeve Strategies and Account Assignment |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/Model/Ticker/{ticker} | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/Model/Ticker/{ticker}/Accounts | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/ModelAgg/{modelAggId}/{accountId}/Allocations | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/ModelAgg/Lookup | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/SubAdvisor | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Entity/SubAdvisor/Simple | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/ModelAssignment | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/ModelAssignment | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/ModelAssignment/Accounts | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/ModelAssignment/Rebalance | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/ModelAssignment/Rebalance/Model | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/ModelAssignment/Update | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/PortfolioCompare/ImplementScenario | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/PortfolioCompare/Info | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/PortfolioCompare/Rebalancer | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/PortfolioCompare/Rebalancer | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/PortfolioViewSettings | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/PortfolioViewSettings/EntityData | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/PortfolioViewSettings/EntityIsSleeved | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Products/Details | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Products/RiskScore | RepExpTrading/{entityEnum} | Use 'Details' endpoint because it is more accurately named.  The process has been changed to get more than just Risk score |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Products/Search | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/Products/Search/Cloud | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/SelfDirected | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/SelfDirected/{id} | RepExpTrading/{entityEnum} |  |
| PUT | /v1/RepExpTrading/{entityEnum}/{entityId}/SelfDirected/{modelAggId} | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/SelfDirected/DeductFee | RepExpTrading/{entityEnum} |  |
| PUT | /v1/RepExpTrading/{entityEnum}/{entityId}/SelfDirected/DeductFee | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/SelfDirected/New | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/SetAsideCash | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/SetAsideCash | RepExpTrading/{entityEnum} |  |
| DELETE | /v1/RepExpTrading/{entityEnum}/{entityId}/SetAsideCash/{setAsideCashId} | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/SleeveAssignment | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/SleeveAssignment | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/SleeveAssignment/Rebalance | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/SleeveAssignment/SleeveStrategy | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/SleeveAssignment/SleeveStrategy/{sleeveStrategyAggId} | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/SleeveAssignment/Validate | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeInstances | RepExpTrading/{entityEnum} |  |
| DELETE | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeInstances/{tradeInstanceId} | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeInstances/{tradeInstanceId}/Orders | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/GlobalTrades | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/GlobalTrades/List | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/GlobalTrades/Validate | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/HasOrders | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/TradeDetails | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/TradeDetails | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/TradeDetails/Nonsleeve | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/TradeDetails/Nonsleeve | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/TradeDetails/NonSleeve/Rebalance | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/TradeDetails/Nonsleeve/Validate | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/TradeOrders/TradeDetails/Validate | RepExpTrading/{entityEnum} |  |
| GET | /v1/RepExpTrading/{entityEnum}/{entityId}/TradingPreferences | RepExpTrading/{entityEnum} |  |
| POST | /v1/RepExpTrading/{entityEnum}/{entityId}/TradingPreferences | RepExpTrading/{entityEnum} |  |
| GET | /v1/ReportAdministration/Reports/{key} | ReportAdministration/Reports | Gets the full report that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/ReportAdministration/Reports/{key} | ReportAdministration/Reports | Used to update an existing report. Upon successful modification a 200 will be returned. |
| GET | /v1/ReportBuilder/CoverPages | ReportBuilder/CoverPages |  |
| GET | /v1/ReportBuilder/CoverPages/{key} | ReportBuilder/CoverPages | Gets the cover page that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/ReportBuilder/CoverPages/{key}/Image | ReportBuilder/CoverPages | Gets the image of the cover page that has the provided key formatted as an image response regaurdless of mime type requested. |
| GET | /v1/ReportBuilder/CoverPages/Landscape | ReportBuilder/CoverPages | Gets a list of cover pages that are landscape oriented. |
| GET | /v1/ReportBuilder/CoverPages/Portrait | ReportBuilder/CoverPages | Gets a list of cover pages that are portrait oriented. |
| POST | /v1/ReportBuilder/Reports | ReportBuilder/Reports | Used to create a new report builder report. Upon successful creation a 201 will be returned with the location of the nearly created report. |
| DELETE | /v1/ReportBuilder/Reports/{key} | ReportBuilder/Reports | Used to delete an existing report builder report. Upon successful deletion a 204 will be returned. |
| GET | /v1/ReportBuilder/Reports/{key} | ReportBuilder/Reports | Gets the full report builder report that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/ReportBuilder/Reports/{key} | ReportBuilder/Reports | Used to update an existing report builder report. Upon successful modification a 200 will be returned. |
| GET | /v1/ReportBuilder/Reports/Simple | ReportBuilder/Reports | Gets a simple list of report builder reports that the logged in user has access to. Versioned reports appear at the top level with their parent report. |
| GET | /v1/ReportBuilder/Reports/Simple/{key} | ReportBuilder/Reports | Gets the simple report builder report that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/ReportBuilder/Reports/Simple/Search | ReportBuilder/Reports | Gets the simple report builder report list that contains the search text in the report name |
| GET | /v1/ReportBuilder/Reports/Simple/Search/{search} | ReportBuilder/Reports | Gets the simple report builder report list that contains the search text in the report name |
| GET | /v1/ReportBuilder/Reports/Simple/Tree | ReportBuilder/Reports | Gets a simple tree of report builder reports that the logged in user has access to. Versioned reports appear below their parent report. |
| GET | /v1/ReportBuilder/Reports/Templates | ReportBuilder/Reports |  |
| GET | /v1/ReportBuilder/Sections | ReportBuilder/Sections | Gets a list of report builder sections that the logged in user has access to. |
| GET | /v1/ReportBuilder/Sections/{key} | ReportBuilder/Sections | Gets the report builder section that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/ReportBuilder/Sections/{key}/Image | ReportBuilder/Sections | Gets the image of the report builder section that has the provided key formatted as an image response regaurdless of mime type requested. |
| GET | /v1/ReportBuilder/Sections/Landscape | ReportBuilder/Sections | Gets a list of report builder sections that are landscape oriented. |
| GET | /v1/ReportBuilder/Sections/Landscape/Grouped | ReportBuilder/Sections | Gets a list of report builder sections that are landscape oriented grouped by category. |
| GET | /v1/ReportBuilder/Sections/Parameters | ReportBuilder/Sections | Gets a dictionary of all the parameters used in all sections that the logged in user has access to. The dictionary key is the section key. The dictionary value is a list of parameters for the section. |
| GET | /v1/ReportBuilder/Sections/Portrait | ReportBuilder/Sections | Gets a list of report builder sections that are portrait oriented. |
| GET | /v1/ReportBuilder/Sections/Portrait/Grouped | ReportBuilder/Sections | Gets a list of report builder sections that are portrait oriented grouped by category. |
| GET | /v1/ReportBuilder/Themes | ReportBuilder/Themes | Gets a list of report builder themes that the logged in user has access to. |
| POST | /v1/ReportBuilder/Themes | ReportBuilder/Themes |  |
| DELETE | /v1/ReportBuilder/Themes/{key} | ReportBuilder/Themes |  |
| GET | /v1/ReportBuilder/Themes/{key} | ReportBuilder/Themes | Gets the report builder theme that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/ReportBuilder/Themes/{key} | ReportBuilder/Themes |  |
| GET | /v1/ReportBuilder/Themes/Default | ReportBuilder/Themes | Gets the default report builder theme that has the provided key. |
| GET | /v1/ReportBuilder/Themes/Simple | ReportBuilder/Themes | Gets a simple list of report builder themes that the logged in user has access to. |
| GET | /v1/ReportBuilder/Themes/Simple/{key} | ReportBuilder/Themes | Gets the simple report builder theme that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/ReportBuilder/WebMenuOptions | ReportBuilder/WebMenuOptions | Gets a list of web menu options. |
| GET | /v1/Reporting/Activity/{entity}/{entityId}/Value | Reporting/Activity | Method to get value for the entity specified. |
| GET | /v1/Reporting/Activity/{entity}/{entityId}/Value/{asOfDate} | Reporting/Activity | Method to get value for the entity specified. |
| GET | /v1/Reporting/Activity/CostBasis | Reporting/Activity | Returns aggregated cost basis information for each asset in the requested entity / entityid |
| POST | /v1/Reporting/Activity/DrillDownSummary | Reporting/Activity | Used to return a drill down summary of activity. Has the ability to return activity heirarchically as desired. |
| POST | /v1/Reporting/Activity/EstimatedIncome | Reporting/Activity | Method to retrieve estimated income yields and other values for the provided entity, detailed out by the specified settings |
| POST | /v1/Reporting/Activity/FixedIncome | Reporting/Activity | Method to retrieve fixed income yields and other values for the provided entity |
| POST | /v1/Reporting/Activity/FixedIncome/Detail | Reporting/Activity | Method to retrieve fixed income yields and other values for the provided entity, detailed out by the specified settings |
| POST | /v1/Reporting/Activity/Holdings | Reporting/Activity | Returns holding (asset level) data for a specified "run for entity" grouped by some other entity. Allowed "run for entities": Representative, Client, Registration, Account, and Asset. Allowed grouping entities: Representative, Client, Registration, Account, AssetClass, ProductType, Platform, RiskCategory, Product, AssetCategory, AssetLevelStrategy, AggregateModel, and AccountType. |
| POST | /v1/Reporting/Activity/Holdings/Unmanaged | Reporting/Activity | Returns unmanaged holding (asset level) data for a specified "run for entity" grouped by some other entity. Allowed "run for entities": Representative, Client, Registration, Account, and Asset. Allowed grouping entities: Representative, Client, Registration, Account, AssetClass, ProductType, Platform, RiskCategory, Product, AssetCategory, AssetLevelStrategy, AggregateModel, and AccountType. |
| POST | /v1/Reporting/Activity/TargetAndActual | Reporting/Activity | Used to return the comparison of Actual allocations to the target allocation detailed at the HouseHold or Account level. |
| POST | /v1/Reporting/Activity/TransactionBreakdown | Reporting/Activity | Used to verbosely return activity. Has the ability to return activity grouped as desired for the groups over a number of date ranges. |
| POST | /v1/Reporting/Activity/Verbose | Reporting/Activity | Used to verbosely return activity. Has the ability to return activity grouped as desired for the groups over a number of date ranges. |
| GET | /v1/Reporting/Admin/Compares | Reporting/Admin |  |
| GET | /v1/Reporting/Admin/Compares/{sessionId} | Reporting/Admin |  |
| POST | /v1/Reporting/Admin/Compares/Assign/{sessionId} | Reporting/Admin |  |
| GET | /v1/Reporting/Admin/Compares/Data/{sessionId}/{instanceId} | Reporting/Admin |  |
| PUT | /v1/Reporting/Admin/Compares/Instance/{instanceId}/{category} | Reporting/Admin |  |
| GET | /v1/Reporting/Admin/Compares/Visual/{sessionId}/{instanceId} | Reporting/Admin |  |
| GET | /v1/Reporting/Assistant/ControlList | Reporting/Assistant |  |
| POST | /v1/Reporting/Assistant/DataDefinitions/Update/Run | Reporting/Assistant |  |
| POST | /v1/Reporting/Assistant/Index/Update/Run | Reporting/Assistant |  |
| POST | /v1/Reporting/Assistant/prompt | Reporting/Assistant |  |
| GET | /v1/Reporting/Assistant/PromptSystemList | Reporting/Assistant |  |
| POST | /v1/Reporting/AutomatedCompares/TestBaseline | Reporting/AutomatedCompares |  |
| GET | /v1/Reporting/AutomatedCompares/TestClone/{previousRegressionId} | Reporting/AutomatedCompares |  |
| GET | /v1/Reporting/AutomatedCompares/TestReport | Reporting/AutomatedCompares |  |
| POST | /v1/Reporting/AutomatedCompares/TestVisual | Reporting/AutomatedCompares |  |
| GET | /v1/Reporting/Batch | Reporting/Batch | Gets a list of report batches that the logged in user has access to. |
| POST | /v1/Reporting/Batch/{batchId}/Action/SendTestEmail | Reporting/Batch |  |
| POST | /v1/Reporting/Batch/{batchId}/Action/ToggleLockDown | Reporting/Batch | Used to generate the stored PDFs for either the whole batch or only those specified. Entities that are onHold or already have a document generated will be ignored. Removed entities will be ignored. |
| GET | /v1/Reporting/Batch/{batchId}/Entities | Reporting/Batch |  |
| GET | /v1/Reporting/Batch/{batchId}/Entities/{key} | Reporting/Batch | Gets the report batch entity with the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/Batch/{batchId}/Entities/{key}/Action/Download | Reporting/Batch | Used to generate the stored PDF for this entity in the batch. Error will be returned if the entity is on hold or report has already been generated. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/DetectErrors | Reporting/Batch | Used to generate the stored PDFs for either the whole batch or only those specified. Entities that are onHold or already have a document generated will be ignored. Removed entities will be ignored. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/Download | Reporting/Batch |  |
| GET | /v1/Reporting/Batch/{batchId}/Entities/Action/Download/{sessionId} | Reporting/Batch | Used to actually download a group of reports that was requested using POST Action/Download. |
| GET | /v1/Reporting/Batch/{batchId}/Entities/Action/DownloadAll/{combinationMethod} | Reporting/Batch |  |
| DELETE | /v1/Reporting/Batch/{batchId}/Entities/Action/Generate | Reporting/Batch | Used to stop report generation. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/Generate | Reporting/Batch | Used to generate the stored PDFs for either the whole batch or only those specified. Entities that are onHold or already have a document generated will be ignored. Removed entities will be ignored. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/OnHold | Reporting/Batch | Used to update the OnHold property on some or all entities in the batch. Removed entities will be ignored. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/ResetElectronicStatement | Reporting/Batch | Used to reset the electronic statement status of some of the entities in the batch. Removed entities will be ignored. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/ResetGeneration | Reporting/Batch | Used to reset the generation status of some of the entities in the batch. Removed entities will be ignored. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/ResetPrintVendor | Reporting/Batch | Used to reset the print vendor status of some of the entities in the batch. Removed entities will be ignored. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/SendElectronicStatement | Reporting/Batch | Used to send e-statement notification for either the whole batch or only those specified. Removed entities will be ignored. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/SendToPrintVendor | Reporting/Batch | Used to generate the stored PDFs for either the whole batch or only those specified. Entities that are onHold or already have a document generated will be ignored. Removed entities will be ignored. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/Sync | Reporting/Batch | If the provided batch has a dynamic group associated this will sync the list of entities with the list from that dynamic group. If it does not an unsupported exception is raised. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/SyncList | Reporting/Batch | If the provided batch does not have a dynamic group associated this will sync the list of entities with the list provided. If it does not an unsupported exception is raised. |
| POST | /v1/Reporting/Batch/{batchId}/Entities/Action/ViewableBy | Reporting/Batch | Used to update the viewableBy property on some or all entities in the batch. Removed entities will be ignored. |
| GET | /v1/Reporting/Batch/{batchId}/Inserts | Reporting/Batch | Gets a list of inserts for the provided report batch id that the logged in user has access to. |
| PUT | /v1/Reporting/Batch/{batchId}/Inserts | Reporting/Batch | Updates the list of inserts for the provided report batch id that the logged in user has access to. |
| GET | /v1/Reporting/Batch/{batchId}/Inserts/{key} | Reporting/Batch | Gets the report batch entity with the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/Batch/{batchId}/Inserts/{key}/Action/Upload | Reporting/Batch |  |
| GET | /v1/Reporting/Batch/{batchId}/Inserts/{key}/Download | Reporting/Batch | Gets the raw data of the specific insert with the key provided which is associated to the batch with the specified key. |
| GET | /v1/Reporting/Batch/{key} | Reporting/Batch | Gets the report batches with the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/Batch/Action/ConcurrentReportExecutionInfo | Reporting/Batch |  |
| POST | /v1/Reporting/Batch/Action/RefreshConcurrentReportExecutionLimit | Reporting/Batch |  |
| GET | /v1/Reporting/Batch/Reports/{reportId} | Reporting/Batch | Endpoint to get report information needed for the batch wizard. |
| GET | /v1/Reporting/Batch/Reports/{reportListId} | Reporting/Batch | Endpoint to get report information needed for the batch wizard. |
| GET | /v1/Reporting/Batch/Verbose | Reporting/Batch |  |
| POST | /v1/Reporting/Batch/Verbose | Reporting/Batch | Creates a new report batch. |
| DELETE | /v1/Reporting/Batch/Verbose/{key} | Reporting/Batch | Deletes a report batch. |
| GET | /v1/Reporting/Batch/Verbose/{key} | Reporting/Batch |  |
| PUT | /v1/Reporting/Batch/Verbose/{key} | Reporting/Batch | Updates a report batch. |
| GET | /v1/Reporting/BI/AccountHistory | Reporting/BI |  |
| GET | /v1/Reporting/BI/AccountTable | Reporting/BI |  |
| GET | /v1/Reporting/BI/AssetTable | Reporting/BI |  |
| GET | /v1/Reporting/BI/HouseholdTable | Reporting/BI |  |
| GET | /v1/Reporting/BI/Performance | Reporting/BI |  |
| GET | /v1/Reporting/BI/ProductHistory | Reporting/BI |  |
| GET | /v1/Reporting/BI/ProductTable | Reporting/BI |  |
| GET | /v1/Reporting/BI/RepTable | Reporting/BI |  |
| GET | /v1/Reporting/BI/SisenseBaseAddress | Reporting/BI |  |
| GET | /v1/Reporting/BI/SisenseSSO | Reporting/BI |  |
| GET | /v1/Reporting/Billing/AdvisoryFeeNotification/Reports/Action/{key}/Run/{sessionId} | Reporting/Billing | Runs the report generation process for the Advisory Fee Notification. |
| GET | /v1/Reporting/Billing/AdvisoryFeeNotification/Reports/Action/{key}/Run/{sessionId}/Pdf | Reporting/Billing | Retrieves a previously generated Advisory Fee Notification report PDF. |
| POST | /v1/Reporting/Billing/AdvisoryFeeNotification/Reports/Action/Generate | Reporting/Billing | Generates an Advisory Fee Notification Report |
| GET | /v1/Reporting/Billing/PayeePayable/Reports/Action/{key}/Run/{sessionId} | Reporting/Billing | Retrieves a previously generated Bill Cancellation By Payee Payable report |
| GET | /v1/Reporting/Billing/PayeePayable/Reports/Action/{key}/Run/{sessionId}/Pdf | Reporting/Billing | Retrieves a previously generated Bill Cancellation By Payee Payable report PDF |
| POST | /v1/Reporting/Billing/PayeePayable/Reports/Action/Generate | Reporting/Billing | Generates a Bill Cancellation By Payee Payable Report |
| GET | /v1/Reporting/Billing/Reports/BillCancellationByAccount/Action/{key}/Run/{sessionId} | Reporting/Billing | Retrieves a previously generated Bill Cancellation By Account report |
| GET | /v1/Reporting/Billing/Reports/BillCancellationByAccount/Action/{key}/Run/{sessionId}/Pdf | Reporting/Billing | Retrieves a previously generated Bill Cancellation By Account report PDF |
| POST | /v1/Reporting/Billing/Reports/BillCancellationByAccount/Action/Generate | Reporting/Billing | Generates a Bill Cancellation By Account Report |
| GET | /v1/Reporting/Billing/Reports/LegacyAdvisoryFeeReport/Action/{key}/Run/{sessionId} | Reporting/Billing | Runs the report generation process for the Legacy Advisory Fee Notification. |
| GET | /v1/Reporting/Billing/Reports/LegacyAdvisoryFeeReport/Action/{key}/Run/{sessionId}/Pdf | Reporting/Billing | Retrieves a previously generated Legacy Advisory Fee Notification report PDF. |
| POST | /v1/Reporting/Billing/Reports/LegacyAdvisoryFeeReport/Action/Generate | Reporting/Billing | Generates a Legacy Advisory Fee Report |
| GET | /v1/Reporting/Billing/Reports/LegacyAdvisoryFeeReport/Action/Generate/Preview | Reporting/Billing |  |
| GET | /v1/Reporting/Billing/Reports/RevenuePayout/Action/{key}/Run/{sessionId} | Reporting/Billing |  |
| GET | /v1/Reporting/Billing/Reports/RevenuePayout/Action/{key}/Run/{sessionId}/Pdf | Reporting/Billing |  |
| GET | /v1/Reporting/Billing/Reports/RevenuePayout/Action/{revenuePayoutId}/{revenuePayoutPaymentId}/Generate | Reporting/Billing |  |
| POST | /v1/Reporting/Billing/Reports/RevenuePayout/Action/Generate | Reporting/Billing |  |
| GET | /v1/Reporting/Calculate/DateRanges | Reporting/Calculate |  |
| GET | /v1/Reporting/Calculate/DateRanges/{asOfDate} | Reporting/Calculate |  |
| POST | /v1/Reporting/Calculate/Verbose | Reporting/Calculate |  |
| GET | /v1/Reporting/Calculate/Verbose/New | Reporting/Calculate |  |
| POST | /v1/Reporting/Compares/Batch | Reporting/Compares |  |
| POST | /v1/Reporting/Compares/BatchExcelReport | Reporting/Compares |  |
| GET | /v1/Reporting/Composite/Accounts | Reporting/Composite | Gets a list of composite accounts that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Reporting/Composite/Accounts | Reporting/Composite | Used to create a new composite account. Upon successful creation the created data is returned. |
| GET | /v1/Reporting/Composite/Accounts/{key} | Reporting/Composite | Gets the composite account that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/Composite/Accounts/{key} | Reporting/Composite |  |
| PUT | /v1/Reporting/Composite/Accounts/Action/Delete | Reporting/Composite |  |
| PUT | /v1/Reporting/Composite/Accounts/Action/Delete/All | Reporting/Composite | Deletes composite accounts by date and type |
| PUT | /v1/Reporting/Composite/Accounts/Action/Exclude | Reporting/Composite |  |
| PUT | /v1/Reporting/Composite/Accounts/Action/Exclude/AccountIds | Reporting/Composite |  |
| PUT | /v1/Reporting/Composite/Accounts/Action/Include | Reporting/Composite |  |
| PUT | /v1/Reporting/Composite/Accounts/Action/Include/AccountIds | Reporting/Composite |  |
| PUT | /v1/Reporting/Composite/Accounts/Action/MakeLive | Reporting/Composite | Marks all preliminary composite accounts, on the date provided, live. |
| PUT | /v1/Reporting/Composite/Accounts/Action/MakeLiveForSelected | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Accounts/Action/OCISync | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Accounts/Action/OCISync/ByDateRange | Reporting/Composite |  |
| PUT | /v1/Reporting/Composite/Accounts/Action/Sync | Reporting/Composite | Mark rows for the selected preliminary node as not include if they are not included in the corresponding saved node.  This finds account IDs in the preliminary list in a saved list for the same  month and year and copies the "Included" data from the saved list to the preliminary list for the matching account ID.  If it is marked not included in saved, then it updates preliminary to not include for the account ID.   (requires that a preliminary and saved list exist for the same month and year) |
| PUT | /v1/Reporting/Composite/Accounts/Action/UpdateList | Reporting/Composite | Used to create a new composite accounts. Upon successful creation the created data is returned. |
| PUT | /v1/Reporting/Composite/Accounts/Action/UpdateNote | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Accounts/Archive | Reporting/Composite | Gets a list of composite archived reports. |
| DELETE | /v1/Reporting/Composite/Accounts/Archive/{key} | Reporting/Composite | Used to download an archived report file. |
| GET | /v1/Reporting/Composite/Accounts/Archive/{key}/Download | Reporting/Composite | Used to download an archived report file. |
| GET | /v1/Reporting/Composite/Accounts/CompositeFilter | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Accounts/List | Reporting/Composite | Used to create a new composite accounts. Upon successful creation the created data is returned. |
| GET | /v1/Reporting/Composite/Accounts/Logs | Reporting/Composite | Gets a list of composite account logs that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Reporting/Composite/Accounts/Logs/{key} | Reporting/Composite | Gets the composite account log that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/Composite/Accounts/Missing | Reporting/Composite | Gets a list of accounts that are missing from this period's composites. |
| GET | /v1/Reporting/Composite/Accounts/Summary | Reporting/Composite | Gets a summary list of composite accounts. Specifies the month beginning dates and how many accounts are in each period as well as other information. |
| GET | /v1/Reporting/Composite/AdHocAccounts | Reporting/Composite | Gets a list of composite ad-hoc accounts that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Reporting/Composite/AdHocAccounts | Reporting/Composite | Used to create a new composite account. Upon successful creation the created data is returned. |
| GET | /v1/Reporting/Composite/AdHocAccounts/{key} | Reporting/Composite | Gets the composite account that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/Composite/AdHocAccounts/{key} | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/AdHocAccounts/List | Reporting/Composite | Used to create a new composite accounts. Upon successful creation the created data is returned. |
| GET | /v1/Reporting/Composite/AdHocInstances | Reporting/Composite | Return list of composite ad-hoc instances |
| GET | /v1/Reporting/Composite/AdHocInstances/{key} | Reporting/Composite | Return list of composite ad-hoc instances |
| GET | /v1/Reporting/Composite/AdHocInstances/{key}/CompositeAdHocAccount | Reporting/Composite | Return list of composite accounts |
| PUT | /v1/Reporting/Composite/AdHocInstances/Action/Delete | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/AdHocInstances/Action/Instance | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/AdHocInstances/Running | Reporting/Composite | Return list of compositeAdHocInstanceIds that are currently running in hangfire |
| GET | /v1/Reporting/Composite/AdHocInstances/Simple | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Dashboard | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Dashboard/Details/{businessLineId}/{repAccountManagerId}/{brokerDealerId}/{branchId}/{fundFamilyId}/{platformId}/{modelAggId}/{custodianId}/{planId}/{repId}/{crsrId}/{crrbId}/{crrtId} | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Dashboard/ModelFactSheet | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Dashboard/ModelRollingReturns | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Dashboard/MonthlyModelReturns | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Dashboard/Performance/ModelAgg | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Disclosures | Reporting/Composite | Get the disclosures with their associated reports |
| DELETE | /v1/Reporting/Composite/Disclosures/{key} | Reporting/Composite | Delete the disclosure with matching id |
| GET | /v1/Reporting/Composite/Disclosures/{key} | Reporting/Composite | Get disclosures by id |
| POST | /v1/Reporting/Composite/Disclosures/Create | Reporting/Composite | Create a new disclosure |
| PUT | /v1/Reporting/Composite/Disclosures/Reorder | Reporting/Composite | Reorder disclosures |
| PUT | /v1/Reporting/Composite/Disclosures/Update/{id} | Reporting/Composite | Update an existing disclosure |
| GET | /v1/Reporting/Composite/FirmAssets | Reporting/Composite | Gets a list of composite firm assets that the logged in user has access to. |
| POST | /v1/Reporting/Composite/FirmAssets | Reporting/Composite | Used to create a new composite firm asset. Upon successful creation a 201 will be returned with the location of the nearly created firm asset. |
| GET | /v1/Reporting/Composite/FirmAssets/{asOfDate} | Reporting/Composite | Gets a list of composite firm assets that start on the date provided. |
| DELETE | /v1/Reporting/Composite/FirmAssets/{key} | Reporting/Composite | Used to delete an existing composite firm asset. Upon successful deletion a 204 will be returned. |
| GET | /v1/Reporting/Composite/FirmAssets/{key} | Reporting/Composite | Gets the composite firm assets that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/Composite/FirmAssets/{key} | Reporting/Composite | Used to update an existing composite firm asset. Upon successful modification a 200 will be returned. |
| GET | /v1/Reporting/Composite/GIPS | Reporting/Composite | Gets a list of GIPS queries The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Reporting/Composite/Instances/{key} | Reporting/Composite | Return list of composite accounts |
| GET | /v1/Reporting/Composite/Instances/Running | Reporting/Composite | Return list of compositeInstanceIds that are currently running in hangfire |
| GET | /v1/Reporting/Composite/Ranges | Reporting/Composite | Gets a list of composite ranges that the logged in user has access to. |
| POST | /v1/Reporting/Composite/Ranges | Reporting/Composite | Used to create a new composite range. Upon successful creation a 201 will be returned with the location of the nearly created range. |
| DELETE | /v1/Reporting/Composite/Ranges/{key} | Reporting/Composite | Used to delete an existing composite range. Upon successful deletion a 204 will be returned. |
| GET | /v1/Reporting/Composite/Ranges/{key} | Reporting/Composite | Gets the composite ranges that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/Composite/Ranges/{key} | Reporting/Composite | Used to update an existing composite range. Upon successful modification a 200 will be returned. |
| GET | /v1/Reporting/Composite/Ranges/{range} | Reporting/Composite | Gets a list of composite ranges that the logged in user has access to. |
| GET | /v1/Reporting/Composite/Ranges/Options/RangeType | Reporting/Composite | Used to get a list of available values for the range type property. |
| GET | /v1/Reporting/Composite/Ranges/Simple | Reporting/Composite | Gets a simple list of composite ranges that the logged in user has access to. |
| GET | /v1/Reporting/Composite/Ranges/Simple/{range} | Reporting/Composite | Gets a simple list of composite ranges that the logged in user has access to. |
| GET | /v1/Reporting/Composite/Reports | Reporting/Composite | Gets a list of composite reports that the logged in user has access to. |
| POST | /v1/Reporting/Composite/Reports | Reporting/Composite | Used to create a new composite report. Upon successful creation a 201 will be returned with the location of the nearly created report. |
| DELETE | /v1/Reporting/Composite/Reports/{key} | Reporting/Composite | Used to delete an existing composite report. Upon successful deletion a 204 will be returned. |
| GET | /v1/Reporting/Composite/Reports/{key} | Reporting/Composite | Gets the composite report that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/Composite/Reports/{key} | Reporting/Composite | Used to update an existing composite report. Upon successful modification a 200 will be returned. |
| GET | /v1/Reporting/Composite/Reports/{key}/Run | Reporting/Composite | Gets a data file representation of the composite report.  If the accept header has "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" the return will be xlsx. If the accept header has "application/vnd.ms-excel" the return will be xls. If the accept header has "text/csv" the return will be csv. |
| GET | /v1/Reporting/Composite/Reports/{key}/Run/{sessionId} | Reporting/Composite | Used to get a retrieved a previously generated composite report. |
| GET | /v1/Reporting/Composite/Reports/{key}/Run/{sessionId}/Pdf | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Reports/{key}/Run/csv | Reporting/Composite | Gets a csv file representation of the composite report. |
| GET | /v1/Reporting/Composite/Reports/{key}/Run/xls | Reporting/Composite | Gets an xls file representation of the composite report. |
| GET | /v1/Reporting/Composite/Reports/{key}/Run/xlsx | Reporting/Composite | Gets an xlsx file representation of the composite report. |
| POST | /v1/Reporting/Composite/Reports/Generate | Reporting/Composite | Used to generate a composite report. Upon success a location header is returned where the file can be retrieved. |
| POST | /v1/Reporting/Composite/Reports/Generate/Json | Reporting/Composite | Used to generate a composite report. Upon success a json object is returned |
| GET | /v1/Reporting/Composite/Reports/Group/{groupId}/Description | Reporting/Composite | Gets the composite report group description that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/Composite/Reports/Group/{groupId}/Description | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Reports/Options/CompositeGroupType | Reporting/Composite | Used to get a list of available values for the group type property. |
| GET | /v1/Reporting/Composite/Reports/Simple | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Rules | Reporting/Composite | Gets all composite rules. |
| POST | /v1/Reporting/Composite/Rules | Reporting/Composite | Used to create a new composite rule. Upon successful creation the created data is returned. |
| GET | /v1/Reporting/Composite/Rules/{key} | Reporting/Composite | Gets the composite rule that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/Composite/Rules/{key} | Reporting/Composite |  |
| DELETE | /v1/Reporting/Composite/Rules/Action/Delete/{key} | Reporting/Composite | Deletes composite rules provided in the key. |
| GET | /v1/Reporting/Composite/Summary | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Summary/Performance | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Summary/Performance/{key}/Details | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Summary/Performance/Growth | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Summary/Performance/Histogram | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Summary/Performance/Scatter | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Texts | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Texts | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Texts/{key} | Reporting/Composite |  |
| PUT | /v1/Reporting/Composite/Texts/{key} | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/ValidateImport/HistoricalCompositeAccount | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/ValidateImport/HistoricalCompositeAccount/Templates/Csv | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/ValidateImport/HistoricalCompositeAccount/Templates/Xls | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/ValidateImport/HistoricalCompositeAccount/Templates/Xlsx | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/ValidateImport/HistoricalCompositeAccountUpdate | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/ValidateImport/HistoricalCompositeAccountUpdate/Templates/Csv | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/ValidateImport/HistoricalCompositeAccountUpdate/Templates/Xls | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/ValidateImport/HistoricalCompositeAccountUpdate/Templates/Xlsx | Reporting/Composite |  |
| POST | /v1/Reporting/Composite/Wizard/Action/Instance | Reporting/Composite | Creates composite instance, kicks off hangfire job on new instance for generating all composite accounts for selected values |
| POST | /v1/Reporting/Composite/Wizard/Action/Recalc | Reporting/Composite |  |
| GET | /v1/Reporting/Composite/Wizard/CompositeDefinition | Reporting/Composite | This generates a generic composite definition loaded with the database default settings.  This object can be retrieved, filled in with composite calculation instructions, and sent to the Calculate Composites Routines. |
| POST | /v1/Reporting/Composite/Wizard/ValidateImport/{validationType} | Reporting/Composite |  |
| GET | /v1/Reporting/Custom/{key} | Reporting/Custom | Gets the custom report that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/Custom/{key}/ConfirmGroup/{confirmGroupId} | Reporting/Custom | Gets the custom report with the provided reportId, with prompts populated based on info from the confirm group.  If the ConfirmGroup or the Query don't exist or aren't accessible to the logged in user, a 404 will be thrown |
| GET | /v1/Reporting/Custom/{key}/CustomImportTypes | Reporting/Custom | Gets a list of custom import types associated to a dataquery |
| PUT | /v1/Reporting/Custom/{key}/Description | Reporting/Custom | Updates custom report description |
| POST | /v1/Reporting/Custom/{key}/Generate | Reporting/Custom | Used to generate a custom report to the format and location based on the CustomReport.RunTo.StorageType ("DirectDownload" or "ReportInbox") and the CustomReport.RunTo.ReportFormat ("Excel" or "Csv") with the provided parameters. The successful return will be 201 Created  with the location set to the url of the newly generated file.  If ReportInbox is selected, then a blank accepted response is returned. |
| POST | /v1/Reporting/Custom/{key}/Generate/csv | Reporting/Custom | Used to generate a custom report csv with the provided parameters. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| POST | /v1/Reporting/Custom/{key}/Generate/CustomImport | Reporting/Custom | Used to generate a custom import from a provided dataquery |
| POST | /v1/Reporting/Custom/{key}/Generate/SlickGrid | Reporting/Custom | Generates the result of the custom report, using the parameters passed in. |
| GET | /v1/Reporting/Custom/{key}/Generate/SlickGrid/{cacheKey} | Reporting/Custom | Retrieve the previously generated slick grid result. |
| POST | /v1/Reporting/Custom/{key}/Generate/Table | Reporting/Custom | Generates the result of the custom report, using the parameters passed in. |
| POST | /v1/Reporting/Custom/{key}/Generate/xls | Reporting/Custom | Used to generate a custom report xls with the provided parameters. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| POST | /v1/Reporting/Custom/{key}/Generate/xlsx | Reporting/Custom | Used to generate a custom report xlsx with the provided parameters. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| GET | /v1/Reporting/Custom/{key}/Run/{filename} | Reporting/Custom | Used to download a previously generated custom report. |
| GET | /v1/Reporting/Custom/Category | Reporting/Custom | Gets a list of categories used by the custom reports |
| POST | /v1/Reporting/Custom/Full/List | Reporting/Custom |  |
| POST | /v1/Reporting/Custom/List | Reporting/Custom | Gets a simple list of custom reports that match one of the keys in the provided list. |
| GET | /v1/Reporting/Custom/Notes | Reporting/Custom | Get custom report notes |
| POST | /v1/Reporting/Custom/Notes | Reporting/Custom | Create custom report note |
| GET | /v1/Reporting/Custom/Notes/{key} | Reporting/Custom | Get custom report note by key |
| PUT | /v1/Reporting/Custom/Notes/{key} | Reporting/Custom | Update custom report note |
| GET | /v1/Reporting/Custom/Schedules | Reporting/Custom | Get all custom report schedules |
| POST | /v1/Reporting/Custom/Schedules | Reporting/Custom | Create new schedule |
| DELETE | /v1/Reporting/Custom/Schedules/{key} | Reporting/Custom | Delete schedule |
| GET | /v1/Reporting/Custom/Schedules/{key} | Reporting/Custom | Get custom report schedule by key |
| PUT | /v1/Reporting/Custom/Schedules/{key} | Reporting/Custom | Update schedule |
| GET | /v1/Reporting/Custom/Schedules/{key}/Download/csv/{resultId} | Reporting/Custom | Get data query results as Csv |
| GET | /v1/Reporting/Custom/Schedules/{key}/Download/psv/{resultId} | Reporting/Custom | Get data query results as pipe-delimited |
| GET | /v1/Reporting/Custom/Schedules/{key}/Download/xls/{resultId} | Reporting/Custom | Get data query results as data Xls |
| GET | /v1/Reporting/Custom/Schedules/{key}/Download/xlsx/{resultId} | Reporting/Custom | Get data query results as Xlsx |
| GET | /v1/Reporting/Custom/Schedules/{key}/Generate/SlickGrid/{resultId} | Reporting/Custom | Get data query results as slick grid |
| GET | /v1/Reporting/Custom/Schedules/{key}/Generate/Table/{resultId} | Reporting/Custom | Get data query results as data table |
| GET | /v1/Reporting/Custom/Schedules/{key}/Run/{filename} | Reporting/Custom | Used to download a scheduled generated custom report. |
| GET | /v1/Reporting/Custom/Schedules/New | Reporting/Custom | Returns a new schedule object |
| GET | /v1/Reporting/Custom/Schedules/ReportId/{key} | Reporting/Custom | Get custom report schedules by CustomReportId |
| GET | /v1/Reporting/Custom/Simple | Reporting/Custom | Gets a list of custom reports that the logged in user has access to. The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Reporting/Custom/Simple/{key} | Reporting/Custom | Gets the custom report that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/Custom/Simple/ConfirmGroup/{confirmGroupId} | Reporting/Custom | Gets a list of Custom Reports associated to the provided Confirm Group Id.  If the Confirm Group specified doesn't exist or isn't accessible to the logged in user an empty list will be returned. |
| GET | /v1/Reporting/Custom/Simple/DefaultQueryList | Reporting/Custom | Gets the default list of data queries that the logged in user has access to and/or set up for themself. The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Reporting/Custom/Simple/List | Reporting/Custom | Gets a simple list of custom reports that match one of the keys in the provided list. |
| GET | /v1/Reporting/Custom/Simple/Search | Reporting/Custom | Gets a simple list of custom reports that the logged in user has access to where the custom report name begins with the search string or Id is exact match. |
| GET | /v1/Reporting/Custom/Simple/Search/{search} | Reporting/Custom | Gets a simple list of custom reports that the logged in user has access to where the custom report name begins with the search string or Id is exact match. |
| GET | /v1/Reporting/Custom/UploadTargets | Reporting/Custom | Gets a list of data query upload targets that the logged in user has access to. |
| POST | /v1/Reporting/Custom/UploadTargets | Reporting/Custom | Create new data query upload target |
| GET | /v1/Reporting/Custom/UploadTargets/{key} | Reporting/Custom | Gets a list of data query upload targets that the logged in user has access to. |
| PUT | /v1/Reporting/Custom/UploadTargets/{key} | Reporting/Custom | Update data query upload target |
| GET | /v1/Reporting/Custom/UploadTargets/Simple | Reporting/Custom | Gets a simple list of data query upload targets that the logged in user has access to. |
| GET | /v1/Reporting/Custom/Verbose | Reporting/Custom |  |
| POST | /v1/Reporting/Custom/Verbose | Reporting/Custom | Creates a new custom report. |
| DELETE | /v1/Reporting/Custom/Verbose/{key} | Reporting/Custom | Deletes a custom report. |
| GET | /v1/Reporting/Custom/Verbose/{key} | Reporting/Custom |  |
| PUT | /v1/Reporting/Custom/Verbose/{key} | Reporting/Custom | Updates a custom report. |
| GET | /v1/Reporting/Custom/Verbose/New | Reporting/Custom |  |
| POST | /v1/Reporting/Custom/Verbose/Test | Reporting/Custom |  |
| GET | /v1/Reporting/Dashboards | Reporting/Dashboards |  |
| POST | /v1/Reporting/Dashboards | Reporting/Dashboards |  |
| DELETE | /v1/Reporting/Dashboards/{key} | Reporting/Dashboards |  |
| GET | /v1/Reporting/Dashboards/{key} | Reporting/Dashboards |  |
| PUT | /v1/Reporting/Dashboards/{key} | Reporting/Dashboards |  |
| GET | /v1/Reporting/Dashboards/DashboardSystemType/{dashboardSystemType} | Reporting/Dashboards |  |
| GET | /v1/Reporting/Dashboards/DashboardSystemType/{dashboardSystemType}/Edit | Reporting/Dashboards |  |
| GET | /v1/Reporting/Data/Cache | Reporting/Data |  |
| POST | /v1/Reporting/Data/Cache/Refresh | Reporting/Data |  |
| GET | /v1/Reporting/Deliver | Reporting/Deliver | Gets a list of Deliver templates that the logged in user has access to. |
| GET | /v1/Reporting/Deliver/{databaseName}/AdvisorEmail/{filepath} | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/{key} | Reporting/Deliver | Gets the Deliver template with the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/Deliver/{key}/Action/Download/{sentEmailId} | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/{key}/Action/Render/{entityId} | Reporting/Deliver |  |
| POST | /v1/Reporting/Deliver/{key}/Action/SendTestEmail/{entityId} | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Email/{blobId} | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Email/{dateSent}/ByDate | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Email/{emailId}/Sent | Reporting/Deliver | Get all emails that have been sent given an emailId |
| GET | /v1/Reporting/Deliver/Email/ByDate | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Email/Groups | Reporting/Deliver |  |
| POST | /v1/Reporting/Deliver/Email/Groups | Reporting/Deliver |  |
| DELETE | /v1/Reporting/Deliver/Email/Groups/{key} | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Email/Groups/{key} | Reporting/Deliver |  |
| PUT | /v1/Reporting/Deliver/Email/Groups/{key} | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Email/Groups/{key}/Selected | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Emails | Reporting/Deliver | Get all Deliver Sents |
| GET | /v1/Reporting/Deliver/Emails/{key} | Reporting/Deliver | Gets the Deliver Sent that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/Deliver/Emails/{key}/Action/Download/Html | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Emails/{key}/Action/Download/Pdf | Reporting/Deliver |  |
| POST | /v1/Reporting/Deliver/Emails/Action/Download | Reporting/Deliver | Used to set up a download request to get the stored deliver sent items specified. Returns a 201 Created response that includes a location header where the request can be completed. |
| GET | /v1/Reporting/Deliver/Emails/Action/Download/{sessionId} | Reporting/Deliver | Used to actually download the group of deliver sent items (as a zip file) that was requested using POST Action/Download. |
| POST | /v1/Reporting/Deliver/Emails/Action/Regenerate | Reporting/Deliver | Used to regenerate [successfully generated], [not generated], and [errored] emails. In all cases an email must not have been sent yet. |
| POST | /v1/Reporting/Deliver/Emails/Action/Resend | Reporting/Deliver | Used to resend any email that previosly failed when it attempted to send. |
| POST | /v1/Reporting/Deliver/Emails/Action/Reviewed | Reporting/Deliver | Used to update a set of emails in pending review status to either allow them to send or prevent them from sending. |
| POST | /v1/Reporting/Deliver/Emails/List | Reporting/Deliver | Returns a list of Deliver Sents that are found for the list of Id's posted in the message body. |
| POST | /v1/Reporting/Deliver/Emails/List/Id | Reporting/Deliver | Returns a list of Deliver Sents that are found for the list of Id's posted in the message body. |
| GET | /v1/Reporting/Deliver/Instances | Reporting/Deliver | Get all Deliver Templates |
| GET | /v1/Reporting/Deliver/Instances/{key} | Reporting/Deliver | Gets the Deliver Template that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/Deliver/Instances/{key}/Action/EmailPreview | Reporting/Deliver | Used to preview an email version of a report based on the selected Deliver instance |
| POST | /v1/Reporting/Deliver/Instances/{key}/Action/EmailTestSend | Reporting/Deliver | Used to send a test email of a report based on the selected Deliver instance |
| POST | /v1/Reporting/Deliver/Instances/List | Reporting/Deliver | Returns a list of Deliver Templates that are found for the list of Id's posted in the message body. |
| POST | /v1/Reporting/Deliver/Instances/List/Id | Reporting/Deliver | Returns a list of Deliver Templates that are found for the list of Id's posted in the message body. |
| GET | /v1/Reporting/Deliver/Instances/Verbose | Reporting/Deliver |  |
| POST | /v1/Reporting/Deliver/Instances/Verbose | Reporting/Deliver | Inserts a Deliver template. |
| DELETE | /v1/Reporting/Deliver/Instances/Verbose/{key} | Reporting/Deliver | Deletes an existing Deliver Instance |
| GET | /v1/Reporting/Deliver/Instances/Verbose/{key} | Reporting/Deliver |  |
| PUT | /v1/Reporting/Deliver/Instances/Verbose/{key} | Reporting/Deliver | Updates a Deliver template. |
| GET | /v1/Reporting/Deliver/Instances/Verbose/New | Reporting/Deliver | Returns a blank Deliver template. |
| GET | /v1/Reporting/Deliver/Sections | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Triggers | Reporting/Deliver | Get all Deliver Triggers |
| GET | /v1/Reporting/Deliver/Triggers/{key} | Reporting/Deliver | Gets the Deliver Trigger that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/Deliver/Triggers/Display | Reporting/Deliver | Get all Deliver Triggers. |
| POST | /v1/Reporting/Deliver/Triggers/List | Reporting/Deliver | Returns a list of Deliver Triggers that are found for the list of Id's posted in the message body. |
| POST | /v1/Reporting/Deliver/Triggers/List/Id | Reporting/Deliver | Returns a list of Deliver Triggers that are found for the list of Id's posted in the message body. |
| GET | /v1/Reporting/Deliver/Verbose | Reporting/Deliver |  |
| POST | /v1/Reporting/Deliver/Verbose | Reporting/Deliver | Creates a new Deliver template. |
| DELETE | /v1/Reporting/Deliver/Verbose/{key} | Reporting/Deliver |  |
| GET | /v1/Reporting/Deliver/Verbose/{key} | Reporting/Deliver |  |
| PUT | /v1/Reporting/Deliver/Verbose/{key} | Reporting/Deliver | Updates a Deliver template. |
| POST | /v1/Reporting/Element/FactSheets/Analytical/Rep/{orionRepId} | Reporting/Element |  |
| GET | /v1/Reporting/Element/FactSheets/Analytical/Rep/{orionRepId}/{modelAggId} | Reporting/Element |  |
| POST | /v1/Reporting/Element/FactSheets/Blended/{prospectId}/account/{accountId}/rep/{repId}/{isOatTenant} | Reporting/Element |  |
| GET | /v1/Reporting/Element/FactSheets/Cloud/Blended/{prospectId}/{accountId}/{fragmentGuid} | Reporting/Element |  |
| POST | /v1/Reporting/Element/FactSheets/Cloud/ModelAgg | Reporting/Element |  |
| GET | /v1/Reporting/Element/FactSheets/Cloud/ModelAgg/{modelAggId} | Reporting/Element |  |
| POST | /v1/Reporting/Element/Proposals | Reporting/Element |  |
| POST | /v1/Reporting/Element/Proposals/Cloud | Reporting/Element |  |
| POST | /v1/Reporting/Element/Proposals/Cloud/blob | Reporting/Element |  |
| GET | /v1/Reporting/Element/Proposals/Cloud/CustomIndex/{key} | Reporting/Element |  |
| GET | /v1/Reporting/Element/Proposals/Cloud/CustomIndex/{key}/blob | Reporting/Element |  |
| GET | /v1/Reporting/Element/Proposals/Cloud/Templates | Reporting/Element |  |
| GET | /v1/Reporting/Element/Proposals/Cloud/Themes | Reporting/Element |  |
| GET | /v1/Reporting/Element/Proposals/data/{newHouseholdId} | Reporting/Element |  |
| GET | /v1/Reporting/Element/Proposals/FlushCache | Reporting/Element |  |
| GET | /v1/Reporting/Element/Proposals/Fragments | Reporting/Element |  |
| GET | /v1/Reporting/Element/Proposals/PerformanceData | Reporting/Element |  |
| GET | /v1/Reporting/Element/Prospects | Reporting/Element |  |
| GET | /v1/Reporting/Element/Prospects/{id} | Reporting/Element |  |
| GET | /v1/Reporting/Element/Prospects/{id}/Accounts | Reporting/Element |  |
| GET | /v1/Reporting/Element/Prospects/{id}/CustomIndexing | Reporting/Element |  |
| GET | /v1/Reporting/Element/Prospects/Search | Reporting/Element |  |
| GET | /v1/Reporting/Element/Prospects/Search/{search} | Reporting/Element |  |
| GET | /v1/Reporting/Envision/CoverPages | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/CoverPages/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/CoverPages/Simple | Reporting/Envision | Gets a simple list of reports that the logged in user has access to. |
| GET | /v1/Reporting/Envision/CoverPages/Verbose | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/CoverPages/Verbose | Reporting/Envision |  |
| DELETE | /v1/Reporting/Envision/CoverPages/Verbose/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/CoverPages/Verbose/{key} | Reporting/Envision |  |
| PUT | /v1/Reporting/Envision/CoverPages/Verbose/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/CoverPages/Verbose/New | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/ExcelReports | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/ExcelReports/{key} | Reporting/Envision | Get excel report by Id |
| PUT | /v1/Reporting/Envision/ExcelReports/{key}/Favorite | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/ExcelReports/{key}/Generate | Reporting/Envision | Generate |
| POST | /v1/Reporting/Envision/ExcelReports/{key}/Generate/csv | Reporting/Envision | Used to generate a custom report csv with the provided parameters. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| POST | /v1/Reporting/Envision/ExcelReports/{key}/Generate/SlickGrid | Reporting/Envision | Generates the result of the custom report, using the parameters passed in. |
| GET | /v1/Reporting/Envision/ExcelReports/{key}/Generate/SlickGrid/{cacheKey} | Reporting/Envision | Retrieve the previously generated slick grid result. |
| POST | /v1/Reporting/Envision/ExcelReports/{key}/Generate/Table | Reporting/Envision | Generates the result of the custom report, using the parameters passed in. |
| POST | /v1/Reporting/Envision/ExcelReports/{key}/Generate/xlsx | Reporting/Envision | Used to generate a custom report xlsx with the provided parameters. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| GET | /v1/Reporting/Envision/ExcelReports/{key}/Parameters | Reporting/Envision | Gets the custom report that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/Envision/ExcelReports/{key}/Run/{filename} | Reporting/Envision | Used to download a previously generated custom report. |
| GET | /v1/Reporting/Envision/ExcelReports/Categories | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/ExcelReports/Simple | Reporting/Envision | Gets a simple list of excel reports that the logged in user has access to. |
| GET | /v1/Reporting/Envision/ExcelReports/Verbose | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/ExcelReports/Verbose | Reporting/Envision |  |
| DELETE | /v1/Reporting/Envision/ExcelReports/Verbose/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/ExcelReports/Verbose/{key} | Reporting/Envision |  |
| PUT | /v1/Reporting/Envision/ExcelReports/Verbose/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/ExcelReports/Verbose/New | Reporting/Envision | Creates a blank verbose report that will be used as a starting template to create a new excel report. |
| GET | /v1/Reporting/Envision/ExcelReportSchedules | Reporting/Envision | Get all excel report schedules |
| POST | /v1/Reporting/Envision/ExcelReportSchedules | Reporting/Envision | Create new schedule |
| DELETE | /v1/Reporting/Envision/ExcelReportSchedules/{key} | Reporting/Envision | Delete schedule |
| GET | /v1/Reporting/Envision/ExcelReportSchedules/{key} | Reporting/Envision | Get excel report schedule by key |
| PUT | /v1/Reporting/Envision/ExcelReportSchedules/{key} | Reporting/Envision | Update schedule |
| GET | /v1/Reporting/Envision/ExcelReportSchedules/{key}/Download/csv/{resultId} | Reporting/Envision | Get data query results as Csv |
| GET | /v1/Reporting/Envision/ExcelReportSchedules/{key}/Download/psv/{resultId} | Reporting/Envision | Get data query results as pipe-delimited |
| GET | /v1/Reporting/Envision/ExcelReportSchedules/{key}/Download/xls/{resultId} | Reporting/Envision | Get data query results as data Xls |
| GET | /v1/Reporting/Envision/ExcelReportSchedules/{key}/Download/xlsx/{resultId} | Reporting/Envision | Get data query results as Xlsx |
| GET | /v1/Reporting/Envision/ExcelReportSchedules/{key}/Generate/SlickGrid/{resultId} | Reporting/Envision | Get data query results as slick grid |
| GET | /v1/Reporting/Envision/ExcelReportSchedules/{key}/Generate/Table/{resultId} | Reporting/Envision | Get data query results as data table |
| GET | /v1/Reporting/Envision/ExcelReportSchedules/{key}/Run/{filename} | Reporting/Envision | Used to download a scheduled generated excel report. |
| GET | /v1/Reporting/Envision/ExcelReportSchedules/New | Reporting/Envision | Returns a new schedule object |
| GET | /v1/Reporting/Envision/Fragments | Reporting/Envision | List all report fragments accessible by current user |
| GET | /v1/Reporting/Envision/Fragments/{fragmentId} | Reporting/Envision | Get report fragment by Id |
| GET | /v1/Reporting/Envision/Fragments/Categories | Reporting/Envision | List all report fragment categories accessible by current user |
| GET | /v1/Reporting/Envision/Fragments/FragmentReportCount/{fragmentId} | Reporting/Envision | Get the count if subreport to parent reports |
| GET | /v1/Reporting/Envision/Fragments/Simple | Reporting/Envision | Gets a simple list of report fragments that the logged in user has access to. |
| GET | /v1/Reporting/Envision/Fragments/Verbose | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/Fragments/Verbose | Reporting/Envision | Create new report |
| PUT | /v1/Reporting/Envision/Fragments/Verbose | Reporting/Envision |  |
| DELETE | /v1/Reporting/Envision/Fragments/Verbose/{fragmentId} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Fragments/Verbose/{fragmentId} | Reporting/Envision |  |
| PUT | /v1/Reporting/Envision/Fragments/Verbose/{fragmentId} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Fragments/Verbose/Edit/{fragmentId} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Fragments/Verbose/Edit/New | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Fragments/Verbose/New | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/GroupingOptions | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/PlaceholderHeirarchy | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/PlaceholderHeirarchy/Action/Format | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/PlaceholderHeirarchy/Action/Format/List | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/ReportImages | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/ReportImages | Reporting/Envision | Create new Report Image |
| DELETE | /v1/Reporting/Envision/ReportImages/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/ReportImages/{key} | Reporting/Envision |  |
| PUT | /v1/Reporting/Envision/ReportImages/{key} | Reporting/Envision | Update Report Image |
| POST | /v1/Reporting/Envision/ReportImages/{key}/Action/Upload | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/ReportPdfs | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/ReportPdfs | Reporting/Envision | Create new Report Pdf |
| DELETE | /v1/Reporting/Envision/ReportPdfs/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/ReportPdfs/{key} | Reporting/Envision |  |
| PUT | /v1/Reporting/Envision/ReportPdfs/{key} | Reporting/Envision | Update Report Pdf |
| POST | /v1/Reporting/Envision/ReportPdfs/{key}/Action/Upload | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports | Reporting/Envision | List all reports accessible by current user |
| PUT | /v1/Reporting/Envision/Reports/{key}/Favorite | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/{key}/History | Reporting/Envision | Gets the list of history for this given report |
| GET | /v1/Reporting/Envision/Reports/{key}/History/{historyId} | Reporting/Envision | Gets the point in time for the given report and the provided historyId |
| GET | /v1/Reporting/Envision/Reports/{reportId} | Reporting/Envision | Get report by Id |
| POST | /v1/Reporting/Envision/Reports/{reportId}/Generate | Reporting/Envision | Generate |
| GET | /v1/Reporting/Envision/Reports/{reportId}/Generate/{sessionId} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/{reportId}/Generate/{sessionId}/Html | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/{reportId}/Generate/{sessionId}/Json | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/{reportId}/Generate/{sessionId}/Pdf | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/{reportId}/HasThumbnail | Reporting/Envision |  |
| DELETE | /v1/Reporting/Envision/Reports/{reportId}/Thumbnail | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/{reportId}/Thumbnail | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/Reports/{reportId}/Thumbnail/Upload | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/Categories | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/Reports/GetReportVersionAssignment/{entity}/{reportGuid} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/Recent | Reporting/Envision | Returns the reports the user has run over the last 30 days ordered by how often each was run. |
| GET | /v1/Reporting/Envision/Reports/Settings | Reporting/Envision |  |
| DELETE | /v1/Reporting/Envision/Reports/Settings/{optionGuid} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/Settings/CheckDuplicates/Batch/{workerCount} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/Settings/CheckDuplicates/Single | Reporting/Envision |  |
| PUT | /v1/Reporting/Envision/Reports/Settings/Defaults | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/Reports/Settings/Option | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/Reports/Settings/Options/{typeOption} | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/Reports/Settings/UpdateSpecificReportsGlobalOptionGuids | Reporting/Envision | This method can be removed after it is run in production |
| POST | /v1/Reporting/Envision/Reports/Settings/UpdateSpecificSubReportsGlobalOptionGuids | Reporting/Envision | This method can be removed after it is run in production |
| POST | /v1/Reporting/Envision/Reports/Settings/Validate/{typeOption} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/Simple | Reporting/Envision | Gets a simple list of reports that the logged in user has access to. |
| GET | /v1/Reporting/Envision/Reports/Validate | Reporting/Envision | Goes through all the reports and checks for any errors. |
| GET | /v1/Reporting/Envision/Reports/Verbose | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/Reports/Verbose | Reporting/Envision | Create new report |
| PUT | /v1/Reporting/Envision/Reports/Verbose | Reporting/Envision |  |
| DELETE | /v1/Reporting/Envision/Reports/Verbose/{reportId} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/Verbose/{reportId} | Reporting/Envision |  |
| PUT | /v1/Reporting/Envision/Reports/Verbose/{reportId} | Reporting/Envision |  |
| PUT | /v1/Reporting/Envision/Reports/Verbose/Action/RestoreReport/{reportId} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Reports/Verbose/New | Reporting/Envision | Gets a blank verbose report that will be used as a starting template to create a new report. |
| GET | /v1/Reporting/Envision/Themes | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/{key}/Css | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/Default | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/Render/Css | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/Selection | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/Standard/Css | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/Themes/ValidateImport | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/ValidateImport/Template | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/Verbose | Reporting/Envision |  |
| POST | /v1/Reporting/Envision/Themes/Verbose | Reporting/Envision |  |
| DELETE | /v1/Reporting/Envision/Themes/Verbose/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/Verbose/{key} | Reporting/Envision |  |
| PUT | /v1/Reporting/Envision/Themes/Verbose/{key} | Reporting/Envision |  |
| GET | /v1/Reporting/Envision/Themes/Verbose/New | Reporting/Envision |  |
| GET | /v1/Reporting/Extracts/PerformanceData | Reporting/Extracts |  |
| GET | /v1/Reporting/Extracts/UnrealizedTaxLots | Reporting/Extracts |  |
| POST | /v1/Reporting/Extracts/UnrealizedTaxLots/List/AccountId | Reporting/Extracts |  |
| POST | /v1/Reporting/Extracts/UnrealizedTaxLots/List/AssetId | Reporting/Extracts |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund | Reporting/FundPerformance |  |
| POST | /v1/Reporting/FundPerformance/GeminiFund | Reporting/FundPerformance |  |
| DELETE | /v1/Reporting/FundPerformance/GeminiFund/{key} | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/{key} | Reporting/FundPerformance | Gets the fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/{key} | Reporting/FundPerformance |  |
| POST | /v1/Reporting/FundPerformance/GeminiFund/BackLoad | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/BackLoad/{key}/{forYear}/{effectiveDate} | Reporting/FundPerformance | Gets the fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/BackLoad/{key}/{forYear}/{effectiveDate} | Reporting/FundPerformance |  |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/BackLoad/Action/Delete | Reporting/FundPerformance | Deletes every gemini fund backload provided in the list of ids. |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Data | Reporting/FundPerformance | Gets the fund data that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/FundPerformance/GeminiFund/Data | Reporting/FundPerformance |  |
| DELETE | /v1/Reporting/FundPerformance/GeminiFund/Data/{key}/{rateDate} | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Data/{key}/{rateDate} | Reporting/FundPerformance | Gets the fund data that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/Data/{key}/{rateDate} | Reporting/FundPerformance |  |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/Data/Action/Delete | Reporting/FundPerformance | Deletes every gemini fund data provided in the list of ids. |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Div | Reporting/FundPerformance | Gets the fund div that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/FundPerformance/GeminiFund/Div | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Div/{key}/{divYear} | Reporting/FundPerformance | Gets the fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/Div/{key}/{divYear} | Reporting/FundPerformance |  |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/Div/Action/Delete | Reporting/FundPerformance | Deletes every fund backload provided in the list of ids. |
| GET | /v1/Reporting/FundPerformance/GeminiFund/DivDetail | Reporting/FundPerformance | Gets the fund data that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/FundPerformance/GeminiFund/DivDetail | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/DivDetail/{key}/{rateDate} | Reporting/FundPerformance | Gets the fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/DivDetail/{key}/{rateDate} | Reporting/FundPerformance |  |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/DivDetail/Action/Delete | Reporting/FundPerformance | Deletes every gemini fund backload provided in the list of ids. |
| POST | /v1/Reporting/FundPerformance/GeminiFund/FrontLoad | Reporting/FundPerformance | Create new front load record. |
| GET | /v1/Reporting/FundPerformance/GeminiFund/FrontLoad/{key}/{effectiveDate}/{starting} | Reporting/FundPerformance | Gets the fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/FrontLoad/{key}/{effectiveDate}/{starting} | Reporting/FundPerformance | Update the front load record that has the provided key. |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/FrontLoad/Action/Delete | Reporting/FundPerformance | Deletes front load records provided the list of keys. |
| POST | /v1/Reporting/FundPerformance/GeminiFund/GeminiImport | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Inception/{key} | Reporting/FundPerformance | Get the inception date of fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/FundPerformance/GeminiFund/Index | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Index/{key} | Reporting/FundPerformance | Gets the index that has the provided key.  If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Index/{key}/Links | Reporting/FundPerformance | Gets the fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Index/Simple/Search | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Index/Simple/Search/{search} | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/IndexLink | Reporting/FundPerformance | Gets the fund div that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/FundPerformance/GeminiFund/IndexLink | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/IndexLink/{key}/{indexNumber} | Reporting/FundPerformance | Gets the fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/IndexLink/{key}/{indexNumber} | Reporting/FundPerformance |  |
| PUT | /v1/Reporting/FundPerformance/GeminiFund/IndexLink/Action/Delete | Reporting/FundPerformance | Deletes every fund backload provided in the list of ids. |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Loads | Reporting/FundPerformance | Gets the fund data that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/FundPerformance/GeminiFund/Performance | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Simple | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Simple/Search | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/Simple/Search/{search} | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFund/StartPrice/{key} | Reporting/FundPerformance | Get the start date price of fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/FundPerformance/GeminiFundCalendar | Reporting/FundPerformance | Get the list of calendar dates. |
| GET | /v1/Reporting/FundPerformance/GeminiFundCalendar/{key} | Reporting/FundPerformance | Gets the fund data that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFundCalendar/{key} | Reporting/FundPerformance |  |
| POST | /v1/Reporting/FundPerformance/GeminiFundCalendar/Add | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFundGroup | Reporting/FundPerformance | Gets the fund that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Reporting/FundPerformance/GeminiFundGroup | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFundGroup/{key} | Reporting/FundPerformance | Gets the fund data that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFundGroup/{key} | Reporting/FundPerformance |  |
| PUT | /v1/Reporting/FundPerformance/GeminiFundGroup/Action/Delete | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFundGroup/GetByGroupName | Reporting/FundPerformance | Gets the fund data that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/FundPerformance/GeminiFundGroup/Simple/{fundKey} | Reporting/FundPerformance | Gets the fund groups. |
| GET | /v1/Reporting/FundPerformance/GeminiFundTax | Reporting/FundPerformance |  |
| POST | /v1/Reporting/FundPerformance/GeminiFundTax | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/GeminiFundTax/{key} | Reporting/FundPerformance | Gets the tax data that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/FundPerformance/GeminiFundTax/{key} | Reporting/FundPerformance | Update Tax information. |
| PUT | /v1/Reporting/FundPerformance/GeminiFundTax/Action/Delete | Reporting/FundPerformance |  |
| GET | /v1/Reporting/FundPerformance/Reports/YardstickAllPerf | Reporting/FundPerformance | Returns the results of spimGeminiFundPerfAllInd  report. |
| GET | /v1/Reporting/FundPerformance/Reports/YardstickHypothetical | Reporting/FundPerformance | Returns the results of pimGeminiFundPerfHypothetical  report. |
| GET | /v1/Reporting/Fuse/Notifications | Reporting/Fuse |  |
| GET | /v1/Reporting/Fuse/Notifications/{notificationId} | Reporting/Fuse |  |
| GET | /v1/Reporting/Fuse/Notifications/Subscriptions | Reporting/Fuse |  |
| PUT | /v1/Reporting/Fuse/Notifications/Subscriptions | Reporting/Fuse |  |
| GET | /v1/Reporting/Fuse/Notifications/SummaryCount | Reporting/Fuse |  |
| POST | /v1/Reporting/GainLoss/Realized/DrillDownSummary | Reporting/GainLoss | Returns gain loss information for each asset in the requested entity / entityid |
| POST | /v1/Reporting/GainLoss/Unrealized/DrillDownSummary | Reporting/GainLoss | Returns gain loss information for each asset in the requested entity / entityid |
| GET | /v1/Reporting/Implementation | Reporting/Implementation |  |
| PUT | /v1/Reporting/Implementation/{key} | Reporting/Implementation |  |
| POST | /v1/Reporting/Implementation/GenerateNew | Reporting/Implementation | Generate a new dashboard |
| GET | /v1/Reporting/InterfaceSetup | Reporting/InterfaceSetup |  |
| GET | /v1/Reporting/InterfaceSetup/{key}/DashboardNewsletter | Reporting/InterfaceSetup |  |
| POST | /v1/Reporting/InterfaceSetup/{key}/DashboardNewsletter | Reporting/InterfaceSetup |  |
| GET | /v1/Reporting/InterfaceSetup/{qpeItemId} | Reporting/InterfaceSetup |  |
| GET | /v1/Reporting/InterfaceSetup/{qpeItemId}/Dashboard | Reporting/InterfaceSetup |  |
| GET | /v1/Reporting/InterfaceSetup/{qpeItemId}/DrillDown | Reporting/InterfaceSetup |  |
| GET | /v1/Reporting/NotificationGroups | Reporting/NotificationGroups |  |
| POST | /v1/Reporting/NotificationGroups | Reporting/NotificationGroups |  |
| DELETE | /v1/Reporting/NotificationGroups/{key} | Reporting/NotificationGroups | Used to delete an existing notification group. Upon successful deletion a 204 will be returned. |
| GET | /v1/Reporting/NotificationGroups/{key} | Reporting/NotificationGroups |  |
| PUT | /v1/Reporting/NotificationGroups/{key} | Reporting/NotificationGroups |  |
| GET | /v1/Reporting/NotificationGroups/AvailableUsers | Reporting/NotificationGroups | Returns a list of user profiles for the specified UserType that the currently logged in user is allowed to setup notifications for. |
| GET | /v1/Reporting/NotificationGroups/Simple | Reporting/NotificationGroups | Gets a simple list of notification groups that the logged in user has access to. |
| GET | /v1/Reporting/NotificationGroups/UserTypes | Reporting/NotificationGroups | Returns User Types that the currently logged in user is allowed to setup notification groups for. |
| GET | /v1/Reporting/Notifications | Reporting/Notifications |  |
| GET | /v1/Reporting/Notifications/{key} | Reporting/Notifications | Gets the notification that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/Notifications/Action/UpdateState | Reporting/Notifications |  |
| GET | /v1/Reporting/Notifications/Destinations | Reporting/Notifications | Get all notification destinations by notification type |
| GET | /v1/Reporting/Notifications/SubscriptionWithDestination | Reporting/Notifications | Get all notification subscriptions |
| POST | /v1/Reporting/Notifications/SubscriptionWithDestination | Reporting/Notifications | Create new notification subscription |
| DELETE | /v1/Reporting/Notifications/SubscriptionWithDestination/{key} | Reporting/Notifications | Delete notification subscription |
| GET | /v1/Reporting/Notifications/SubscriptionWithDestination/{key} | Reporting/Notifications | Get notification subscription by key |
| PUT | /v1/Reporting/Notifications/SubscriptionWithDestination/{key} | Reporting/Notifications | Update notification subscription |
| GET | /v1/Reporting/Notifications/SubscriptionWithDestination/NotificationSubscriptions | Reporting/Notifications | Flattens notification type and destinations to easily assign enabled notifications by destionation. |
| PUT | /v1/Reporting/Notifications/SubscriptionWithDestination/NotificationSubscriptions | Reporting/Notifications |  |
| GET | /v1/Reporting/Notifications/SummaryCount | Reporting/Notifications |  |
| GET | /v1/Reporting/NotificationTypes/Simple | Reporting/NotificationTypes | Gets a simple list of notification types that the logged in user has access to. |
| POST | /v1/Reporting/Performance/Action/UpdateAstroTaxData | Reporting/Performance |  |
| POST | /v1/Reporting/Performance/Action/UpdateAstroTaxData/All | Reporting/Performance |  |
| POST | /v1/Reporting/Performance/DrillDownSummary | Reporting/Performance | Used to return a drill down summary of performance. Has the ability to return performance heirarchically as desired. The return will include one benchmark for comparison. |
| POST | /v1/Reporting/Performance/DrillDownSummary/ActiveFilters | Reporting/Performance |  |
| POST | /v1/Reporting/Performance/Overview | Reporting/Performance | Returns Overview Performance.  Overview performance is "stored" performance.  It is updated once per day with pre-defined periods and settings. |
| POST | /v1/Reporting/Performance/ProductStatistics/Run | Reporting/Performance |  |
| GET | /v1/Reporting/Performance/Run/{filename} | Reporting/Performance | Used to download a previously generated Performance Export. |
| POST | /v1/Reporting/Performance/Verbose | Reporting/Performance | Used to verbosely return performance. Has the ability to return performance grouped as desired, benchmark performance, and statistical data for the groups over a number of date ranges. |
| POST | /v1/Reporting/Performance/Verbose/Export/xls | Reporting/Performance |  |
| POST | /v1/Reporting/Performance/Verbose/Export/xlsx | Reporting/Performance |  |
| POST | /v1/Reporting/PortalProtoType/Activity | Reporting/PortalProtoType |  |
| GET | /v1/Reporting/PortalProtoType/Allocation | Reporting/PortalProtoType | Get a List of Assets with properties that can be used to show allocation by groupings. |
| GET | /v1/Reporting/PortalProtoType/Client/{clientId}/NetAmountInvested | Reporting/PortalProtoType |  |
| GET | /v1/Reporting/PortalProtoType/DisplayNames | Reporting/PortalProtoType | Get a List of Display Names for all accounts under the given household ID. |
| GET | /v1/Reporting/PortalTask | Reporting/PortalTask |  |
| POST | /v1/Reporting/PortalTask | Reporting/PortalTask |  |
| PUT | /v1/Reporting/PortalTask | Reporting/PortalTask |  |
| DELETE | /v1/Reporting/PortalTask/{key} | Reporting/PortalTask |  |
| GET | /v1/Reporting/PortalTask/{key} | Reporting/PortalTask | Gets the portal task with the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/PortalTask/{key} | Reporting/PortalTask |  |
| POST | /v1/Reporting/PortalTask/EStatementEmail | Reporting/PortalTask |  |
| GET | /v1/Reporting/PortalTask/Simple | Reporting/PortalTask | Gets a simple list of portal tasks that the logged in user has access to. |
| POST | /v1/Reporting/Preview | Reporting/Preview |  |
| GET | /v1/Reporting/Preview/Calculate/InceptionDate/{entity}/{entityId} | Reporting/Preview |  |
| GET | /v1/Reporting/ProcessManager/ActionTypes | Reporting/ProcessManager |  |
| GET | /v1/Reporting/ProcessManager/Dashboard | Reporting/ProcessManager |  |
| POST | /v1/Reporting/ProcessManager/Dashboard | Reporting/ProcessManager |  |
| DELETE | /v1/Reporting/ProcessManager/Dashboard/{key} | Reporting/ProcessManager |  |
| GET | /v1/Reporting/ProcessManager/Dashboard/{key} | Reporting/ProcessManager |  |
| PUT | /v1/Reporting/ProcessManager/Dashboard/{key} | Reporting/ProcessManager |  |
| PUT | /v1/Reporting/ProcessManager/Dashboard/{key}/Action/Lockdown | Reporting/ProcessManager |  |
| PUT | /v1/Reporting/ProcessManager/Dashboard/{key}/WorkflowAction/{workflowActionId}/Action/SignOff | Reporting/ProcessManager |  |
| PUT | /v1/Reporting/ProcessManager/Dashboard/{key}/WorkflowAction/{workflowActionId}/Action/SignOff/Lock | Reporting/ProcessManager |  |
| PUT | /v1/Reporting/ProcessManager/Dashboard/{key}/WorkflowAction/{workflowActionId}/Action/SignOff/Revoke | Reporting/ProcessManager |  |
| GET | /v1/Reporting/ProcessManager/Dashboard/tasks | Reporting/ProcessManager |  |
| GET | /v1/Reporting/ProcessManager/Phases | Reporting/ProcessManager |  |
| GET | /v1/Reporting/ProcessManager/Types | Reporting/ProcessManager |  |
| GET | /v1/Reporting/ProcessManager/Workflows | Reporting/ProcessManager |  |
| GET | /v1/Reporting/Proto/Controls | Reporting/Proto |  |
| GET | /v1/Reporting/Qpe | Reporting/Qpe |  |
| GET | /v1/Reporting/Qpe/{key}/DashboardNewsletter | Reporting/Qpe |  |
| POST | /v1/Reporting/Qpe/{key}/DashboardNewsletter | Reporting/Qpe |  |
| GET | /v1/Reporting/Qpe/{qpeItemId} | Reporting/Qpe |  |
| GET | /v1/Reporting/Qpe/{qpeItemId}/Dashboard | Reporting/Qpe |  |
| GET | /v1/Reporting/Qpe/{qpeItemId}/DrillDown | Reporting/Qpe |  |
| GET | /v1/Reporting/ReportGroups | Reporting/ReportGroups | List all report groups accessible by current user |
| POST | /v1/Reporting/ReportGroups | Reporting/ReportGroups | Insert a report group |
| DELETE | /v1/Reporting/ReportGroups/{reportGroupId} | Reporting/ReportGroups | Delete a report group |
| GET | /v1/Reporting/ReportGroups/{reportGroupId} | Reporting/ReportGroups | Get report group info by Id |
| PUT | /v1/Reporting/ReportGroups/{reportGroupId} | Reporting/ReportGroups | Update report group |
| GET | /v1/Reporting/ReportGroups/Simple | Reporting/ReportGroups | Gets a simple list of report groups that the logged in user has access to. |
| GET | /v1/Reporting/ReportInbox | Reporting/ReportInbox | Gets a list of report inboxs that the logged in user has access to. |
| DELETE | /v1/Reporting/ReportInbox/{key} | Reporting/ReportInbox |  |
| GET | /v1/Reporting/ReportInbox/{key} | Reporting/ReportInbox | Gets the report inbox with the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Reporting/ReportInbox/{key}/Download | Reporting/ReportInbox | Used to download a file from report inbox. |
| GET | /v1/Reporting/ReportPackages | Reporting/ReportPackages |  |
| GET | /v1/Reporting/ReportPackages/{reportPackageId} | Reporting/ReportPackages |  |
| PUT | /v1/Reporting/ReportPackages/{reportPackageId}/Favorite | Reporting/ReportPackages |  |
| POST | /v1/Reporting/ReportPackages/run | Reporting/ReportPackages |  |
| GET | /v1/Reporting/ReportPackages/run/{downloadId} | Reporting/ReportPackages |  |
| GET | /v1/Reporting/ReportPackages/Verbose | Reporting/ReportPackages |  |
| POST | /v1/Reporting/ReportPackages/Verbose | Reporting/ReportPackages |  |
| DELETE | /v1/Reporting/ReportPackages/Verbose/{key} | Reporting/ReportPackages |  |
| GET | /v1/Reporting/ReportPackages/Verbose/{key} | Reporting/ReportPackages |  |
| PUT | /v1/Reporting/ReportPackages/Verbose/{key} | Reporting/ReportPackages |  |
| GET | /v1/Reporting/ReportPackages/Verbose/{key}/ReportReferenceReportPackage | Reporting/ReportPackages |  |
| GET | /v1/Reporting/Reports | Reporting/Reports |  |
| POST | /v1/Reporting/Reports/{key}/Calculate/InceptionDate | Reporting/Reports | Used to calculate the appropriate inception date for the provided report. The unstorable parameters "EntityEnum" and  "pkEntity" must be provided. Together they dictate the entity that the defaults are being saved for. The successful return  will be 201 Created with the location set to the url of the newly generated file. |
| POST | /v1/Reporting/Reports/{key}/Generate | Reporting/Reports | Used to generate a report pdf with the provided report parameters. The successful return will be 201 Created  with the location set to the url of the newly generated file. When the Entities array is populated this will generate one report per entity in that array. |
| GET | /v1/Reporting/Reports/{key}/Generate/{session}/Status | Reporting/Reports | Used to get the status of a previously requested report generation. |
| POST | /v1/Reporting/Reports/{key}/Parameters/EntityDefaults | Reporting/Reports | Used to save the entity level default parameters for a the provided report. The unstorable parameters "EntityEnum" and  "pkEntity" must be provided. Together they dictate the entity that the defaults are being saved for. The successful return  will be 201 Created with the location set to the url of the newly generated file. |
| PUT | /v1/Reporting/Reports/{key}/Parameters/EntityDefaults | Reporting/Reports | Used to save the entity level default parameters for a the provided report. The unstorable parameters "EntityEnum" and  "pkEntity" must be provided. Together they dictate the entity that the defaults are being saved for. The successful return  will be 201 Created with the location set to the url of the newly generated file. |
| POST | /v1/Reporting/Reports/{key}/Parameters/EntityDefaults/Delete/{entity}/{entityId} | Reporting/Reports | Used to delete the entity level default parameters for a the provided report. The successful return will be 204 No Content. |
| POST | /v1/Reporting/Reports/{key}/Parameters/ReportDefaults | Reporting/Reports | Used to save the report level default parameters for a the provided report. The successful return will be 201 Created. |
| PUT | /v1/Reporting/Reports/{key}/Parameters/ReportDefaults | Reporting/Reports | Used to save the report level default parameters for a the provided report. The successful return will be 201 Created. |
| POST | /v1/Reporting/Reports/{key}/Parameters/ReportDefaults/Delete | Reporting/Reports | Used to delete the report level default parameters for a the provided report. The successful return will be 204 No Content. |
| POST | /v1/Reporting/Reports/{key}/Parameters/UserDefaults | Reporting/Reports | Used to save the user level default parameters for a the provided report. The successful return will be 201 Created. |
| PUT | /v1/Reporting/Reports/{key}/Parameters/UserDefaults | Reporting/Reports | Used to save the user level default parameters for a the provided report. The successful return will be 201 Created. |
| POST | /v1/Reporting/Reports/{key}/Parameters/UserDefaults/Delete | Reporting/Reports | Used to delete the user level default parameters for a the provided report. The successful return will be 204 No Content. |
| GET | /v1/Reporting/Reports/{reportId} | Reporting/Reports | Gets a dictionary of all the parameters used in all sections that the logged in user has access to. The dictionary key is the section key. The dictionary value is a list of parameters for the section. |
| POST | /v1/Reporting/Reports/{reportId} | Reporting/Reports | Fills in the storable paramaters (if any) for the provided report that has the entity filled in. |
| PUT | /v1/Reporting/Reports/{reportId} | Reporting/Reports | Fills in the storable paramaters (if any) for the provided report that has the entity filled in. |
| POST | /v1/Reporting/Reports/{reportId}/Calculate/InceptionDate | Reporting/Reports | Used to calculate the appropriate inception date for the provided report. The unstorable parameters "EntityEnum" and  "pkEntity" must be provided. Together they dictate the entity that the defaults are being saved for. The successful return  will be 201 Created with the location set to the url of the newly generated file. |
| POST | /v1/Reporting/Reports/{reportId}/Generate | Reporting/Reports | Used to generate a report pdf with the provided report parameters. The successful return will be 201 Created  with the location set to the url of the newly generated file. When the Entities array is populated this will generate one report per entity in that array. |
| GET | /v1/Reporting/Reports/{reportId}/Parameters | Reporting/Reports | Gets a dictionary of all the parameters used in all sections that the logged in user has access to. The dictionary key is the section key. The dictionary value is a list of parameters for the section. |
| POST | /v1/Reporting/Reports/{reportId}/Parameters | Reporting/Reports | Fills in the storable paramaters (if any) for the provided report that has the entity filled in. |
| PUT | /v1/Reporting/Reports/{reportId}/Parameters | Reporting/Reports | Fills in the storable paramaters (if any) for the provided report that has the entity filled in. |
| GET | /v1/Reporting/Reports/{reportId}/Parameters/{parentParameterName}/{parentParameterValue}/ChildOptions | Reporting/Reports | For a given parent parameter/value, it returns options fo rthe child parameter.  This is used for a pair of report paramaters that have a parent - child relationship.  Where when the user chooses a parent, the child combo needs to be reloaded. |
| POST | /v1/Reporting/Reports/{reportId}/ReportInboxes | Reporting/Reports | Gets a list of the valid report inbox options. |
| PUT | /v1/Reporting/Reports/{reportId}/ReportInboxes | Reporting/Reports | Gets a list of the valid report inbox options. |
| GET | /v1/Reporting/Reports/{reportId}/Run/{fileGuid} | Reporting/Reports | Used to download a previously generated report pdf. |
| HEAD | /v1/Reporting/Reports/{reportId}/Run/{fileGuid} | Reporting/Reports | Used to download a previously generated report pdf. |
| GET | /v1/Reporting/Reports/Code/{code} | Reporting/Reports | Gets a dictionary of all the parameters used in all sections that the logged in user has access to. The dictionary key is the section key. The dictionary value is a list of parameters for the section. |
| GET | /v1/Reporting/Reports/Simple/Search | Reporting/Reports |  |
| GET | /v1/Reporting/Reports/Simple/Search/{search} | Reporting/Reports |  |
| GET | /v1/Reporting/ReportTemplates | Reporting/ReportTemplates |  |
| GET | /v1/Reporting/ReportTemplates/{reportTemplateId} | Reporting/ReportTemplates |  |
| PUT | /v1/Reporting/ReportTemplates/{reportTemplateId}/Favorite | Reporting/ReportTemplates |  |
| GET | /v1/Reporting/ReportTemplates/{reportTemplateId}/HasThumbnail | Reporting/ReportTemplates |  |
| GET | /v1/Reporting/ReportTemplates/{reportTemplateId}/Outline | Reporting/ReportTemplates |  |
| DELETE | /v1/Reporting/ReportTemplates/{reportTemplateId}/Thumbnail | Reporting/ReportTemplates |  |
| GET | /v1/Reporting/ReportTemplates/{reportTemplateId}/Thumbnail | Reporting/ReportTemplates |  |
| POST | /v1/Reporting/ReportTemplates/{reportTemplateId}/Thumbnail/Upload | Reporting/ReportTemplates |  |
| GET | /v1/Reporting/ReportTemplates/Categories | Reporting/ReportTemplates |  |
| GET | /v1/Reporting/ReportTemplates/Verbose | Reporting/ReportTemplates |  |
| POST | /v1/Reporting/ReportTemplates/Verbose | Reporting/ReportTemplates |  |
| DELETE | /v1/Reporting/ReportTemplates/Verbose/{key} | Reporting/ReportTemplates |  |
| GET | /v1/Reporting/ReportTemplates/Verbose/{key} | Reporting/ReportTemplates |  |
| PUT | /v1/Reporting/ReportTemplates/Verbose/{key} | Reporting/ReportTemplates |  |
| POST | /v1/Reporting/ReportTemplates/Verbose/{key}/Actions/Clone | Reporting/ReportTemplates |  |
| GET | /v1/Reporting/ReportTemplates/Verbose/New | Reporting/ReportTemplates |  |
| GET | /v1/Reporting/RequiredMinimumDistribution/Accounts | Reporting/RequiredMinimumDistribution |  |
| PUT | /v1/Reporting/RequiredMinimumDistribution/Accounts/{accountId}/notes | Reporting/RequiredMinimumDistribution |  |
| PUT | /v1/Reporting/RequiredMinimumDistribution/Accounts/{accountId}/satisfied/{isSatisfied} | Reporting/RequiredMinimumDistribution |  |
| PUT | /v1/Reporting/RequiredMinimumDistribution/Accounts/{accountId}/YearEnd | Reporting/RequiredMinimumDistribution |  |
| GET | /v1/Reporting/RequiredMinimumDistribution/Accounts/Custom | Reporting/RequiredMinimumDistribution |  |
| POST | /v1/Reporting/RequiredMinimumDistribution/Action/RunSchwabRmd | Reporting/RequiredMinimumDistribution |  |
| POST | /v1/Reporting/RequiredMinimumDistribution/Calculate | Reporting/RequiredMinimumDistribution |  |
| POST | /v1/Reporting/RequiredMinimumDistribution/CalculateAccountsSave | Reporting/RequiredMinimumDistribution |  |
| POST | /v1/Reporting/RequiredMinimumDistribution/CalculateRegistrationsSave | Reporting/RequiredMinimumDistribution |  |
| GET | /v1/Reporting/RequiredMinimumDistribution/Registrations | Reporting/RequiredMinimumDistribution |  |
| PUT | /v1/Reporting/RequiredMinimumDistribution/Registrations/{registrationId}/notes | Reporting/RequiredMinimumDistribution |  |
| PUT | /v1/Reporting/RequiredMinimumDistribution/Registrations/{registrationId}/satisfied/{isSatisfied} | Reporting/RequiredMinimumDistribution |  |
| GET | /v1/Reporting/RequiredMinimumDistribution/RmdCalculationCounts | Reporting/RequiredMinimumDistribution |  |
| POST | /v1/Reporting/Scope | Reporting/Scope | Used to create a reporting scope |
| GET | /v1/Reporting/ScrubSchedules | Reporting/ScrubSchedules | Gets a list of scrub schedule that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Reporting/ScrubSchedules | Reporting/ScrubSchedules | Used to create a new scrub schedule. Upon successful creation a 201 will be returned with the location of the nearly created scrub schedule. |
| DELETE | /v1/Reporting/ScrubSchedules/{key} | Reporting/ScrubSchedules | Used to delete an existing Scrub Schedule. Upon successful deletion a 204 will be returned. |
| GET | /v1/Reporting/ScrubSchedules/{key} | Reporting/ScrubSchedules | Gets the scrub schedule that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Reporting/ScrubSchedules/{key} | Reporting/ScrubSchedules | Used to update an existing Scrub Schedule. Upon successful modification a 200 will be returned. |
| GET | /v1/Reporting/ScrubSchedules/Simple | Reporting/ScrubSchedules | Gets a simple list of scrub schedule that the logged in user has access to. |
| POST | /v1/Reporting/StaticFiles | Reporting/StaticFiles |  |
| GET | /v1/Reporting/StaticFiles/{fileType} | Reporting/StaticFiles | Gets a list of specific static documents. |
| POST | /v1/Reporting/StaticFiles/{fileType} | Reporting/StaticFiles | Adds a new advisor file. |
| DELETE | /v1/Reporting/StaticFiles/{fileType}/{fileId} | Reporting/StaticFiles | Deletes the specific file with the blobId provided which is an advisor file. |
| GET | /v1/Reporting/StaticFiles/{fileType}/{fileId} | Reporting/StaticFiles | Gets the raw data of the specific file with the blobId provided which is an advisor file. |
| GET | /v1/Reporting/StaticFiles/{key} | Reporting/StaticFiles |  |
| GET | /v1/Reporting/VideoStatements | Reporting/VideoStatements |  |
| POST | /v1/Reporting/VideoStatements | Reporting/VideoStatements |  |
| GET | /v1/Reporting/VideoStatements/{videoStatementId} | Reporting/VideoStatements |  |
| PUT | /v1/Reporting/VideoStatements/{videoStatementId} | Reporting/VideoStatements |  |
| GET | /v1/Reporting/VideoStatements/{videoStatementId}/Clients | Reporting/VideoStatements |  |
| GET | /v1/Reporting/VideoStatements/{videoStatementId}/Clients/{clientId} | Reporting/VideoStatements |  |
| GET | /v1/Reporting/VideoStatements/{videoStatementId}/Video | Reporting/VideoStatements | This is a redirect endpoint that would auto-redirect users to the videostatements endpoint and log the api call |
| GET | /v1/Reporting/VideoStatements/Mock/{entityId} | Reporting/VideoStatements |  |
| GET | /v1/Reporting/Widgets | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/{key}/Download/{filename} | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/AdvisoryWorldExpectedVsActual | Reporting/Widgets | Method to get AdvisoryWorld Expected Vs Actual for the account |
| GET | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/AdvisoryWorldMonteCarlo | Reporting/Widgets | Method to get AdvisoryWorld Monte Carlo for an account |
| GET | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/beneficiaries | Reporting/Widgets | Method to get registration beneficiaries for a account |
| GET | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/IndexedAnnuities | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/InsightDocuments | Reporting/Widgets | Method to get insight documents for the account. Returns advisor level documents if none assigned to the account. |
| POST | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/InsightDocuments | Reporting/Widgets | Method to create insight documents for the account. |
| DELETE | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/InsightDocuments/{fileId} | Reporting/Widgets | Method to delete insight document for the account. |
| GET | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/InsightDocuments/{fileId} | Reporting/Widgets | Method to get insight document for the account. Looks for an advisor level document with the provided key if none found that match on the account. |
| PUT | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/InsightDocuments/{fileId} | Reporting/Widgets | Method to update insight document for the account. |
| GET | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/RmdCalculations | Reporting/Widgets | Method to get RMD calculation for the account |
| GET | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/Suitabilitys | Reporting/Widgets | Method to get suitabilitys for the account |
| GET | /v1/Reporting/Widgets/DataEngine/Accounts/{accountId}/Systematics | Reporting/Widgets |  |
| POST | /v1/Reporting/Widgets/DataEngine/Action/SaveToPDF | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Advisor/AUM | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Advisor/AUM/Detail | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Advisor/InsightDocuments | Reporting/Widgets | Method to get insight documents for the advisor. |
| POST | /v1/Reporting/Widgets/DataEngine/Advisor/InsightDocuments | Reporting/Widgets | Method to create insight document for the advisor. |
| DELETE | /v1/Reporting/Widgets/DataEngine/Advisor/InsightDocuments/{fileId} | Reporting/Widgets | Method to delete insight document for the advisor. |
| GET | /v1/Reporting/Widgets/DataEngine/Advisor/InsightDocuments/{fileId} | Reporting/Widgets | Method to get insight document for the advisor. |
| PUT | /v1/Reporting/Widgets/DataEngine/Advisor/InsightDocuments/{fileId} | Reporting/Widgets | Method to update insight document for the advisor. |
| GET | /v1/Reporting/Widgets/DataEngine/AUM | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/AdvisoryWorldExpectedVsActual | Reporting/Widgets | Method to get AdvisoryWorld Expected Vs Actual for a client |
| GET | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/AdvisoryWorldMonteCarlo | Reporting/Widgets | Method to get AdvisoryWorld Monte Carlo for a client |
| GET | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/beneficiaries | Reporting/Widgets | Method to get registration beneficiaries for aclient |
| GET | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/IndexedAnnuities | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/InsightDocuments | Reporting/Widgets | Method to get insight document for the client. Returns advisor level documents if none assigned to the client. |
| POST | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/InsightDocuments | Reporting/Widgets | Method to create insight document for the client. |
| DELETE | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/InsightDocuments/{fileId} | Reporting/Widgets | Method to delete insight document for the client. |
| GET | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/InsightDocuments/{fileId} | Reporting/Widgets | Method to get insight document for the client. Looks for an advisor level document with the provided key if none found that match on the client. |
| PUT | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/InsightDocuments/{fileId} | Reporting/Widgets | Method to update insight document for the client. |
| GET | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/RmdCalculations | Reporting/Widgets | Method to get RMD calculation for each account of a client |
| GET | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/Suitabilitys | Reporting/Widgets | Method to get suitabilitys for each account of a client |
| GET | /v1/Reporting/Widgets/DataEngine/Clients/{clientId}/Systematics | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/NewClosedAccounts | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/AdvisoryWorldExpectedVsActual | Reporting/Widgets | Method to get AdvisoryWorld Expected Vs Actual for the registration |
| GET | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/AdvisoryWorldMonteCarlo | Reporting/Widgets | Method to get AdvisoryWorld Monte Carlo for a registration |
| GET | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/beneficiaries | Reporting/Widgets | Method to get registration beneficiaries for a registration |
| GET | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/IndexedAnnuities | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/InsightDocuments | Reporting/Widgets | Method to get insight documents for the registration. Returns advisor level documents if none assigned to the registration. |
| POST | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/InsightDocuments | Reporting/Widgets | Method to create insight document for the registration. |
| DELETE | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/InsightDocuments/{fileId} | Reporting/Widgets | Method to delete insight document for the registration. |
| GET | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/InsightDocuments/{fileId} | Reporting/Widgets | Method to get insight document for the registration. Looks for an advisor level document with the provided key if none found that match on the registration. |
| PUT | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/InsightDocuments/{fileId} | Reporting/Widgets | Method to update insight document for the registration. |
| GET | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/RmdCalculations | Reporting/Widgets | Method to get RMD calculation for each account of a registration |
| GET | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/Suitabilitys | Reporting/Widgets | Method to get suitabilitys for each account of a registration |
| GET | /v1/Reporting/Widgets/DataEngine/Registrations/{registrationId}/Systematics | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Rep/{repId}/AUM | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Rep/{repId}/AUM/Detail | Reporting/Widgets |  |
| POST | /v1/Reporting/Widgets/DataEngine/Representative/AccountStatusSummary | Reporting/Widgets |  |
| POST | /v1/Reporting/Widgets/DataEngine/Representative/AdvisoryFeeReport | Reporting/Widgets |  |
| POST | /v1/Reporting/Widgets/DataEngine/Representative/AUM | Reporting/Widgets |  |
| POST | /v1/Reporting/Widgets/DataEngine/Representative/Holding/Group/{group} | Reporting/Widgets |  |
| POST | /v1/Reporting/Widgets/DataEngine/Representative/Payout | Reporting/Widgets |  |
| POST | /v1/Reporting/Widgets/DataEngine/Representative/Performance/Group/{group} | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/DataEngine/Reps/{repId}/RmdSummary | Reporting/Widgets |  |
| GET | /v1/Reporting/Widgets/Grouped | Reporting/Widgets |  |
| POST | /v1/Rollups/AssetValueDaily/Run | Rollups/AssetValueDaily |  |
| POST | /v1/Rollups/InvalidateTodaysStoredPerformanceCheck | Rollups/InvalidateTodaysStoredPerformanceCheck |  |
| GET | /v1/Rollups/RollupCompares | Rollups/RollupCompares |  |
| POST | /v1/Rollups/RollupCompares | Rollups/RollupCompares |  |
| PUT | /v1/Rollups/RollupCompares | Rollups/RollupCompares |  |
| DELETE | /v1/Rollups/RollupCompares/{rollupCompareId} | Rollups/RollupCompares |  |
| GET | /v1/Rollups/RollupCompares/{rollupCompareId} | Rollups/RollupCompares |  |
| GET | /v1/Rollups/RollupCompares/{rollupCompareId}/AssetValueChangeDifferences | Rollups/RollupCompares |  |
| GET | /v1/Rollups/RollupCompares/{rollupCompareId}/AssetValueDifferences | Rollups/RollupCompares |  |
| POST | /v1/Rollups/RollupCompares/CheckPending | Rollups/RollupCompares |  |
| GET | /v1/Rollups/RollupCompares/Differences/AssetValueChangeDifferences/{rollupCompareId} | Rollups/RollupCompares |  |
| GET | /v1/Rollups/RollupCompares/Differences/AssetValueDifferences/{rollupCompareId} | Rollups/RollupCompares |  |
| POST | /v1/Rollups/RollupCompares/Differences/UpdateNotes/{rollupCompareId} | Rollups/RollupCompares |  |
| POST | /v1/Rollups/RollupCompares/Process/{rollupCompareId} | Rollups/RollupCompares |  |
| GET | /v1/Scheduler/Jobs | Scheduler/Jobs | Gets a list of job schedules that the logged in user has access to. |
| GET | /v1/Scheduler/Jobs/{key} | Scheduler/Jobs | Gets the job schedules that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Scheduler/JobSchedules | Scheduler/JobSchedules | Gets a list of job schedules that the logged in user has access to. |
| GET | /v1/Scheduler/JobSchedules/{key} | Scheduler/JobSchedules | Gets the job schedules that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Scheduler/JobSchedules/{key}/LastResultMessage | Scheduler/JobSchedules | Gets the last result message for the job schedule that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Scheduler/JobSchedules/Action/Reschedule | Scheduler/JobSchedules |  |
| GET | /v1/Scheduler/NotificationGroup | Scheduler/NotificationGroup | Gets a list of notification groups that the logged in user has access to. |
| GET | /v1/Scheduler/NotificationGroup/{key} | Scheduler/NotificationGroup | Gets the notification groups that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Security/Databases | Security/Databases | Gets a list of databases the logged in user has access to. |
| GET | /v1/Security/Databases/{key} | Security/Databases | Gets the database that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Security/Databases/{key} | Security/Databases | Use v1/Authorization/User/Databases/{key:int} |
| GET | /v1/Security/Databases/FirmTypes | Security/Databases |  |
| GET | /v1/Security/Databases/LockdownTypes | Security/Databases |  |
| GET | /v1/Security/EndpointDetails | Security/EndpointDetails | Gets a list of endpoints with details that the api has exposed. |
| GET | /v1/Security/Endpoints | Security/Endpoints | Gets a list of endpoints the api has exposed. |
| GET | /v1/Security/Endpoints2 | Security/Endpoints2 | Gets a list of endpoints the api has exposed. |
| GET | /v1/Security/FirmContacts | Security/FirmContacts |  |
| POST | /v1/Security/FirmContacts | Security/FirmContacts |  |
| GET | /v1/Security/Formatters | Security/Formatters | Gets a list of formatters the api accepts. |
| GET | /v1/Security/Login | Security/Login |  |
| GET | /v1/Security/LoginEntities | Security/LoginEntities |  |
| GET | /v1/Security/LoginEntities/UserCanUpdate | Security/LoginEntities |  |
| POST | /v1/Security/PartnerAppAdvisors | Security/PartnerAppAdvisors | Create a partner app advisor |
| PUT | /v1/Security/PartnerAppAdvisors/{key} | Security/PartnerAppAdvisors |  |
| GET | /v1/Security/PartnerAppAdvisors/PartnerApps/{partnerAppId}/AlClients/{alClientId} | Security/PartnerAppAdvisors | Gets the partner app advisor of a partner app and alclient. |
| GET | /v1/Security/PartnerAppAdvisors/PartnerApps/Clients/{partnerAppId} | Security/PartnerAppAdvisors | List all clients a partner is allowed to access |
| GET | /v1/Security/PartnerAppAdvisors/PartnerApps/Partners/{alClientId} | Security/PartnerAppAdvisors |  |
| GET | /v1/Security/PartnerApps | Security/PartnerApps | Gets a list of partner apps that the logged in user has access to.  The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Security/PartnerApps | Security/PartnerApps |  |
| PUT | /v1/Security/PartnerApps/{key} | Security/PartnerApps |  |
| GET | /v1/Security/PartnerApps/{key}/Full | Security/PartnerApps | Gets the partner app that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Security/PartnerApps/{key}/Simple | Security/PartnerApps | Gets a simple version of the partner app that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Security/PartnerApps/{key}/SimplePlus | Security/PartnerApps | Gets the partner app that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Security/PartnerApps/{key}/TermsOfService/{acceptTOS} | Security/PartnerApps | The process to add a partner app includes saving the TOS acceptance (in IntegrationProcess). Does this still need to be done separately? |
| DELETE | /v1/Security/PartnerApps/{partnerappId} | Security/PartnerApps |  |
| GET | /v1/Security/PartnerApps/{partnerappId} | Security/PartnerApps |  |
| POST | /v1/Security/PartnerApps/{partnerAppId}/TrustedPrompt | Security/PartnerApps |  |
| GET | /v1/Security/PartnerApps/{partnerId}/SsoRedirect | Security/PartnerApps |  |
| GET | /v1/Security/PartnerApps/Simple | Security/PartnerApps | Gets a list of simple versions of the partner apps that the logged in user has access to.  The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Security/Privileges | Security/Privileges |  |
| POST | /v1/Security/Privileges | Security/Privileges |  |
| GET | /v1/Security/Privileges/{code} | Security/Privileges |  |
| PUT | /v1/Security/Privileges/{code} | Security/Privileges |  |
| GET | /v1/Security/Privileges/{code}/Roles | Security/Privileges | Gets details about the privilege specified by the {code}, along with the Roles used by the firm. |
| GET | /v1/Security/Privileges/{key} | Security/Privileges |  |
| GET | /v1/Security/Privileges/{key}/AllowedEntitiesHistory | Security/Privileges |  |
| GET | /v1/Security/Privileges/{key}/Histories | Security/Privileges |  |
| GET | /v1/Security/Privileges/{key}/Roles | Security/Privileges | Gets details about the privilege specified by the {key}, along with the Roles used by the firm. |
| GET | /v1/Security/Privileges/Categories | Security/Privileges |  |
| GET | /v1/Security/Profiles | Security/Profiles | Gets a list of profiles that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Security/Profiles/Search | Security/Profiles | Gets a list of profiles that the logged in user has access to where the UserName or UserId contains the search string. |
| GET | /v1/Security/Profiles/Search/{search} | Security/Profiles | Gets a list of profiles that the logged in user has access to where the UserName or UserId contains the search string. |
| GET | /v1/Security/Rights | Security/Rights | Gets a list of rights that the logged in user has. |
| GET | /v1/Security/Rights/{securitycode} | Security/Rights | Gets the right that the logged in user has that matches the security code provided. |
| GET | /v1/Security/Rights/Groups | Security/Rights | Gets the groups that the logged in user has access to. |
| GET | /v1/Security/Rights/ObjectTypeCode/{code} | Security/Rights | Gets the rights that the logged in user has that fall within the object type code provided. |
| GET | /v1/Security/Roles | Security/Roles |  |
| POST | /v1/Security/Roles | Security/Roles |  |
| PUT | /v1/Security/Roles | Security/Roles |  |
| DELETE | /v1/Security/Roles/{key} | Security/Roles |  |
| GET | /v1/Security/Roles/{key} | Security/Roles |  |
| PUT | /v1/Security/Roles/{key} | Security/Roles |  |
| PUT | /v1/Security/Roles/{key}/Action/AssignUsers | Security/Roles |  |
| GET | /v1/Security/Roles/{key}/Users | Security/Roles |  |
| GET | /v1/Security/Roles/{loginEntityId}/{name} | Security/Roles |  |
| GET | /v1/Security/Roles/AvailableDashboards | Security/Roles |  |
| GET | /v1/Security/Roles/Simple | Security/Roles |  |
| PUT | /v1/Security/Roles/Update | Security/Roles | Updates Roles and details using list of updated roles. Identical to the UpdateRoles method, but sending data in the body instead of the Uri. |
| DELETE | /v1/Security/Token | Security/Token |  |
| GET | /v1/Security/Token | Security/Token | Authorizes Credentials, and returns a token |
| POST | /v1/Security/Token | Security/Token | Authorizes Credentials, and returns a token |
| POST | /v1/Security/Token/CheckPassword | Security/Token | Checks whether the provided string is known to be a compromised password. |
| GET | /v1/Security/Token/element | Security/Token | Authorizes Credentials, and returns a token |
| POST | /v1/Security/Token/SendTwoFactorCode | Security/Token | Sends a registration code to email or sms |
| GET | /v1/Security/Users | Security/Users |  |
| POST | /v1/Security/Users | Security/Users |  |
| GET | /v1/Security/Users/{entity}/{key} | Security/Users |  |
| GET | /v1/Security/Users/{entity}/ContactTypes | Security/Users |  |
| DELETE | /v1/Security/Users/{key} | Security/Users |  |
| GET | /v1/Security/Users/{key} | Security/Users |  |
| PUT | /v1/Security/Users/{key} | Security/Users |  |
| PUT | /v1/Security/Users/{key}/Action/Password/Reset | Security/Users |  |
| PUT | /v1/Security/Users/{key}/Action/Password/Set | Security/Users |  |
| PUT | /v1/Security/Users/{key}/Action/SecurityQuestion/Delete | Security/Users | Obsolete: Security questions and answers are no longer used. This endpoint no longer does anything. |
| GET | /v1/Security/Users/{key}/LoginActivity | Security/Users |  |
| POST | /v1/Security/Users/{key}/LoginActivity | Security/Users |  |
| PUT | /v1/Security/Users/Action/Activate | Security/Users |  |
| POST | /v1/Security/Users/Action/Import | Security/Users |  |
| GET | /v1/Security/Users/DeactivationPolicies | Security/Users |  |
| PUT | /v1/Security/Users/DeactivationPolicies | Security/Users |  |
| POST | /v1/Security/Users/Import/LoginActivity | Security/Users |  |
| GET | /v1/Security/Users/RepUsers | Security/Users |  |
| GET | /v1/Security/Users/Search | Security/Users |  |
| POST | /v1/Security/Users/Search/ByEmail | Security/Users |  |
| PUT | /v1/Security/Users/SendNewUserEmails | Security/Users |  |
| POST | /v1/Security/ValidateImport/Users/{entity} | Security/ValidateImport |  |
| GET | /v1/Settings/Apps | Settings/Apps | Gets a list of apps that the logged in user has access to.  The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Settings/Apps | Settings/Apps | Used to create a new app. Upon successful creation a 201 will be returned with the location of the nearly created app. |
| DELETE | /v1/Settings/Apps/{appCode} | Settings/Apps | Used to delete an existing app. Upon successful deletion a 204 will be returned. |
| GET | /v1/Settings/Apps/{appCode} | Settings/Apps | Gets the app that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Settings/Apps/{appCode} | Settings/Apps | Used to update an existing app. Upon successful modification a 200 will be returned. |
| GET | /v1/Settings/Apps/{appCode}/Options | Settings/Apps | Gets all app options for the app with the provided appCode. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Settings/Apps/{appCode}/Options | Settings/Apps | Updates an array of AppOptions. |
| DELETE | /v1/Settings/Apps/{appCode}/Options/{optionName} | Settings/Apps | Used to delete an existing app option value. Returns the app option value with approviate value after the delete occured. |
| GET | /v1/Settings/Apps/{appCode}/Options/{optionName} | Settings/Apps | Gets the app option that has the provided name. If the item specified doesn't exist or isn't  accessible to the logged in user, a mocked object with the option name and default value will be returned. |
| PUT | /v1/Settings/Apps/{appCode}/Options/{optionName} | Settings/Apps | Used to update an existing app option value. Upon successful modification a 200 will be returned. Returns the app option value with appropriate value after the update occured. |
| GET | /v1/Settings/Apps/ContextualLinks | Settings/Apps |  |
| GET | /v1/Settings/Apps/Pages/{search} | Settings/Apps |  |
| GET | /v1/Settings/Apps/Search | Settings/Apps | Gets a list of apps that the logged in user has access to where the app name or tags contains the search string. |
| GET | /v1/Settings/Apps/Search/{search} | Settings/Apps | Gets a list of apps that the logged in user has access to where the app name or tags contains the search string. |
| GET | /v1/Settings/Apps/User | Settings/Apps |  |
| GET | /v1/Settings/CustomSettings | Settings/CustomSettings | Gets a list of custom settings that the logged in user has access to. |
| PUT | /v1/Settings/CustomSettings | Settings/CustomSettings | Used to update existing custom settings. Upon successful modification a 200 will be returned. |
| GET | /v1/Settings/CustomSettings/{promptName} | Settings/CustomSettings | Gets the custom setting that has the provided prompt name. If the item specified doesn't exist or isn't  accessible to the logged in user, a mocked object with the option name and default value will be returned. |
| PUT | /v1/Settings/CustomSettings/{promptName} | Settings/CustomSettings | Used to update existing custom setting. Upon successful modification a 200 will be returned. |
| GET | /v1/Settings/CustomSettings/{promptName}/Image | Settings/CustomSettings | If the prompt being requested is an image this will return that image. If it is not it will return 400. If the prompt doesn't exist it will return a 404. |
| POST | /v1/Settings/CustomSettings/Actions/Reset/{promptName} | Settings/CustomSettings | Used to reset existing custom setting. Upon successful modification a 200 will be returned. |
| GET | /v1/Settings/Database/EntityOptions | Settings/Database |  |
| GET | /v1/Settings/Database/EntityOptions/{userDefineDefinitionId} | Settings/Database | Gets the database entity option that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/Database/EntityOptions/Categories | Settings/Database | Gets the list categories for the database entity options. |
| GET | /v1/Settings/Database/EntityOptions/Categories/{category} | Settings/Database | Gets the list of database entity options that have the provided category. |
| GET | /v1/Settings/Database/EntityOptions/Code/{code} | Settings/Database | Gets the database entity option that has the provided code. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/Database/EntityOptions/Name/{name} | Settings/Database | Gets the database entity option that has the provided name. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Settings/EntityOptions/{entity} | Settings/EntityOptions |  |
| GET | /v1/Settings/EntityOptions/{entity}/{entityId} | Settings/EntityOptions | Gets a list of entity options that the logged in user has access to. |
| GET | /v1/Settings/EntityOptions/{entity}/{entityId}/{code}/Value | Settings/EntityOptions | Simple Only gets the entity setting value and type, no other properties. |
| PUT | /v1/Settings/EntityOptions/{entity}/{entityId}/{code}/Value | Settings/EntityOptions | Simple - Only updates the entity setting value. |
| DELETE | /v1/Settings/EntityOptions/{entity}/{entityId}/{userDefineDefinitionId} | Settings/EntityOptions | Deletes the user established value for the provided entity option. |
| GET | /v1/Settings/EntityOptions/{entity}/{entityId}/{userDefineDefinitionId} | Settings/EntityOptions | Gets the entity option that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/EntityOptions/{entity}/{entityId}/Categories | Settings/EntityOptions | Gets the list categories for the database entity options. |
| GET | /v1/Settings/EntityOptions/{entity}/{entityId}/Categories/{category} | Settings/EntityOptions | Gets the list of entity options that have the provided category. |
| DELETE | /v1/Settings/EntityOptions/{entity}/{entityId}/Code/{code} | Settings/EntityOptions | Deletes the user established value for the provided entity option. |
| GET | /v1/Settings/EntityOptions/{entity}/{entityId}/Code/{code} | Settings/EntityOptions | Gets the entity option that has the provided code. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Settings/EntityOptions/{entity}/{entityId}/Codes | Settings/EntityOptions |  |
| DELETE | /v1/Settings/EntityOptions/{entity}/{entityId}/Name/{name} | Settings/EntityOptions | Deletes the user established value for the provided entity option. |
| GET | /v1/Settings/EntityOptions/{entity}/{entityId}/Name/{name} | Settings/EntityOptions | Gets the entity option that has the provided name. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/EntityOptions/{entity}/Code/{code} | Settings/EntityOptions | Gets a list of entity options that the logged in user has access to. |
| PUT | /v1/Settings/EntityOptions/{entity}/Code/{code} | Settings/EntityOptions | Updates the provided entity option. |
| GET | /v1/Settings/EntityOptions/{entity}/Name/{name} | Settings/EntityOptions | Gets a list of entity options that the logged in user has access to. |
| GET | /v1/Settings/EntityOptions/List | Settings/EntityOptions | Lists the available entity option levels |
| GET | /v1/Settings/EntityOptions/List/Code/{code} | Settings/EntityOptions | Lists the available entity option levels for the entity option with the code provided. |
| GET | /v1/Settings/EntityOptions/List/Name/{name} | Settings/EntityOptions | Lists the available entity option levels for the entity option with the name provided. |
| GET | /v1/Settings/Options | Settings/Options | Gets a list of options that the logged in user has access to.  The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Settings/Options/{fieldName} | Settings/Options | Gets the option that has the provided name. |
| PUT | /v1/Settings/Options/{fieldName} | Settings/Options | Used to update existing option. Upon successful modification a 200 will be returned. |
| GET | /v1/Settings/Owner | Settings/Owner | Gets the Owner info |
| PUT | /v1/Settings/Owner | Settings/Owner | Used to update existing owner record. |
| GET | /v1/Settings/Owner/Code | Settings/Owner | Gets the Owner code |
| GET | /v1/Settings/Owner/ReportImage | Settings/Owner | Gets the owner's report image if one exists. If none exists a 404 will be thrown. |
| PUT | /v1/Settings/UserDefinedFields/{entity} | Settings/UserDefinedFields | Updates the provided user defined fields. |
| GET | /v1/Settings/UserDefinedFields/{entity}/{entityId} | Settings/UserDefinedFields | Gets a list of user defined options that the logged in user has access to. |
| GET | /v1/Settings/UserDefinedFields/{entity}/{entityId}/{key} | Settings/UserDefinedFields | Gets the user defined fields that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/UserDefinedFields/{entity}/{entityId}/Categories | Settings/UserDefinedFields | Gets the list categories for the database user defined options. |
| GET | /v1/Settings/UserDefinedFields/{entity}/{entityId}/Categories/{category} | Settings/UserDefinedFields | Gets the list of user defined options that have the provided category. |
| GET | /v1/Settings/UserDefinedFields/{entity}/{entityId}/Code/{code} | Settings/UserDefinedFields | Gets the user defined fields that has the provided code. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/UserDefinedFields/{entity}/{entityId}/Name/{name} | Settings/UserDefinedFields | Gets the user defined fields that has the provided name. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/UserDefinedFields/{entity}/Code/{code} | Settings/UserDefinedFields | Gets a list of user defined options that the logged in user has access to. |
| PUT | /v1/Settings/UserDefinedFields/{entity}/Code/{code} | Settings/UserDefinedFields | Updates the provided user defined fields. |
| GET | /v1/Settings/UserDefinedFields/{entity}/Name/{name} | Settings/UserDefinedFields | Gets a list of user defined options that the logged in user has access to. |
| POST | /v1/Settings/UserDefinedFields/{entity}/Name/{name} | Settings/UserDefinedFields | Creates provided user defined fields. |
| GET | /v1/Settings/UserDefinedFields/Definitions/{entity} | Settings/UserDefinedFields | Get all definitions for specified entity type |
| POST | /v1/Settings/UserDefinedFields/Definitions/{entity} | Settings/UserDefinedFields | Creates provided user defined field definition. |
| DELETE | /v1/Settings/UserDefinedFields/Definitions/{entity}/Code/{code} | Settings/UserDefinedFields | Delete definition |
| GET | /v1/Settings/UserDefinedFields/Definitions/{entity}/Code/{code} | Settings/UserDefinedFields | Get definition for specified entity type and code |
| PUT | /v1/Settings/UserDefinedFields/Definitions/{entity}/Code/{code} | Settings/UserDefinedFields | Update definition |
| GET | /v1/Settings/UserDefinedFields/List | Settings/UserDefinedFields | Lists the available user defined fields levels |
| GET | /v1/Settings/UserDefinedFields/List/Code/{code} | Settings/UserDefinedFields | Lists the available user defined fields levels for the user defined fields with the code provided. |
| GET | /v1/Settings/UserDefinedFields/List/Name/{name} | Settings/UserDefinedFields | Lists the available user defined fields levels for the user defined fields with the name provided. |
| PUT | /v1/Settings/UserDefinedTimeFields/{entity} | Settings/UserDefinedTimeFields | Updates the provided user defined time fields. |
| GET | /v1/Settings/UserDefinedTimeFields/{entity}/{entityId} | Settings/UserDefinedTimeFields | Gets a list of user defined options that the logged in user has access to. |
| GET | /v1/Settings/UserDefinedTimeFields/{entity}/{entityId}/{key} | Settings/UserDefinedTimeFields | Gets the user defined time fields that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/UserDefinedTimeFields/{entity}/{entityId}/Categories | Settings/UserDefinedTimeFields | Gets the list categories for the database user defined options. |
| GET | /v1/Settings/UserDefinedTimeFields/{entity}/{entityId}/Categories/{category} | Settings/UserDefinedTimeFields | Gets the list of user defined options that have the provided category. |
| GET | /v1/Settings/UserDefinedTimeFields/{entity}/{entityId}/Code/{code} | Settings/UserDefinedTimeFields | Gets the user defined time fields that has the provided code. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/UserDefinedTimeFields/{entity}/{entityId}/Name/{name} | Settings/UserDefinedTimeFields | Gets the user defined time fields that has the provided name. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Settings/UserDefinedTimeFields/{entity}/Code/{code} | Settings/UserDefinedTimeFields | Gets a list of user defined options that the logged in user has access to. |
| PUT | /v1/Settings/UserDefinedTimeFields/{entity}/Code/{code} | Settings/UserDefinedTimeFields | Updates the provided user defined time fields. |
| GET | /v1/Settings/UserDefinedTimeFields/{entity}/Name/{name} | Settings/UserDefinedTimeFields | Gets a list of user defined options that the logged in user has access to. |
| POST | /v1/Settings/UserDefinedTimeFields/{entity}/Name/{name} | Settings/UserDefinedTimeFields | Creates provided user defined time fields. |
| GET | /v1/Settings/UserDefinedTimeFields/List | Settings/UserDefinedTimeFields | Lists the available user defined time fields levels |
| GET | /v1/Settings/UserDefinedTimeFields/List/Code/{code} | Settings/UserDefinedTimeFields | Lists the available user defined time fields levels for the user defined time fields with the code provided. |
| GET | /v1/Settings/UserDefinedTimeFields/List/Name/{name} | Settings/UserDefinedTimeFields | Lists the available user defined time fields levels for the user defined time fields with the name provided. |
| GET | /v1/Settings/UserOptions | Settings/UserOptions | Gets a list of user options that the logged in user has access to.  The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| DELETE | /v1/Settings/UserOptions/{optionname} | Settings/UserOptions |  |
| GET | /v1/Settings/UserOptions/{optionname} | Settings/UserOptions | Gets the user option that has the provided name. If the item specified doesn't exist or isn't  accessible to the logged in user, a mocked object with the option name and default value will be returned. |
| POST | /v1/Settings/UserOptions/{optionname} | Settings/UserOptions |  |
| POST | /v1/Settings/Views/{pageCode} | Settings/Views |  |
| GET | /v1/Settings/Views/{pageCode}/{gridType} | Settings/Views | Gets a list of views that the logged in user has access to for this controller. |
| DELETE | /v1/Settings/Views/{pageCode}/{key} | Settings/Views |  |
| GET | /v1/Settings/Views/{pageCode}/{key} | Settings/Views | Gets the view that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Settings/Views/{pageCode}/{key} | Settings/Views |  |
| PUT | /v1/Settings/Views/{pageCode}/{key}/Actions/RemoveAsDefault | Settings/Views |  |
| PUT | /v1/Settings/Views/{pageCode}/{key}/Actions/SetDefault | Settings/Views |  |
| POST | /v1/Settings/Views/{pageCode}/AgGrid/Convert | Settings/Views |  |
| GET | /v1/Settings/Views/PageCodes/{entity}/Simple | Settings/Views |  |
| GET | /v1/Settings/WebAcknowledgements | Settings/WebAcknowledgements | Gets all webAcknowledgement objects for user |
| POST | /v1/Settings/WebAcknowledgements | Settings/WebAcknowledgements | Create a new webAcknowledgement |
| PUT | /v1/Settings/WebAcknowledgements | Settings/WebAcknowledgements | Mass update webAcknowledgements |
| DELETE | /v1/Settings/WebAcknowledgements/{key} | Settings/WebAcknowledgements | Delete a webAcknowledgement |
| GET | /v1/Settings/WebAcknowledgements/{key} | Settings/WebAcknowledgements | Gets webAcknowledgement by key |
| PUT | /v1/Settings/WebAcknowledgements/{key} | Settings/WebAcknowledgements | Update one webAcknowledgement |
| POST | /v1/Settings/WebAcknowledgements/{key}/Respond | Settings/WebAcknowledgements | Log a response for this user for the given webAcknowledgement |
| GET | /v1/Settings/WebAcknowledgements/{key}/Responses | Settings/WebAcknowledgements | Gets webAcknowledgement responses by key |
| GET | /v1/Settings/WebOptions | Settings/WebOptions | Gets a list of web options that the logged in user has access to.  The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Settings/WebOptions | Settings/WebOptions | Used to update existing web options. Upon successful modification a 200 will be returned. |
| PUT | /v1/Settings/WebOptions | Settings/WebOptions | Used to update existing web options. Upon successful modification a 200 will be returned. |
| DELETE | /v1/Settings/WebOptions/{optionname} | Settings/WebOptions |  |
| GET | /v1/Settings/WebOptions/{optionname} | Settings/WebOptions | Gets the web option that has the provided name. If the item specified doesn't exist or isn't  accessible to the logged in user, a mocked object with the option name and default value will be returned. |
| GET | /v1/Status/Hangfire | Status/Hangfire |  |
| GET | /v1/Status/Hangfire/JobsOnInactiveServers | Status/Hangfire |  |
| GET | /v1/Theoretical/InflationRates | Theoretical/InflationRates | Gets a list of inflation rates that the logged in user has access to. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Theoretical/InflationRates | Theoretical/InflationRates | Used to create a new business line. Upon successful creation a 201 will be returned with the location of the nearly created business line. |
| DELETE | /v1/Theoretical/InflationRates/{key} | Theoretical/InflationRates | Used to delete an existing business line. Upon successful deletion a 204 will be returned. |
| GET | /v1/Theoretical/InflationRates/{key} | Theoretical/InflationRates | Gets the business line that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Theoretical/InflationRates/{key} | Theoretical/InflationRates | Used to update an existing business line. Upon successful modification a 200 will be returned. |
| GET | /v1/Trading/AccountTradeInfo/{accountId} | Trading/AccountTradeInfo | Gets the account trade info for the provided account. |
| GET | /v1/Trading/Confirm | Trading/Confirm | Get all trade confirmations |
| GET | /v1/Trading/Confirm/{key} | Trading/Confirm | Get trade confirmation by key |
| GET | /v1/Trading/Confirm/{key}/Details | Trading/Confirm | Get trade confirmation by key and parse XML |
| GET | /v1/Trading/Confirm/Accounts/{accountId}/{confirmDate}/{confirmType} | Trading/Confirm | Get trade confirmation by account, confirmation date and confirmation type |
| GET | /v1/Trading/Confirm/Clients/{clientId}/{confirmDate}/{confirmType} | Trading/Confirm | Get trade confirmation for client at specified date |
| GET | /v1/Trading/Confirm/Dates | Trading/Confirm | Get the list of all confirmation dates |
| GET | /v1/Trading/ContributionCodeExts | Trading/ContributionCodeExts | Gets a list of contribution codes extensions that the logged in user has access to. |
| GET | /v1/Trading/ContributionCodeExts/Simple | Trading/ContributionCodeExts | Gets a simple list of contribution code extensions that the logged in user has access to. |
| GET | /v1/Trading/ContributionCodes/Simple | Trading/ContributionCodes | Gets a simple list of contribution codes that the logged in user has access to. |
| POST | /v1/Trading/Contributions | Trading/Contributions | Saves contributions |
| GET | /v1/Trading/ConvexRebalanceAccount | Trading/ConvexRebalanceAccount |  |
| GET | /v1/Trading/ConvexRebalanceAccount/{key} | Trading/ConvexRebalanceAccount |  |
| PUT | /v1/Trading/ConvexRebalanceAccount/{key} | Trading/ConvexRebalanceAccount |  |
| POST | /v1/Trading/ConvexRebalanceAccount/CalculateAccount | Trading/ConvexRebalanceAccount | Convex rebalance for account. |
| GET | /v1/Trading/DistributionCodes | Trading/DistributionCodes |  |
| GET | /v1/Trading/DistributionCodes/{key}/Simple | Trading/DistributionCodes | Gets a simple list of distribution codes that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Trading/DistributionCodes/Simple | Trading/DistributionCodes | Gets a simple list of distribution codes that the logged in user has access to. |
| GET | /v1/Trading/DistributionCodes/TransDesc | Trading/DistributionCodes |  |
| GET | /v1/Trading/ExecutionLogs/{asOfDate} | Trading/ExecutionLogs |  |
| GET | /v1/Trading/ExecutionLogs/Schedules/{asOfDate} | Trading/ExecutionLogs |  |
| PUT | /v1/Trading/ExecutionLogs/Schedules/Action/QueueStatus | Trading/ExecutionLogs |  |
| GET | /v1/Trading/FixBatches/{fixBatchId}/FixBlockOrders | Trading/FixBatches |  |
| GET | /v1/Trading/FixBlockOrders | Trading/FixBlockOrders | Gets a list of fix block orders that the logged in user has access to. The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Trading/FixBlockOrders | Trading/FixBlockOrders |  |
| GET | /v1/Trading/FixBlockOrders/{blockId}/Fees | Trading/FixBlockOrders | Gets a list of FixBlockOrderCommissions that the logged in user has access to.  The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| PUT | /v1/Trading/FixBlockOrders/{blockId}/Fees | Trading/FixBlockOrders | Takes a Fees/Commissions object, and saves the fee and commission detail to the block order, and to the underlying trade orders. |
| GET | /v1/Trading/FixBlockOrders/{blockId}/FixLogs | Trading/FixBlockOrders | Returns Fix Log Message for a block order. |
| GET | /v1/Trading/FixBlockOrders/{blockId}/Orders | Trading/FixBlockOrders | Gets a list of orders that fall within the specified block. |
| GET | /v1/Trading/FixBlockOrders/{blockId}/Transactions | Trading/FixBlockOrders | Gets a list of transactions that fall within the specified block. The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| DELETE | /v1/Trading/FixBlockOrders/{key} | Trading/FixBlockOrders |  |
| GET | /v1/Trading/FixBlockOrders/{key} | Trading/FixBlockOrders | Gets the fix block order that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/FixBlockOrders/{key} | Trading/FixBlockOrders | Save a fix block order. |
| POST | /v1/Trading/FixBlockOrders/{key}/ImportAllocations | Trading/FixBlockOrders | Takes an xlsx, xls, or csv file as multipart content. The file needs either an order id column (named  "order #", or "order id") or an account id column (named  "account #", or "account id"). The file will be processed and returned as a list of orders. No change will be made to the underlying database. |
| GET | /v1/Trading/FixBlockOrders/{key}/RealtimePrice | Trading/FixBlockOrders | Gets the price to use for the order that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/FixBlockOrders/Action/Allocate | Trading/FixBlockOrders |  |
| PUT | /v1/Trading/FixBlockOrders/Action/AllocateAutoAdjust | Trading/FixBlockOrders | Update order qty to match the block orders filled CumQty adjusting the order quantity using pro-rata calculation. |
| PUT | /v1/Trading/FixBlockOrders/Action/Cancel | Trading/FixBlockOrders |  |
| PUT | /v1/Trading/FixBlockOrders/Action/Delete | Trading/FixBlockOrders |  |
| PUT | /v1/Trading/FixBlockOrders/Action/Execute | Trading/FixBlockOrders |  |
| GET | /v1/Trading/FixBlockOrders/Filter/Orders | Trading/FixBlockOrders | Gets a list of orders that the logged in user has access to which fall within the filtering parameters provided. Note: all filters apply to the the fix block order. The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/FixBlockOrders/Filter/UnallocatedOrders | Trading/FixBlockOrders | Gets a list of unallocated orders that the logged in user has access to which fall within the filtering parameters provided. Note: all filters apply to the the fix block order. The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| PUT | /v1/Trading/FixBlockOrders/UpdateEnMasse | Trading/FixBlockOrders | Updates every block provided in the list of ids. |
| PUT | /v1/Trading/FixBlockOrders/UpdateInMass | Trading/FixBlockOrders | Updates every block provided in the list of ids. |
| POST | /v1/Trading/GenerateTrades | Trading/GenerateTrades | Generates trades of any type based on the instructions in the tradeDefinition provided in the request body. |
| POST | /v1/Trading/GenerateTrades/Buy | Trading/GenerateTrades | This is used when buying a product from cash, it handles setting the sell side of the trade to sweep asset/product. |
| POST | /v1/Trading/GenerateTrades/Sell | Trading/GenerateTrades | This is used when selling a product to cash, it handles setting the buy side of the trade to sweep asset/product. |
| POST | /v1/Trading/GlobalTradeCount | Trading/GlobalTradeCount | Returns the number of global trades the logged in user has access to for the criteria provided. This is a Post because the UI can send tons of ModelAggs and break the url length |
| GET | /v1/Trading/Instances | Trading/Instances | Gets a list of trade request instances that the logged in user has access to and were created within the range provided.  The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/Instances/{entity}/{entityId} | Trading/Instances |  |
| GET | /v1/Trading/Instances/{key} | Trading/Instances | Gets the trade request instance that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Trading/Instances/{key}/Orders | Trading/Instances | Gets a list of orders that fall below the trade request instance with the specified key, which the logged in user has access to. |
| PUT | /v1/Trading/Instances/Action/Cancel | Trading/Instances |  |
| PUT | /v1/Trading/Instances/Action/CreateBlocks | Trading/Instances |  |
| PUT | /v1/Trading/Instances/Action/CreateFee | Trading/Instances |  |
| PUT | /v1/Trading/Instances/Action/Delete | Trading/Instances |  |
| PUT | /v1/Trading/Instances/Action/DisableClientInstance | Trading/Instances | Disables every order for the instances provided in the list of ids and also sets the instance to executed. This should only be used for FTJ's client portal trading. This is only because they wanted to do it the old way it was done in Desktop. |
| PUT | /v1/Trading/Instances/Action/ExecuteFees | Trading/Instances |  |
| PUT | /v1/Trading/Instances/Action/SetApprovalStatus | Trading/Instances |  |
| PUT | /v1/Trading/Instances/Action/SetIsReady | Trading/Instances |  |
| GET | /v1/Trading/Instances/Blob/{key} | Trading/Instances |  |
| GET | /v1/Trading/Instances/Simple | Trading/Instances | Gets a simple list of trade request instances that the logged in user has access to.  The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/ModelAggs | Trading/ModelAggs | Gets a list of model aggs that the logged in user has access to.  The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Trading/ModelAggs | Trading/ModelAggs |  |
| DELETE | /v1/Trading/ModelAggs/{key} | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/{key} | Trading/ModelAggs | Gets the model agg that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/ModelAggs/{key} | Trading/ModelAggs | Updates the billFeeSchedule for the model aggregate |
| GET | /v1/Trading/ModelAggs/{key}/{accountId}/Allocations | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/{key}/Accounts | Trading/ModelAggs | Returns standard account object for a ModelAggregate Id. |
| GET | /v1/Trading/ModelAggs/{key}/Allocations | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/{key}/AssignedBenchmarks | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/{key}/CanMaintain | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/AggTypes | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/ByModel/{modelId} | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/Element | Trading/ModelAggs | Gets a list of model aggs that the logged in user has access to.  The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| PUT | /v1/Trading/ModelAggs/FindByAllocation | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/Limited | Trading/ModelAggs | Gets a list of model aggs with few fields that the logged in user has access to.  The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Trading/ModelAggs/List | Trading/ModelAggs |  |
| POST | /v1/Trading/ModelAggs/List/Id | Trading/ModelAggs |  |
| POST | /v1/Trading/ModelAggs/MapEclipseModelsToModelAggs | Trading/ModelAggs |  |
| POST | /v1/Trading/ModelAggs/Reporting | Trading/ModelAggs | Creates a focus point reporting table for the model aggregate |
| PUT | /v1/Trading/ModelAggs/Reporting | Trading/ModelAggs | Updates the focus point reporting table for the model aggregate |
| GET | /v1/Trading/ModelAggs/Reporting/{key} | Trading/ModelAggs | Gets the model agg reporting records based on the model agg key. |
| POST | /v1/Trading/ModelAggs/RequestEclipseModelCreation | Trading/ModelAggs | Finds all qualifying AggregateModels (have not already been created in Eclipse) Builds a requestDto to send to Eclipse, and initiates the request to create Eclipse models from the supplied requestDto. |
| GET | /v1/Trading/ModelAggs/Search | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/Search/{search} | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/Simple | Trading/ModelAggs | Gets a simple list of model aggs that the logged in user has access to. |
| GET | /v1/Trading/ModelAggs/Simple/ByCommunityModelId/{communityModelId} | Trading/ModelAggs | Get the model agg for the community model id that is provided |
| GET | /v1/Trading/ModelAggs/Simple/ByCommunityModelId/{communityModelId}/{eclipseFirmId} | Trading/ModelAggs | Get the model agg for the community model id that is provided |
| POST | /v1/Trading/ModelAggs/Simple/List | Trading/ModelAggs |  |
| POST | /v1/Trading/ModelAggs/Simple/List/Id | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/Simple/Name | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/Simple/Name/List | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggs/Types | Trading/ModelAggs |  |
| GET | /v1/Trading/ModelAggTypes | Trading/ModelAggTypes |  |
| GET | /v1/Trading/ModelAnalyzer/ModelAggs/{modelAggId} | Trading/ModelAnalyzer | Brings back the model agg summary for the ModelAggID selected. |
| GET | /v1/Trading/ModelDetails/{communityModelId} | Trading/ModelDetails | Returns model stats by community model id. |
| POST | /v1/Trading/ModelDetails/List | Trading/ModelDetails | Returns a list of model stats based on a list of supplied community strategist ids |
| GET | /v1/Trading/Models | Trading/Models | Gets a list of models that the logged in user has access to.  The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Trading/Models | Trading/Models |  |
| DELETE | /v1/Trading/Models/{key} | Trading/Models |  |
| GET | /v1/Trading/Models/{key} | Trading/Models | Gets the model that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/Models/{key} | Trading/Models |  |
| PUT | /v1/Trading/Models/{key}/Action/RefreshDynamic | Trading/Models |  |
| GET | /v1/Trading/Models/{key}/ModelRanges | Trading/Models |  |
| PUT | /v1/Trading/Models/Action/DeleteModels | Trading/Models |  |
| POST | /v1/Trading/Models/Action/ModelDeleteValidation | Trading/Models |  |
| GET | /v1/Trading/Models/Element | Trading/Models | Gets a list of models such that they can be displayed in Element that the logged in user has access to. |
| GET | /v1/Trading/Models/Element/ModelNameInUseValidation | Trading/Models | Endpoint for element to validate a name. |
| GET | /v1/Trading/Models/GroupNumbers | Trading/Models | Gets a simple list of model group numbers that the logged in user has access to.  The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Trading/Models/List | Trading/Models | Gets the models provided in the list of keys. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Trading/Models/List/ByModelAgg | Trading/Models |  |
| POST | /v1/Trading/Models/List/ByModelAgg/Allocations | Trading/Models |  |
| GET | /v1/Trading/Models/List/Entity | Trading/Models |  |
| POST | /v1/Trading/Models/List/Id | Trading/Models | Gets the models provided in the list of keys. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Trading/Models/ModelTypes | Trading/Models | Gets a simple list of model types that the logged in user has access to.  The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/Models/Restrictions | Trading/Models | Gets a list of model restrictions that the logged in user has access to. |
| POST | /v1/Trading/Models/Restrictions | Trading/Models | Used to create a new model restriction. Upon successful creation a 201 will be returned with the location of the nearly created local price. |
| DELETE | /v1/Trading/Models/Restrictions/{key} | Trading/Models | Used to delete an existing model restriction. Upon successful deletion a 204 will be returned. |
| GET | /v1/Trading/Models/Restrictions/{key} | Trading/Models | Gets the model restriction that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/Models/Restrictions/{key} | Trading/Models | Used to update an existing model restriction. Upon successful modification a 200 will be returned. |
| GET | /v1/Trading/Models/Search | Trading/Models |  |
| GET | /v1/Trading/Models/Search/{search} | Trading/Models |  |
| GET | /v1/Trading/Models/Simple | Trading/Models | Gets a simple list of models that the logged in user has access to. |
| POST | /v1/Trading/Models/Simple/List | Trading/Models |  |
| POST | /v1/Trading/Models/Simple/List/Id | Trading/Models |  |
| POST | /v1/Trading/Models/Simple/List/Name | Trading/Models |  |
| GET | /v1/Trading/Models/Sma/AccountType/Restrictions | Trading/Models | Gets a list of account type restrictions for sma models. |
| GET | /v1/Trading/Models/Sma/AccountType/Restrictions/{categoryName} | Trading/Models | Gets a list of account type restrictions for sma models. |
| GET | /v1/Trading/Models/Sma/AccountType/Restrictions/{key} | Trading/Models | Gets the sma model account type restriction that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Trading/Models/Types | Trading/Models |  |
| GET | /v1/Trading/Models/Value | Trading/Models | Gets a list of models (including aum for today and a count of accounts with value) that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/Models/Value/{asOfDate} | Trading/Models | Gets a list of models (including aum for the end of the date specified and a count of accounts with value) that the logged in user has access to. The return is limited to pages of 50000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/Orders | Trading/Orders | Gets a list of orders that the logged in user has access to and were created within the range provided. |
| DELETE | /v1/Trading/Orders/{key} | Trading/Orders |  |
| GET | /v1/Trading/Orders/{key} | Trading/Orders | Gets the order that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/Orders/{key} | Trading/Orders | Saves the trade order. If it is linked for exchange, the linked order will also be updated. |
| GET | /v1/Trading/Orders/{key}/AssetLots/{assetId} | Trading/Orders | Splits the order based on the lots selected. |
| GET | /v1/Trading/Orders/{key}/RealtimePrice | Trading/Orders | Gets the price to use for the order that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/Orders/{key}/SplitByLots | Trading/Orders | Splits the order based on the lots selected. |
| PUT | /v1/Trading/Orders/Action/CalculateGainLoss | Trading/Orders | Calculates gain loss on all trades for the day. |
| PUT | /v1/Trading/Orders/Action/CreateBlocks | Trading/Orders |  |
| POST | /v1/Trading/Orders/Action/CreateOptionTradeFile | Trading/Orders | Creates trade file(s) for the provided list of option trades that do not exist in our system (based on previously executed equity trades). |
| PUT | /v1/Trading/Orders/Action/Delete | Trading/Orders |  |
| PUT | /v1/Trading/Orders/Action/DeleteZeroQuantity | Trading/Orders |  |
| PUT | /v1/Trading/Orders/Action/Disable | Trading/Orders |  |
| PUT | /v1/Trading/Orders/Action/Enable | Trading/Orders |  |
| PUT | /v1/Trading/Orders/Action/RebuildOrderFromSplit | Trading/Orders | Rebuilds the order from the orders that were created from splitting the original order by Lots. |
| PUT | /v1/Trading/Orders/Action/RefreshPrices | Trading/Orders |  |
| PUT | /v1/Trading/Orders/Action/ResetMutualFundTrades | Trading/Orders |  |
| PUT | /v1/Trading/Orders/Action/RoundQuantity/{nearest} | Trading/Orders |  |
| PUT | /v1/Trading/Orders/Action/SetApprovalStatus | Trading/Orders |  |
| PUT | /v1/Trading/Orders/Action/Unlink | Trading/Orders |  |
| PUT | /v1/Trading/Orders/Action/UpdateReinvest | Trading/Orders |  |
| GET | /v1/Trading/Orders/GetFIXMutualFundsNotSent | Trading/Orders | Gets all of the FIX Mutual Fund orders that have been blocked and not sent. |
| GET | /v1/Trading/Orders/GetOpenOrders | Trading/Orders | Gets the open orders for TOM Orders tab. |
| GET | /v1/Trading/Orders/Histories | Trading/Orders | Gets the order histories that fit the parameters specified. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/Orders/NewFixedIncomeTrades | Trading/Orders | Creates new orders with real tickers that will . |
| GET | /v1/Trading/OutsideTrading/AvailableCustodians | Trading/OutsideTrading | Returns a list of available custodians. |
| POST | /v1/Trading/OutsideTrading/CreateAccountModelAndRebalance | Trading/OutsideTrading | From the householdId, positions, and allocations given, temporary model, account, assets, transactions, and trades will be created. |
| POST | /v1/Trading/OutsideTrading/CreateAdditionalCustodians | Trading/OutsideTrading | With the householdId and list of custodians, create new custodians for the household. |
| POST | /v1/Trading/OutsideTrading/CreateClientAndCustodian | Trading/OutsideTrading | From the firm name and list of custodians, a client, registration and custodians will be created. |
| POST | /v1/Trading/OutsideTrading/OutsideTradingCreateTradeFiles | Trading/OutsideTrading | From the returned list of orders create blocks and return the trade file. |
| PUT | /v1/Trading/OutsideTrading/UpdateBlockAccountNumber | Trading/OutsideTrading | Update the Block Account Number |
| POST | /v1/Trading/OutsideTrading/ValidateAccount | Trading/OutsideTrading | Validate a account |
| POST | /v1/Trading/OutsideTrading/ValidateModel | Trading/OutsideTrading | Validate a model |
| GET | /v1/Trading/PendAccounts | Trading/PendAccounts | Gets a list of pend accounts that the logged in user has access to. The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Trading/PendAccounts | Trading/PendAccounts |  |
| PUT | /v1/Trading/PendAccounts | Trading/PendAccounts |  |
| GET | /v1/Trading/PendAccounts/{key} | Trading/PendAccounts | Gets the pend account that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/PendAccounts/Action/Delete | Trading/PendAccounts |  |
| POST | /v1/Trading/PendAccounts/List | Trading/PendAccounts |  |
| POST | /v1/Trading/PendAccounts/List/Id | Trading/PendAccounts |  |
| GET | /v1/Trading/Ping | Trading/Ping | Used to test access to the batch data service |
| GET | /v1/Trading/PingMany | Trading/PingMany | Used to test access to the batch data service |
| GET | /v1/Trading/Price/ReviewPrices | Trading/Price | Orions the price service review prices asynchronous. |
| GET | /v1/Trading/Products/{ticker}/RealtimePrice | Trading/Products | Returns the real-time price of the product requested if the logged in user has permission to real-time prices. If the user does not or real-time  prices are not available, the most recent Orion price will be returned. |
| GET | /v1/Trading/Products/FundFamilyOverride/{key} | Trading/Products |  |
| POST | /v1/Trading/Products/FundFamilyOverrideSave | Trading/Products |  |
| POST | /v1/Trading/Products/RealtimePrices | Trading/Products |  |
| GET | /v1/Trading/Products/Search | Trading/Products | Gets a simple list of products that the logged in user has access to where the product name or ticker contains the search string. |
| GET | /v1/Trading/Products/Search/{search} | Trading/Products | Gets a simple list of products that the logged in user has access to where the product name or ticker contains the search string. |
| GET | /v1/Trading/Queues | Trading/Queues | Get all trade queues |
| PUT | /v1/Trading/Queues/Action/HoldUntil | Trading/Queues |  |
| PUT | /v1/Trading/Queues/Action/Rebalance/{registrationId} | Trading/Queues | Rebalance trade queue item and returns the trades created. |
| PUT | /v1/Trading/Queues/Action/Reschedule | Trading/Queues |  |
| PUT | /v1/Trading/Queues/Action/Status/{newStatus} | Trading/Queues |  |
| GET | /v1/Trading/QUODD/check | Trading/QUODD | Permission check to show QUODD page(s). If either one is False, the page will not display. For some reason, changing these permissions do not immediately take affect. User needs to wait a few minutes before gainning access. Needs to have access to the RealTimePrices priveliges in order to hit this endpoint. |
| GET | /v1/Trading/QUODD/checkRealTimeStatus | Trading/QUODD |  |
| GET | /v1/Trading/QUODD/signAgreement | Trading/QUODD | Gets a list of users. Checks against the logged-in user. If found sends token and tuple back. Ideally, this method will only be called after demographic informaiton is sent. |
| POST | /v1/Trading/QUODD/update | Trading/QUODD | Creates user information Update user information w/ demographic information Assigns products to user Take note that QUODD checks for dupe client_user_ids. As such, when developing locally, make sure to use the test method below. Needs to have access to the RealTimePrices priveliges in order to hit this endpoint. |
| GET | /v1/Trading/RebalanceLog/{key} | Trading/RebalanceLog | Returns the Rebalance Log for the given key |
| GET | /v1/Trading/RebalanceLog/Account/Simple/{accountId} | Trading/RebalanceLog | Returns simple details for all the Rebalance Logs for the given account. |
| GET | /v1/Trading/RebalanceLog/Instance/Simple/{instanceId} | Trading/RebalanceLog | Returns simple details for all the Rebalance Logs for the given instance. |
| GET | /v1/Trading/Sleeve/Accounts | Trading/Sleeve | Gets a list of account sleeves that the logged in user has access to. The return is limited to pages of 250000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/Sleeve/Accounts/{accountIdOut}/Action/GetETLPreference | Trading/Sleeve | v2 Extract should always be used. |
| PUT | /v1/Trading/Sleeve/Accounts/{accountIdOut}/Action/Transfer | Trading/Sleeve | Use PUT /v1/Portfolio/SleeveTransfer/Action/Transfer/{entitySessionId} instead |
| PUT | /v1/Trading/Sleeve/Accounts/{accountIdOut}/Action/V2PartialETL | Trading/Sleeve |  |
| GET | /v1/Trading/Sleeve/Accounts/{key} | Trading/Sleeve | Gets the account sleeve that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Trading/Sleeve/Accounts/{key}/Histories | Trading/Sleeve | Gets a list of account sleeve histories for the key provided. |
| PUT | /v1/Trading/Sleeve/Accounts/{key}/Validate | Trading/Sleeve | Validates updated values for account sleeve |
| GET | /v1/Trading/Sleeve/Accounts/AgingCashBalance | Trading/Sleeve | Returns accounts (sleeves) that are of type contribution, or distribution, that have a balance, and shows the min transdate since the account was last at $0 (When the cash balance started.) |
| POST | /v1/Trading/Sleeve/Accounts/List | Trading/Sleeve | Gets a list of account sleeves that match one of the keys in the provided list. |
| POST | /v1/Trading/Sleeve/Accounts/List/Id | Trading/Sleeve | Gets a list of account sleeves that match one of the keys in the provided list. |
| GET | /v1/Trading/Sleeve/Registrations | Trading/Sleeve | Gets a list of registration sleeves that the logged in user has access to. The return is limited to pages of 1000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/Sleeve/Registrations/{key} | Trading/Sleeve | Gets the registration sleeve that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/Sleeve/Registrations/{key}/Action/CWMProcess | Trading/Sleeve | Used to update a registration sleeve as well as its underlying account sleeves. |
| PUT | /v1/Trading/Sleeve/Registrations/{key}/Action/MoveInactiveValue | Trading/Sleeve | Moves value in inactive sleeves in the registration to active sleeves |
| GET | /v1/Trading/Sleeve/Registrations/{key}/Check | Trading/Sleeve | Check Registration |
| GET | /v1/Trading/Sleeve/Registrations/{key}/Histories | Trading/Sleeve | Gets a list of registration sleeve histories for the key provided. |
| GET | /v1/Trading/Sleeve/Registrations/{key}/Histories/Accounts | Trading/Sleeve | Gets a list of account sleeve histories for the key provided. |
| GET | /v1/Trading/Sleeve/Registrations/{key}/Histories/Registrations | Trading/Sleeve | Gets a list of registration sleeve histories for the key provided. |
| PUT | /v1/Trading/Sleeve/Registrations/{key}/Validate | Trading/Sleeve | Validate Registration Sleeve |
| DELETE | /v1/Trading/Sleeve/Registrations/{regId} | Trading/Sleeve | Delete sleeves that were mistakenly made |
| GET | /v1/Trading/Sleeve/Registrations/{registrationId}/GetEclipseEnabled | Trading/Sleeve |  |
| PUT | /v1/Trading/Sleeve/Registrations/Action/MoveInactiveValue | Trading/Sleeve | Moves value in all inactive sleeves to active sleeves |
| POST | /v1/Trading/Sleeve/Registrations/Action/Process | Trading/Sleeve | Used to update a registration sleeve as well as its underlying account sleeves. |
| POST | /v1/Trading/Sleeve/Registrations/Action/Process/Batch | Trading/Sleeve | Used to update multiple registrations sleeve as well as its underlying account sleeves. |
| POST | /v1/Trading/Sleeve/Registrations/Action/Process/Historical | Trading/Sleeve | Used to create historical sleeves |
| POST | /v1/Trading/Sleeve/Registrations/Action/Process/Historical/Batch | Trading/Sleeve | Process a batch of historical sleeves import |
| POST | /v1/Trading/Sleeve/Registrations/Action/Process/SleeveSetUpWizard | Trading/Sleeve | Used to update a registration sleeve as well as its underlying account sleeves. |
| POST | /v1/Trading/Sleeve/Registrations/Action/Unlock | Trading/Sleeve | Change registrations to Custom Sleeve by a list of accountIds |
| PUT | /v1/Trading/Sleeve/Registrations/Batch | Trading/Sleeve | Updates registration sleeve values without processing account sleeves. |
| POST | /v1/Trading/Sleeve/Registrations/Guardrails/Action/Validate | Trading/Sleeve |  |
| POST | /v1/Trading/Sleeve/Registrations/ImportCheck | Trading/Sleeve | Import Check |
| GET | /v1/Trading/Sleeve/Registrations/IsDoNotTrade | Trading/Sleeve | Gets the registration sleeves that have IsDoNotTrade = true. This is used by OPS as part of a daily process that sets trade blocks/unblocks. |
| POST | /v1/Trading/Sleeve/Registrations/IsDoNotTrade/Set | Trading/Sleeve | Gets the registration sleeves that have IsDoNotTrade = true. This is used by OPS as part of a daily process that sets trade blocks/unblocks. Updates the IsDoNotTrade value in tblRegistrationSleeve for a list of registration ids. |
| POST | /v1/Trading/Sleeve/Registrations/List | Trading/Sleeve | Gets a list of registration sleeves that match one of the keys in the provided list. |
| POST | /v1/Trading/Sleeve/Registrations/List/Id | Trading/Sleeve | Gets a list of registration sleeves that match one of the keys in the provided list. |
| POST | /v1/Trading/Sleeve/Registrations/ListWithAccountSleeves | Trading/Sleeve | Gets a list of registration sleeves that match one of the keys in the provided list with account sleeves. |
| PUT | /v1/Trading/Sleeve/Registrations/SpecialSleeves | Trading/Sleeve | Process special locked sleeves. This only processes model and platform. |
| PUT | /v1/Trading/Sleeve/Registrations/UpcomingSWP | Trading/Sleeve | A quick update to the Registration Sleeve table to upcomingSWP flag without processing the registration. |
| POST | /v1/Trading/Sleeve/Registrations/UpcomingSWP/CreateAutoJournal | Trading/Sleeve | Creates UpcomingSWP AutoJournal Transactions |
| PUT | /v1/Trading/Sleeve/Registrations/UpdateFirmId/{key} | Trading/Sleeve | A quick update to the Registration Sleeve talbe to write the FirmId to the table without processing the registration. |
| GET | /v1/Trading/SleeveStrategy | Trading/SleeveStrategy | Returns all of the Sleeve Strategies in the database |
| POST | /v1/Trading/SleeveStrategy | Trading/SleeveStrategy | Creates new Sleeve Strategy |
| DELETE | /v1/Trading/SleeveStrategy/{key} | Trading/SleeveStrategy | Deletes the existing Sleeve Strategy |
| GET | /v1/Trading/SleeveStrategy/{key} | Trading/SleeveStrategy | Returns a Sleeve Strategy |
| PUT | /v1/Trading/SleeveStrategy/{key} | Trading/SleeveStrategy | Saves changes to the Sleeve Strategy and the Details |
| POST | /v1/Trading/SleeveStrategy/{key}/{batchId}/Action/Process/Registration | Trading/SleeveStrategy | Used to update multiple registrations sleeves as well as it's underlying account sleeves. |
| POST | /v1/Trading/SleeveStrategy/{key}/Action/Process/Accounts | Trading/SleeveStrategy | Assigns accounts to a Sleeve Strategy |
| POST | /v1/Trading/SleeveStrategy/{key}/Action/Process/Registration | Trading/SleeveStrategy | Overloaded method |
| GET | /v1/Trading/SleeveStrategy/{key}/DetailHistories | Trading/SleeveStrategy | Returns the data regarding the changes in the Sleeve Strategy Detail changes |
| GET | /v1/Trading/SleeveStrategy/{key}/Histories | Trading/SleeveStrategy | Returns the data regarding the changes in the Sleeve Strategy |
| GET | /v1/Trading/SleeveStrategy/{SleeveStrategyId}/AssetLevelsAllowed | Trading/SleeveStrategy | Returns a list of SleeveStrategyAssetLevelAllowed assigned to a SleeveStrategy |
| POST | /v1/Trading/SleeveStrategy/{sleeveStrategyId}/ValidateRegistrationModelAssignments | Trading/SleeveStrategy | Validates selected Models on assigned Registrations against Sleeve Strategy Model Restriction settings. |
| GET | /v1/Trading/SleeveStrategy/CountRegistrationsAssigned/{key} | Trading/SleeveStrategy | Returns how many registration sleeves have been assigned to the Sleeve Strategy |
| GET | /v1/Trading/SleeveStrategy/Element | Trading/SleeveStrategy | Endpoint for element to get sleeve data. |
| GET | /v1/Trading/SleeveStrategy/Element/{sleeveId}/Detail | Trading/SleeveStrategy | Endpoint for Element to get sleeve model details |
| GET | /v1/Trading/SleeveStrategy/Element/{sleeveId}/Registration | Trading/SleeveStrategy | Endpoint for Element to get registrations assigned to a rep and sleeve. |
| GET | /v1/Trading/SleeveStrategy/Element/{sleeveId}/RegWithValue | Trading/SleeveStrategy | Endpoint for Element to get registrations assigned to a rep and sleeve, including value. |
| GET | /v1/Trading/SleeveStrategy/Element/NameInUseValidation | Trading/SleeveStrategy | Endpoint for element to validate a sleeve name. |
| GET | /v1/Trading/SleeveStrategy/RegistrationsAssignedSimple/{key} | Trading/SleeveStrategy | Returns the Registration Sleeve information for the sleeves assigned to the Sleeve Strategy |
| GET | /v1/Trading/SleeveStrategy/Reps/{repId}/Simple | Trading/SleeveStrategy |  |
| GET | /v1/Trading/SleeveStrategy/Restrictions | Trading/SleeveStrategy | Gets a list of sleeve strategy restrictions that the logged in user has access to. |
| POST | /v1/Trading/SleeveStrategy/Restrictions | Trading/SleeveStrategy | Used to create a new sleeve strategy restriction. Upon successful creation a 201 will be returned with the location of the nearly created sleeve strategy. |
| DELETE | /v1/Trading/SleeveStrategy/Restrictions/{key} | Trading/SleeveStrategy | Used to delete an existing sleeve strategy restriction. Upon successful deletion a 204 will be returned. |
| GET | /v1/Trading/SleeveStrategy/Restrictions/{key} | Trading/SleeveStrategy | Gets the sleeve strategy restriction that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/SleeveStrategy/Restrictions/{key} | Trading/SleeveStrategy | Used to update an existing sleeve strategy restriction. Upon successful modification a 200 will be returned. |
| GET | /v1/Trading/SleeveStrategy/ReturnBatchId | Trading/SleeveStrategy | This method creates a new batchid for consumption later. The batchId identifies the run of sleeve strategies being modified by the user. |
| GET | /v1/Trading/SleeveStrategy/ReturnRegSleeveWithStrategy/{key} | Trading/SleeveStrategy | Used to update multiple registrations sleeves as well as it's underlying account sleeves. |
| GET | /v1/Trading/SleeveStrategy/Search | Trading/SleeveStrategy | Returns a list of the Sleeve Strategy id and names beginning with the searchText provided. |
| GET | /v1/Trading/SleeveStrategy/Search/{search} | Trading/SleeveStrategy | Returns a list of the Sleeve Strategy id and names beginning with the searchText provided. |
| GET | /v1/Trading/SleeveStrategy/Simple | Trading/SleeveStrategy | Returns a list of all the Sleeve Strategy id and names |
| POST | /v1/Trading/SleeveStrategy/StrategyStatistics | Trading/SleeveStrategy | Returns performance statistics for strategy |
| PUT | /v1/Trading/SleeveStrategy/UpdateSubstitutes/{strategyId}/{detailId} | Trading/SleeveStrategy | Saves changes to the Sleeve Strategy Details Substitutes |
| GET | /v1/Trading/SleeveStrategy/Verbose | Trading/SleeveStrategy |  |
| POST | /v1/Trading/SleeveStrategy/Verbose | Trading/SleeveStrategy | Create a new Portfolio Target Strategy |
| GET | /v1/Trading/SleeveStrategy/Verbose/{key} | Trading/SleeveStrategy |  |
| PUT | /v1/Trading/SleeveStrategy/Verbose/{key} | Trading/SleeveStrategy | Update Portfolio Target Strategy |
| POST | /v1/Trading/SleeveStrategy/Verbose/List | Trading/SleeveStrategy |  |
| POST | /v1/Trading/SleeveStrategy/Verbose/List/Id | Trading/SleeveStrategy |  |
| GET | /v1/Trading/SleeveStrategyAggregate | Trading/SleeveStrategyAggregate | Returns all of the Sleeve Strategies Aggregates in the database |
| POST | /v1/Trading/SleeveStrategyAggregate | Trading/SleeveStrategyAggregate | Creates new Sleeve Strategy Aggregate |
| DELETE | /v1/Trading/SleeveStrategyAggregate/{key} | Trading/SleeveStrategyAggregate | Deletes the existing Sleeve Strategy Aggregate |
| GET | /v1/Trading/SleeveStrategyAggregate/{key} | Trading/SleeveStrategyAggregate | Returns the Sleeve Strategies Aggregates for the given key. |
| PUT | /v1/Trading/SleeveStrategyAggregate/{key} | Trading/SleeveStrategyAggregate | Saves changes to the Sleeve Strategy Aggregate and the Details |
| POST | /v1/Trading/SleeveStrategyAggregate/{key}/Action/Process/Registration | Trading/SleeveStrategyAggregate | Used to update multiple registrations sleeves as well as it's underlying account sleeves. |
| GET | /v1/Trading/SleeveStrategyAggregate/{key}/DetailHistories | Trading/SleeveStrategyAggregate | Returns the data regarding the changes in the Sleeve Strategy Detail changes |
| GET | /v1/Trading/SleeveStrategyAggregate/{key}/Histories | Trading/SleeveStrategyAggregate | Returns the data regarding the changes in the Sleeve Strategy Aggregates. |
| GET | /v1/Trading/SleeveStrategyAggregate/CountRegistrationsAssigned/{key} | Trading/SleeveStrategyAggregate | Returns how many registration sleeves have been assigned to the Sleeve Strategy |
| GET | /v1/Trading/SleeveStrategyAggregate/RegistrationsAssignedSimple/{key} | Trading/SleeveStrategyAggregate | Returns the Registration Sleeve information for the sleeves assigned to the Sleeve Strategy Aggregate |
| GET | /v1/Trading/SleeveStrategyAggregate/Restrictions | Trading/SleeveStrategyAggregate | Gets a list of sleeve strategy aggregate restrictions that the logged in user has access to. |
| POST | /v1/Trading/SleeveStrategyAggregate/Restrictions | Trading/SleeveStrategyAggregate | Used to create a new sleeve strategy aggregate restriction. Upon successful creation a 201 will be returned with the location of the nearly created sleeve strategy. |
| DELETE | /v1/Trading/SleeveStrategyAggregate/Restrictions/{key} | Trading/SleeveStrategyAggregate | Used to delete an existing sleeve strategy aggregate restriction. Upon successful deletion an <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/204">HTTP 204 status code</a> is returned. |
| GET | /v1/Trading/SleeveStrategyAggregate/Restrictions/{key} | Trading/SleeveStrategyAggregate | Gets the sleeve strategy aggregate restriction that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/SleeveStrategyAggregate/Restrictions/{key} | Trading/SleeveStrategyAggregate | Used to update an existing sleeve strategy aggregate restriction. Upon successful modification a 200 will be returned. |
| GET | /v1/Trading/SleeveStrategyAggregate/ReturnRegSleeveWithStrategyAggregate/{key} | Trading/SleeveStrategyAggregate | Used to update multiple registrations sleeves as well as it's underlying account sleeves. |
| GET | /v1/Trading/SleeveStrategyAggregate/Search | Trading/SleeveStrategyAggregate | Returns a list of the Sleeve Strategy Aggregate ids and names beginning with the searchText provided. |
| GET | /v1/Trading/SleeveStrategyAggregate/Search/{search} | Trading/SleeveStrategyAggregate | Returns a list of the Sleeve Strategy Aggregate ids and names beginning with the searchText provided. |
| GET | /v1/Trading/SleeveStrategyAggregate/Simple | Trading/SleeveStrategyAggregate | Returns a list of all the Sleeve Strategy Aggregate id and names |
| GET | /v1/Trading/SleeveStrategyRiskType | Trading/SleeveStrategyRiskType | Returns all Sleeve Strategy Risk Types |
| PUT | /v1/Trading/SleeveStrategyRiskType | Trading/SleeveStrategyRiskType | Update list of Sleeve Strategy Risk Types |
| GET | /v1/Trading/SleeveStrategyRiskType/{key} | Trading/SleeveStrategyRiskType | Returns Sleeve Strategy Risk Types by key |
| PUT | /v1/Trading/SleeveStrategyRiskType/{key} | Trading/SleeveStrategyRiskType | Update list of Sleeve Strategy Risk Types |
| GET | /v1/Trading/SleeveUpdateQueue | Trading/SleeveUpdateQueue | Returns all of the Sleeve Update Queue items in the database |
| POST | /v1/Trading/SleeveUpdateQueue | Trading/SleeveUpdateQueue | Update list of Sleeve Update Queues |
| GET | /v1/Trading/SleeveUpdateQueue/{key} | Trading/SleeveUpdateQueue | Returns the Sleeve Update Queue item in the database |
| POST | /v1/Trading/SleeveUpdateQueue/Action/ProcessAllApproved | Trading/SleeveUpdateQueue | Process all of the approved Sleeve Update Queue items |
| PUT | /v1/Trading/SleeveUpdateQueue/UdpateStatus/{key} | Trading/SleeveUpdateQueue | Update one Sleeve Update Queue |
| PUT | /v1/Trading/SleeveUpdateQueue/UdpateStatusList | Trading/SleeveUpdateQueue | Update list of Sleeve Update Queues |
| GET | /v1/Trading/SummaryCount | Trading/SummaryCount | Returns the number of open orders, pending transactions, and allocation orders the logged in user has access to. |
| POST | /v1/Trading/Tactical | Trading/Tactical | Endpoint to create new trade |
| PUT | /v1/Trading/Tactical | Trading/Tactical | Recalculate trade shares, trade and post trade amounts. |
| PUT | /v1/Trading/Tactical/{accountId}/{productId} | Trading/Tactical | Recalculate trade shares, trade and post trade amounts without saving to db. |
| GET | /v1/Trading/Tactical/Account/{accountId} | Trading/Tactical | Gets a list of tactical trades by account. |
| GET | /v1/Trading/Tactical/AccountList | Trading/Tactical | Gets a list of tactical trades by list of account ids. |
| POST | /v1/Trading/Tactical/AccountList | Trading/Tactical | Gets a list of tactical trades by list of account ids. |
| PUT | /v1/Trading/Tactical/Action/Balance | Trading/Tactical | Balance rows in memory |
| PUT | /v1/Trading/Tactical/Action/BuyProportionately | Trading/Tactical | Spend available cash pro rata to the model |
| PUT | /v1/Trading/Tactical/Action/BuyRebalance | Trading/Tactical | Buy all underweight products up their model targets |
| PUT | /v1/Trading/Tactical/Action/SellProportionately | Trading/Tactical | Sell positions in proportion to the model target % to raise specified amount |
| PUT | /v1/Trading/Tactical/Action/SellRebalance | Trading/Tactical | Sell all overweight positions to their target percents |
| PUT | /v1/Trading/Tactical/Action/TargetAmount | Trading/Tactical | Assign target percent to specified rows and update update rows |
| PUT | /v1/Trading/Tactical/Action/TargetPercent | Trading/Tactical | Assign target percent to specified rows and update update rows |
| PUT | /v1/Trading/Tactical/Action/TradingRebalance | Trading/Tactical | Generate trades to balance account |
| GET | /v1/Trading/Tactical/Client/{clientId} | Trading/Tactical | Gets a list of tactical trades by household. |
| PUT | /v1/Trading/Tactical/ClosedOrders | Trading/Tactical | Gets a list of tactical trades by list of account ids. |
| GET | /v1/Trading/Tactical/Product/{productId} | Trading/Tactical | Gets a list of tactical trades by product. |
| GET | /v1/Trading/Tactical/Registration/{registrationId} | Trading/Tactical | Gets a list of tactical trades by registration. |
| PUT | /v1/Trading/Tactical/TradingTool | Trading/Tactical | Endpoint to run trading tools |
| PUT | /v1/Trading/TradeBlockReasons | Trading/TradeBlockReasons |  |
| DELETE | /v1/Trading/TradeBlockReasons/{tradeBlockReasonGlobalId} | Trading/TradeBlockReasons |  |
| GET | /v1/Trading/TradeBlocks | Trading/TradeBlocks |  |
| POST | /v1/Trading/TradeBlocks | Trading/TradeBlocks | Creates trade block detail records for the given {tradeBlockDetailDtos} payload. |
| PUT | /v1/Trading/TradeBlocks | Trading/TradeBlocks | Replaces trade block detail records with the given {tradeBlockDetailDtos} payload. |
| DELETE | /v1/Trading/TradeBlocks/{tradeBlockId} | Trading/TradeBlocks | Deletes the trade block details record identified by the given {tradeBlockId}. |
| GET | /v1/Trading/TradeBlocks/{tradeBlockId} | Trading/TradeBlocks | Returns the Trade Block Detail having the given ID. |
| POST | /v1/Trading/TradeBlocks/DeleteByGlobalIds | Trading/TradeBlocks | Deletes the trade block details records identified by the collection of {tradeBlockDetailIds} in the payload. |
| POST | /v1/Trading/TradeBlocks/DeleteRequests | Trading/TradeBlocks | Deletes the trade block details records identified by the collection of {tradeBlockDetailIds} in the payload. |
| POST | /v1/Trading/TradeBlocks/QueueForAccountIds | Trading/TradeBlocks | Creates outbox events for the provided {accountIds} with active Trade Block Details. |
| GET | /v1/Trading/TradeBlocks/Reasons | Trading/TradeBlocks | Returns Trade Block Reasons |
| GET | /v1/Trading/TradeBlocks/Reasons/Simple | Trading/TradeBlocks | Returns a simple list of Trade Block Reasons for the OAS.Search. |
| GET | /v1/Trading/TradeBlocks/Related | Trading/TradeBlocks | Returns Trade Block Related Entities |
| GET | /v1/Trading/TradeDefinition | Trading/TradeDefinition | This generates a generic trade definition loaded with the database default settings.  This object can be retrieved, filled in with trade instructions, and sent to the Trade Generation Routines. |
| GET | /v1/Trading/TradeExecution/ErrorCheck | Trading/TradeExecution |  |
| GET | /v1/Trading/TradeFiles | Trading/TradeFiles | Gets a list of trade files that have already been generated that the logged in user has access to and were created within the range provided.  The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/TradeFiles/{fileId} | Trading/TradeFiles | Gets a trade file that has already been generated and has the key provided. |
| GET | /v1/Trading/TradeFiles/{fileId}/File | Trading/TradeFiles | Downloads the trade file to the browser using an http stream for the given TradeFile.Id.  This method will also update the trade file as "processed", each time it is called. |
| GET | /v1/Trading/TradeFiles/{fileId}/Log | Trading/TradeFiles | Downloads the trade log to the browser using an http stream for the given TradeFile.Id. |
| GET | /v1/Trading/TradeFiles/{fileId}/Reset | Trading/TradeFiles | Resets the provided trade file. |
| POST | /v1/Trading/TradeFiles/{fileId}/Transmit | Trading/TradeFiles | Transmits trade file to ftp destination. |
| POST | /v1/Trading/TradeFiles/CreateTradeFileFromAllocations | Trading/TradeFiles | Creates a trade file from allocation block.  Takes one or more blockIds |
| GET | /v1/Trading/TradeFiles/Fees | Trading/TradeFiles | Gets a list of trade files that have already been generated that the logged in user has access to and were created within the range provided.  The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| GET | /v1/Trading/TradeFiles/WithProcessing | Trading/TradeFiles | Returns the Trade files that were created on the specified date, also adds "temporary" records in for currently processing files. |
| GET | /v1/Trading/TradeGenerationStatus/{batchId} | Trading/TradeGenerationStatus | Gets the status of trade generation for the batchId provided. |
| GET | /v1/Trading/TradeGenerationStatus/{batchId}/Message | Trading/TradeGenerationStatus | Returns a message formatted for the users inbox based on a trade batch id. |
| GET | /v1/Trading/TradeStatuses | Trading/TradeStatuses | Gets a list of trade statuses that the logged in user has access to. |
| GET | /v1/Trading/TradeValidation | Trading/TradeValidation | Gets account trade validation. |
| GET | /v1/Trading/Transactions | Trading/Transactions |  |
| PUT | /v1/Trading/Transactions | Trading/Transactions | Obsolete. Will be removed after the June 2014 build. Use Portfolio/Transactions/Verbose instead. |
| GET | /v1/Trading/Transactions/{key} | Trading/Transactions | Gets the transaction that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/Transactions/{key} | Trading/Transactions | Obsolete. Will be removed after the June 2014 build. Use Portfolio/Transactions/Verbose/{key} instead. |
| PUT | /v1/Trading/Transactions/Action/Delete | Trading/Transactions |  |
| PUT | /v1/Trading/Transactions/Action/StatusChange/{status} | Trading/Transactions |  |
| POST | /v1/Trading/Transactions/List | Trading/Transactions | Gets a list of transactions that match one of the keys in the provided list. |
| POST | /v1/Trading/Transactions/List/Id | Trading/Transactions | Gets a list of transactions that match one of the keys in the provided list. |
| GET | /v1/Trading/TransactionSubTypes | Trading/TransactionSubTypes | Returns a list of all the transaction sub types that the logged in user has access to. |
| GET | /v1/Trading/TransactionTypes | Trading/TransactionTypes | Returns a list of all the transaction types that the logged in user has access to. |
| GET | /v1/Trading/TransactionTypes/{key} | Trading/TransactionTypes | Gets the TransType that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Trading/UnallocatedOrders | Trading/UnallocatedOrders | Creates a new order, and ties it to the block. |
| PUT | /v1/Trading/UnallocatedOrders | Trading/UnallocatedOrders |  |
| DELETE | /v1/Trading/UnallocatedOrders/{key} | Trading/UnallocatedOrders |  |
| GET | /v1/Trading/UnallocatedOrders/{key} | Trading/UnallocatedOrders | Gets the order that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Trading/UnallocatedOrders/{key} | Trading/UnallocatedOrders | Updates the OrderQty only on the orders object. |
| GET | /v1/Trading/UnallocatedOrders/New/BlockId/{blockId}/AccountId/{accountId} | Trading/UnallocatedOrders | Returns a newly initialized unallocated dto based on the accountId, and blockId.  It does not create a record in the database, Update must be called to persist to database. |
| GET | /v1/Trading/UploadTargets/Simple | Trading/UploadTargets | Gets a simple list of upload targets that the logged in user has access to. |
| POST | /v1/Trading/ValidateImport/Distributions | Trading/ValidateImport | Takes an xlsx, xls, or csv file as multipart content. The file needs either an account id column (named  "account id", "accountid", "pkaccount", "acct id", or "acctid") or an account number column (named "account number", or "acct number"). The file will be processed and returned as a list signifying the id or number provided. If the account  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/Trading/ValidateImport/FeeAndLoanDistribution | Trading/ValidateImport | Takes an xlsx, xls, or csv file as multipart content. The file needs either an account id column (named  "account id", "accountid", "pkaccount", "acct id", or "acctid") or an account number column (named "account number", or "acct number"). The file will be processed and returned as a list signifying the id or number provided. If the account  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/Trading/ValidateImport/FeeAndLoanDistribution/Import | Trading/ValidateImport |  |
| POST | /v1/Trading/ValidateImport/Orders | Trading/ValidateImport | Takes an xlsx, xls, or csv file as multipart content. The file needs either an account id column (named  "account id", "accountid", "pkaccount", "acct id", or "acctid") or an account number column (named "account number", or "acct number"). The file will be processed and returned as a list signifying the id or number provided. If the account  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/Trading/ValidateImport/Orders/List | Trading/ValidateImport | Takes a list of accounts. At a minimum either the Id property or the number property must be filled in. The list  will be processed and returned. If the account  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| GET | /v1/Trading/ValidateImport/Orders/Templates/Csv | Trading/ValidateImport |  |
| GET | /v1/Trading/ValidateImport/Orders/Templates/Xls | Trading/ValidateImport |  |
| GET | /v1/Trading/ValidateImport/Orders/Templates/Xlsx | Trading/ValidateImport |  |
| POST | /v1/Trading/ValidateImport/Sleeve/Registrations/ValidateImport/Sleeve/Registration | Trading/ValidateImport | Import Sleeves |
| POST | /v1/Trading/ValidateImport/Sleeve/Registrations/ValidateImport/Sleeve/Registration/HistoricalSleeveImport | Trading/ValidateImport | Import historical Sleeves |
| POST | /v1/Trading/ValidateImport/Sleeve/Registrations/WithoutProcess | Trading/ValidateImport | Import registration sleeve changes without processing account sleeves |
| POST | /v1/Trading/ValidateImport/SleeveStrategy/Registrations/Import/Batch | Trading/ValidateImport | Used to assign Sleeve Strategy Aggregates to Registrations in bulk with import. |
| POST | /v1/Trading/ValidateImport/SleeveStrategy/Registrations/Validate | Trading/ValidateImport | Validates import file for processing. |
| POST | /v1/Trading/ValidateImport/Strategy | Trading/ValidateImport | Takes an xlsx, xls, or csv file as multipart content. The file will be processed and returned. If the account valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/Trading/ValidateImport/Strategy/ProcessImport | Trading/ValidateImport | The method runs a buld insert to a temp table from the import file then runs a procedure that creates the strategies. |
| POST | /v1/Trading/ValidateImport/Strategy/Revalidate | Trading/ValidateImport | Takes a List ValidateStrategiesDto. The dto will be processed and returned. If the account valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/Trading/ValidateImport/StrategyAggregate | Trading/ValidateImport | Takes an xlsx, xls, or csv file as multipart content. The file will be processed and returned. If the account valid, the "isValid" property will be true.  If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/Trading/ValidateImport/StrategyAggregate/ProcessImport | Trading/ValidateImport | The method runs a buld insert to a temp table from the import file then runs a procedure that creates the strategy aggregates. |
| POST | /v1/Trading/ValidateImport/StrategyAggregate/Revalidate | Trading/ValidateImport | Takes a List ValidateStrategyAggregatesDto. The dto will be processed and returned. If the account valid, the "isValid" property will be true.  If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| DELETE | /v1/User/Homepage/Assigned/Dashboards/{dashboardId}/Cards/{cardId} | User/Homepage | Remove card from dashboard. |
| GET | /v1/User/Homepage/Assigned/PortfolioView/Dashboards/{dashboardName} | User/Homepage | Get assigned portfolio view dashboard for the current login user. |
| POST | /v1/User/Homepage/RoleDashboards | User/Homepage |  |
| POST | /v1/User/Homepage/UserDashboards | User/Homepage |  |
| GET | /v1/Utility/APILogs | Utility/APILogs | Get a list of API log records for the current users "partnerAppId". |
| GET | /v1/Utility/APILogs/{correlationId} | Utility/APILogs | Get a single api log record for the correlation id. |
| POST | /v1/Utility/Archive/Blobs | Utility/Archive | Trigger policy blob archiver |
| POST | /v1/Utility/Archive/Relocate/S3/Database | Utility/Archive | Initiate a hangfire job to relocate file from s3 to database for all files with EFileLocation =  EFileLocation.AmazonS3. |
| POST | /v1/Utility/Archive/Relocate/S3/Database/Blob/List | Utility/Archive | Initiate hangfire job to relocate file from s3 to database for file with  EFileLocation =  EFileLocation.AmazonS3. |
| POST | /v1/Utility/Archive/Retire | Utility/Archive | Retire all blobs from database. |
| POST | /v1/Utility/AuditAlert | Utility/AuditAlert |  |
| GET | /v1/Utility/BatchProcessing | Utility/BatchProcessing |  |
| GET | /v1/Utility/BatchProcessing/{batchId} | Utility/BatchProcessing | Gets the status of batch processing for the batchId provided. |
| GET | /v1/Utility/BatchProcessing/{batchId}/Errors | Utility/BatchProcessing | Gets all errors for a specific batchId |
| GET | /v1/Utility/BatchProcessing/Counts | Utility/BatchProcessing |  |
| GET | /v1/Utility/BatchProcessing/GetLast | Utility/BatchProcessing | Gets the status of batch processing for the batchId provided. |
| POST | /v1/Utility/BatchProcessing/List | Utility/BatchProcessing |  |
| POST | /v1/Utility/BatchProcessing/List/Id | Utility/BatchProcessing |  |
| POST | /v1/Utility/Cache/Test | Utility/Cache |  |
| GET | /v1/Utility/DatabaseActionQueue | Utility/DatabaseActionQueue |  |
| POST | /v1/Utility/DatabaseActionQueue | Utility/DatabaseActionQueue |  |
| GET | /v1/Utility/DatabaseActionQueue/{databaseActionQueueID} | Utility/DatabaseActionQueue |  |
| GET | /v1/Utility/DatabaseGroups | Utility/DatabaseGroups |  |
| POST | /v1/Utility/DatabaseGroups | Utility/DatabaseGroups | Creates a new Database Group record, and returns the new record in the location header. |
| DELETE | /v1/Utility/DatabaseGroups/{key} | Utility/DatabaseGroups |  |
| GET | /v1/Utility/DatabaseGroups/{key} | Utility/DatabaseGroups | Gets the Database Group that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Utility/DatabaseGroups/{key} | Utility/DatabaseGroups | Updates an existing Database Group record. |
| GET | /v1/Utility/DatabaseGroups/Simple | Utility/DatabaseGroups | Returns a simple Id/Name for all Database Group records |
| POST | /v1/Utility/DateExpressions | Utility/DateExpressions |  |
| POST | /v1/Utility/DateExpressions/{asOfDate} | Utility/DateExpressions |  |
| POST | /v1/Utility/EmailClients | Utility/EmailClients | Used to email one message to a number of provided clients. |
| POST | /v1/Utility/EntitySession/{parseAsType}/{entityType} | Utility/EntitySession |  |
| POST | /v1/Utility/EntitySession/SimpleFile/{parseAsType}/{entityType} | Utility/EntitySession | Creates an entity session ID to associate selected ids Sample Request POST /EntitySession/IdList/Account [1, 2, 3] |
| POST | /v1/Utility/Excel | Utility/Excel | Converts the provided IWorkbook to an excel file. |
| GET | /v1/Utility/Excel/Run/{filename} | Utility/Excel | Used to download a previously generated Excel Export. |
| GET | /v1/Utility/FeatureFlag | Utility/FeatureFlag | When this endpoint is called without querystring params, then returns all the feature flag for which the privilege is null or user has privilege. if the query param is provided then the corresponding feature flag details will be returned but if the user does not have  privilege then empty result is returned |
| PUT | /v1/Utility/FeatureFlag/{featureFlagId} | Utility/FeatureFlag | When this endpoint is called it should update the Global value database column based on the FeatureFlagId, If the  global value is not null or empty then delete all the records from tblFeatureFlagAlClient When this endpoint is called and user don’t have the privilege FeatureFlags or  don’t have the privilege associated on the definition(if it is not null) Then Unauthorized is returned |
| GET | /v1/Utility/FeatureFlag/{featureFlagId}/AlClient | Utility/FeatureFlag | when there is corresponding record on the FeatureFlagAlClient then use that  records value, if not use the tblFeatureFlag Default value for the value when this endpoint is called and user does not have privilege featureflags then unauthorized is returned. |
| POST | /v1/Utility/FeatureFlag/{featureFlagId}/AlClient | Utility/FeatureFlag |  |
| POST | /v1/Utility/FileToBase64 | Utility/FileToBase64 | Takes a file as multipart content. The file will be returned as a base64 string. |
| GET | /v1/Utility/Groupings | Utility/Groupings |  |
| GET | /v1/Utility/Groupings/{key} | Utility/Groupings |  |
| GET | /v1/Utility/Groupings/AccessPerson | Utility/Groupings | Returns list of representative for grouping view. |
| GET | /v1/Utility/Groupings/Accounts | Utility/Groupings | Returns list of account for grouping view. |
| POST | /v1/Utility/Groupings/Accounts | Utility/Groupings | Returns list of account for grouping view. |
| PUT | /v1/Utility/Groupings/Action/Refresh | Utility/Groupings |  |
| GET | /v1/Utility/Groupings/Clients | Utility/Groupings | Returns list of clients for grouping view. |
| POST | /v1/Utility/Groupings/Clients | Utility/Groupings | Returns list of clients for grouping view. |
| GET | /v1/Utility/Groupings/Entities | Utility/Groupings | Returns a list of entities that have dynamic groups associated to them. |
| GET | /v1/Utility/Groupings/Registrations | Utility/Groupings | Returns list of registration for grouping view. |
| POST | /v1/Utility/Groupings/Registrations | Utility/Groupings | Returns list of registration for grouping view. |
| GET | /v1/Utility/Groupings/Representatives | Utility/Groupings | Returns list of representative for grouping view. |
| POST | /v1/Utility/Groupings/Representatives | Utility/Groupings | Returns list of representative for grouping view. |
| GET | /v1/Utility/Groupings/Simple | Utility/Groupings |  |
| GET | /v1/Utility/Hangfire/Servers | Utility/Hangfire |  |
| POST | /v1/Utility/HomepageDashboard/Export/Excel | Utility/HomepageDashboard |  |
| GET | /v1/Utility/Html/{sessionId} | Utility/Html |  |
| POST | /v1/Utility/Html2Pdf | Utility/Html2Pdf |  |
| GET | /v1/Utility/Html2Pdf/{sessionId} | Utility/Html2Pdf |  |
| GET | /v1/Utility/Import | Utility/Import | Gets a list view of Imports for the Custom Import process. |
| POST | /v1/Utility/Import/{state} | Utility/Import | Genericized endpoint to process the provided import object, for the provided state. E.G. If the user passes in Validate, and has the ImportId and ImportTypeId populated in the input object, the user will receive the current validation state of the import. |
| PUT | /v1/Utility/Import/Common/{id}/{alClientId}/Apply | Utility/Import | Applies a single client's data in a multi-db custom import |
| PUT | /v1/Utility/Import/Common/{id}/{alClientId}/Create | Utility/Import | Creates a single client's import for a multi-db custom import |
| PUT | /v1/Utility/Import/Common/{id}/{alClientId}/Delete | Utility/Import | Reverses a single client's data in a multi-db custom import |
| PUT | /v1/Utility/Import/Common/{id}/{alClientId}/ExcludeErrors | Utility/Import | Excludes Errors for a single client's data in a multi-db custom import |
| PUT | /v1/Utility/Import/Common/{id}/{alClientId}/Reset | Utility/Import | Resets a single client's data in a multi-db custom import |
| PUT | /v1/Utility/Import/Common/{id}/{alClientId}/Reverse | Utility/Import | Reverses a single client's data in a multi-db custom import |
| PUT | /v1/Utility/Import/Common/{id}/{alClientId}/Status | Utility/Import | Updates the status for a ImportCommon |
| PUT | /v1/Utility/Import/Common/{id}/{alClientId}/Validate | Utility/Import | Validates a single client's data in a multi-db custom import |
| GET | /v1/Utility/Import/Common/{key} | Utility/Import | Gets a Common Import by Id |
| PUT | /v1/Utility/Import/Common/{key}/{importAction} | Utility/Import | Requeue's common import ext records for update |
| POST | /v1/Utility/Import/Common/CreateFromFile | Utility/Import | Creates a new import based on the provided object for multi database imports. |
| GET | /v1/Utility/Import/Common/Detail | Utility/Import | Get a list of ImportCommonExtImportCommonDto for MultiDB Custom Imports |
| GET | /v1/Utility/Import/Common/Details/{importCommonId} | Utility/Import |  |
| GET | /v1/Utility/Import/Common/GetFile/{key} | Utility/Import | Gets a Common Import by Id |
| GET | /v1/Utility/Import/Common/Summary/{importCommonId} | Utility/Import |  |
| GET | /v1/Utility/Import/Common/UserDatabases | Utility/Import | Return a list of Databases for the user |
| POST | /v1/Utility/Import/Create | Utility/Import | Creates a new import based on the provided object. |
| POST | /v1/Utility/Import/CreateFromFile | Utility/Import | Creates a new import based on the provided object |
| PUT | /v1/Utility/Import/DeleteMany | Utility/Import |  |
| GET | /v1/Utility/Import/PostImport/{key} | Utility/Import |  |
| GET | /v1/Utility/Import/PreImport/{key} | Utility/Import |  |
| GET | /v1/Utility/ImportType | Utility/ImportType | Gets a list of ImportTypes available for the Custom Import process. |
| GET | /v1/Utility/ImportType/{key} | Utility/ImportType | Gets the ImportType for the Custom Process, including Column definitions and SlickGrid display definitions |
| GET | /v1/Utility/ImportType/{name} | Utility/ImportType |  |
| GET | /v1/Utility/ImportType/All | Utility/ImportType | Gets all import types in the system. |
| POST | /v1/Utility/ImportType/UpdateConfigJson/{key} | Utility/ImportType | This is for the modification of the import types. This is only something we should be doing in Dev or Test, and only certain people should be able to access it. |
| POST | /v1/Utility/Logging/{eventName} | Utility/Logging | Used to log custom users information |
| GET | /v1/Utility/MaintenanceLastRun/{key} | Utility/MaintenanceLastRun | Gets the Maintenance Last Run that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Utility/PageQueries | Utility/PageQueries | Returns page queries for the specified page code. |
| POST | /v1/Utility/PageQueries | Utility/PageQueries | This POST, will return the same information as the GET, however the POST allows default values to be passed in the body, so the parameters will be returned with the specified defaults already populated. This is meant for use where the interface needs to pass in parameters based on the context of where they are in the application, but the UI does not want to prompt the user for the information. |
| GET | /v1/Utility/PageQueries/{key} | Utility/PageQueries | Returns page query for the specified key. |
| POST | /v1/Utility/PageQueries/{pageQueryId}/Count | Utility/PageQueries | TODO: Ben |
| POST | /v1/Utility/PageQueries/{pageQueryId}/Results | Utility/PageQueries | TODO: Ben |
| GET | /v1/Utility/Pgp/UserIds | Utility/Pgp |  |
| GET | /v1/Utility/PreviousBusinessDay | Utility/PreviousBusinessDay |  |
| GET | /v1/Utility/PreviousBusinessDay/v2 | Utility/PreviousBusinessDay | Returns the Previous Business Day |
| GET | /v1/Utility/Process/Actions | Utility/Process |  |
| POST | /v1/Utility/Process/Actions | Utility/Process | Adds a new Corporate Action Extension to the database. |
| DELETE | /v1/Utility/Process/Actions/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Actions/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Utility/Process/Actions/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Utility/Process/Assignments | Utility/Process | Get all Corporate Action Processes The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Utility/Process/Assignments | Utility/Process | Add new task |
| DELETE | /v1/Utility/Process/Assignments/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Assignments/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Utility/Process/Assignments/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Utility/Process/Definitions | Utility/Process |  |
| POST | /v1/Utility/Process/Definitions | Utility/Process | Adds a new Corporate Action Extension to the database. |
| DELETE | /v1/Utility/Process/Definitions/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Definitions/{key} | Utility/Process |  |
| PUT | /v1/Utility/Process/Definitions/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Utility/Process/Definitions/{key}/Detail | Utility/Process |  |
| GET | /v1/Utility/Process/Elements | Utility/Process | Get all Corporate Action Processes The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Utility/Process/Elements | Utility/Process | Add new task |
| DELETE | /v1/Utility/Process/Elements/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Elements/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Utility/Process/Elements/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Elements/{key}/Descendants | Utility/Process |  |
| GET | /v1/Utility/Process/Events | Utility/Process | Get all Corporate Action Processes The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Utility/Process/Events | Utility/Process | Add new task |
| DELETE | /v1/Utility/Process/Events/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Events/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Utility/Process/Events/{key} | Utility/Process |  |
| POST | /v1/Utility/Process/Fields | Utility/Process | Add new task |
| DELETE | /v1/Utility/Process/Fields/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Fields/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Utility/Process/Fields/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Utility/Process/Instances | Utility/Process |  |
| POST | /v1/Utility/Process/Instances | Utility/Process |  |
| DELETE | /v1/Utility/Process/Instances/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Instances/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Participants | Utility/Process |  |
| POST | /v1/Utility/Process/Participants | Utility/Process | Add new task |
| DELETE | /v1/Utility/Process/Participants/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Participants/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Utility/Process/Participants/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Utility/Process/Tasks | Utility/Process | Get all Corporate Action Processes The return is limited to pages of 10000. Use $top and $skip in the query string to page through the data. |
| POST | /v1/Utility/Process/Tasks | Utility/Process | Add new task |
| DELETE | /v1/Utility/Process/Tasks/{key} | Utility/Process |  |
| GET | /v1/Utility/Process/Tasks/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Utility/Process/Tasks/{key} | Utility/Process | Gets the Corporate Action Extension that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/Utility/Routing/Trading/AssignAccounts/SleeveStrategy/{sleeveStrategyId} | Utility/Routing | Assign Accounts to SleeveStrategy |
| POST | /v1/Utility/Routing/Trading/CreateTrade | Utility/Routing | Create a trade in Eclipse |
| GET | /v1/Utility/Routing/Trading/Instance/{tradeInstanceId} | Utility/Routing | Get TradeInstances |
| POST | /v1/Utility/Routing/Trading/Instances/{tradeInstanceId}/UpdateStatus | Utility/Routing |  |
| GET | /v1/Utility/Routing/Trading/Instances/{tradeOrderInstanceId}/Trades | Utility/Routing | Returns the trade orders from Eclipse based on an Instance ID |
| POST | /v1/Utility/Routing/Trading/Instances/Trades | Utility/Routing | Returns the trade orders from Eclipse based on an Instance ID |
| PUT | /v1/Utility/Routing/Trading/Model/{modelId}/SetEditedBy | Utility/Routing | Updates the last edited by on a model |
| POST | /v1/Utility/Routing/Trading/Model/Firm | Utility/Routing | Create a model and model agg in the corresponding platform |
| DELETE | /v1/Utility/Routing/Trading/Model/Firm/{modelId} | Utility/Routing | Delete an existing TOM or Eclipse model |
| POST | /v1/Utility/Routing/Trading/Model/Firm/Update | Utility/Routing | Update an existing TOM or Eclipse model |
| GET | /v1/Utility/Routing/Trading/Platform | Utility/Routing | Return the trading platform associated with the logged in rep, based on Firm Level settings and Rep Level Settings |
| GET | /v1/Utility/Routing/Trading/Platform/{accountId} | Utility/Routing | Return the trading platform associated with the specific account |
| POST | /v1/Utility/Routing/Trading/Platform/Rep/{repId}/Cache | Utility/Routing |  |
| GET | /v1/Utility/Routing/Trading/Product | Utility/Routing | Return the a list of products that contain the search term |
| GET | /v1/Utility/Routing/Trading/Product/Firm | Utility/Routing | Returns a list of products based on platform, without restrictions |
| POST | /v1/Utility/Routing/Trading/RefreshAnalytics | Utility/Routing |  |
| GET | /v1/Utility/Search/AllDatabases | Utility/Search | Get results that match provided criteria. |
| GET | /v1/Utility/Search/AllDatabases/Count | Utility/Search | Get count of results that match provided criteria. |
| POST | /v1/Utility/SlickGridExport | Utility/SlickGridExport | Gets a data file representation of the slick grid json data provided via Form[ "data" ].  If the accept header has "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" the return will be xlsx. If the accept header has "application/vnd.ms-excel" the return will be xls. If the accept header has "text/csv" the return will be csv. |
| POST | /v1/Utility/SlickGridExport/AGxlsxEncryptedExport | Utility/SlickGridExport | Used to generate a slickgridexport xlsx. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| POST | /v1/Utility/SlickGridExport/csv | Utility/SlickGridExport | Used to generate a slickgridexport csv. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| GET | /v1/Utility/SlickGridExport/Run/{filename} | Utility/SlickGridExport | Used to download a previously generated SlickGridExport. |
| POST | /v1/Utility/SlickGridExport/xls | Utility/SlickGridExport | Used to generate a slickgridexport xls. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| POST | /v1/Utility/SlickGridExport/xlsx | Utility/SlickGridExport | Used to generate a slickgridexport xlsx. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| POST | /v1/Utility/SlickGridExport/zip | Utility/SlickGridExport | Used to generate a slickgridexport csv. The successful return will be 201 Created  with the location set to the url of the newly generated file. |
| POST | /v1/Utility/SMS/SendPIN | Utility/SMS | Sends a validation PIN to the specified phone nmber.  Use /VerifyPIN to validate the phone number. |
| GET | /v1/Utility/SMS/Test | Utility/SMS |  |
| POST | /v1/Utility/SMS/VerifyPIN | Utility/SMS | Validates that the User entered PIN matches the PIN sent to the users phonenumber from /SendPIN. |
| POST | /v1/Utility/SubscriptionCenter/User | Utility/SubscriptionCenter |  |
| POST | /v1/Utility/ValidateExpressions | Utility/ValidateExpressions |  |
| GET | /v1/Utility/WorkflowProcessInstances | Utility/WorkflowProcessInstances | Gets a list of WWorkflow Process Instance that the logged in user has access to. |
| DELETE | /v1/Utility/WorkflowProcessInstances/{key} | Utility/WorkflowProcessInstances |  |
| GET | /v1/Utility/WorkflowProcessInstances/{key} | Utility/WorkflowProcessInstances | Gets the Workflow Process Instance that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| PUT | /v1/Utility/WorkflowProcessInstances/{templetId} | Utility/WorkflowProcessInstances | Gets the Workflow Process Instance that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Utility/WorkflowProcessInstances/Dashboard | Utility/WorkflowProcessInstances | Gets a list of WWorkflow Process Instance that the logged in user has access to. |
| GET | /v1/Utility/WorkflowProcessTemplates | Utility/WorkflowProcessTemplates | Gets a list of Workflow Process Templates that the logged in user has access to. |
| GET | /v1/Utility/WorkflowProcessTemplates/{key} | Utility/WorkflowProcessTemplates | Gets the WorkflowProcessTemplate that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| GET | /v1/Utility/WorkflowProcessTypes | Utility/WorkflowProcessTypes | Gets a list of Workflow Process Types that the logged in user has access to. |
| GET | /v1/Utility/WorkflowProcessTypes/{key} | Utility/WorkflowProcessTypes | Gets the Workflow Process Type that has the provided key. If the item specified doesn't exist or isn't accessible to the logged in users a 404 will be thrown. |
| POST | /v1/ValidateImport/Accounts | ValidateImport/Accounts | Takes an xlsx, xls, or csv file as multipart content. The file needs either an account id column (named  "account id", "accountid", "pkaccount", "acct id", or "acctid") or an account number column (named "account number", or "acct number"). The file will be processed and returned as a list signifying the id or number provided. If the account  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/ValidateImport/Accounts/Contributions | ValidateImport/Accounts | Takes an xlsx, xls, or csv file as multipart content. The file needs either an account id column (named  "account id", "accountid", "pkaccount", "acct id", or "acctid") or an account number column (named "account number", or "acct number"). The file will be processed and returned as a list signifying the id or number provided. If the account  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/ValidateImport/Accounts/List | ValidateImport/Accounts | Takes a list of accounts. At a minimum either the Id property or the number property must be filled in. The list  will be processed and returned. If the account  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/ValidateImport/Accounts/PostPayments | ValidateImport/Accounts | Takes a list of accounts. At a minimum either the Id property or the number property must be filled in. The list  will be processed and returned. If the account  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/ValidateImport/Accounts/TransactionsImport | ValidateImport/Accounts | Takes an xlsx, xls, or csv file as multipart content. The file needs either an transaction id column (named  "transaction id", "transactionid", "pkTransaction", "tran id", or "tranid") . The file will be processed and returned as a list signifying the id provided. If the transaction is  valid, the "isValid" property will be true. If it is invalid, the "isValid" property will be false and a message about why it is invalid will be provided. |
| POST | /v1/ValidateImport/Billing/Bills | ValidateImport/Billing | Takes an xlsx, xls, or csv file as multipart content. The file will be parsed and returned as a generic list of sheets, with each sheet  containing a list that represents the data on that sheet. The first row is assumed to be the column headers. Not available in production. Returns a list of Bill Items |
| POST | /v1/ValidateImport/Echo | ValidateImport/Echo | Takes an xlsx, xls, or csv file as multipart content. The file will be parsed and returned as a generic list of sheets, with each sheet  containing a list that represents the data on that sheet. The first row is assumed to be the column headers. Not available in production. |
