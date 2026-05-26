# Common Layer — packages/common

Shared foundational library used by ALL packages and apps. Provides logger, errors, middlewares, Api base, and utilities. Contains NO business logic and NO external service implementations.

## Structure

```
packages/common/src/
├── logger/            # ILogger interface + Pino implementation
├── errors/            # ServiceError + HTTP error hierarchy
├── api/               # Api base class for controllers
├── middlewares/       # bodySignature (HMAC), bodyValidator, queryValidator
├── dtos/              # Shared DTOs
├── container/         # CommonModule (Inversify bindings)
├── types.ts           # COMMON_TYPES (Inversify symbols)
└── index.ts           # Root re-exports
```

## Import Patterns

Subpath imports are tree-shakable; prefer them.

```typescript
import { ILogger, LoggerWrapper } from "@bivium/common/logger";
import { ApiError, HttpUnAuthorizedError } from "@bivium/common/errors";
import { bodySignatureMiddleware } from "@bivium/common/middlewares";
import { Api } from "@bivium/common/api";
```

## Logger

```typescript
interface ILogger {
  info(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  warning(message: string, metadata?: Record<string, unknown>): void;
}
```

- `LoggerWrapper` — Pino-based concrete implementation.
- Bound in each app's `configBinding.ts` as `COMMON_TYPES.Logger`.

## Api Base Class

All controllers extend `Api`:

```typescript
@injectable()
abstract class Api {
  public send<T>(res: Response, data: T, statusCode?: number, message?: string): void;
}
```

## Errors

```
ServiceError              — Base service-level failure
ApiError                  — Base HTTP error (statusCode)
├── HttpBadRequestError       (400)
├── HttpUnAuthorizedError     (401)
├── HttpNotFoundError         (404)
└── HttpInternalServerError   (500)
```

## Middlewares

```typescript
bodySignatureMiddleware(config)  // Webhook signature verification (HMAC-SHA256)
```

`bodySignatureMiddleware` config:
```typescript
{
  signatureHeader: string;        // e.g. "x-alchemy-signature"
  getSigningKey: (req) => Promise<string>;  // resolves the secret per request
}
```

## Critical Rules

1. **ZERO business logic** — common provides utilities and interfaces, not decisions.
2. **ZERO domain imports** — never import from `@bivium/domain`, `@bivium/application`, or `@bivium/infrastructure`.
3. **Search before creating** — check existing utilities before adding duplicates.
4. **ESM imports** — always `.js` extension.

## Pre-Implementation Checklist

- [ ] Is this truly shared across multiple packages? (If only one needs it, put it there)
- [ ] Zero imports from domain/application/infrastructure?
- [ ] Added to the correct subpath export?
- [ ] Exported from `index.ts`?
- [ ] ESM `.js` extensions on all relative imports?
