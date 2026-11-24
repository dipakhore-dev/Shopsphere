# ShopSphere

Multi-vendor e-commerce marketplace built with the MERN stack (JavaScript only).

**Status: Phase 4 - cart, wishlist, addresses, checkout and orders**

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Setup: React + Vite + Tailwind, Express, MongoDB connection, routing | Done |
| 2 | Authentication and RBAC | Done |
| 3 | Product marketplace | Done |
| 4 | Customer shopping (cart, wishlist, addresses, checkout, orders) | Done |
| 5 | Seller dashboard, order fulfilment, reviews | Next |
| 6 | Admin dashboard | |
| 7 | Payments (Razorpay, COD, webhooks, refunds) | |
| 8 | Testing and deployment | |

## Requirements

- Node.js 20 or newer (`node -v`)
- A free MongoDB Atlas cluster
- Internet access on the first `npm test` run (downloads a small MongoDB binary used by the tests, then cached)

## 1. MongoDB Atlas setup

1. Create a free **M0** cluster at https://cloud.mongodb.com
2. **Database Access** -> Add Database User -> username + password.
3. **Network Access** -> Add IP Address -> `0.0.0.0/0` while developing.
4. **Connect** -> **Drivers** -> copy the connection string and put `shopsphere` between `.net/` and `?`.

URL-encode special characters in the password (`@` becomes `%40`).

## 2. Install

```bash
npm run install:all
```

## 3. Configure environment variables

```bash
# macOS / Linux
cp server/.env.example server/.env
cp client/.env.example client/.env
# Windows (PowerShell)
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Edit `server/.env`:

1. Set `MONGODB_URI`.
2. **New in Phase 2:** set `JWT_ACCESS_SECRET`. Generate one:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

3. Leave `SMTP_HOST` empty for now. Emails (verification, password reset) are then **printed in the server
   terminal** instead of being sent, which is all you need in development. To send real emails, fill in the
   `SMTP_*` values (Brevo, Mailtrap, or Gmail with an app password).

## 4. Run

```bash
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:5000/api/health

## 5. Create the admin account (one time)

Admins cannot register through the website. Provision the first one from the server:

1. In `server/.env` set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters, upper, lower, number).
2. Run:

   ```bash
   npm run seed:admin --prefix server
   ```

3. Delete `ADMIN_PASSWORD` from `server/.env`.

Log in with that account: you land on `/admin`.

## 6. Verify Phase 2 in the browser

1. Open http://localhost:5173/register and create an account. You are logged in and redirected to `/account`.
2. Check the **server terminal**: a "DEV EMAIL" block with a verification link. Open the link: the account page shows
   "Your email address is verified".
3. Open DevTools -> Application -> Cookies: `accessToken` and `refreshToken` are **HttpOnly**. Local Storage is empty.
4. Log out, then visit `/account`: you are sent to `/login`, and after logging in you return to `/account`.
5. As the customer, visit `/admin` or `/seller`: a 403 page. As the admin, `/admin` opens and `/seller` shows 403.
6. Click "Forgot password?", use the link printed in the terminal, set a new password, and log in with it.
7. Run the tests: `npm test`.

## 7. Phase 3 setup: images and demo data

**Cloudinary (product images).** Create a free account at https://cloudinary.com, open the dashboard and copy
the three values into `server/.env`:

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Without them the storefront works, but sellers cannot upload images (the API answers `503 UPLOADS_NOT_CONFIGURED`).

**Demo data.** The seller-application flow arrives in Phase 5, so for now create a ready-made seller, six
categories and 24 products:

```bash
npm run seed:demo --prefix server
```

It prints the demo seller's email and a generated password **once**. Re-running rebuilds the demo products.
(Demo products use placeholder artwork served from `client/public/placeholders`, so they never depend on an outside image site. Products you create use Cloudinary.)

## 8. Verify Phase 3 in the browser

Shopper side (no login needed):

1. Home shows categories, **Trending now** and **New arrivals**.
2. Type `wire` in the search box: suggestions appear. Use Up/Down/Enter. Press Enter on plain text to open `/search?q=...`.
3. `/products`: filter by category, price, rating and "in stock only"; change the sort; use pagination.
   Every change updates the URL, so refresh and the Back button keep your filters.
4. Open a product: image gallery, discount, stock, seller name, specifications.

Seller side (log in as the demo seller):

5. You land on `/seller`. Open **My products**: search, status filter, Hide/Show, Edit, Delete (confirmation dialog).
6. **Add product**: choose images (they upload to Cloudinary immediately), fill the form, save. It appears in the store
   at once. Set it to Inactive and it disappears from the storefront but stays in your list.
7. Log in as a normal customer and open `/seller/products`: 403 page.
8. `npm test`.

## Test the products API with Postman

Re-import the collection (it now has a **Phase 3 - Products** folder). Run the public requests first, then
**Seller login**, then upload, create, update, delete. **Prices are in paise**: `499900` means Rs 4,999.

| Try this | Expected |
|----------|----------|
| `GET /api/products?q=earbuds` | Matches name, brand, tags and description, best match first |
| `GET /api/products?limit=1000` | `400` (limit is capped at 48) |
| `GET /api/products?category[$ne]=x` | `400` (operators are stripped) |
| Create a product with `"averageRating": 5` in the body | `201`, but the stored rating stays `0` |
| `PATCH` another seller's product | `404` (it does not exist for you) |
| Upload a `.txt` renamed to `.png` | `400`, the bytes are checked, not the extension |
| `GET /api/products/<id of an inactive product>` | `404` |

## API reference (Phase 3)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/categories` | - | Active categories |
| GET | `/api/products` | - | `q, category, minPrice, maxPrice, minRating, inStock, sort, page, limit` |
| GET | `/api/products/suggestions?q=` | - | Name-prefix suggestions + categories |
| GET | `/api/products/:id` | - | Active + approved products only |
| POST | `/api/products` | approved seller | Creates a product owned by the caller |
| PATCH | `/api/products/:id` | owner | Partial update |
| DELETE | `/api/products/:id` | owner | Soft delete |
| GET | `/api/sellers/products` | approved seller | Own products incl. inactive. `status, q, page, limit` |
| GET | `/api/sellers/products/:id` | owner | Seller view with inventory and moderation fields |
| POST | `/api/sellers/products/images` | approved seller | multipart field `images` (1-6 files, 5 MB each) |

Sort values: `relevance` (only with `q`), `newest`, `price_asc`, `price_desc`, `rating`, `popularity`.
List responses: `{ success, data: { products }, meta: { page, limit, total, totalPages, hasNext, hasPrev } }`.

## How the marketplace works

- **Money** is stored and sent as integer **paise** (Rs 499.50 = 49950). Floats cannot represent most decimal amounts exactly.
- **`finalPrice`** (discount price if set, else price) is stored on the product, so price filters and price sorting are
  index-friendly.
- **Visibility**: shoppers only see `status: active` and `moderationStatus: approved`. Sellers control `status`;
  only admins (Phase 6) control `moderationStatus`.
- **Ownership**: seller routes look products up with `{ _id, seller: <session user> }`. Someone else's product answers
  `404`, never `403`, so ids cannot be probed.
- **Mass assignment**: Zod schemas list exactly which fields a seller may send. `seller`, `store`, ratings,
  `soldCount` and `moderationStatus` are never accepted.
- **Search**: a MongoDB text index (name weight 10, brand 5, tags 5, description 1) powers `q`. Suggestions use a
  lower-cased `searchName` with an anchored prefix regex, which can use an index.
- **Pagination** is offset-based with `_id` as the last sort key so pages never repeat or skip items.
- **Images**: the browser sends files to our API (multer, memory storage), the API checks size, MIME type and the
  file's magic bytes, then uploads to `shopsphere/products/<sellerId>/` in Cloudinary. Product payloads may only
  reference images from that seller's own folder in our Cloudinary account.
- **Soft delete**: deleted products stay in the database so Phase 4 order history can still show them. Images are not
  removed for the same reason (a cleanup job for unreferenced uploads comes in Phase 8).

## 9. Phase 4: shopping and orders

**Requirements.** Order placement uses MongoDB **transactions**, which need a replica set. MongoDB Atlas (including
the free M0 tier) is one, so nothing to do. A plain local `mongod` is NOT: either use Atlas or start local MongoDB
with `--replSet rs0` and run `rs.initiate()` once.

No new packages or environment variables. Just unzip, then `npm run dev`.

**Verify in the browser** (use a normal customer account whose email you verified through the server-console link):

1. On a product card or page click the heart (wishlist) and **Add to cart**. The cart icon in the header shows a badge.
2. `/cart`: change quantities, remove a line. Totals come from the server, with delivery charged **per seller**
   (free from Rs 500 per seller, otherwise Rs 40).
3. **Proceed to checkout**: add an address (inline), choose Cash on delivery, **Place order**. You land on the
   confirmation page and the server console prints the order email.
4. `/orders`: filter by status, open an order, open **Track**. Cancel it: the stock goes back on sale.
5. On a product page use **Buy now**: it orders just that product and leaves the cart untouched.
6. In the seller area (demo seller) the product's stock dropped by what you bought.
7. Log in as the demo seller and try to buy one of their own products: refused.
8. `npm test`.

## API reference (Phase 4)

All routes need a logged-in **customer or seller** (admins get 403) and the CSRF header on writes.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/cart` | Live prices, stock problems, totals, `canCheckout` |
| POST | `/api/cart/items` | `{ productId, quantity }`, adds to the existing quantity |
| PATCH | `/api/cart/items/:productId` | `{ quantity }`, sets an exact quantity |
| DELETE | `/api/cart/items/:productId` | Removes a line |
| DELETE | `/api/cart` | Empties the cart |
| GET | `/api/wishlist` / `/api/wishlist/ids` | Products / just ids |
| POST, DELETE | `/api/wishlist/:productId` | Idempotent add / remove |
| GET, POST | `/api/addresses` | Max 10 per user; first one becomes default |
| PATCH, DELETE | `/api/addresses/:id` | Own addresses only (others answer 404) |
| POST | `/api/orders/preview` | Totals for the cart or `{ buyNow }` |
| POST | `/api/orders` | Header `Idempotency-Key` required. Body `{ addressId, paymentMethod: "cod", buyNow? }`. Verified email required |
| GET | `/api/orders/my` | `page, limit, status` |
| GET | `/api/orders/:id` | Own orders only (others answer 404) |
| PATCH | `/api/orders/:id/cancel` | `{ reason? }`. Allowed until a shipment has shipped |

Machine-readable error codes include `INSUFFICIENT_STOCK`, `MAX_QUANTITY`, `OWN_PRODUCT`, `CART_EMPTY`,
`CHECKOUT_CONFLICT`, `INVALID_ADDRESS`, `IDEMPOTENCY_KEY_REQUIRED`, `ORDER_ALREADY_CANCELLED`, `ORDER_NOT_CANCELLABLE`.

Postman: re-import the collection, run the **Phase 4 - Shopping** folder after logging in as a customer.

## How ordering works

- **The server owns the money.** The cart stores only product ids and quantities. Every total comes from one function
  (`pricing.service.js`) used by the cart, the checkout preview and order creation. The order endpoint has no price
  field at all; any price sent is ignored.
- **One order, one shipment per seller.** `Order` holds the money and the address. `SellerOrder` holds what each
  seller ships, with its own status and history. Phase 5 lets sellers update only their own shipments. The parent
  status is derived from the shipments (`deriveOrderStatus`).
- **Placing an order is one transaction:** re-read products, price them, reserve stock with
  `updateOne({ stock: { $gte: qty }, finalPrice }, { $inc })`, create the order and shipments, empty the cart. If any
  step fails everything rolls back, so there are no half-orders and no stock leaks.
- **No overselling.** The stock check and the decrement are a single atomic update, so with 1 item left and two
  buyers exactly one succeeds.
- **No duplicate orders.** The client sends an `Idempotency-Key`; a unique index on `(customer, idempotencyKey)`
  guarantees one order per key. Repeating the request returns the same order with `200`.
- **Snapshots.** Orders copy product name, image, prices and the delivery address, so later edits or deletions never
  change history.
- **Cancelling** is a transaction too: each shipment is claimed atomically (so it cannot race with a seller shipping it),
  then stock and sold counters are restored.
- **Cash on delivery** orders are confirmed immediately. Online payments (Phase 7) will start as `pending` and
  confirm after server-side verification.

## 10. Email verification (Gmail SMTP)

Customers must verify their email before they can place an order. The API enforces this (`403 EMAIL_NOT_VERIFIED`);
the React pages only make it friendly.

### Configure Gmail (free)

1. Google Account -> **Security** -> turn on **2-Step Verification**.
2. Open https://myaccount.google.com/apppasswords , create an app password named `ShopSphere` and copy the 16 letters.
   (If the page is missing, 2-Step Verification is off, or your Google Workspace admin has disabled app passwords.)
3. Add these lines to your existing `server/.env` by hand (do not overwrite the file). Your normal Gmail password
   will **not** work. Spaces in the app password are ignored.

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_letter_app_password
EMAIL_FROM="ShopSphere <your_email@gmail.com>"
CLIENT_URL=http://localhost:5173
```

`EMAIL_FROM` must use the same Gmail address, otherwise Gmail rewrites the sender. Use port `465` with
`SMTP_SECURE=true` if 587 is blocked on your network. Personal Gmail allows roughly 500 messages a day.

Optional: `EMAIL_VERIFICATION_TTL_MINUTES=30` and `EMAIL_RESEND_COOLDOWN_SECONDS=60` (these are the defaults).

On start the server tells you whether SMTP works: `SMTP connection verified`, or `SMTP check FAILED (EAUTH)`.
`EAUTH` means a wrong address or app password. Never commit `.env`.

### Development mode (no SMTP)

With `SMTP_HOST` empty nothing is delivered. The server prints a banner `EMAIL NOT SENT: development simulation`
with the link, the API reports `"verificationEmail": "simulated"`, and the app warns you. In **production** the server
refuses to start without SMTP, so a simulated email can never be mistaken for a real one.
Tokens and links are only ever printed in this simulation mode, never in SMTP mode and never in API responses.

### Windows PowerShell

```powershell
cd D:\shopsphere
npm run install:all          # no new packages were needed
npm test                     # backend tests (first run downloads a MongoDB binary)
npm run build --prefix client   # production build check
npm run dev
```

### Test it by hand

1. Register at `http://localhost:5173/register` with an address you can read.
2. An email "Verify your ShopSphere email" arrives (check spam). Without SMTP, copy the link from the server terminal.
3. Add a product to the cart and open `/checkout` **before** verifying: you land on *Verify your email to check out*.
   Click **Resend**: the button counts down 60 seconds. Clicking it again too early is refused by the server.
4. Open the link. You see *Your email is verified* and are sent on to checkout (or your account).
   The checkout tab you left open continues by itself when you switch back to it.
5. Place a Cash on Delivery order: it succeeds. Open the same link again: *Your email is already verified*.
6. Let a link sit past 30 minutes (or set `EMAIL_VERIFICATION_TTL_MINUTES=5`): the page says it expired and offers a new one.
   When logged out it asks for your address and answers the same way for any address.

### How it works

- **Token**: 48 random bytes (`crypto`), only the **SHA-256 hash** is stored with an expiry (default 30 minutes).
  The raw token exists only in the email link. A new token replaces (invalidates) the previous one.
- **Verify** (`POST /api/auth/verify-email`) consumes the token with one atomic update, so two parallel clicks
  cannot both succeed. Errors: `VERIFICATION_TOKEN_EXPIRED` or `VERIFICATION_TOKEN_INVALID` (unknown or already used).
- **Resend** (`POST /api/auth/resend-verification`): logged in with `{}`, or logged out with `{ "email" }`.
  One atomic update enforces "unverified" and "cooldown" together; logged-out callers always get the same answer.
  Limits: cooldown (60 s) + 5 per hour per account + 10 per hour per IP.
  Errors: `RESEND_COOLDOWN` (with `details.retryAfterSeconds` and a `Retry-After` header), `ALREADY_VERIFIED`,
  `EMAIL_DELIVERY_FAILED`.
- **Status** (`GET /api/auth/verification-status`) lets the page restore the cooldown timer after a refresh.
- **If delivery fails** the token is discarded, so nobody is stuck behind a cooldown for an email that never left.
  Registration itself still succeeds (`verificationEmail: "failed"`).
- The link is opened with the token in the URL; the page removes it from the address bar immediately and the app sends
  `Referrer-Policy: no-referrer`, so the token is not leaked to other sites.

## Test the auth API with Postman

1. Import `docs/postman/ShopSphere.postman_collection.json`.
2. Run **0. Get CSRF token** first. It stores the token in a variable, and a collection pre-request script adds the
   `X-CSRF-Token` header to every later request. Postman keeps the cookies for you.
3. Run **1. Register**, **3. Me**, **4. Refresh session**, **5. Logout** in order.
4. For verify/reset, copy the `token=...` value from the link printed in the server terminal into the
   `emailToken` collection variable.

Things worth trying by hand:

| Try this | Expected |
|----------|----------|
| POST login without the `X-CSRF-Token` header | `403` with `"code": "CSRF_INVALID"` |
| Register with `"role": "admin"` in the body | `201`, but the user's role is `customer` |
| Login with `{"email": {"$gt": ""}, "password": {"$gt": ""}}` | `400` validation error |
| 5 wrong passwords, then the right one | `429`, `"code": "ACCOUNT_LOCKED"` |
| `GET /api/auth/me` after logout | `401` |

## API reference (Phase 2)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/auth/csrf` | - | Issues the CSRF token |
| POST | `/api/auth/register` | - | Creates a customer, logs in, emails verification link |
| POST | `/api/auth/login` | - | Sets HttpOnly cookies |
| POST | `/api/auth/logout` | - | Revokes the session, clears cookies |
| POST | `/api/auth/refresh` | refresh cookie | Rotates the refresh token |
| GET | `/api/auth/me` | access cookie | Current user |
| POST | `/api/auth/forgot-password` | - | Same response whether or not the email exists |
| POST | `/api/auth/reset-password` | - | Single-use token; signs out all devices |
| POST | `/api/auth/verify-email` | - | Single-use token |
| POST | `/api/auth/resend-verification` | access cookie | |

Error format: `{ "success": false, "message": "...", "code": "OPTIONAL_MACHINE_CODE", "errors": [...] }`

## How authentication works

- **Access token**: JWT, 15 minutes, HttpOnly cookie, sent on every API call.
- **Refresh token**: random opaque value, 7 days, HttpOnly cookie restricted to `/api/auth`. Only its SHA-256 hash is
  stored (`RefreshSession`). Every refresh **rotates** it. Replaying an old token revokes the whole login family.
- **CSRF**: double-submit cookie. The SPA fetches a token, keeps it in memory and sends it as `X-CSRF-Token`.
- **Silent refresh**: when an API call returns 401 the Axios interceptor refreshes once (single-flight) and retries.
- **RBAC**: `authenticate` loads the user from the database on each request (so suspension and role changes apply
  immediately), then `authorize('seller', 'admin')` checks the role. React `ProtectedRoute` is only UX.
- **Hardening**: bcrypt, per-IP rate limits, account lockout, timing-equalised login, generic reset responses,
  NoSQL-operator stripping, Zod validation that strips unknown fields (no mass assignment).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `JWT_ACCESS_SECRET must be at least 32 characters` | Generate one with the command in step 3. |
| `COOKIE_SAME_SITE=none requires secure cookies` | Only needed for cross-site deploys; keep `lax` locally. |
| Login works but you are logged out on refresh | Use `http://localhost:5173`, not `127.0.0.1`, and keep the Vite proxy (`VITE_API_URL=/api`). |
| `403 Invalid or missing CSRF token` in Postman | Run **0. Get CSRF token** first. |
| No emails arrive | Expected without SMTP: read the link in the server terminal. |
| `npm test` is slow the first time | It downloads a MongoDB binary once. |
| Product images do not show | Re-run `npm run seed:demo --prefix server` (older seeds pointed at an external site). For your own uploads open DevTools > Network > Img and check the failing URL's status. A failed image now shows a grey placeholder instead of a broken icon. |
| `Transaction numbers are only allowed on a replica set member` | Order placement needs a replica set: use MongoDB Atlas, or run local MongoDB with `--replSet`. |
| Checkout button stays disabled | Your email is not verified (open the link printed in the server terminal), or a cart line has a stock problem. |
| `403 EMAIL_NOT_VERIFIED` when ordering | Same: verify your email first. |
| `SMTP check FAILED (EAUTH)` at startup | Wrong Gmail address or password. Use a 16-letter **App Password**, not your normal password. |
| `SMTP check FAILED (ETIMEDOUT)` / `ESOCKET` | The network blocks the port. Try port 465 with `SMTP_SECURE=true`. |
| Email says "simulation" / `verificationEmail: "simulated"` | `SMTP_HOST` is empty. Fill in the `SMTP_*` values and restart. |
| Server refuses to start: "SMTP_HOST ... required in production" | Set the `SMTP_*` variables on Render. Simulated email is disabled in production. |
| Verify link on your phone opens `localhost` | `CLIENT_URL` must be a URL the phone can reach (your deployed site, or your PC's LAN address). |
| `429 RESEND_COOLDOWN` | Wait for the countdown. The server enforces it, so refreshing the page does not reset it. |
| `503 UPLOADS_NOT_CONFIGURED` | Add the three `CLOUDINARY_*` values to `server/.env` and restart. |
| Seller list says 403 `SELLER_NOT_APPROVED` | Only seller accounts with an approved store work. Use the demo seller from `seed:demo`. |
| Text search finds nothing for part of a word | `q` matches whole words (with stemming). Use the search-box suggestions for prefixes. |
| `bcrypt` fails to install | Use Node 20 or 22 LTS and re-run `npm run install:all`. |

## Folder structure

```text
shopsphere/
├── client/src/
│   ├── components/{common,layout,auth,products,shop,seller}
│   ├── pages/{public,customer,seller,admin}
│   ├── layouts/           MainLayout, SellerLayout
│   ├── routes/            AppRoutes, ProtectedRoute, GuestRoute
│   ├── redux/slices/      uiSlice, authSlice, catalogSlice, cartSlice, wishlistSlice
│   ├── services/          api (interceptors), csrf, auth.service
│   ├── hooks/  utils/      useAsync, useDebounce, money (paise), images
├── server/
│   ├── src/
│   │   ├── config/        env, db, cors
│   │   ├── models/        User, RefreshSession, Category, SellerProfile, Product, Address, Cart, Wishlist, Order, SellerOrder
│   │   ├── services/      auth, token, email, product, imageStorage, pricing, cart, order, address, wishlist
│   │   ├── controllers/  routes/  validators/
│   │   ├── middleware/    auth, csrf, sanitize, validate, rateLimiter, errorHandler
│   │   ├── scripts/       seedAdmin, seedDemo
│   │   └── app.js  server.js
│   └── tests/             health, auth, rbac, auth.ratelimit, products, cart, shopping (addresses+wishlist), orders (+ helpers)
├── docs/postman/
└── package.json
```
