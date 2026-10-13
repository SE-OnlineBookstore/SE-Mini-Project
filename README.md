# Online Bookstore

A multi-seller e-commerce platform for buying and selling books, built on the MERN stack.

| Member | SRN | Owns (SRS section 5) |
|---|---|---|
| Chenchu Sreekrishna Koushik | PES1UG24CS128 | Identity, accounts and access control (FR-01 to FR-06) |
| Deeptha S | PES1UG24CS144 | Catalogue, search and reviews (FR-07 to FR-12) |
| G H Pramod | PES1UG24CS162 | Cart, checkout, payment and orders (FR-13 to FR-18) |
| Hardhick M Gowda | PES1UG24CS179 | Seller operations, administration and reporting (FR-19 to FR-24) |

## Part-1 documents

| Document | Files |
|---|---|
| Software Requirements Specification v1.1 | `SRS_Document.pdf` |
| Software Architecture and Design Specification v1.0 | `SAD_pdf.pdf`, `SAD_doc.docx` |
| Software Test Plan v1.0 (32 functional and non-functional test cases + 10 security test cases) | `Test_Plan_pdf.pdf`, `Test_Plan_doc.docx` |
| API contract (Sprint 1 endpoints) | `docs/api/openapi.yaml` |
| Product backlog and sprint plan (GitHub Project) | `docs/sprints/BACKLOG.md`, `docs/sprints/create_backlog.sh` |
| Manual test cases | `docs/testing/manual-cases.md` |

The backlog lives in the GitHub Project linked to this repository: one issue per requirement (FR-01 to FR-24, NFR-01 to NFR-08) with story points, owner and sprint. `docs/sprints/create_backlog.sh` creates it; `docs/sprints/BACKLOG.md` lists it.

| Sprint | Dates |
|---|---|
| Sprint 1 | 19-23 Oct 2026 |
| Sprint 2 | 26-30 Oct 2026 |

## Running locally

Requirements: Node.js 20+, and either a local MongoDB 7 or a free MongoDB Atlas cluster. Redis is optional.

### API

```bash
cd server
cp .env.example .env          # set MONGO_URI and JWT_ACCESS_SECRET
npm install
npm run seed                  # 12 accounts, 60 categories, 2,500 titles, 10,000 listings
npm run dev                   # http://localhost:5000/api/v1/health
```

### Client (second terminal)

```bash
cd client
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :5000)
```

### Seeded accounts

- `buyer1@bookstore.test` to `buyer4@bookstore.test`
- `seller1@bookstore.test` to `seller4@bookstore.test`
- `admin1@bookstore.test` to `admin4@bookstore.test`

All seeded accounts use the password `Book@2026`.

### E-mail

With `SMTP_URL` empty, e-mails (OTPs and password-reset links) are not sent; they are captured by the mail stub and written to the debug log. Set `LOG_LEVEL=debug` to see them, or set `SMTP_URL` to a Mailtrap/Ethereal SMTP URL.

## Tests

```bash
cd server
npm test               # all tests
npm run test:unit      # no database needed
npm run test:coverage  # with the 70 per cent service-coverage target (NFR-06)
npm run lint
```

API tests need MongoDB 7. By default they start an in-memory MongoDB through `mongodb-memory-server` (it downloads the MongoDB binary on the first run). To use an existing MongoDB instead, set `MONGO_URI_TEST`, for example:

```bash
MONGO_URI_TEST=mongodb://127.0.0.1:27017 npm test
```

Each run uses a throwaway database name. Test names start with the Test Plan IDs (`TC-A-01`, `TC-C-02`, ...) so results map straight onto the traceability matrix.

## Repository layout

```text
SRS_Document.pdf                Software Requirements Specification
SAD_pdf.pdf, SAD_doc.docx       Software Architecture and Design Specification
Test_Plan_pdf.pdf, Test_Plan_doc.docx  Software Test Plan
server/
  app.js            API Gateway Layer: middleware order (helmet, CORS, rate limit, sanitise, routes, errors)
  config/           env validation, MongoDB connection, logger with redaction
  middleware/       verifyJWT, authorizeRoles, validate, rateLimit, requestId, errorHandler
  routes/           auth, users, books, health (cart/orders/seller/admin arrive in Sprints 2-3)
  controllers/      thin HTTP layer
  services/         business rules: auth, otp, token, user, catalogue, audit, notification
  models/           all 17 collections from SRS v1.1 Appendix B
  adapters/         mailer (SMTP or stub), cache (Redis or in-memory)
  validators/       Joi schemas (unknown fields rejected)
  scripts/seed.js   deterministic seed data
  tests/            unit/ and api/
client/
  src/api/client.js Axios client with silent token refresh
  src/pages/        Catalogue, BookDetail, Login, Register, VerifyOtp, Forgot/Reset password
docs/
  api/              OpenAPI specification
  sprints/          Backlog, sprint plan and the GitHub Project setup script
  testing/          Manual test cases
```

## Sprint 1 status

Implemented in the starter code:

- FR-01 to FR-06: registration, OTP verification, login with rotating refresh tokens, password reset, profile and addresses, role-based access control with audit logging
- FR-07 to FR-10 and FR-12: catalogue, search, filters, sorting, book details, related books
- Health endpoint, error model, all 17 data models and seed data

Sprint 1 and Sprint 2 items are listed in `docs/sprints/BACKLOG.md` and tracked on the GitHub Project board.

## Branching

Work on `feature/FR-xx-short-name`, open a pull request whose description says `Closes #<issue number>`, get a review from another owner, then merge into `main`. The issue moves to Done on the board automatically.
