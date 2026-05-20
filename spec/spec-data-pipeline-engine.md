---
title: Data Pipeline & Transformation Engine Specification
version: 1.0
date_created: 2026-05-20
owner: DataMapper Pro Team
tags: data, pipeline, transformation, etl, mapping
---

# Introduction

Defines the data processing pipeline, mapping engine, template engine, transformation functions, validation rules, and export serializers for DataMapper Pro. This specification governs how source data flows from ingestion through transformation to final output generation.

## 1. Purpose & Scope

This specification defines the complete data lifecycle within DataMapper Pro, from file ingestion through output generation. It covers the internal data contracts, engine interfaces, transformation function registry, template syntax, validation rule system, and export format serializers. The intended audience is developers implementing or extending data processing components and AI agents generating code against this system.

**Assumptions:** Source files contain tabular data (CSV, XLSX). Each input row produces exactly one output record unless filtered by conditional template logic. The system operates on structured row data, not free-form documents.

## 2. Definitions

| Term | Definition |
|------|-----------|
| Source Column | A named field in the input file detected during parsing |
| Destination Field | A named field in the output defined by the user via mapping |
| Mapping | An association between source column(s) and a destination field, optionally with a transformation |
| Token | A `{{variable}}` placeholder in a template string |
| Template | A string containing tokens, conditionals, and loops that defines output format |
| Transit Row | An in-memory `Record<string, any>` object representing one row being processed through the pipeline |
| Mapping Profile | A saved set of mappings, template, and configuration as a `MappingProfile` database record |
| Expression | A transformation function invocation string (e.g., `upper(last_name)`, `formatDate(dob, 'yyyyMMdd')`) |
| Rule | A validation constraint applied to a destination field |

## 3. Requirements, Constraints & Guidelines

### Data Processing Pipeline (REQ)
- **REQ-DPP-001**: The pipeline shall process one input row at a time and emit one output record per row.
- **REQ-DPP-002**: The pipeline shall support streaming: read input rows in chunks, process incrementally, write output in chunks.
- **REQ-DPP-003**: The pipeline shall never load the entire source file into memory. Only the current processing batch shall reside in memory.
- **REQ-DPP-004**: The pipeline execution order shall be: Load Row -> Apply Mappings -> Apply Transformations -> Apply Template -> Validate -> Write Output.
- **REQ-DPP-005**: Failed rows shall be collected with error messages. Successful rows shall continue. Processing shall not halt on individual row failures.
- **REQ-DPP-006**: Job progress shall be tracked as `processedRows` and `failedRows` counters updated atomically per row.

### Mapping Engine (REQ)
- **REQ-MAP-001**: A mapping shall contain exactly one destination field and optionally one source field, constant, expression, or condition.
- **REQ-MAP-002**: Direct mapping: `{destinationField: "patient_id", sourceField: "MRN"}` copies source value to destination.
- **REQ-MAP-003**: Constant mapping: `{destinationField: "type", constant: "ADT"}` sets a static value.
- **REQ-MAP-004**: Expression mapping: `{destinationField: "full_name", expression: "concat(first_name, ' ', last_name)"}` applies a transformation function.
- **REQ-MAP-005**: Conditional mapping: `{destinationField: "status", sourceField: "age", condition: {field: "age", operator: ">=", value: "18"}}` evaluates before applying.
- **REQ-MAP-006**: Multiple mappings may target the same destination field. Last mapping evaluated wins.
- **REQ-MAP-007**: Auto-mapping shall infer source-to-destination matches by normalized name similarity (case-insensitive, underscore/space normalization, Levenshtein distance ≤ 2).

### Template Engine (REQ)
- **REQ-TMP-001**: Token syntax: `{{field_name}}` shall resolve to the mapped value of `field_name`.
- **REQ-TMP-002**: Dot-notation: `{{row.field_name}}` shall resolve to source column `field_name` (the `row.` prefix is stripped).
- **REQ-TMP-003**: Conditional block: `{{#if field_name}}content{{/if}}` shall include `content` only when `field_name` is truthy (non-null, non-empty, not false).
- **REQ-TMP-004**: Conditional with else: `{{#if field_name}}yes{{else}}no{{/if}}` shall render the else branch when falsy.
- **REQ-TMP-005**: Each loop: `{{#each list_field}}item: {{name}}{{/each}}` shall iterate over an array, rendering the inner template per item with that item's properties in scope.
- **REQ-TMP-006**: Template processing shall generate exactly one line per source row unless conditional blocks filter the row (producing zero lines).
- **REQ-TMP-007**: Unknown tokens shall resolve to empty string `""`.

### Transformation Functions (REQ)
- **REQ-TRF-001**: The system shall provide built-in functions in four categories: String, Date, Numeric, Logic.
- **REQ-TRF-002**: Each function shall be callable by name with parenthesized arguments: `functionName(arg1, arg2)`.
- **REQ-TRF-003**: String functions: `trim(s)`, `upper(s)`, `lower(s)`, `substring(s, start[, end])`, `replace(s, search, replacement)`, `padStart(s, len, char)`, `padEnd(s, len, char)`, `concat(...args)`.
- **REQ-TRF-004**: Date functions: `formatDate(date, pattern)` where pattern uses yyyy/MM/dd/HH/mm/ss tokens, `parseDate(str, pattern)`.
- **REQ-TRF-005**: Numeric functions: `round(num[, decimals])`, `formatNumber(num, pattern)`, `parseInt(s)`, `parseFloat(s)`.
- **REQ-TRF-006**: Logic functions: `coalesce(...values)` returns first non-null/non-undefined, `if(condition, trueVal, falseVal)`, `case(val, pair1, result1, pair2, result2, ...[, default])`, `switch(val, {key1: val1, key2: val2}, defaultVal)`.
- **REQ-TRF-007**: Function arguments may be field references (resolved from the transit row), string literals (single-quoted), numeric literals, or nested function calls.

### Validation Engine (REQ)
- **REQ-VAL-001**: A validation rule shall specify a field name, rule type, optional value parameter, and optional error message.
- **REQ-VAL-002**: Rule type `required` shall fail if the field value is null, undefined, or empty string.
- **REQ-VAL-003**: Rule type `maxLength` shall fail if the string length of the field value exceeds the parameter value.
- **REQ-VAL-004**: Rule type `regex` shall fail if the field value does not match the parameter pattern.
- **REQ-VAL-005**: Rule type `date` shall fail if the field value cannot be parsed as a valid date.
- **REQ-VAL-006**: Rule type `lookup` shall fail if the field value is not present in the parameter comma-separated list.
- **REQ-VAL-007**: Validation results shall return `{valid: boolean, errors: string[]}` with one error message per failed rule.

### Export Formats (REQ)
- **REQ-EXP-001**: CSV export shall use configurable delimiter (default `,`), optional header row, and escape fields containing the delimiter.
- **REQ-EXP-002**: JSON export shall support either formatted array `[{...}, {...}]` or newline-delimited JSON (NDJSON) lines.
- **REQ-EXP-003**: XML export shall wrap records in a configurable root element (default `root`) and item element (default `record`).
- **REQ-EXP-004**: Flat-file (fixed-width) export shall support per-field configuration: `{field, width, align: 'left'|'right', padChar}`.
- **REQ-EXP-005**: Pipe-delimited export shall use `|` as delimiter with no quoting.
- **REQ-EXP-006**: Tab-delimited export shall use `\t` as delimiter.
- **REQ-EXP-007**: HL7-style export shall use `|` as field delimiter and `^` as component delimiter with `\r` line endings.

### Constraints (CON)
- **CON-001**: The pipeline must process a minimum of 10,000 rows per second on a single-core Node.js process.
- **CON-002**: Maximum memory per job shall not exceed 256 MB regardless of input file size.
- **CON-003**: Untrusted file uploads shall be validated: file extension restriction (.csv, .xlsx, .xls), MIME type check, maximum file size 500 MB.
- **CON-004**: All transformation function arguments shall be sanitized. No arbitrary code execution via expression strings.

### Guidelines (GUD)
- **GUD-001**: Mapping expressions should favor built-in transformation functions over raw JavaScript evaluation.
- **GUD-002**: Templates should use `{{field_name}}` (without `row.` prefix) for destination fields and `{{field_name}}` for source column references. Both syntaxes are supported.
- **GUD-003**: Large files (>100 MB) should be processed with explicit delimiter and encoding settings rather than auto-detection.

## 4. Interfaces & Data Contracts

### 4.1 Field Mapping Contract

```typescript
interface FieldMapping {
  destinationField: string;
  sourceField?: string;
  transformation?: string;
  constant?: string;
  expression?: string;
  condition?: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
    value: string;
  };
}
```

### 4.2 Mapping Profile Contract

```typescript
interface MappingProfile {
  id: string;                    // UUID
  name: string;                  // User-visible name
  description?: string;
  template: string;              // Template string with {{tokens}}
  configurationJson: {
    mappings: FieldMapping[];
  };
  version: number;
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### 4.3 Validation Rule Contract

```typescript
interface ValidationRule {
  field: string;
  type: 'required' | 'maxLength' | 'regex' | 'date' | 'lookup';
  value?: string;                // Max length number, regex pattern, or comma-separated lookup list
  message?: string;              // Custom error message (defaults to type-specific message)
}
```

### 4.4 Job Configuration Contract

```typescript
interface JobConfig {
  mappings: FieldMapping[];
  template?: string;
  outputFormat: 'csv' | 'json' | 'xml' | 'txt' | 'hl7' | 'pipe' | 'tab' | 'fixedwidth';
  outputOptions?: {
    delimiter?: string;           // CSV: default ','
    includeHeaders?: boolean;     // CSV: default true
    jsonLines?: boolean;          // JSON: NDJSON mode
    xmlRoot?: string;             // XML: root element name
    xmlItem?: string;             // XML: item element name
    lineEnding?: '\n' | '\r\n' | '\r';
    encoding?: 'utf-8' | 'ascii' | 'latin1';
    fixedWidthConfig?: Array<{
      field: string;
      width: number;
      align: 'left' | 'right';
      padChar?: string;           // default ' '
    }>;
  };
  validationRules?: ValidationRule[];
  sheetName?: string;             // Excel sheet selection
  delimiter?: string;             // CSV input delimiter
  hasHeader?: boolean;            // CSV: first row is header
  transformations?: Array<{
    field: string;
    expression: string;
  }>;
}
```

### 4.5 Pipeline Context Contract

```typescript
// The transit row object flowing through the pipeline stages
// Stage 1: Raw Row (from file parser)
// { firstName: "John", lastName: "Doe", dob: "1986-10-08", ... }

// Stage 2: Mapped Row (after mapping engine)
// { first_name: "John", last_name: "Doe", dob: "1986-10-08", ... }

// Stage 3: Transformed Row (after transformation engine)
// { first_name: "JOHN", last_name: "DOE", dob: "19861008", ... }

// Stage 4: Template Result (after template engine)
// "JOHN|DOE|19861008"

// Stage 5: Final Output (after validation + serialization)
// File buffer in requested format
```

### 4.6 API Endpoints

| Method | Path | Purpose | Request Body | Response |
|--------|------|---------|--------------|----------|
| POST | `/api/jobs` | Create processing job | `CreateJobDto` | `ProcessingJob` |
| GET | `/api/jobs` | List jobs | Query: `?status=&page=&limit=` | `PaginatedResponse<ProcessingJob>` |
| GET | `/api/jobs/:id` | Get job details | — | `ProcessingJob` |
| GET | `/api/jobs/:id/progress` | Get progress | — | `{processedRows, failedRows, totalRows, status}` |
| POST | `/api/jobs/:id/cancel` | Cancel job | — | `{success: true}` |
| GET | `/api/jobs/:id/download` | Download output | — | File stream |
| POST | `/api/validation/row` | Validate single row | `{row, rules}` | `{valid, errors}` |
| POST | `/api/validation/rows` | Validate batch | `{rows, rules}` | `{results: [{valid, errors}]}` |
| POST | `/api/templates/:id/render` | Test template | `{row, index}` | `{output: string}` |
| POST | `/api/transformations/apply` | Apply transformation | `{expression, row}` | `{result: any}` |

## 5. Acceptance Criteria

- **AC-DPP-001**: Given a CSV file with 10,000 rows, when a job is created with direct mappings, then all 10,000 rows are processed and the output file contains exactly 10,000 lines.
- **AC-DPP-002**: Given a row where `age = null` and a mapping `if(age >= 18, 'adult', 'minor')`, when the pipeline processes the row, then the destination field evaluates to `'minor'` (coalesce/null-safe behavior).
- **AC-DPP-003**: Given a template `{{first_name}} {{last_name}}` with mapped fields, when rendered, then the output is the concatenation of first_name and last_name separated by a space.
- **AC-DDP-004**: Given a validation rule `{field: "email", type: "regex", value: "^.+@.+\\..+$"}`, when a row has `email = "invalid"`, then the row is flagged as failed with a validation error.
- **AC-DPP-005**: Given a job processing a file where 5 rows out of 100 have errors, when the job completes, then `processedRows = 95`, `failedRows = 5`, and the output contains only the 95 valid rows.
- **AC-DPP-006**: Given a fixed-width export config with `{field: "name", width: 10, align: "left", padChar: " "}`, when `name = "John"`, then the output contains `"John      "` (6 trailing spaces).
- **AC-DPP-007**: Given a template with `{{#if address}}ADDR|{{address}}{{/if}}` and a row where `address` is empty, then no output line is generated for that row.
- **AC-DPP-008**: Given a transformation `formatDate("2024-01-15", "yyyyMMdd")`, when applied, then the result is the string `"20240115"`.

## 6. Test Automation Strategy

- **Test Levels**: Unit (engine functions), Integration (pipeline end-to-end), Performance (throughput benchmarks).
- **Frameworks**: Jest for backend unit/integration tests. Supertest for API contract tests.
- **Test Data Management**: Deterministic seed data sets: 10-row CSV for unit tests, 100K-row CSV for performance tests. Files generated by test helpers, cleaned up after test run.
- **CI/CD Integration**: Tests run on every PR. Pipeline tests require Postgres test container.
- **Coverage Requirements**: Minimum 85% line coverage for engine services. 100% coverage for transformation functions.
- **Performance Testing**: 100K-row benchmark with `artillery` or inline timer. Must complete under 10 seconds on CI runner.

## 7. Rationale & Context

The row-by-row streaming architecture prevents out-of-memory failures on large files, which is the primary failure mode for naive ETL implementations. The separation of mapping, transformation, template, and validation into discrete stages allows each to be tested independently and potentially executed in parallel in future iterations.

Template syntax uses a Handlebars-like `{{variable}}` and `{{#if}}/{{#each}}` convention because it is widely recognized, avoids collision with most output formats (HTML, XML, HL7), and can be parsed with simple regex without a full parser library.

Transformation functions use a string-based expression format rather than JavaScript eval for security. The expression parser resolves field references against the transit row context and dispatches to registered function handlers. This prevents arbitrary code injection while providing sufficient expressiveness for ETL transformations.

## 8. Dependencies & External Integrations

### External Systems
- None. DataMapper Pro is self-contained and processes user-provided files.

### Third-Party Services
- None. All processing is local. No external API calls during pipeline execution.

### Infrastructure Dependencies
- **INF-001**: PostgreSQL database — Stores job records, mapping profiles, uploaded file metadata. Not used during pipeline processing (processing reads source files directly).
- **INF-002**: Redis (optional) — Required only if BullMQ background job queue is used for job orchestration.

### Data Dependencies
- **DAT-001**: User-provided input files — CSV or XLSX format. The system has no external data sources.

### Technology Platform Dependencies
- **PLT-001**: Node.js runtime 18+ — Required for streaming file I/O, buffer management, and async pipeline execution.
- **PLT-002**: PostgreSQL 14+ — Required for storing mapping profiles, job records, and file metadata.

### Compliance Dependencies
- None.

## 9. Examples & Edge Cases

### Example 1: Basic Pipeline (CSV Input → Pipe-Delimited Output)

**Input CSV:**
```csv
MRN,LASTNAME,FIRSTNAME,DOB,SEX,PHONE
1001,SMITH,JOHN,19861008,M,555-0100
1002,DOE,JANE,19900315,F,
```

**Mappings:**
```json
[
  {"destinationField": "mrn", "sourceField": "MRN"},
  {"destinationField": "last_name", "sourceField": "LASTNAME", "transformation": "upper"},
  {"destinationField": "first_name", "sourceField": "FIRSTNAME"},
  {"destinationField": "dob", "sourceField": "DOB"},
  {"destinationField": "gender", "sourceField": "SEX"},
  {"destinationField": "phone", "expression": "coalesce(PHONE, 'UNKNOWN')"}
]
```

**Template:**
```
{{mrn}}|{{last_name}}|{{first_name}}|{{dob}}|{{gender}}|{{phone}}
```

**Expected Output:**
```
1001|SMITH|JOHN|19861008|M|555-0100
1002|DOE|JANE|19900315|F|UNKNOWN
```

### Example 2: Date Format Transformation

**Input:** `dob = "1986-10-08"`
**Expression:** `formatDate(dob, 'yyyyMMdd')`
**Expected:** `"19861008"`

### Example 3: Conditional Template

**Template:**
```
PID|{{mrn}}|{{last_name}}|{{first_name}}
{{#if phone}}PHN|{{phone}}{{/if}}
{{#if email}}EML|{{email}}{{/if}}
```

**Row with phone but no email:**
```
PID|1001|SMITH|JOHN
PHN|555-0100
```

### Example 4: Fixed-Width Export Configuration

```json
{
  "outputFormat": "fixedwidth",
  "outputOptions": {
    "lineEnding": "\r\n",
    "fixedWidthConfig": [
      {"field": "mrn", "width": 10, "align": "right", "padChar": "0"},
      {"field": "last_name", "width": 20, "align": "left"},
      {"field": "first_name", "width": 15, "align": "left"},
      {"field": "dob", "width": 8, "align": "left"},
      {"field": "amount", "width": 10, "align": "right"}
    ]
  }
}
```

### Edge Case: Empty Input File

- **Input:** CSV with header row only, zero data rows.
- **Expected Behavior:** Job completes successfully. `processedRows = 0`. Output file is empty (or contains header only for CSV with `includeHeaders: true`).

### Edge Case: Null Coalescing

- **Expression:** `coalesce(middle_name, 'N/A')`
- **When `middle_name` is `null`**: Result is `"N/A"`.
- **When `middle_name` is `"James"`**: Result is `"James"`.
- **When `middle_name` is empty string `""`**: Result is `""` (empty string is not null/undefined, so it is returned directly).

### Edge Case: Template Unknown Token

- **Template:** `{{first_name}} {{unknown_field}} {{last_name}}`
- **Row:** `{first_name: "John", last_name: "Doe"}`
- **Expected:** `"John  Doe"` (unknown token renders as empty string).

## 10. Validation Criteria

- **VAL-001**: All transformation functions return correct results for normal inputs, boundary values, and null/undefined inputs.
- **VAL-002**: Template engine correctly renders simple tokens, nested conditionals, each loops, and combinations thereof.
- **VAL-003**: Pipeline throughput meets or exceeds 10,000 rows/second for files under 100 MB.
- **VAL-004**: Memory usage stays under 256 MB when processing a 500 MB CSV file.
- **VAL-005**: Export format serializers produce valid output for the target format (valid JSON, well-formed XML, valid CSV with proper escaping).
- **VAL-006**: Validation engine correctly identifies invalid rows and passes valid rows for all rule types.
- **VAL-007**: Failed rows are collected with descriptive error messages. Processing continues for subsequent rows.
- **VAL-008**: Mapping auto-suggestion produces correct mappings for columns with identical or near-identical names.

## 11. Related Specifications / Further Reading

- [JSON Lines format](https://jsonlines.org/)
- [RFC 4180: Common Format and MIME Type for Comma-Separated Values (CSV)](https://tools.ietf.org/html/rfc4180)
- [HL7 v2.x Message Format](https://www.hl7.org/implement/standards/product_brief.cfm?product_id=185)
