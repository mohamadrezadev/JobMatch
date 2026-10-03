# JM-BACK-0001: Auth Module Scaffold PRD

## Problem
JobMatch needs user authentication to support personalized job matching, resume generation, and profile management. Users must be able to register, login, and maintain authenticated sessions.

## Scope
- JWT-based authentication (access + refresh token)
- User registration with email/password
- Login endpoint returning token pair
- Current user endpoint (me)
- Token refresh mechanism
- Password hashing with bcrypt (rounds >= 12)
- Basic input validation

## Out Of Scope
- OAuth/social login
- Email verification
- Password reset flow
- Two-factor authentication
- Role-based access control (beyond user/admin distinction if needed later)
- Session management beyond JWT

## Affected Modules
- auth module (new)
- users module (lightweight - basic user entity)

## API Contract

### POST /api/auth/register
**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```
**Errors:**
- 400: Validation failed (invalid email format, password too weak)
- 409: Email already exists

### POST /api/auth/login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
}
```
**Errors:**
- 401: Invalid credentials

### GET /api/auth/me
**Auth:** Required (Bearer token)
**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": null,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/auth/refresh
**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```
**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
}
```
**Errors:**
- 401: Invalid or expired refresh token

## Persistence Needs
- Prisma schema: User entity
- Fields: id (UUID), email (unique), password (hashed), firstName, lastName, avatar (nullable), createdAt, updatedAt
- Index on email for fast lookups

## Security Requirements
- Passwords hashed with bcrypt (12 rounds minimum)
- JWT secret from environment variable (never hardcoded)
- Access token expires in 1 hour
- Refresh token expires in 7 days
- HTTP-only cookies for refresh token storage (frontend)
- Rate limiting on auth endpoints (10 requests per minute per IP)

## Acceptance Criteria
- [ ] User can register with valid email/password
- [ ] Duplicate email registration returns 409 conflict
- [ ] User can login and receive valid access + refresh tokens
- [ ] Invalid credentials return 401
- [ ] Valid access token allows accessing /auth/me
- [ ] Expired access token returns 401
- [ ] Valid refresh token returns new token pair
- [ ] Expired/invalid refresh token returns 401
- [ ] Password is never returned in any response
- [ ] All tests pass (unit + integration)