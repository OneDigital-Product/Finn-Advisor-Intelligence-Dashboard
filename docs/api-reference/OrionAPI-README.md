# Orion API Postman Project

This workspace includes a ready-to-import Postman setup for Orion Cloud API:
- Base URL: `https://api.cloud.orionadvisor.com`
- Collection: `postman/Orion Advisor API.postman_collection.json`
- Environment: `postman/Orion Advisor API.postman_environment.json`

## Import in Postman
1. Open Postman.
2. Import the collection file.
3. Import the environment file.
4. Select **Orion Advisor Cloud** environment.
5. Set `username` and `password` (or paste `authToken` directly if you already have one).
6. Run **Auth / Login** first, then run the other requests.

## Run from CLI (optional)
If you want automated runs with Newman:

1. Install dependencies:
   - `npm install`
2. Run collection:
   - `npm run test:postman`

> Note: Endpoint paths in this starter are defaults. If your tenant uses different paths, update the requests in the collection.
