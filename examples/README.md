# DataMapper Pro — Examples

This directory contains sample data files and pre-built mapping profiles for learning the DataMapper Pro ETL pipeline end-to-end.

## Overview

| File | Records | Columns | Scenario |
|---|---|---|---|
| `sample-employees.csv` | 30 | 16 | HR employee directory with diverse departments and statuses |
| `sample-patients.csv` | 25 | 23 | Healthcare patient records for HL7 export |
| `sample-orders.csv` | 25 | 18 | E-commerce orders with multiple fulfillment statuses |
| `sample-financial.csv` | 20 | 10 | General-ledger financial transactions with debits/credits |

## System Architecture

DataMapper Pro processes data through a **5-stage pipeline** per row:

```
[Source Row] → Mapping Engine → Template Engine → Validation Engine → Export Serializer
                    ↓                  ↓                  ↓                  ↓
             Field resolution    Output formatting    Data quality        File output
             (source→dest)       ({{tokens}}/#if)     (rules/errors)     (CSV/JSON/XML)
```

Each profile in `profiles/` demonstrates different stages of this pipeline. Import them via **Saved Profiles → Import** to inspect the full configuration.

---

## Scenario 1: Employee Directory (Beginner)

**File**: `sample-employees.csv` · **Profile**: `profiles/employee-directory-enhanced.json`

This scenario introduces the **Mapping Engine** and **Template Engine** — the two core stages.

### What the Profile Contains

Open `profiles/employee-directory-enhanced.json` after importing. The `configurationJson` has three sections:

**mappings[]** — Each entry links a source column to a destination field:
```json
{ "destinationField": "first_name", "sourceField": "first_name", "transformation": "upper" }
{ "destinationField": "full_name",  "expression": "concat(first_name, ' ', last_name)" }
{ "destinationField": "manager_name","expression": "coalesce(manager, 'Unassigned')" }
```

| Feature | How It's Used |
|---|---|
| `sourceField` | Maps directly from CSV column |
| `transformation: "upper"` | Converts name to uppercase |
| `expression: "concat(...)"` | Combines first + last name |
| `expression: "coalesce(...)"` | Falls back to 'Unassigned' when manager is empty |
| `condition` | Skips employees whose status is not 'Active' |

**validationRules[]** — Data quality checks applied per row:
```json
{ "field": "email", "type": "email", "message": "Email must be a valid format" }
{ "field": "status", "type": "enum", "value": ["Active","Leave","Terminated"] }
{ "field": "employee_id", "type": "required" }
```

**outputOptions** — Controls how the export file is written:
```json
{ "delimiter": "|", "includeHeaders": true }
```

### Walkthrough

1. **Upload** `sample-employees.csv` on the Upload page
2. **Import** `profiles/employee-directory-enhanced.json` via Saved Profiles → Import
3. On the **Mapping Designer**, select the uploaded file and the imported profile (or simply inspect the imported profile in Saved Profiles by clicking to expand)
4. Click **Run Job** (after selecting file + profile + output format)
5. Visit **Processing Jobs** to monitor progress and download the output

### Key Learning Points

- A `sourceField` mapping copies data as-is from the CSV column
- `transformation: "upper"` is shorthand — the mapping engine handles it internally
- `expression` can call `concat()` and `coalesce()` with field references
- `condition` on a mapping skips rows entirely (useful for filtering)
- The template uses `{{field_name}}` tokens referencing destination field names
- Validation rules flag bad data without stopping processing

---

## Scenario 2: Order Processing with Validation (Intermediate)

**File**: `sample-orders.csv` · **Profile**: `profiles/order-processing-with-validation.json`

This scenario focuses on the **Validation Engine** — 8 of the 9 rule types are demonstrated.

### What Validation Looks Like

When a row fails validation during job processing, it is recorded in the job's error log with the row number and message. Valid rows pass through; invalid rows are skipped.

**Rules in this profile:**

```json
{ "field": "customer_email", "type": "email" }
{ "field": "order_status",   "type": "enum", "value": ["Delivered","Shipped","Processing","Pending","Cancelled"] }
{ "field": "shipping_zip",   "type": "regex", "value": "^\\d{5}$" }
{ "field": "unit_price",     "type": "number" }
{ "field": "discount",       "type": "number" }
{ "field": "order_date",     "type": "date" }
{ "field": "customer_name",  "type": "maxLength", "value": 100 }
{ "field": "order_id",       "type": "required" }
```

| Rule Type | What It Checks |
|---|---|
| `required` | Field is not null/undefined/empty |
| `maxLength` | String length ≤ value |
| `email` | Valid email format (has `@`, domain) |
| `enum` | Value must be in the allowed list |
| `number` | Value is parseable as a number |
| `date` | Value is parseable as a Date |
| `regex` | Value matches the pattern |

### Templates with Conditionals

The template in this profile uses `{{#if}}` blocks:

```handlebars
{{#if notes}}{{notes}}{{/if}}
{{#if discount_label}}Discount: {{discount_label}}{{/if}}
```

When the destination field value is empty/null, the entire block is omitted. This lets you create compact output that adapts to data availability.

### Walkthrough

1. Upload `sample-orders.csv`
2. Import `profiles/order-processing-with-validation.json`
3. Try modifying `sample-orders.csv` to introduce bad data (remove an email, set a bad status)
4. Run the job and check the errors
5. Notice that valid rows still produce output — invalid rows are logged separately

### Try Breaking It

- Remove the email from a row → `"Customer email format is invalid"` error
- Change a status to `"Backordered"` → `"Invalid order status"` error
- Set a ZIP to `"ABC"` → regex fails

---

## Scenario 3: Financial Report with Fixed-Width Output (Advanced)

**File**: `sample-financial.csv` · **Profile**: `profiles/financial-report.json`

This scenario demonstrates the **Export Engine's fixed-width format** and multi-field expressions.

### The Data

`sample-financial.csv` contains 20 accounting transactions with:
- **debit** / **credit** columns (mutually exclusive — one is always 0)
- 10 expense categories (Revenue, COGS, Payroll, Rent, etc.)
- Transaction statuses (Posted, Pending, Reconciled)
- Nullable vendor field

### Fixed-Width Output

Instead of delimiters, fixed-width output arranges data in precise column positions:

```json
"fixedWidthConfig": [
  { "field": "formatted_date",  "width": 12, "align": "left"  },
  { "field": "description",     "width": 45, "align": "left"  },
  { "field": "debit",           "width": 12, "align": "right" },
  { "field": "credit",          "width": 12, "align": "right" },
  { "field": "status",          "width": 10, "align": "left"  }
]
```

Each field gets a character width, alignment, and optional pad character. Ideal for COBOL-style reports, bank statements, or legacy system integration.

### Expressions in Action

```json
{ "destinationField": "vendor_name", "expression": "coalesce(vendor, '')" }
{ "destinationField": "amount_col",  "expression": "concat('$', coalesce(debit, credit, '0'))" }
```

The `coalesce()` function tries each argument in order and returns the first non-null/non-empty value. The `concat()` joins multiple values into a single string.

### Walkthrough

1. Upload `sample-financial.csv`
2. Import `profiles/financial-report.json`
3. Run the job selecting output format: **TXT** (for fixed-width, use TXT)
4. Download and inspect — notice columns align at exact positions
5. Re-run with **CSV** format to compare the same data as delimited output

---

## Scenario 4: Comparing Output Formats

**File**: `sample-employees.csv` · **Profile**: `profiles/employee-directory-enhanced.json`

The same data + same profile can produce 8 different output formats. This shows how the pipeline separates **what to output** (template + mappings) from **how to serialize it** (export format).

| Format | File Extension | Use Case |
|---|---|---|
| CSV | `.csv` | Standard spreadsheet import |
| JSON | `.json` | API consumption, programmatic use |
| XML | `.xml` | Enterprise data interchange |
| Pipe-delimited | `.txt` | Legacy system import |
| Tab-delimited | `.tsv` | Excel/Google Sheets paste |
| Fixed-width | `.txt` | Mainframe, bank statements |
| Plain text | `.txt` | Human-readable reports |
| HL7 | `.hl7` | Healthcare data exchange |

### Walkthrough

1. Upload `sample-employees.csv` and import the profile (once)
2. Run a job with output format set to **CSV** — download the output
3. Run another job with the same file+profile but output format **JSON** — compare structures
4. Run with **Pipe-Delimited** — note how the template renders differently

### Key Observation

The **template** determines what text goes into each row. The **output format** determines how multiple rows are packaged:
- CSV wraps each row as a delimited line with optional header
- JSON wraps rows as an array or NDJSON stream
- XML wraps rows in `<record>` elements under a `<root>`

---

## Scenario 5: Combined Pipeline (Expert)

Run multiple datasets through the same or different profiles to exercise the full system:

### Cross-Format Consistency

Upload `sample-financial.csv` with `profiles/financial-report.json`. Run the job 4 times with different formats (CSV, JSON, XML, TXT). Verify field names are consistent across outputs.

### Error Accumulation

`sample-orders.csv` has one cancelled order. Run `profiles/order-processing-with-validation.json` and check the error log. Only the valid rows should appear in the output.

### Template Variations

After importing a profile, navigate to the **Template Editor** page. Select the profile and modify its template — add a `{{#if}}` block, change token names, include literal text. Run a job to see how template changes affect output without touching the mappings.

### Profile Reuse

- **Clone** an imported profile, rename it, and change one transformation
- **Export** a modified profile as JSON — inspect the structure
- **Import** the exported file into a fresh session
- This demonstrates the full CRUD lifecycle of profiles

---

## Reference: configurationJson Structure

Each profile's `configurationJson` can contain up to 4 sections:

### mappings[] (required for job processing)

```json
{
  "destinationField": "output_name",
  "sourceField": "source_column",
  "transformation": "upper|lower|trim|formatDate(pattern)",
  "expression": "concat(f1, ' ', f2)|coalesce(f1, fallback)",
  "constant": "static value {{with_token_support}}",
  "condition": {
    "field": "source_column",
    "operator": "equals|notEquals|contains|greaterThan|lessThan|isEmpty|isNotEmpty",
    "value": "compare_value"
  }
}
```

### validationRules[] (applied during job processing)

```json
{
  "field": "field_name",
  "type": "required|maxLength|minLength|regex|date|email|number|lookup|enum",
  "value": "param_or_array",
  "message": "Custom error shown when rule fails"
}
```

### outputOptions (export format configuration)

```json
{
  "delimiter": ",",                    // CSV default
  "includeHeaders": true,              // CSV header row
  "lineEnding": "\n",
  "rootElement": "root",               // XML root
  "itemElement": "record",             // XML item
  "jsonLines": false,                  // JSON: true = NDJSON, false = pretty array
  "fixedWidthConfig": [
    { "field": "name", "width": 20, "align": "left", "padChar": " " }
  ]
}
```

### transformations[] (post-mapping transforms — 18 functions)

When applied, these run after mapping and before templating. Functions include: `upper`, `lower`, `trim`, `substring`, `replace`, `padStart`, `padEnd`, `concat`, `formatDate`, `parseDate`, `round`, `formatNumber`, `parseInt`, `parseFloat`, `coalesce`, `if`, `case`, `switch`.

---

## Quick Reference: Profile Files

| File | Best For | Key Features Demonstrated |
|---|---|---|
| `profiles/employee-directory-enhanced.json` | Beginners | `sourceField`, `transformation: upper`, `concat`/`coalesce` expressions, required + email + enum validation, conditional mappings, pipe-delimited output |
| `profiles/order-processing-with-validation.json` | Validation | 8 rule types (required/email/enum/number/regex/date/maxLength/minLength), `{{#if}}` template blocks, conditional address formatting |
| `profiles/financial-report.json` | Fixed-width export | `coalesce` for nullable fields, fixed-width column config, numeric validation, enum status check |
| `profiles/employee-directory.json` | Basic intro | Simple mappings, one transformation, basic template |
| `profiles/patient-hl7-export.json` | HL7 healthcare | `formatDate` transformation, multi-line template, HL7 output format |
| `profiles/employee-transformed.json` | Expressions | `concat`, `coalesce`, `if` logic, date formatting |

## System Requirements

These examples work with the default DataMapper Pro installation. No special configuration needed. Start with `docker compose up -d` from the project root, then seed the demo user.
