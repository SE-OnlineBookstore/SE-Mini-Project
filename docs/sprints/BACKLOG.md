# Online Bookstore - Product Backlog and Sprint Plan (Group 2)

Source: SRS v1.1, requirements FR-01 to FR-24 and NFR-01 to NFR-08. One GitHub issue per requirement.
Story points use the Fibonacci scale (1, 2, 3, 5, 8). Owners follow the product-ownership split in SRS Appendix C.1.

| Sprint | Dates | Goal |
|---|---|---|
| Dry run | 12-16 Oct 2026 | Practice: each member moves one Sprint 1 item through To do → In progress → Done with a branch and pull request |
| Sprint 1 | 19-23 Oct 2026 | Working product: register/login, catalogue and search, cart → checkout → sandbox payment, seller listings and dispatch |
| Sprint 2 | 26-30 Oct 2026 | Remaining features, NFR verification, documentation complete, development frozen |

## Backlog

| ID | Item | Owner | Priority | Points | Sprint |
|---|---|---|---|---|---|
| FR-01 | Buyer and seller registration | Koushik | High | 3 | 1 |
| FR-02 | E-mail OTP verification | Koushik | High | 3 | 1 |
| FR-03 | Login, logout and silent token refresh | Koushik | High | 5 | 1 |
| FR-04 | Password recovery | Koushik | Medium | 3 | 2 |
| FR-05 | Profile and address book | Koushik | Medium | 3 | 2 |
| FR-06 | Role-based access control | Koushik | High | 2 | 1 |
| FR-07 | Paged catalogue | Deeptha | High | 3 | 1 |
| FR-08 | Keyword search | Deeptha | High | 5 | 1 |
| FR-09 | Filters and sorting | Deeptha | High | 5 | 1 |
| FR-10 | Book detail with all seller offers | Deeptha | High | 3 | 1 |
| FR-11 | Verified-purchase reviews | Deeptha | Medium | 3 | 2 |
| FR-12 | Related titles | Deeptha | Low | 2 | 2 |
| FR-13 | Shopping cart | Pramod | High | 3 | 1 |
| FR-14 | Wishlist | Pramod | Medium | 2 | 1 |
| FR-15 | Checkout with address and coupon | Pramod | High | 5 | 1 |
| FR-16 | Online payment (sandbox) | Pramod | High | 8 | 1 |
| FR-17 | PDF invoice | Pramod | Medium | 3 | 2 |
| FR-18 | Order tracking, cancel and return | Pramod | Medium | 5 | 2 |
| FR-19 | Create listing from ISBN | Hardhick | High | 5 | 1 |
| FR-20 | Stock and price management | Hardhick | High | 3 | 1 |
| FR-21 | Order fulfilment and dispatch | Hardhick | High | 5 | 1 |
| FR-22 | Seller sales dashboard | Hardhick | Medium | 3 | 2 |
| FR-23 | Admin moderation | Hardhick | Medium | 5 | 2 |
| FR-24 | Platform analytics and export | Hardhick | Low | 3 | 2 |
| NFR-01 | Search performance (2 s at p95) | Deeptha | High | 3 | 2 |
| NFR-02 | Availability (99 per cent) | Hardhick | Medium | 2 | 2 |
| NFR-03 | Password storage (bcrypt, cost 12) | Koushik | High | 2 | 1 |
| NFR-04 | Usability of checkout | Pramod | Medium | 2 | 2 |
| NFR-05 | No overselling (atomic stock) | Pramod | High | 3 | 2 |
| NFR-06 | Code quality gate (lint + 70 per cent coverage) | Hardhick | Medium | 2 | 1 |
| NFR-07 | Cross-browser support | Deeptha | Low | 2 | 2 |
| NFR-08 | Append-only audit log | Koushik | High | 3 | 2 |

## Points per member

| Member | Sprint 1 | Sprint 2 | Total |
|---|---|---|---|
| Chenchu Sreekrishna Koushik | 15 | 9 | 24 |
| Deeptha S | 16 | 10 | 26 |
| G H Pramod | 18 | 13 | 31 |
| Hardhick M Gowda | 15 | 13 | 28 |
| **Team** | **64** | **45** | **109** |

## Project views to add (in the GitHub Project, 2 minutes)

1. **Board** view: layout Board, column field Status (Todo / In Progress / Done).
2. **Sprint plan** view: layout Table, Group by Sprint, show Assignees, Story Points, Priority; turn on the Story Points sum.
3. **By member** view: layout Table, Group by Assignees.

Workflow for every item: create a branch `feature/FR-xx-short-name`, open a pull request that says `Closes #<issue>`, another owner reviews and merges, and the issue moves to Done automatically.
