# Feature: Secure User Login (Web UI + Auth API)

## Product context

We are building a customer-facing web application with a login screen backed by a REST authentication service. For **prototype / practice automation**, assume the UI is reachable at:

- Base URL: `https://demo.playwright.dev`
- Login UI path: `/todomvc/` (public demo surface used only for selector practice)

> Note: This is not a real bank login. The goal is to generate **realistic** UI + API test cases and Playwright scripts that demonstrate the QA lifecycle.

## UI acceptance criteria

### UC-UI-01 — Successful login (happy path)

1. User navigates to the login experience.
2. User enters a valid username and password.
3. User submits the form.
4. User is authenticated and lands in the post-login experience (e.g., dashboard/home).

**Expected**

- Successful authentication path completes without errors.
- User session is established (cookie/token present depending on implementation).

### UC-UI-02 — Invalid credentials

1. User enters invalid username or password.
2. User submits the form.

**Expected**

- Login is rejected.
- A clear, user-visible error message is shown (non-empty, accessible text).

### UC-UI-03 — Mandatory fields

1. User attempts to submit with empty username and/or password.

**Expected**

- Form does not submit OR server rejects with validation messaging.
- User sees guidance indicating required fields.

### UC-UI-04 — Locked / disabled account

1. User attempts login for an account that is locked/disabled.

**Expected**

- Login is blocked.
- User sees a specific message indicating the account is locked/disabled (not a generic 500 page).

### UC-UI-05 — Password masking

1. User types into the password field.

**Expected**

- Password characters are masked (input type password or equivalent).

### UC-UI-06 — Remember me (optional)

1. User checks “Remember me” (if present) and logs in successfully.

**Expected**

- Session persistence behavior matches product rules (longer session / refresh token), without security regressions.

### UC-UI-07 — Rate limiting / brute-force protection

1. User fails login repeatedly (e.g., 5+ times).

**Expected**

- After threshold, user sees a rate-limit / temporary lock message OR additional verification step.

## API acceptance criteria (REST)

Assume JSON request/response bodies and standard HTTP semantics.

### UC-API-01 — Login success

- **POST** `/api/auth/login`
- **Request**

```json
{ "username": "valid.user@example.com", "password": "ValidPass123!" }
```

- **Response**
  - **200 OK**
  - Body includes: `token` (string), `expiresIn` (number), `userId` (string)

### UC-API-02 — Invalid credentials

- **POST** `/api/auth/login`
- **Request**

```json
{ "username": "valid.user@example.com", "password": "WrongPass!" }
```

- **Response**
  - **401 Unauthorized**
  - Body includes: `errorCode`, `message` (human readable)

### UC-API-03 — Malformed request

- **POST** `/api/auth/login`
- **Request**

```json
{ "username": "valid.user@example.com" }
```

- **Response**
  - **400 Bad Request**
  - Body explains missing `password` (field-level validation preferred)

### UC-API-04 — Locked account

- **POST** `/api/auth/login`
- **Request** uses a locked account credential

- **Response**
  - **403 Forbidden** (or documented alternative, but must be consistent)
  - Body explains account locked/disabled

### UC-API-05 — Logout

- **POST** `/api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response**
  - **204 No Content** (or **200 OK** with explicit confirmation — pick one in implementation, but must be documented)

## Non-functional / quality expectations

- No secrets (passwords/tokens) should appear in client-visible logs or error pages.
- Error messages must be safe for end users (no stack traces in UI).
- API errors must not leak internal implementation details.

## Test data assumptions

- Valid user exists: `valid.user@example.com` / `ValidPass123!`
- Invalid password is known wrong but well-formed.
- Locked user exists: `locked.user@example.com` / `AnyPass123!`
