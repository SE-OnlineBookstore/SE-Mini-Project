#!/usr/bin/env bash
# =============================================================================
# Online Bookstore - Group 2 : GitHub backlog + Project setup (Deliverable Part-2, item 1)
# Version 2: safe against GitHub rate limits, safe to run again and again.
#
# What it does:
#   * labels, two sprint milestones
#   * 32 issues (FR-01..FR-24, NFR-01..NFR-08) with labels, assignee and milestone
#     (issues that already exist are FIXED, not duplicated)
#   * GitHub Project #2 linked to the repo, every issue added, with
#     Story Points, Sprint, Priority and Module filled in
#
# Needs: GitHub CLI (gh) logged in as deep-1005 with the project scope:
#        gh auth refresh -s project
# Run from Git Bash:   bash docs/sprints/create_backlog.sh
# =============================================================================
set -uo pipefail

# ----------------------------------------------------------------------------- settings
OWNER="SE-OnlineBookstore"
REPO="SE-OnlineBookstore/SE-Mini-Project"
PROJECT_TITLE="Online Bookstore - Group 2 Backlog"

GH_KOUSHIK="Koushik283"
GH_DEEPTHA="deep-1005"
GH_PRAMOD="ghpramod"
GH_HARDHICK="hardhickmgowda"

SPRINT_DRY="Dry run (12-16 Oct)"
SPRINT_1="Sprint 1 (19-23 Oct)"
SPRINT_2="Sprint 2 (26-30 Oct)"
SPRINT_3="Sprint 3 (2-6 Nov)"
# ----------------------------------------------------------------------------- end settings

GH="${GH_BIN:-gh}"
ERRF="$(mktemp 2>/dev/null || echo /tmp/backlog_err.$$)"
FAILED=""

die()  { echo "ERROR: $*" >&2; exit 1; }
info() { echo "==> $*"; }

command -v "$GH" >/dev/null 2>&1 || die "GitHub CLI 'gh' not found."
"$GH" auth status >/dev/null 2>&1 || die "Not logged in. Run: gh auth login   then   gh auth refresh -s project"

# Wait here if GitHub's GraphQL budget is almost used up (this check itself is free).
wait_for_budget() {
  local rem reset now
  rem=$("$GH" api rate_limit --jq '.resources.graphql.remaining' 2>/dev/null | tr -d '\r')
  reset=$("$GH" api rate_limit --jq '.resources.graphql.reset' 2>/dev/null | tr -d '\r')
  case "$rem" in ''|*[!0-9]*) return 0;; esac
  if [ "$rem" -lt 300 ]; then
    now=$(date +%s); local w=$(( reset - now + 10 ))
    [ "$w" -lt 10 ] && w=10
    echo "   GitHub allows only $rem more calls right now. Waiting $(( w / 60 + 1 )) minute(s) for the limit to reset..."
    sleep "$w"
  else
    echo "   GitHub budget OK ($rem calls left)."
  fi
}

# Run a gh command; if GitHub says "rate limit", wait and try again (up to 6 times).
run() {
  local out rc n=0
  while :; do
    out=$("$@" 2>"$ERRF"); rc=$?
    if [ $rc -eq 0 ]; then printf '%s' "$out" | tr -d '\r'; return 0; fi
    if grep -qiE "rate limit|abuse|secondary" "$ERRF"; then
      n=$((n + 1))
      if [ $n -gt 6 ]; then cat "$ERRF" >&2; return 1; fi
      echo "   ...rate limit hit, waiting 5 minutes (try $n of 6)" >&2
      sleep 300
    else
      cat "$ERRF" >&2; return $rc
    fi
  done
}

member_login() {
  case "$1" in
    Koushik)  echo "$GH_KOUSHIK" ;;
    Deeptha)  echo "$GH_DEEPTHA" ;;
    Pramod)   echo "$GH_PRAMOD" ;;
    Hardhick) echo "$GH_HARDHICK" ;;
  esac
}
member_name() {
  case "$1" in
    Koushik)  echo "Chenchu Sreekrishna Koushik (PES1UG24CS128)" ;;
    Deeptha)  echo "Deeptha S (PES1UG24CS144)" ;;
    Pramod)   echo "G H Pramod (PES1UG24CS162)" ;;
    Hardhick) echo "Hardhick M Gowda (PES1UG24CS179)" ;;
  esac
}

# ----------------------------------------------------------------------------- backlog
# ID | Type | Module | Priority | Points | Owner | Sprint(1/2) | Title | User story | Requirement (SRS v1.1) | Acceptance criteria
read -r -d '' BACKLOG <<'BACKLOG_EOF'
FR-01|FR|Accounts|High|3|Koushik|1|Buyer and seller registration|As a visitor, I want to register as a Buyer or a Seller so that I can buy or sell books.|The system shall allow a visitor to register as a Buyer or a Seller, capturing name, e-mail, phone and password, with all validation repeated server-side.|Duplicate e-mail is refused with 409; weak password or 9-digit phone is refused with 400; TC-A-01 passes.
FR-02|FR|Accounts|High|3|Koushik|1|E-mail OTP verification|As a new user, I want to verify my e-mail with a one-time code so that my account is activated securely.|The system shall e-mail a six-digit OTP on registration and activate the account only when that OTP is entered within ten minutes.|Correct OTP activates the account; 3 wrong attempts invalidate the code; at most 3 resends per hour; TC-A-02 passes.
FR-03|FR|Accounts|High|5|Koushik|1|Login, logout and silent token refresh|As a registered user, I want to log in and stay signed in safely so that I do not have to log in on every page.|The system shall authenticate a verified user against a bcrypt hash and issue a 15-minute JWT access token and a 7-day refresh token.|Valid login returns tokens and role; refresh token rotates on use; logout revokes it; 5 failed logins in 15 min are rate-limited; TC-A-03 passes.
FR-04|FR|Accounts|Medium|3|Koushik|2|Password recovery|As a user who forgot my password, I want a reset link so that I can get back into my account.|The system shall provide password recovery through a single-use link valid for thirty minutes and invalidate all refresh tokens once the password is changed.|Same message whether or not the e-mail exists; link works once within 30 min; all sessions revoked after reset; TC-A-04 passes.
FR-05|FR|Accounts|Medium|3|Koushik|2|Profile and address book|As a buyer, I want to manage my profile and delivery addresses so that checkout is quick.|The system shall allow a signed-in user to view and edit their profile and to add, edit and delete delivery addresses, exactly one of which is marked default.|Exactly one default address at all times; PIN code must be 6 digits; another user's address returns 404; TC-A-05 passes.
FR-06|FR|Accounts|High|2|Koushik|1|Role-based access control|As the platform, I want every protected route to admit only its declared roles so that users cannot reach functions they are not allowed to use.|The system shall enforce role-based access control on every protected route and refuse all other roles with HTTP 403.|Buyer calling a seller route gets 403 and an ACCESS_DENIED audit entry; blocked accounts cannot log in; TC-A-06 passes.
FR-07|FR|Catalogue|High|3|Deeptha|1|Paged catalogue|As a visitor, I want to browse the catalogue page by page so that I can see what is available.|The system shall present the catalogue with server-side pagination of twenty titles per page, showing cover, title, author, lowest active price and average rating.|20 titles per page with correct total; lowest active price shown; TC-C-01 passes.
FR-08|FR|Catalogue|High|5|Deeptha|1|Keyword search|As a visitor, I want to search by title, author, ISBN or publisher so that I can find a specific book quickly.|The system shall support keyword search across title, author, ISBN-13 and publisher using a compound text index, ranked by text score.|Results ranked by relevance; no-match shows a message and the nearest category; TC-C-02 passes.
FR-09|FR|Catalogue|High|5|Deeptha|1|Filters and sorting|As a buyer, I want to filter by category, price, condition, language and rating and sort the results so that I can narrow down my choice.|The system shall allow results to be filtered by category, price range, condition, language and minimum rating in any combination and sorted by price, rating or recency.|Filters combine correctly; lowest matching offer used for price sort; min price above max price returns 400; TC-C-03 passes.
FR-10|FR|Catalogue|High|3|Deeptha|1|Book detail with all seller offers|As a buyer, I want to see every seller's offer for a book so that I can compare price and condition.|The system shall present a book detail page with full metadata and every ACTIVE listing ordered by price ascending, with condition, seller name and stock.|Only ACTIVE offers listed, cheapest first; unknown book returns 404 BOOK_NOT_FOUND; TC-C-04 passes.
FR-11|FR|Catalogue|Medium|3|Deeptha|2|Verified-purchase reviews|As a buyer who received a book, I want to rate and review it so that other buyers can decide.|The system shall accept a 1-5 rating and optional comment of up to 1000 characters only from a buyer with a DELIVERED order line, one review per order line.|Review refused unless the order line is DELIVERED; second review on the same line refused; average rating updated; TC-C-05 passes.
FR-12|FR|Catalogue|Low|2|Deeptha|2|Related titles|As a buyer, I want to see related books on a detail page so that I can discover similar titles.|The system shall display up to six related titles, same author first and then same category, excluding the current title and titles with no active listing.|At most 6 titles; current title never shown; titles without active offers excluded; TC-C-06 passes.
FR-13|FR|Orders|High|3|Pramod|1|Shopping cart|As a buyer, I want to add books to a cart and change quantities so that I can buy several books at once.|The system shall allow a buyer to add a listing to the cart, change the quantity between 1 and 10 subject to stock, and remove a line.|Quantity capped at 10 and at available stock; cart persists across sessions; TC-O-01 passes.
FR-14|FR|Orders|Medium|2|Pramod|1|Wishlist|As a buyer, I want to save books to a wishlist and move them to the cart later so that I do not lose track of them.|The system shall allow a buyer to save a listing to a wishlist and move it into the cart in one action, removing it from the wishlist on success.|Move-to-cart adds the line and removes the wishlist item in one step; TC-O-02 passes.
FR-15|FR|Orders|High|5|Pramod|1|Checkout with address and coupon|As a buyer, I want to check out with my address and an optional coupon so that I know exactly what I will pay.|The system shall revalidate every cart line against current price and stock, require a delivery address, accept an optional coupon and show item total, shipping, discount and payable amount.|Price or stock changes are flagged before payment; expired coupon refused; totals correct in paise; TC-O-03 passes.
FR-16|FR|Orders|High|8|Pramod|1|Online payment (sandbox)|As a buyer, I want to pay online so that my order is confirmed immediately.|The system shall create a payment intent for the payable amount, confirm the order only on a signature-verified success callback, and allow at most three attempts per order.|Order confirmed only after a verified webhook; forged webhook rejected; failed payment leaves order PLACED; TC-O-04 passes.
FR-17|FR|Orders|Medium|3|Pramod|2|PDF invoice|As a buyer, I want a PDF invoice for my order so that I have a record of the purchase.|The system shall generate a PDF invoice on confirmation with order number, buyer and delivery details, every line with unit price and total, and a tax summary; downloadable and e-mailed.|Invoice downloadable from the order page and e-mailed; figures match the order; TC-O-05 passes.
FR-18|FR|Orders|Medium|5|Pramod|2|Order tracking, cancel and return|As a buyer, I want to track my order and cancel or return it so that I stay in control after paying.|The system shall show the order lifecycle with timestamps and tracking number, accept cancellation until dispatch and a return request within seven days of delivery.|Cancel allowed only before SHIPPED; return allowed only within 7 days of DELIVERED; stock restored on cancel; TC-O-06 passes.
FR-19|FR|Seller-Admin|High|5|Hardhick|1|Create listing from ISBN|As a seller, I want to list a book by entering its ISBN so that the details fill in automatically.|The system shall allow a seller to create a listing against an ISBN-13, auto-filling catalogue metadata where the title exists, and capture condition, price, MRP and stock.|Valid ISBN auto-fills title and author; invalid ISBN refused with ISBN_INVALID; TC-S-01 passes.
FR-20|FR|Seller-Admin|High|3|Hardhick|1|Stock and price management|As a seller, I want to update stock and price so that my listings stay accurate.|The system shall allow a seller to update stock and price on an active listing, refuse a price above MRP, raise a low-stock alert at five units or fewer and set OUT_OF_STOCK at zero.|Price above MRP refused; alert at 5 units or fewer; status becomes OUT_OF_STOCK at 0; TC-S-02 passes.
FR-21|FR|Seller-Admin|High|5|Hardhick|1|Order fulfilment and dispatch|As a seller, I want to accept, pack and dispatch orders with a tracking number so that buyers get their books.|The system shall allow a seller to accept an order line, mark it packed and record courier and tracking number on dispatch, notifying the buyer at each step.|Shipment record created on dispatch; buyer notified at each transition; out-of-order transitions refused; TC-S-03 passes.
FR-22|FR|Seller-Admin|Medium|3|Hardhick|2|Seller sales dashboard|As a seller, I want a dashboard of my sales and settlement so that I know what I have earned.|The system shall present a seller dashboard with units sold, gross revenue, returns, commission and net settlement for a chosen date range, with the orders listed beneath.|Totals match the listed orders for the chosen range; TC-S-04 passes.
FR-23|FR|Seller-Admin|Medium|5|Hardhick|2|Admin moderation|As an administrator, I want to review and block reported listings, users and reviews so that the platform stays trustworthy.|The system shall allow an administrator to block or unblock reported listings, users and reviews, recording actor, reason and timestamp in the audit log.|Block without a reason refused; every action appears in the audit log; TC-S-05 passes.
FR-24|FR|Seller-Admin|Low|3|Hardhick|2|Platform analytics and export|As an administrator, I want monthly platform analytics exportable to CSV and PDF so that I can report on the platform.|The system shall present orders, GMV, commission, average order value and new-user growth for a chosen month, exportable to CSV and PDF.|Figures match the seeded data; CSV and PDF exports download; TC-S-06 passes.
NFR-01|NFR|Catalogue|High|3|Deeptha|2|Search performance (2 s at p95)|As a buyer, I want search results within two seconds so that browsing feels fast.|A catalogue search shall return results within 2 seconds at the 95th percentile under the reference load (200 concurrent users, 10,000 listings).|k6 load test at 200 users shows p95 under 2 s; repeated filters served from the 5-minute cache; TC-N-01 passes.
NFR-02|NFR|Seller-Admin|Medium|2|Hardhick|2|Availability (99 per cent)|As a user, I want the site to be up whenever I open it so that I can rely on it.|The deployed application is reachable for at least 99 per cent of the evaluation window, evidenced by an uptime monitor polling the health endpoint every five minutes.|Staging deployed; uptime monitor polls GET /api/v1/health every 5 min; TC-N-02 passes.
NFR-03|NFR|Accounts|High|2|Koushik|1|Password storage (bcrypt, cost 12)|As a user, I want my password stored safely so that it cannot be stolen from the database.|Passwords shall be stored only as bcrypt hashes at cost factor 12 and never logged, echoed or sent anywhere except the login and registration endpoints over TLS.|Database holds only bcrypt hashes with cost 12; no password in any log line; TC-N-03 and TC-SEC-01 pass.
NFR-04|NFR|Orders|Medium|2|Pramod|2|Usability of checkout|As a buyer, I want a short, accessible checkout that works on my phone so that buying is easy.|Checkout is completed in at most four screens, every screen is usable at a 360 px viewport, contrast meets WCAG 2.1 AA and all controls are keyboard reachable.|Cart to confirmation in 4 screens or fewer; works at 360 px; keyboard-only run succeeds; TC-N-04 passes.
NFR-05|NFR|Orders|High|3|Pramod|2|No overselling (atomic stock)|As a buyer and as a seller, I want stock to be exact so that a book is never sold twice.|Stock is decremented atomically at confirmation so that a listing cannot be oversold.|Two concurrent orders for the last copy: exactly one succeeds and stock never goes below 0; TC-N-05 passes.
NFR-06|NFR|Seller-Admin|Medium|2|Hardhick|1|Code quality gate (lint + 70 per cent coverage)|As the team, we want lint and test coverage checked on every pull request so that the code stays maintainable.|ESLint passes with zero errors and service modules hold at least 70 per cent unit-test coverage, enforced on every pull request.|GitHub Actions runs lint and tests on each PR; a PR with a lint error or coverage under 70 per cent is blocked; TC-N-06 passes.
NFR-07|NFR|Catalogue|Low|2|Deeptha|2|Cross-browser support|As a user, I want the site to work in my browser so that I can use whichever browser I like.|The client renders and functions correctly on the latest two versions of Chrome, Edge, Firefox and Safari, verified by a cross-browser regression pass.|Main flows pass in Chrome, Edge, Firefox and Safari; TC-N-07 passes.
NFR-08|NFR|Accounts|High|3|Koushik|2|Append-only audit log|As an administrator, I want every admin action and payment event logged permanently so that every change can be traced.|Every administrative action and every payment event shall be written to an append-only audit log carrying actor, action, target and timestamp.|Audit entries cannot be edited or deleted through any API; admin and payment events all logged; TC-N-08 passes.
S3-01|FR|Seller-Admin|High|2|Hardhick|3|Seller listings API|As a seller, I want to see all my listings so that I can manage them from the seller page.|Adds GET /api/v1/seller/listings, needed by the seller page (supports FR-19 and FR-20).|Returns only the logged-in seller's listings with title, condition, price, stock and status; buyers and admins get 403; tests added and passing.
S3-02|FR|Orders|High|2|Pramod|3|Seller orders API|As a seller, I want to see the order items I have to fulfil so that I can accept, pack and dispatch them.|Adds GET /api/v1/seller/orders, needed by the seller page (supports FR-21).|Returns only the logged-in seller's order items with order number, title, quantity and item status, filterable by status; buyers and admins get 403; tests added and passing.
S3-03|FR|Seller-Admin|High|5|Deeptha|3|Seller page (listings, fulfilment, dashboard)|As a seller, I want a seller page on the website so that I can do my work without calling the API directly.|Website screens for FR-19 to FR-22: add a listing from an ISBN-13, edit price and stock, accept/pack/dispatch order items, and view the sales dashboard for a date range.|A seller who logs in sees a Seller link; all actions work from the page and show API errors clearly; client build passes.
S3-04|FR|Seller-Admin|Medium|3|Koushik|3|Admin page (moderation and analytics export)|As an administrator, I want an admin page so that I can moderate content and download reports from the website.|Website screens for FR-23 and FR-24: block and unblock with a reason, and download the monthly analytics export as CSV and PDF.|An admin who logs in sees an Admin link; block/unblock and both downloads work; non-admins cannot open the page; client build passes.
S3-05|FR|Catalogue|Medium|2|Hardhick|3|Review form on the book page|As a buyer, I want to write a review on the book page so that I can rate a book I received.|Website form for FR-11: rating 1 to 5 and an optional comment, using the existing review endpoint.|A buyer with a delivered copy can post a review and sees the rating update; not-eligible and already-reviewed cases show the API error; client build passes.
S3-06|TEST|Testing|High|2|Deeptha|3|Update the Test Case Document|As the QA lead, I want the test cases to match what was built so that testing checks the real behaviour.|Part-3 item 1: update the test cases written earlier based on the changes made during the sprints.|Every changed or new behaviour from Sprints 1 to 3 has an updated or new test case; document uploaded to docs/testing.
S3-07|TEST|Testing|High|3|Deeptha|3|Test reports (unit, system validation, code coverage, branch coverage)|As the QA lead, I want the test reports generated so that the testing results are documented.|Part-3 item 2: complete all testing according to the Test Plan and generate the four reports.|Unit Test Report, System Validation Report, Code Coverage Report and Branch Coverage Report uploaded to docs/testing.
BACKLOG_EOF

# ----------------------------------------------------------------------------- 0. budget
info "Checking GitHub rate limit"
wait_for_budget

# ----------------------------------------------------------------------------- 1. labels
info "Creating labels"
mklabel() { run "$GH" label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null || echo "   (label $1 not created)"; }
mklabel "FR"                  "1d76db" "Functional requirement (SRS section 5)"
mklabel "NFR"                 "5319e7" "Non-functional requirement (SRS section 6)"
mklabel "module:Accounts"     "c5def5" "Identity, accounts and access control"
mklabel "module:Catalogue"    "c5def5" "Catalogue, search and reviews"
mklabel "module:Orders"       "c5def5" "Cart, checkout, payment and orders"
mklabel "module:Seller-Admin" "c5def5" "Seller operations, administration and reporting"
mklabel "priority:High"       "b60205" "Must have"
mklabel "priority:Medium"     "fbca04" "Should have"
mklabel "priority:Low"        "0e8a16" "Could have"
mklabel "user-story"          "ededed" "Backlog item derived from the SRS"
mklabel "TEST"                "0e8a16" "Testing and test reports (Part-3)"
mklabel "module:Testing"      "c5def5" "Test documents and reports"

# ----------------------------------------------------------------------------- 2. milestones (sprints)
info "Creating milestones"
milestone_number() { run "$GH" api "repos/$REPO/milestones?state=all&per_page=100" --jq ".[] | select(.title==\"$1\") | .number" | head -n1; }
mkmilestone() { # title due description
  local n; n=$(milestone_number "$1")
  if [ -z "$n" ]; then
    run "$GH" api "repos/$REPO/milestones" -f title="$1" -f due_on="$2" -f description="$3" >/dev/null && echo "   created: $1" || echo "   (milestone $1 not created)"
  else
    echo "   exists:  $1"
  fi
}
mkmilestone "$SPRINT_1" "2026-10-23T18:00:00Z" "Sprint 1: 19-23 Oct 2026. Working product with accounts, catalogue, cart/checkout/payment and seller listing."
mkmilestone "$SPRINT_2" "2026-10-30T18:00:00Z" "Sprint 2: 26-30 Oct 2026. Remaining features, NFR verification, documentation freeze."
mkmilestone "$SPRINT_3" "2026-11-06T18:00:00Z" "Sprint 3: 2-6 Nov 2026. Spill-over UI (seller, admin, review form) and Part-3 testing."
MS1=$(milestone_number "$SPRINT_1"); MS2=$(milestone_number "$SPRINT_2"); MS3=$(milestone_number "$SPRINT_3")
[ -n "$MS1" ] && [ -n "$MS2" ] || die "Milestones missing. Run the script again."

# ----------------------------------------------------------------------------- 3. project
info "Finding the Project"
PROJECT_NUMBER=$(run "$GH" project list --owner "$OWNER" --format json --limit 100 --jq ".projects[] | select(.title==\"$PROJECT_TITLE\") | .number" | head -n1)
if [ -z "$PROJECT_NUMBER" ]; then
  PROJECT_NUMBER=$(run "$GH" project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json --jq .number) \
    || die "Could not create the project. Run: gh auth refresh -s project   and try again."
  echo "   created project #$PROJECT_NUMBER"
else
  echo "   found project #$PROJECT_NUMBER"
fi
PROJECT_ID=$(run "$GH" project view "$PROJECT_NUMBER" --owner "$OWNER" --format json --jq .id) || die "Could not read the project id."
run "$GH" project link "$PROJECT_NUMBER" --owner "$OWNER" --repo "$REPO" >/dev/null 2>&1 && echo "   linked to $REPO" || echo "   (already linked)"

# Read all field + option ids ONCE (lines: FieldName|OptionName|id)
load_fields() {
  FIELDS=$(run "$GH" project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json --limit 50 \
     --jq '.fields[] | .name as $f | ("\($f)||\(.id)"), (if .options then (.options[] | "\($f)|\(.name)|\(.id)") else empty end)') || FIELDS=""
}
field_id()  { printf '%s\n' "$FIELDS" | awk -F'|' -v f="$1" '$1==f && $2=="" {print $3; exit}'; }
option_id() { printf '%s\n' "$FIELDS" | awk -F'|' -v f="$1" -v o="$2" '$1==f && $2==o {print $3; exit}'; }
ensure_field() { # name type [options]
  if [ -z "$(field_id "$1")" ]; then
    if [ "$2" = "SINGLE_SELECT" ]; then
      run "$GH" project field-create "$PROJECT_NUMBER" --owner "$OWNER" --name "$1" --data-type SINGLE_SELECT --single-select-options "$3" >/dev/null
    else
      run "$GH" project field-create "$PROJECT_NUMBER" --owner "$OWNER" --name "$1" --data-type "$2" >/dev/null
    fi
    echo "   created field: $1"; load_fields
  else
    echo "   field exists:  $1"
  fi
}
load_fields
ensure_field "Story Points" NUMBER
ensure_field "Sprint"   SINGLE_SELECT "$SPRINT_DRY,$SPRINT_1,$SPRINT_2,$SPRINT_3"
ensure_field "Priority" SINGLE_SELECT "High,Medium,Low"
ensure_field "Module"   SINGLE_SELECT "Accounts,Catalogue,Orders,Seller-Admin"

F_POINTS=$(field_id "Story Points"); F_SPRINT=$(field_id "Sprint"); F_PRIORITY=$(field_id "Priority"); F_MODULE=$(field_id "Module")
[ -n "$F_POINTS" ] && [ -n "$F_SPRINT" ] && [ -n "$F_PRIORITY" ] && [ -n "$F_MODULE" ] || die "Project fields missing; run the script again."
O_S1=$(option_id "Sprint" "$SPRINT_1"); O_S2=$(option_id "Sprint" "$SPRINT_2"); O_S3=$(option_id "Sprint" "$SPRINT_3")

# ----------------------------------------------------------------------------- 4. issues + project items
info "Reading existing issues (one call)"
EXISTING=$(run "$GH" api "repos/$REPO/issues?state=all&per_page=100" --paginate \
  --jq '.[] | select(.pull_request|not) | "\(.number)|\(.html_url)|\(.title)"') || EXISTING=""

info "Creating / fixing the backlog issues and adding them to the Project (ONLY_SPRINT=${ONLY_SPRINT:-all})"
TOTAL_POINTS=0; DONE_ITEMS=0
while IFS='|' read -r ID TYPE MODULE PRIO PTS OWNERKEY SPR TITLE STORY REQ ACC; do
  ID=$(printf '%s' "$ID" | tr -d '\r\n'); [ -z "$ID" ] && continue
  if [ -n "${ONLY_SPRINT:-}" ] && [ "$SPR" != "$ONLY_SPRINT" ]; then continue; fi
  ACC=$(printf '%s' "$ACC" | tr -d '\r')
  ISSUE_TITLE="[$ID] $TITLE"
  LOGIN=$(member_login "$OWNERKEY"); NAME=$(member_name "$OWNERKEY")
  case "$SPR" in
    1) MS="$MS1"; SPRINT_OPT="$O_S1"; SPRINT_TXT="$SPRINT_1" ;;
    3) MS="$MS3"; SPRINT_OPT="$O_S3"; SPRINT_TXT="$SPRINT_3"
       [ -n "$MS3" ] && [ -n "$O_S3" ] || { echo "   ! Sprint 3 milestone or Sprint field option missing"; FAILED="$FAILED $ID(sprint3)"; continue; } ;;
    *) MS="$MS2"; SPRINT_OPT="$O_S2"; SPRINT_TXT="$SPRINT_2" ;;
  esac
  BODY=$(printf '**User story**\n%s\n\n**Requirement (SRS v1.1, %s)**\n%s\n\n**Acceptance criteria**\n%s\n\n| Field | Value |\n|---|---|\n| Type | %s |\n| Module | %s |\n| Priority | %s |\n| Story points | %s |\n| Owner | %s |\n| Sprint | %s |\n\n**Definition of done:** code merged through a reviewed pull request, tests for the acceptance criteria pass, and the RTM row is updated.\n' \
    "$STORY" "$ID" "$REQ" "$ACC" "$TYPE" "$MODULE" "$PRIO" "$PTS" "$NAME" "$SPRINT_TXT")

  LINE=$(printf '%s\n' "$EXISTING" | grep -F "|[$ID] " | head -n1)
  if [ -n "$LINE" ]; then
    NUM=${LINE%%|*}; REST=${LINE#*|}; URL=${REST%%|*}
    run "$GH" api -X PATCH "repos/$REPO/issues/$NUM" \
      -f title="$ISSUE_TITLE" -f body="$BODY" -F milestone="$MS" \
      -f "labels[]=$TYPE" -f "labels[]=module:$MODULE" -f "labels[]=priority:$PRIO" -f "labels[]=user-story" \
      -f "assignees[]=$LOGIN" >/dev/null && echo "   fixed   $ID -> $LOGIN  $URL" || { echo "   ! could not update $ID"; FAILED="$FAILED $ID(issue)"; continue; }
  else
    RES=$(run "$GH" api -X POST "repos/$REPO/issues" \
      -f title="$ISSUE_TITLE" -f body="$BODY" -F milestone="$MS" \
      -f "labels[]=$TYPE" -f "labels[]=module:$MODULE" -f "labels[]=priority:$PRIO" -f "labels[]=user-story" \
      -f "assignees[]=$LOGIN" --jq '"\(.number)|\(.html_url)"') || { echo "   ! could not create $ID"; FAILED="$FAILED $ID(issue)"; continue; }
    URL=${RES#*|}
    echo "   created $ID -> $LOGIN  $URL"
  fi
  sleep 1

  ITEM=$(run "$GH" project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$URL" --format json --jq .id) || ITEM=""
  if [ -z "$ITEM" ]; then echo "   ! $ID not added to the project"; FAILED="$FAILED $ID(project)"; continue; fi
  OK=1
  run "$GH" project item-edit --id "$ITEM" --project-id "$PROJECT_ID" --field-id "$F_POINTS"   --number "$PTS" >/dev/null || OK=0; sleep 1
  run "$GH" project item-edit --id "$ITEM" --project-id "$PROJECT_ID" --field-id "$F_SPRINT"   --single-select-option-id "$SPRINT_OPT" >/dev/null || OK=0; sleep 1
  run "$GH" project item-edit --id "$ITEM" --project-id "$PROJECT_ID" --field-id "$F_PRIORITY" --single-select-option-id "$(option_id Priority "$PRIO")" >/dev/null || OK=0; sleep 1
  MOD_OPT=$(option_id Module "$MODULE")
  if [ -n "$MOD_OPT" ]; then run "$GH" project item-edit --id "$ITEM" --project-id "$PROJECT_ID" --field-id "$F_MODULE"   --single-select-option-id "$MOD_OPT" >/dev/null || OK=0; sleep 1; fi
  if [ "$OK" = "1" ]; then
    TOTAL_POINTS=$((TOTAL_POINTS + PTS)); DONE_ITEMS=$((DONE_ITEMS + 1))
  else
    echo "   ! some fields of $ID were not set"; FAILED="$FAILED $ID(fields)"
  fi
done <<< "$BACKLOG"

rm -f "$ERRF" 2>/dev/null
echo
if [ -z "$FAILED" ]; then
  info "ALL GOOD: $DONE_ITEMS items complete, $TOTAL_POINTS story points (all sprints: 39 items, 128 points; Sprint 3 only: 7 items, 19 points)."
else
  info "$DONE_ITEMS items complete, $TOTAL_POINTS story points (all sprints: 39 items, 128 points; Sprint 3 only: 7 items, 19 points)."
  echo "Needs another run:$FAILED"
  echo "Just run the same command again (it only fixes what is missing)."
fi
echo "Open the project: https://github.com/users/$OWNER/projects/$PROJECT_NUMBER"
echo "Issues:           https://github.com/$REPO/issues"
