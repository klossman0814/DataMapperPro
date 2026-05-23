# DataMapper Pro — API Documentation

**Base URL**: `http://localhost:3002/api`

**Global prefix**: `/api` (all endpoints below are relative to this prefix)

**Auth scheme**: Bearer JWT token (`Authorization: Bearer <token>`)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Files](#2-files)
3. [Mappings](#3-mappings)
4. [Profiles](#4-profiles)
5. [Jobs](#5-jobs)
6. [Templates](#6-templates)
7. [Transformations](#7-transformations)
8. [Validation](#8-validation)
9. [Export](#9-export)
10. [Database Connections](#10-database-connections)
11. [Notifications](#11-notifications)
12. [Text to Table](#12-text-to-table)
13. [Spec Evaluator](#13-spec-evaluator)
14. [Admin](#14-admin)
15. [Shared Types](#15-shared-types)
16. [Error Codes](#16-error-codes)

---

## 1. Authentication

These endpoints do **not** require JWT (except `profile`, `password`, `update-profile`).

### `POST /auth/register`

Create a new user account.

**Request body**:
```json
{
  "email": "user@example.com",
  "password": "mypassword",
  "name": "John Doe"
}
```

**Validation**:
| Field | Type | Rules |
|---|---|---|
| `email` | string | valid email |
| `password` | string | min 6 characters |
| `name` | string | required |

**Response** `201`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "isActive": true
  }
}
```

**Notes**: The first registered user is assigned `role: "ADMIN"`. Subsequent users get `role: "USER"`.

---

### `POST /auth/login`

Authenticate and receive a JWT token.

**Request body**:
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response** `200`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "isActive": true,
    "notificationPreferences": {
      "jobCompleted": true,
      "jobFailed": true,
      "weeklySummary": false,
      "weeklySummaryDay": "Monday",
      "weeklySummaryTime": "09:00"
    }
  }
}
```

**Errors**: `401 Unauthorized` — invalid credentials.

---

### `POST /auth/forgot-password`

Request a password reset email.

**Request body**:
```json
{
  "email": "user@example.com"
}
```

**Response** `200`:
```json
{
  "message": "If that email exists, a reset link has been sent"
}
```

**Notes**: Generates a bcrypt-hashed reset token with 1-hour expiry. Sends email via configured SMTP. Response is intentionally vague to prevent email enumeration.

---

### `POST /auth/reset-password`

Reset password using token from email.

**Request body**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newpassword123"
}
```

**Validation**:
| Field | Type | Rules |
|---|---|---|
| `token` | string | required |
| `newPassword` | string | min 6 characters |

**Response** `200`:
```json
{
  "message": "Password reset successful"
}
```

---

### `GET /auth/profile`

Get the current user's profile. **JWT required**.

**Response** `200`:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "isActive": true,
  "notificationPreferences": {...},
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

### `PUT /auth/profile`

Update profile. **JWT required**.

**Request body**:
```json
{
  "name": "New Name"
}
```

**Response** `200`: Updated user object (same shape as `GET /auth/profile`).

---

### `PUT /auth/password`

Change password. **JWT required**.

**Request body**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Validation**:
| Field | Type | Rules |
|---|---|---|
| `currentPassword` | string | required |
| `newPassword` | string | min 6 characters |

**Response** `200`:
```json
{
  "message": "Password updated successfully"
}
```

---

## 2. Files

All endpoints require **JWT**.

### `POST /files/upload`

Upload a CSV or Excel file for processing.

**Request**: `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | file | yes | CSV, XLSX, or XLS (max 500 MB) |
| `sheetName` | string | no | For Excel files, which sheet to read |
| `delimiter` | string | no | Default: `,` |
| `hasHeader` | boolean | no | Default: `true` |

**Response** `201`:
```json
{
  "id": "uuid",
  "originalName": "data.csv",
  "filename": "uuid.csv",
  "mimeType": "text/csv",
  "size": 12345,
  "rowCount": 500,
  "columns": [
    { "name": "id", "type": "number", "sampleValues": ["1", "2", "3"] },
    { "name": "name", "type": "string", "sampleValues": ["Alice", "Bob"] },
    { "name": "dob", "type": "date", "sampleValues": ["2024-01-15"] }
  ],
  "preview": [
    { "id": "1", "name": "Alice", "dob": "2024-01-15" },
    { "id": "2", "name": "Bob", "dob": "2024-02-20" }
  ],
  "sheetNames": null,
  "uploadedById": "uuid",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

**Notes**: Files are stored as `{uuid}.{ext}` in the configured upload directory. Column types are auto-detected as `number`, `date`, or `string`. Preview contains up to 100 rows.

---

### `GET /files`

List all uploaded files for the current user.

**Query params**:
| Param | Type | Default |
|---|---|---|
| `page` | number | 1 |
| `limit` | number | 20 |

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "originalName": "data.csv",
      "filename": "uuid.csv",
      "mimeType": "text/csv",
      "size": 12345,
      "rowCount": 500,
      "columns": [...],
      "createdAt": "..."
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### `GET /files/:id`

Get a single file's metadata.

**Response** `200`: Full `UploadedFile` record.

**Errors**: `404 Not Found`.

---

### `GET /files/:id/preview`

Get paginated preview rows for a file.

**Query params**:
| Param | Type | Default |
|---|---|---|
| `page` | number | 1 |
| `limit` | number | 20 |

**Response** `200`:
```json
{
  "columns": [{ "name": "id", "type": "number", "sampleValues": [...] }],
  "rows": [{ "id": "1", "name": "Alice" }],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

**Notes**: Paginated from the stored preview (first 100 rows max). Use this to display sample data in the mapping UI.

---

### `DELETE /files/:id`

Delete an uploaded file.

**Response** `200`:
```json
{
  "message": "File deleted successfully"
}
```

**Errors**: `409 Conflict` if the file has active processing jobs.

---

## 3. Mappings

All endpoints require **JWT**. Mappings define how source fields map to destination fields.

### `POST /mappings`

Create a new mapping profile.

**Request body**:
```json
{
  "profileId": "uuid",
  "name": "My Mapping",
  "description": "Maps customer data to target format",
  "template": "{{row.id}},{{row.name}},{{row.email}}",
  "mappings": [
    {
      "destinationField": "output_id",
      "sourceField": "id",
      "transformation": "trim"
    },
    {
      "destinationField": "full_name",
      "expression": "concat(first_name, ' ', last_name)"
    },
    {
      "destinationField": "status",
      "constant": "ACTIVE"
    }
  ]
}
```

**Validation**:
| Field | Type | Rules |
|---|---|---|
| `profileId` | string | valid UUID |
| `name` | string | required |
| `template` | string | required |
| `mappings` | array | required |

**Response** `201`: Created `MappingProfile` record.

**Notes**: The `mappings` array is stored as `configurationJson` in the database.

---

### `GET /mappings`

List all mapping profiles for the current user.

**Response** `200`: Array of `MappingProfile[]`.

---

### `GET /mappings/:id`

Get a single mapping profile.

**Response** `200`: Full `MappingProfile` record.

**Errors**: `404 Not Found`.

---

### `PUT /mappings/:id`

Update a mapping profile.

**Request body**: Any subset of fields from `POST /mappings`.

**Response** `200`: Updated `MappingProfile` (version incremented).

---

### `DELETE /mappings/:id`

Delete a mapping profile.

**Response** `200`: (empty body, 200 OK).

---

### `POST /mappings/:id/clone`

Clone a mapping profile.

**Response** `201`: New `MappingProfile` with `" (Copy)"` appended to name and version reset to 1.

---

## 4. Profiles

All endpoints require **JWT**. Profiles wrap `MappingProfile` with richer lifecycle management.

### `POST /profiles`

Create or update a profile.

**Request body**:
```json
{
  "name": "Customer Export",
  "description": "Exports customer records",
  "template": "{{row.id}},{{row.name}}",
  "configurationJson": {
    "mappings": [...],
    "outputOptions": { "delimiter": "," },
    "validationRules": [...]
  }
}
```

If `id` is provided, updates the existing profile; otherwise creates a new one.

**Response** `201` / `200`: `MappingProfile` record.

---

### `GET /profiles`

List profiles with search and pagination.

**Query params**:
| Param | Type | Default |
|---|---|---|
| `search` | string | — |
| `page` | number | 1 |
| `limit` | number | 20 |

**Response** `200`:
```json
{
  "data": [...],
  "total": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

**Notes**: Search is case-insensitive on `name` and `description`.

---

### `GET /profiles/workspace/export`

Export all profiles and database connections.

**Response** `200`:
```json
{
  "exportedAt": "2025-01-01T00:00:00.000Z",
  "profiles": [...],
  "databaseConnections": [...]
}
```

**Notes**: Database connection passwords are **not** included.

---

### `POST /profiles/workspace/import`

Import profiles and database connections.

**Request body**:
```json
{
  "profiles": [...],
  "databaseConnections": [...]
}
```

**Response** `201`:
```json
{
  "profiles": 3,
  "databaseConnections": 1
}
```

---

### `POST /profiles/import`

Import a single profile from JSON.

**Request body**:
```json
{
  "name": "Customer Export",
  "description": "...",
  "template": "...",
  "configurationJson": {...}
}
```

**Response** `201`: Created `MappingProfile`.

---

### `GET /profiles/:id`

Get a single profile.

**Response** `200`: Full `MappingProfile`.

---

### `PUT /profiles/:id`

Update a profile.

**Request body**: Any subset of `{ name, description, template, configurationJson }`.

**Response** `200`: Updated profile (version incremented).

---

### `DELETE /profiles/:id`

Delete a profile.

**Response** `200`: (empty body).

---

### `POST /profiles/:id/clone`

Clone a profile.

**Response** `201`: New cloned profile with incremented version.

---

### `GET /profiles/:id/export`

Export a single profile as JSON.

**Response** `200`:
```json
{
  "name": "...",
  "description": "...",
  "template": "...",
  "configurationJson": {...},
  "version": 1,
  "exportedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 5. Jobs

All endpoints require **JWT**. Jobs process data through the ETL pipeline.

### `POST /jobs`

Create and start a processing job.

**Request body**:
```json
{
  "fileId": "uuid",
  "profileId": "uuid",
  "outputFormat": "csv",
  "template": "{{row.id}},{{row.name}}",
  "mappings": [...],
  "outputOptions": {
    "delimiter": ",",
    "includeHeader": true
  }
}
```

**Supported output formats**: `csv`, `json`, `xml`, `pipe`, `tab`, `fixedwidth`, `txt`.

**Data source**: Either `fileId` (uploaded file) or `databaseConnectionId` + `querySql`.

**Validation**:
| Field | Type | Notes |
|---|---|---|
| `fileId` | uuid | optional — source file |
| `databaseConnectionId` | uuid | optional — source DB connection |
| `querySql` | string | optional — SQL query for DB source |
| `profileId` | uuid | optional — use existing profile |
| `outputFormat` | string | **required** |
| `template` | string | optional |
| `mappings` | array | optional |
| `outputOptions` | object | optional |

**Response** `201`:
```json
{
  "id": "uuid",
  "status": "PENDING",
  "totalRows": 0,
  "processedRows": 0,
  "failedRows": 0,
  "outputFormat": "csv",
  "profileId": "uuid",
  "uploadedFileId": "uuid",
  "createdById": "uuid",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

**Notes**: Processing starts immediately in the background via Bull queue.

---

### `GET /jobs`

List jobs with filtering and pagination.

**Query params**:
| Param | Type | Default |
|---|---|---|
| `status` | string | — | Filter: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `page` | number | 1 |
| `limit` | number | 20 |

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "COMPLETED",
      "totalRows": 500,
      "processedRows": 500,
      "failedRows": 0,
      "outputFormat": "csv",
      "outputFile": "output-uuid.csv",
      "uploadedFile": { "id": "uuid", "originalName": "data.csv" },
      "profile": { "id": "uuid", "name": "My Profile" },
      "createdAt": "..."
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### `GET /jobs/:id`

Get full job details.

**Response** `200`: Full `ProcessingJob` record with nested `uploadedFile` and `profile`.

---

### `GET /jobs/:id/progress`

Get real-time job progress.

**Response** `200`:
```json
{
  "id": "uuid",
  "status": "PROCESSING",
  "totalRows": 500,
  "processedRows": 250,
  "failedRows": 2,
  "progress": 50
}
```

---

### `GET /jobs/:id/download`

Download the job's output file. **JWT required**.

**Response** `200`: Binary file stream.

**Headers**: `Content-Disposition: attachment; filename="output.csv"`

**Errors**: `404 Not Found` if job is not completed or file missing.

---

### `POST /jobs/:id/cancel`

Cancel a running job.

**Response** `200`: Updated job with `status: "FAILED"` and `completedAt` set.

---

### `DELETE /jobs/:id`

Delete a job.

**Response** `200`: (empty body).

**Errors**: `409 Conflict` if job is still `PENDING` or `PROCESSING`.

---

## 6. Templates

All endpoints require **JWT**. Templates use Handlebars-like syntax.

### `GET /templates`

List all templates.

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "My Template",
      "description": "...",
      "content": "{{row.id}},{{row.name}}",
      "version": 1,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### `GET /templates/:id`

Get a single template.

**Response** `200`:
```json
{
  "id": "uuid",
  "name": "...",
  "description": "...",
  "content": "...",
  "version": 1,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### `POST /templates`

Create a new template.

**Request body**:
```json
{
  "name": "CSV Export",
  "template": "{{row.id}},{{row.name}},{{row.email}}",
  "description": "Simple CSV template"
}
```

**Response** `201`: Created template record.

---

### `PUT /templates/:id`

Update a template.

**Request body**: Any subset of `{ name, template, description }`.

**Response** `200`: Updated template (version incremented).

---

### `DELETE /templates/:id`

Delete a template.

**Response** `200`:
```json
{
  "deleted": true
}
```

---

### `POST /templates/render-inline`

Test-render a template inline.

**Request body**:
```json
{
  "template": "{{row.id}} - {{row.name}}",
  "context": {
    "row": { "id": "1", "name": "Alice" },
    "index": 0
  }
}
```

**Response** `200`:
```json
{
  "output": "1 - Alice"
}
```

---

### `POST /templates/:id/render`

Render a saved template with data.

**Request body**:
```json
{
  "row": { "id": "1", "name": "Alice", "email": "alice@example.com" },
  "index": 0
}
```

**Response** `200`:
```json
{
  "output": "1,Alice,alice@example.com"
}
```

---

## 7. Transformations

All endpoints require **JWT**. Apply transformation functions to data.

### `POST /transformations/apply`

Apply a single transformation expression.

**Request body**:
```json
{
  "expression": "upper(trim(name))",
  "row": { "name": "  alice  " }
}
```

**Response** `200`: `"ALICE"`

**Supported functions**: `trim`, `upper`, `lower`, `substring`, `replace`, `padStart`, `padEnd`, `concat`, `formatDate`, `parseDate`, `round`, `formatNumber`, `parseInt`, `parseFloat`, `coalesce`, `if`, `case`, `switch`, `join`.

---

### `POST /transformations/apply-row`

Apply multiple transformations to a row.

**Request body**:
```json
{
  "mappings": [
    { "destination": "fullName", "expression": "concat(first, ' ', last)" },
    { "destination": "idPadded", "expression": "padStart(id, 5, '0')" }
  ],
  "row": {
    "first": "Alice",
    "last": "Smith",
    "id": "42"
  }
}
```

**Response** `200`:
```json
{
  "fullName": "Alice Smith",
  "idPadded": "00042"
}
```

---

## 8. Validation

All endpoints require **JWT**. Validate rows against rules.

### `POST /validation/row`

Validate a single row.

**Request body**:
```json
{
  "row": { "name": "Alice", "email": "invalid", "age": "abc" },
  "rules": [
    { "field": "name", "type": "required" },
    { "field": "email", "type": "email" },
    { "field": "age", "type": "number" },
    { "field": "code", "type": "maxLength", "value": 10 }
  ]
}
```

**Supported rule types**: `required`, `maxLength`, `minLength`, `regex`, `date`, `email`, `number`, `lookup`, `enum`.

**Response** `200`:
```json
{
  "valid": false,
  "errors": [
    "email: Not a valid email",
    "age: Not a valid number"
  ],
  "fieldErrors": {
    "email": ["Not a valid email"],
    "age": ["Not a valid number"]
  }
}
```

---

### `POST /validation/rows`

Validate multiple rows.

**Request body**:
```json
{
  "rows": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "", "email": "invalid" }
  ],
  "rules": [
    { "field": "name", "type": "required" },
    { "field": "email", "type": "email" }
  ]
}
```

**Response** `200`:
```json
{
  "results": [
    { "row": 0, "valid": true, "errors": [], "fieldErrors": {} },
    { "row": 1, "valid": false, "errors": ["name is required", "Not a valid email"], "fieldErrors": {...} }
  ],
  "summary": {
    "totalRows": 2,
    "validRows": 1,
    "invalidRows": 1
  }
}
```

---

## 9. Export

All endpoints require **JWT**.

### `POST /export`

Export rows to a specified format.

**Request body**:
```json
{
  "rows": [
    { "id": "1", "name": "Alice", "email": "alice@example.com" },
    { "id": "2", "name": "Bob", "email": "bob@example.com" }
  ],
  "format": "csv",
  "options": {
    "delimiter": ",",
    "includeHeaders": true,
    "lineEnding": "\n",
    "encoding": "utf8"
  }
}
```

**Supported formats**: `csv`, `pipe`, `tab`, `json`, `xml`, `fixedwidth`.

**Fixed-width config**:
```json
{
  "format": "fixedwidth",
  "options": {
    "fixedWidthConfig": [
      { "field": "id", "width": 10, "align": "left", "padChar": " " },
      { "field": "name", "width": 20, "align": "left", "padChar": " " }
    ]
  }
}
```

**Response** `200`:
```json
{
  "content": "id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com\n",
  "format": "csv",
  "rowCount": 2
}
```

---

## 10. Database Connections

All endpoints require **JWT**. Manage external database connections.

### `POST /database-connections`

Create a new database connection.

**Request body**:
```json
{
  "name": "Production DB",
  "type": "postgresql",
  "host": "db.example.com",
  "port": 5432,
  "databaseName": "mydb",
  "username": "app_user",
  "password": "secret",
  "sslEnabled": true
}
```

**Supported types**: `mssql`, `postgresql`, `mysql`.

**Response** `201`:
```json
{
  "id": "uuid",
  "name": "Production DB",
  "type": "postgresql",
  "host": "db.example.com",
  "port": 5432,
  "databaseName": "mydb",
  "username": "app_user",
  "sslEnabled": true,
  "createdById": "uuid",
  "createdAt": "..."
}
```

**Notes**: Password is encrypted with AES-256-GCM before storage and is **never** returned in responses.

---

### `GET /database-connections`

List all database connections for the current user.

**Response** `200`: Array of connection objects (no passwords).

---

### `GET /database-connections/:id`

Get a single database connection.

**Response** `200`: Connection object (no password).

---

### `PUT /database-connections/:id`

Update a database connection.

**Request body**: Any subset of `{ name, host, port, databaseName, username, password, sslEnabled }`.

**Response** `200`: Updated connection (no password).

---

### `DELETE /database-connections/:id`

Delete a database connection.

**Response** `200`:
```json
{
  "deleted": true
}
```

---

### `POST /database-connections/:id/test`

Test a database connection.

**Response** `200`:
```json
{
  "success": true,
  "message": "Connection successful"
}
```

**Errors**: `400 Bad Request` if connection fails.

---

### `POST /database-connections/:id/query`

Execute a SQL query against the connected database.

**Request body**:
```json
{
  "sql": "SELECT id, name, email FROM users WHERE active = 1"
}
```

**Response** `200`:
```json
{
  "columns": [
    { "name": "id", "type": "int" },
    { "name": "name", "type": "varchar" },
    { "name": "email", "type": "varchar" }
  ],
  "rows": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" }
  ],
  "rowCount": 1
}
```

**Errors**: `400 Bad Request` on SQL errors.

---

## 11. Notifications

All endpoints require **JWT**.

### `GET /notifications/preferences`

Get notification preferences.

**Response** `200`:
```json
{
  "jobCompleted": true,
  "jobFailed": true,
  "weeklySummary": false,
  "weeklySummaryDay": "Monday",
  "weeklySummaryTime": "09:00"
}
```

---

### `PUT /notifications/preferences`

Update notification preferences.

**Request body**: Any subset of:
```json
{
  "jobCompleted": true,
  "jobFailed": true,
  "weeklySummary": true,
  "weeklySummaryDay": "Friday",
  "weeklySummaryTime": "17:00"
}
```

**Validation**: `weeklySummaryTime` must match `HH:MM` format.

**Response** `200`: Merged preferences.

---

## 12. Text to Table

All endpoints require **JWT**. Parse unstructured text into structured tables.

### `POST /text-to-table/parse`

Parse text into tabular data.

**Request body**:
```json
{
  "text": "id|name|email\n1|Alice|alice@example.com\n2|Bob|bob@example.com",
  "separators": ["|", ","],
  "parseMode": "flat",
  "hasHeader": true
}
```

**Supported parse modes**: `flat`, `hierarchical`, `hl7-flat`.

**HL7 options** (when `parseMode` is `hl7-flat`):
| Field | Type | Default |
|---|---|---|
| `hl7FieldSep` | string | `\|` |
| `hl7CompSep` | string | `^` |
| `hl7RepSep` | string | `~` |
| `hl7EscapeChar` | string | `\\` |
| `hl7SubCompSep` | string | `&` |
| `hl7AutoDetect` | boolean | `true` |
| `hl7ExpandComponents` | boolean | `true` |

**Response** `200`: Parsed tabular data (columns + rows).

---

### `POST /text-to-table/parse-file`

Parse an Excel file into tabular data.

**Request**: `multipart/form-data`
| Field | Type | Notes |
|---|---|---|
| `file` | file | XLSX file |
| `sheetName` | string | optional |

**Response** `200`: Parsed tabular data.

---

### `POST /text-to-table/import`

Import tabular data into a database table.

**Request body**:
```json
{
  "connectionId": "uuid",
  "tableName": "imported_data",
  "columns": [
    { "name": "id", "type": "INTEGER" },
    { "name": "name", "type": "VARCHAR(255)" },
    { "name": "email", "type": "VARCHAR(255)" }
  ],
  "rows": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" }
  ],
  "dropExisting": true,
  "batchSize": 100
}
```

**Response** `200`:
```json
{
  "tableName": "imported_data",
  "rowsInserted": 100,
  "ddlStatements": [
    "CREATE TABLE imported_data (id INTEGER, name VARCHAR(255), email VARCHAR(255))",
    "INSERT INTO imported_data (id, name, email) VALUES ..."
  ]
}
```

---

## 13. Spec Evaluator

All endpoints require **JWT**. Upload specification documents and evaluate data files against them.

### `POST /spec-evaluator/upload`

Upload a specification document.

**Request**: `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `file` | file | Supported: `docx`, `xlsx`, `xls`, `pdf`, `txt`, `csv`, `tsv`, `dat`, `hl7` |
| `name` | string | optional |
| `description` | string | optional |
| `tags` | string | optional |
| `delimiter` | string | optional |
| `sheetName` | string | optional |

**Response** `201`:
```json
{
  "id": "uuid",
  "name": "spec.pdf",
  "description": "...",
  "fieldCount": 15,
  "formatCount": 2,
  "fields": [...],
  "formats": [...],
  "rules": [...],
  "notes": "...",
  "sections": [...],
  "status": "UPLOADED",
  "createdAt": "..."
}
```

---

### `GET /spec-evaluator`

List spec documents.

**Query params**: `?page=1&limit=20&tag=...`

**Response** `200`:
```json
{
  "data": [...],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### `GET /spec-evaluator/:id`

Get a spec document with its last 10 evaluations.

**Response** `200`: Spec document with `evaluations` array.

---

### `DELETE /spec-evaluator/:id`

Delete a spec document.

**Response** `200`:
```json
{
  "deleted": true
}
```

---

### `POST /spec-evaluator/:id/evaluate`

Evaluate a data file against a spec document.

**Request**: `multipart/form-data` with field `file` (data file).

**Response** `201`:
```json
{
  "id": "evaluation-uuid",
  "status": "PENDING"
}
```

**Notes**: Evaluation runs asynchronously via Bull queue. Check status via `GET /spec-evaluator/evaluations/:evalId`.

---

### `GET /spec-evaluator/:id/evaluations`

List evaluations for a spec document.

**Response** `200`: Array of `SpecEvaluation[]` (last 20).

---

### `GET /spec-evaluator/evaluations/:evalId`

Get a single evaluation result.

**Response** `200`:
```json
{
  "id": "uuid",
  "specDocumentId": "uuid",
  "status": "COMPLETED",
  "score": 92.5,
  "fieldCoverage": {...},
  "issues": [...],
  "summary": "92.5% of fields match the specification",
  "inputFilename": "data.csv",
  "inputRowCount": 500,
  "specDocument": { "id": "uuid", "name": "spec.pdf" },
  "createdAt": "..."
}
```

---

### `POST /spec-evaluator/:id/generate-template`

Generate a mapping template from a spec document.

**Response** `201`: Created `MappingProfile` with auto-generated mappings and template.

---

## 14. Admin

All endpoints require **JWT + Admin role**.

### `GET /admin/users`

List all users (admin only).

**Query params**: `?search=...&page=1&limit=50`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John",
      "role": "USER",
      "isActive": true,
      "createdAt": "...",
      "_count": {
        "mappingProfiles": 3,
        "uploadedFiles": 5,
        "processingJobs": 10,
        "databaseConnections": 1
      }
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 50
}
```

---

### `GET /admin/users/:id`

Get a single user with relationship counts.

**Response** `200`: User object with `_count`.

---

### `PUT /admin/users/:id`

Update a user.

**Request body**:
```json
{
  "name": "New Name",
  "email": "new@example.com",
  "role": "ADMIN"
}
```

**Valid roles**: `ADMIN`, `USER`.

**Response** `200`: Updated user.

**Restrictions**: Cannot modify the super admin (`admin@datamapperpro.com`).

---

### `DELETE /admin/users/:id`

Soft-deactivate a user.

**Response** `200`: Updated user with `isActive: false`.

**Restrictions**: Cannot deactivate the super admin (`admin@datamapperpro.com`).

---

## 15. Shared Types

### `FieldMapping`
```typescript
interface FieldMapping {
  destinationField: string;
  sourceField?: string;
  constant?: string;
  expression?: string;
  transformation?: string;
  condition?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
    value?: any;
  };
}
```

### `ValidationRule`
```typescript
interface ValidationRule {
  field: string;
  type: 'required' | 'maxLength' | 'minLength' | 'regex' | 'date' | 'email' | 'number' | 'lookup' | 'enum';
  value?: any;
  message?: string;
}
```

### `ValidationResult`
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors: Record<string, string[]>;
}
```

### `QueryResult`
```typescript
interface QueryResult {
  columns: { name: string; type: string }[];
  rows: Record<string, any>[];
  rowCount: number;
}
```

### `NotificationPreferences`
```typescript
interface NotificationPreferences {
  jobCompleted: boolean;
  jobFailed: boolean;
  weeklySummary: boolean;
  weeklySummaryDay: string;
  weeklySummaryTime: string;
}
```

### `PaginationDto`
```typescript
interface PaginationDto {
  page?: number;   // default: 1
  limit?: number;  // default: 20
}
```

---

## 16. Error Codes

| Status | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request — validation error or invalid input |
| `401` | Unauthorized — missing or invalid JWT |
| `403` | Forbidden — insufficient role |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — operation conflicts with current state |
| `413` | Payload Too Large — file exceeds limit |
| `429` | Too Many Requests — rate limit exceeded (100/min) |
| `500` | Internal Server Error |

### Error response format:
```json
{
  "message": "Description of the error",
  "error": "Error type",
  "statusCode": 400
}
```

For validation errors:
```json
{
  "message": ["field1 must be a string", "field2 must be an email"],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Rate Limiting

- **100 requests per 60 seconds** per IP (global)
- Exceeded requests return `429 Too Many Requests`

## Pagination

All paginated endpoints accept:
| Param | Type | Default |
|---|---|---|
| `page` | integer | 1 |
| `limit` | integer | 20 |

And return:
```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## ETL Pipeline Flow

```
Upload File ──┐
              ├──> Load Rows ──> For Each Row ──> Map Fields ──> Transform ──> Render Template ──> Validate ──> Collect
DB Query ─────┘                                                                    │
                                                                              (skip invalid rows)
                                                                                    │
                                                                              Write Output
                                                                           (CSV/JSON/XML/etc.)
```

---

## Template Syntax

| Syntax | Description |
|---|---|
| `{{field}}` or `{{row.field}}` | Insert field value |
| `{{#if field}}...{{/if}}` | Conditional block |
| `{{#if field}}...{{else}}...{{/if}}` | Conditional with else |
| `{{#each list}}{{field}}{{/each}}` | Iterate over array |

---

## Transformation Functions

| Function | Signature | Example | Result |
|---|---|---|---|
| `trim` | `trim(field)` | `trim("  hello  ")` | `"hello"` |
| `upper` | `upper(field)` | `upper("hello")` | `"HELLO"` |
| `lower` | `lower(field)` | `lower("HELLO")` | `"hello"` |
| `substring` | `substring(field, start, end?)` | `substring("hello", 1, 3)` | `"ell"` |
| `replace` | `replace(field, search, replacement)` | `replace("a-b-c", "-", "")` | `"abc"` |
| `padStart` | `padStart(field, len, char?)` | `padStart("42", 5, "0")` | `"00042"` |
| `padEnd` | `padEnd(field, len, char?)` | `padEnd("42", 5, " ")` | `"42   "` |
| `concat` | `concat(...fields)` | `concat(first, " ", last)` | `"John Doe"` |
| `formatDate` | `formatDate(field, pattern)` | `formatDate(dob, "yyyyMMdd")` | `"19900115"` |
| `parseDate` | `parseDate(field)` | `parseDate("2024-01-15")` | `Date` object |
| `round` | `round(field, decimals?)` | `round(3.14159, 2)` | `3.14` |
| `formatNumber` | `formatNumber(field, format?)` | `formatNumber(1234, "0,0.00")` | `"1,234.00"` |
| `parseInt` | `parseInt(field)` | `parseInt("42")` | `42` |
| `parseFloat` | `parseFloat(field)` | `parseFloat("3.14")` | `3.14` |
| `coalesce` | `coalesce(...fields)` | `coalesce(phone, email, "N/A")` | First non-null |
| `if` | `if(condition, trueVal, falseVal)` | `if(status, "Active", "Inactive")` | `"Active"` |
| `case` | `case(value, match1, out1, ..., default?)` | `case(type, "A", "Type A", "B", "Type B", "Unknown")` | `"Type A"` |
| `switch` | `switch(value, obj, default?)` | `switch(dept, {"HR":"Human Resources"}, "Other")` | `"Human Resources"` |
| `join` | `join(separator, ...values)` | `join(", ", city, state, zip)` | `"Austin, TX, 78701"` |

---

## Endpoint Summary

| Module | Endpoints | Auth Required | Open |
|---|---|---|---|
| Auth | 7 | 3 | 4 |
| Files | 5 | 5 | 0 |
| Mappings | 6 | 6 | 0 |
| Profiles | 9 | 9 | 0 |
| Jobs | 7 | 7 | 0 |
| Templates | 7 | 7 | 0 |
| Transformations | 2 | 2 | 0 |
| Validation | 2 | 2 | 0 |
| Export | 1 | 1 | 0 |
| Database Connections | 8 | 8 | 0 |
| Notifications | 2 | 2 | 0 |
| Text to Table | 3 | 3 | 0 |
| Spec Evaluator | 7 | 7 | 0 |
| Admin | 4 | 4 | 0 |
| **Total** | **65** | **61** | **4** |
