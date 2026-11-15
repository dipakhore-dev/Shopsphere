# ShopSphere

Multi-vendor e-commerce marketplace built with the MERN stack (JavaScript only).

**Status: Phase 3 - product marketplace**

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Setup: React + Vite + Tailwind, Express, MongoDB connection, routing | Done |
| 2 | Authentication and RBAC | Done |
| 3 | Product marketplace | Done |
| 4 | Customer shopping (cart, wishlist, addresses, checkout, orders) | Next |
| 5 | Seller dashboard | |
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
| `503 UPLOADS_NOT_CONFIGURED` | Add the three `CLOUDINARY_*` values to `server/.env` and restart. |
| Seller list says 403 `SELLER_NOT_APPROVED` | Only seller accounts with an approved store work. Use the demo seller from `seed:demo`. |
| Text search finds nothing for part of a word | `q` matches whole words (with stemming). Use the search-box suggestions for prefixes. |
| `bcrypt` fails to install | Use Node 20 or 22 LTS and re-run `npm run install:all`. |

## Folder structure

```text
shopsphere/
├── client/src/
│   ├── components/{common,layout,auth,products,seller,cart}
│   ├── pages/{public,customer,seller,admin}
│   ├── layouts/           MainLayout, SellerLayout
│   ├── routes/            AppRoutes, ProtectedRoute, GuestRoute
│   ├── redux/slices/      uiSlice, authSlice, catalogSlice
│   ├── services/          api (interceptors), csrf, auth.service
│   ├── hooks/  utils/      useAsync, useDebounce, money (paise), images
├── server/
│   ├── src/
│   │   ├── config/        env, db, cors
│   │   ├── models/        User, RefreshSession, Category, SellerProfile, Product
│   │   ├── services/      auth, token, email, product, imageStorage
│   │   ├── controllers/  routes/  validators/
│   │   ├── middleware/    auth, csrf, sanitize, validate, rateLimiter, errorHandler
│   │   ├── scripts/       seedAdmin, seedDemo
│   │   └── app.js  server.js
│   └── tests/             health, auth, rbac, auth.ratelimit, products (+ helpers)
├── docs/postman/
└── package.json
```
