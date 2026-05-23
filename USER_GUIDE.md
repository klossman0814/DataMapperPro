# DataMapper Pro User Guide

## Table of Contents

1. [Getting Started](#1-getting-started)
   - [Logging In](#11-logging-in)
   - [Creating an Account](#12-creating-an-account)
   - [The Dashboard](#13-the-dashboard)
2. [Uploading Files](#2-uploading-files)
   - [Drag-and-Drop Upload](#21-drag-and-drop-upload)
   - [File Options](#22-file-options)
   - [Data Preview](#23-data-preview)
3. [Text to Table](#3-text-to-table)
   - [Input Methods](#31-input-methods)
   - [Parse Configuration](#32-parse-configuration)
   - [Preview and Import](#33-preview-and-import)
4. [Mapping Designer](#4-mapping-designer)
   - [Selecting a Source File](#41-selecting-a-source-file)
   - [Adding Mappings](#42-adding-mappings)
   - [Auto-Mapping](#43-auto-mapping)
   - [Drag-and-Drop Mapping](#44-drag-and-drop-mapping)
   - [Transformations](#45-transformations)
   - [Expressions and Constants](#46-expressions-and-constants)
   - [Conditions](#47-conditions)
   - [Output Format](#48-output-format)
   - [Saving, Previewing, and Running](#49-saving-previewing-and-running)
5. [Template Editor](#5-template-editor)
   - [Template Syntax Reference](#51-template-syntax-reference)
   - [Creating a Template](#52-creating-a-template)
   - [Testing with Sample Data](#53-testing-with-sample-data)
   - [Template Library](#54-template-library)
   - [From Sample Generator](#55-from-sample-generator)
6. [Processing Jobs](#6-processing-jobs)
   - [Job Lifecycle](#61-job-lifecycle)
   - [Monitoring Progress](#62-monitoring-progress)
   - [Downloading Results](#63-downloading-results)
   - [Cancelling Jobs](#64-cancelling-jobs)
   - [Filtering and Searching](#65-filtering-and-searching)
7. [Saved Profiles](#7-saved-profiles)
   - [Saving and Loading Profiles](#71-saving-and-loading-profiles)
   - [Cloning, Exporting, and Importing](#72-cloning-exporting-and-importing)
   - [Searching Profiles](#73-searching-profiles)
8. [Settings](#8-settings)
   - [Profile Settings](#81-profile-settings)
   - [Security](#82-security)
   - [API Keys](#83-api-keys)
   - [Export Defaults](#84-export-defaults)
   - [Appearance](#85-appearance)
   - [Notification Preferences](#86-notification-preferences)
9. [Validation Rules](#9-validation-rules)
10. [Appendix A: Transformation Functions](#10-appendix-a-transformation-functions)
11. [Appendix B: Output Formats](#11-appendix-b-output-formats)
12. [Appendix C: Seed Data Examples](#12-appendix-c-seed-data-examples)
13. [API Reference](#13-api-reference)
    - [Base URL and Authentication](#131-base-url-and-authentication)
    - [Endpoints](#132-endpoints)
    - [Request and Response Schemas](#133-request-and-response-schemas)
    - [Common Patterns](#134-common-patterns)
    - [Rate Limiting](#135-rate-limiting)

---

## 1. Getting Started

DataMapper Pro is a self-hosted ETL (Extract, Transform, Load) pipeline builder for structured data transformation. Upload CSV or Excel files, visually map source fields to destination fields, apply transformation functions, define output templates, validate rows, and export in 8 formats.

### 1.1 Logging In

Open the application in your browser. If running locally with Docker, go to `http://localhost:5175`.

The login screen shows the DataMapper Pro logo and a sign-in form:

| Field | Value (Demo) |
|---|---|
| Email | `admin@datamapperpro.com` |
| Password | `admin123` |

Enter the credentials and click **Sign In**.

A second demo account is also available:

| Field | Value (Demo) |
|---|---|
| Email | `demo@datamapperpro.com` |
| Password | `admin123` |

### 1.2 Creating an Account

On the login screen, click **"Don't have an account? Create one"** to switch to the registration form. Fill in your name, email, and password (minimum 6 characters), then click **Create Account**.

After registration, you are automatically signed in and redirected to the Dashboard.

### 1.3 The Dashboard

The Dashboard provides an overview of your data mapping activity. It contains:

- **Stat cards** at the top showing total files, mappings, jobs, and success rate
- **Jobs Over Time** chart — a Recharts area chart showing processing activity across the last 7 days
- **Quick action buttons** to upload a file, create a mapping, or start a new job
- **Recent Jobs** list showing the most recent 5 jobs with their status (Completed/Processing/Failed/Pending)

Click the **Refresh** button (in the toolbar) or the **Retry** button on error to reload dashboard data.

---

## 2. Uploading Files

Navigate to the **Upload** page via the sidebar or dashboard quick-action button.

### 2.1 Drag-and-Drop Upload

The upload page shows a drop zone in the center of the screen. To upload:

1. **Drag** a CSV or Excel file from your file manager and drop it onto the zone, **or**
2. **Click** the drop zone to open a file browser dialog

Supported file types:
- `.csv` — Comma-separated values (auto-detects delimiter)
- `.xlsx`, `.xls` — Excel workbooks (multi-sheet supported)
- `.txt`, `.tsv` — Text files

There is also a three-card grid below the drop zone explaining which file types are supported.

**Important**: Default maximum file size is 500 MB. See troubleshooting if larger files fail.

### 2.2 File Options

After a successful upload, the following sections appear:

**File info card** — Shows:
- File name
- Size (KB)
- Row count
- Column count
- MIME type

**File Options** card — Configure:
- **Sheet** (Excel only): Select which sheet to use from a dropdown
- **Delimiter** (CSV): Choose comma, tab, pipe (`|`), or semicolon (`;`)
- **Has Header**: Toggle whether the first row contains column headers

### 2.3 Data Preview

The **Data Preview Grid** shows a paginated view of your data with:

- **Column type badges** — Each column shows its detected type (`string`, `number`, `date`), name, and null percentage. Columns with >10% null are highlighted in red.
- **Sortable columns** — Click any column header to sort ascending/descending. Click again to cycle through sort states.
- **Search** — Type in the search box to filter rows across all columns (global filter).
- **Pagination** — Choose rows per page (10, 25, 50, 100) and navigate pages with the arrow buttons.

After reviewing the preview, click **Continue to Mapping** to proceed to the Mapping Designer.

---

## 3. Text to Table

The **Text to Table** feature lets you paste or upload delimited text data, configure how it should be parsed, preview the results, and import directly into a database table. It supports flat delimited files, hierarchical HL7 messages, and HL7 flat files with custom encoding characters.

Navigate to **Text to Table** via the sidebar.

### 3.1 Input Methods

### 3.2 Parse Configuration

After entering your text, click **Configure Parsing** to reach the configuration step.

**Parse Mode** — Three modes are available:

- **Flat** — All selected delimiters split at the same level. Select any combination of delimiters (Comma `,`, Pipe `|`, Caret `^`, Ampersand `&`, Tilde `~`, Tab `\t`, Semicolon `;`). Optionally toggle **First row is header**.

- **Hierarchical (HL7)** — Full HL7 v2.x message parsing. The parser detects segments (MSH, PID, OBR, OBX, etc.), extracts encoding characters from MSH-2, expands components and subcomponents into named columns using HL7 field definitions (e.g. `pid_patient_name_given_name`), and groups observations into one row per OBX. HL7 encoding characters are shown for reference and are not user-configurable.

- **HL7 Flat File** — HL7-aware flat parsing with configurable per-role delimiters. When this mode is selected, five delimiter inputs appear:

  | Delimiter | Default | Role |
  |---|---|---|
  | Field | `|` | Splits each line into fields |
  | Component | `^` | Splits field values into components (when expansion is on) |
  | Repetition | `~` | Splits field values into repeated instances, expanded into `_rep_N` sub-columns |
  | Escape | `\` | Character used for HL7 escape sequences (`\F\`, `\S\`, `\T\`, `\R\`, `\E\`) |
  | Subcomponent | `&` | Splits component values into subcomponents (when expansion is on) |

  Additional options:
  - **Auto-detect from MSH-2** (default ON) — If the data starts with `MSH`, the parser reads the actual encoding characters from the MSH-2 field and overrides the delimiter inputs.
  - **Expand components** (default ON) — When enabled, fields are split by component and subcomponent separators into sub-columns (e.g. `field_3_comp_1`, `field_3_comp_2`). When disabled, only field-separator splitting is applied with HL7 escape sequence decoding.
  - **First row is header** — Toggle whether the first row provides column names.

  Unlike the Hierarchical (HL7) mode, HL7 Flat File mode does not interpret segment types or observation structure — it simply applies the HL7 encoding rules to produce flat tabular output. This is useful when you have HL7-formatted data but want flat rows without segment-level parsing.

### 3.3 Preview and Import

After configuring, click **Parse & Preview** to see the results:

- **Parse Result** card shows row count, column count, and the detected separator. If multiple separators were scored, each is shown with its consistency score.
- **Data Preview Grid** shows the parsed data with pagination, sorting, and column type badges.
- **Column summary** shows each column's name, detected type (`string`, `number`, `date`, `boolean`, `integer`), and null percentage.

To import into a database:
1. Select a **Database Connection** from the dropdown, or create a new one.
2. Enter a **Target Table Name**.
3. Optionally toggle **Drop table if exists**.
4. Click **Create Table & Import**.

The import generates CREATE TABLE and INSERT statements, executes them against the selected database, and shows the import result with DDL for review.

---

## 4. Mapping Designer

The Mapping Designer is where you connect source data fields to output fields. It is a split-screen interface with source columns on the left and mapping configuration on the right.

The page header has three action buttons:
- **Preview** — Generate a text preview of your current mappings
- **Save Profile** — Save the current configuration as a reusable profile
- **Run Job** — Start processing the file with the current mappings

### 4.1 Selecting a Source File

On the right sidebar, the **Source File** panel shows a dropdown of all your uploaded files. Select the file you want to use. If no files exist, a button links to the Upload page.

The **Output Format** dropdown lets you choose the format for the generated output file. See [Appendix B](#10-appendix-b-output-formats) for all available formats.

### 4.2 Adding Mappings

Type a destination field name into the input at the top of the **Field Mappings** section and click **Add Mapping** (or press Enter). Each mapping row has:

- **Destination Field**: The output field name (editable text input)
- **Source Field**: A dropdown of your source columns, or drag a column from the left panel onto this field
- **Transformation**: An optional dropdown of transformation functions (see [Section 3.5](#35-transformations))
- **Expression / Constant**: An optional text field for fixed values or token expressions (see [Section 3.6](#36-expressions-and-constants))

Each mapping row is **draggable** (grab the grip icon on the left) to reorder mappings. The order of mappings determines the order of fields in the output.

**Clear All** — The button at the top of the mappings panel removes all mappings at once. A confirmation prompt ("Yes" / "No") prevents accidental deletion.

### 4.3 Auto-Mapping

Click the **Auto-Map** button to open the auto-mapping dialog. Enter your desired destination fields as a comma-separated list (e.g., `first_name, last_name, email, phone`). The system automatically matches each destination field to its best source column using fuzzy name matching with Levenshtein distance scoring (threshold <= 0.4).

Click **Map** to apply the suggestions, or **Cancel** to dismiss.

**Example**: If you type `full_name` and your source has `first_name` and `last_name`, the auto-mapper will suggest the closest match. For exact matches like `email` → `email`, it maps directly.

### 4.4 Drag-and-Drop Mapping

The left panel lists all **Source Columns** with their types. Each source column is draggable:

1. **Drag** a source column name from the left panel
2. **Drop** it onto the **Source Field** area of the target mapping row

This sets the source field for that mapping to the dropped column.

### 4.5 Transformations

Each mapping can apply an optional transformation function. Select from the dropdown, which is grouped by category:

- **String** (8): Trim, Uppercase, Lowercase, Substring, Replace, Pad Start, Pad End, Concat
- **Date** (2): Format Date, Parse Date
- **Numeric** (4): Round, Format Number, Parse Int, Parse Float
- **Logic** (4): Coalesce, If/Else, Case, Switch

When a transformation is selected, the engine applies it to the source value before writing to the destination field. See [Appendix A](#9-appendix-a-transformation-functions) for the complete reference with examples.

### 4.6 Expressions and Constants

The **Expression / Constant** field serves two purposes:

- **Constant value**: Enter a static string like `"Active"` or `N/A` to use a fixed value for every row
- **Expression**: Use `{{field_name}}` syntax to reference source fields in a template expression, e.g., `{{first_name}} {{last_name}}` or `concat({{first_name}}, ' ', {{last_name}})`

This field is most useful when:
- No source field is selected (you want to compute the value from multiple fields)
- You need to combine multiple source values into one output field
- You want a literal constant value for every row (e.g., `"DataMapper Pro"` as a source system identifier)

**Example expressions**:
- `{{first_name}} {{last_name}}` — Combines first and last name
- `upper({{city}})` — City name in uppercase
- `{{quantity}} * {{unit_price}}` — Computes total price
- `coalesce({{phone}}, {{email}}, 'No contact')` — First non-empty value

### 4.7 Conditions

Each mapping can optionally have a **condition** that controls whether the mapping is applied. Conditions use this structure:

| Operator | Behavior |
|---|---|
| `equals` | Apply mapping only if field equals value |
| `notEquals` | Apply mapping only if field does not equal value |
| `contains` | Apply mapping only if field contains value |
| `greaterThan` | Apply mapping only if field value > numeric value |
| `lessThan` | Apply mapping only if field value < numeric value |
| `isEmpty` | Apply mapping only if field is null or empty |
| `isNotEmpty` | Apply mapping only if field is non-empty |

**Example**: You can map `employment_status` to `"Inactive"` only when the source `status` field is not `"Active"`:

```
Destination: employment_status
Source: status
Condition: status notEquals Active
```

### 4.8 Output Format

On the right sidebar, the **Output Format** dropdown lets you choose the format for the generated output file. Each format has specific configuration options:

| Format | Extension | Config Options |
|---|---|---|
| Text | `.txt` | — |
| CSV | `.csv` | Delimiter (comma/tab/pipe/semicolon), include header |
| JSON | `.json` | Pretty print (indented) vs compact, NDJSON mode |
| XML | `.xml` | Root element name, item element name |
| HL7 | `.hl7` | — |
| Pipe-Delimited | `.txt` | Include header |
| Tab-Delimited | `.tsv` | Include header |
| Fixed-Width | `.txt` | Per-field width, alignment, pad character |
| Free Form | `.txt` | — |

See [Appendix B](#10-appendix-b-output-formats) for detailed descriptions.

### 4.9 Saving, Previewing, and Running

- **Save Profile**: Enter a profile name in the right sidebar, then click **Save Profile**. The profile is saved and appears on the Saved Profiles page.
- **Preview**: Click **Preview** to generate a sample of the output using the current mappings and template. The preview appears in the Output Preview panel.
- **Run Job**: Click **Run Job** to immediately start processing. A job must have at least one mapping and a selected file.

---

## 5. Template Editor

The Template Editor lets you create and test Handlebars-style output templates. Navigate to it via the sidebar, or access it inline from the Mapping Designer.

### 5.1 Template Syntax Reference

The editor supports the following syntax constructs:

| Syntax | Description | Example |
|---|---|---|
| `{{field}}` | Insert a field value | `{{last_name}}` |
| `{{row.field}}` | Insert a field value (explicit row prefix) | `{{row.first_name}}` |
| `{{#if field}}...{{/if}}` | Conditional block — renders content only if the field is truthy | `{{#if email}}{{email}}{{/if}}` |
| `{{#if field}}...{{else}}...{{/if}}` | Conditional with else branch | `{{#if active}}{{name}}{{else}}Inactive{{/if}}` |
| `{{#each list}}{{field}}{{/each}}` | Iterate over an array | `{{#each items}}{{name}}{{/each}}` |
| `{{index}}` | Current row index (0-based in preview, 1-based in output) | `Record #{{index}}` |
| `{{func(args)}}` | Apply a transformation function to a field | `{{upper(first_name)}}` |

**Token reference** — Click the helper buttons above the editor to insert syntax templates:
- **`{{field}}`** — Inserts `{{}}` for field reference
- **`Text`** — Inserts a literal text placeholder
- **`{{#if}}`** — Inserts an if/endif block
- **`{{#each}}`** — Inserts an each/endeach block
- **`Transforms`** — Opens a dropdown of 18 transformation functions to wrap selected text

---

#### How Data Maps to Template Fields

When you upload a CSV or Excel file and select it as the **Import Data Source** in the Template Editor, every column in that file becomes a field available in your template. Each row of data is a flat record — a single object where each column name maps to a single cell value.

**Example CSV data:**

| first_name | last_name | email | phone | status |
|---|---|---|---|---|
| John | Smith | john@example.com | 555-0100 | Active |
| Jane | Doe | | | Inactive |

For row 1, the template sees this data:
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "email": "john@example.com",
  "phone": "555-0100",
  "status": "Active"
}
```

For row 2, the template sees:
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "",
  "phone": "",
  "status": "Inactive"
}
```

Every cell value is a simple string or number. There are **no nested objects, no arrays, no complex structures** in standard CSV/Excel files — each field is just a single value per row.

---

#### How `{{#if}}` Works with Imported Data

`{{#if}}` checks the value of a single column. If that cell has **any content** (a non-empty string, a number), the condition is truthy and the block renders. If the cell is **empty** or missing, the condition is falsy and the block is skipped.

**With the data above:**

| Template | Row 1 Output | Row 2 Output |
|---|---|---|
| `{{#if email}}{{email}}{{else}}No email{{/if}}` | `john@example.com` | `No email` |
| `{{#if phone}}Contactable{{/if}}` | `Contactable` | *(nothing)* |

Row 1 has values in all columns, so all `{{#if}}` checks pass.
Row 2 has empty `email` and `phone` cells, so those `{{#if}}` blocks are skipped.

This means **you do not need to structure your data any special way** — a standard CSV with populated columns is all `{{#if}}` needs. Just check for the column name and the template engine handles the rest.

---

#### How `{{#each}}` Works with Imported Data

`{{#each}}` requires an **array** — a list of items, where each item is an object with its own fields. Standard CSV/Excel files **do not produce arrays** because every row is flat. Each row has one value per column, and the template processes one row at a time.

**What this means in practice:**
- `{{#each next_of_kin}}` will **not work** with data imported from a CSV file, because `next_of_kin` would just be a single cell value like `"Jane Smith"`, not an array of objects.
- The `{{#each}}` examples in this guide (NK1 segments, allergy entries) demonstrate what the template engine *can* do when given array data, but that data must come from sources that support structured records — such as the pre-seeded demo data in the database.

**Alternatives for repeating data in CSV:**

If your source file has repeating groups (e.g., multiple phone numbers, multiple diagnosis codes), you have two options:

**Option 1 — Multiple columns per item:** Add separate columns for each occurrence:
| patient_id | phone_1 | phone_2 | phone_3 |
|---|---|---|---|
| 1001 | 555-0100 | 555-0101 | |

Then reference each one individually in the template:
```
{{phone_1}}{{#if phone_2}}, {{phone_2}}{{/if}}{{#if phone_3}}, {{phone_3}}{{/if}}
```

This is the most common approach for CSV-based ETL — you explicitly list each column rather than looping.

**Option 2 — Use the Mapping Engine to produce arrays:** If you have a more advanced setup where multiple rows are grouped into a single record (e.g., via a preprocessing script before import), those records could contain array fields. The demo seed data includes such records to showcase `{{#each}}` capabilities for users working with JSON APIs or database extracts that naturally include arrays.

---

#### `{{#if}}` — Conditional Blocks in Detail

The `{{#if}}` directive controls whether a section of the template is included in the output. It evaluates the named field and renders the block only when the value is **truthy** (non-null, non-undefined, non-empty string, not `false`, and not `0`).

**Basic conditional — include content only when a field has a value:**

```
{{#if field_name}}
  Content here appears only when field_name has a value
{{/if}}
```

**Example — include a phone number only if one exists:**

```
{{#if phone}}PHONE: {{phone}}{{/if}}
```

If `phone` is `"555-0123"` → output: `PHONE: 555-0123`
If `phone` is empty/null → output: *(nothing)*

**Conditional with else branch:**

```
{{#if field_name}}
  Rendered when field_name is truthy
{{else}}
  Rendered when field_name is falsy (empty, null, etc.)
{{/if}}
```

**Example — show status label with fallback:**

```
{{#if status}}{{status}}{{else}}Unknown{{/if}}
```

If `status` is `"Active"` → output: `Active`
If `status` is empty/null → output: `Unknown`

**Real-world HL7 example — conditionally include a segment based on patient gender:**

```
{{#if gender_male}}PID|||{{mrn}}||{{last_name}}^{{first_name}}||{{dob}}|M{{/if}}
{{#if gender_female}}PID|||{{mrn}}||{{last_name}}^{{first_name}}||{{dob}}|F{{/if}}
```

The source data contains two boolean fields (`gender_male`, `gender_female`). Only the matching gender segment renders, allowing different segment content per gender without writing separate templates. If both are false (data missing), neither segment appears.

**Real-world HL7 example — conditionally append an OBX segment when a lab value is present:**

```
OBX|1|NM|GLU||{{glucose}}
{{#if cholesterol}}OBX|2|NM|CHOL||{{cholesterol}}{{/if}}
{{#if hdl}}OBX|3|NM|HDL||{{hdl}}{{/if}}
```

This builds an HL7 message where the basic OBX segment for `glucose` is always present, and the `cholesterol` and `hdl` OBX segments only appear when those source fields have values. If a patient has no cholesterol data, that OBX line is omitted entirely — producing a clean, compact message.

**Real-world fixed-width example — conditionally include a status suffix:**

```
{{employee_id}}{{#if manager}} (Manager){{/if}}
```

Output: `1001` when `manager` is empty, `1001 (Manager)` when `manager` has a value.

---

#### `{{#each}}` — Looping Over Arrays in Detail

The `{{#each}}` directive iterates over an array field, rendering the inner template once per element. Within the loop, each element's properties are available as direct tokens. The `{{index}}` variable tracks the current iteration (0-based in preview, 1-based in final output).

**Basic syntax — iterate over a list of items:**

```
{{#each items}}{{field_name}}{{/each}}
```

Each iteration renders the inner content with the current element as the context. If `items` is `[{name: "A"}, {name: "B"}]`, the output would be `AB`.

**Example — create a comma-separated list from an array:**

```
{{#each phone_numbers}}{{number}}, {{/each}}
```

**Example — generate multiple HL7 NK1 (next of kin) segments from an array:**

```
{{#each next_of_kin}}NK1|{{index}}|{{name}}|{{relationship}}|{{phone}}
{{/each}}
```

With source data:
```json
{
  "next_of_kin": [
    { "name": "Jane Smith", "relationship": "SPO", "phone": "555-0101" },
    { "name": "Bob Smith", "relationship": "BRO", "phone": "555-0102" }
  ]
}
```

Output:
```
NK1|1|Jane Smith|SPO|555-0101
NK1|2|Bob Smith|BRO|555-0102
```

The `{{index}}` starts at 1 in the output and increments per iteration, producing sequential NK1 segment numbers. Without `{{#each}}`, you would need to reference each NK1 field separately (`{{nk1_name}}`, `{{nk2_name}}`, etc.) — impractical when the number of entries is unknown.

**Real-world HL7 example — generating AL1 (allergy) segments from a repeating group:**

```
{{#if has_allergies}}
{{#each allergies}}AL1|{{index}}||{{type}}^{{allergen}}||{{severity}}
{{/each}}
{{/if}}
```

This combines `{{#if}}` and `{{#each}}`: the allergies section is wrapped in a conditional, so if the patient has no allergies (the `has_allergies` field is falsy), the entire block is skipped. When allergies exist, the `{{#each}}` generates one AL1 segment per entry:

Source data:
```json
{
  "has_allergies": true,
  "allergies": [
    { "type": "DA", "allergen": "Penicillin", "severity": "SEVERE" },
    { "type": "DA", "allergen": "Sulfa", "severity": "MODERATE" },
    { "type": "FA", "allergen": "Peanuts", "severity": "MILD" }
  ]
}
```

Output:
```
AL1|1|DA|Penicillin||SEVERE
AL1|2|DA|Sulfa||MODERATE
AL1|3|FA|Peanuts||MILD
```

---

#### Real-World HL7 Flat File Example

The following complete template combines all constructs to produce a full HL7 ADT^A04 (patient registration) message:

```
MSH|^~\&|{{sending_app}}|{{sending_facility}}|{{receiving_app}}|{{receiving_facility}}|{{timestamp}}||ADT^A04|{{message_id}}|P|2.3
PID|1|{{mrn}}|{{account_id}}||{{last_name}}^{{first_name}}^{{middle_init}}||{{dob}}|{{gender}}||{{address}}^^{{city}}^{{state}}^{{zip}}||{{phone}}|||{{marital_status}}||{{religion}}
{{#if next_of_kin.length}}
{{#each next_of_kin}}NK1|{{index}}|{{name}}|{{relationship}}|{{phone}}
{{/each}}
{{/if}}
{{#if has_allergies}}
{{#each allergies}}AL1|{{index}}||{{type}}^{{allergen}}||{{severity}}
{{/each}}
{{/if}}
{{#if diagnosis}}DG1|1||{{diagnosis_code}}^{{diagnosis}}||{{diagnosis_date}}{{/if}}
```

With source data:
```json
{
  "sending_app": "ER",
  "sending_facility": "HOSPITAL",
  "receiving_app": "LAB",
  "receiving_facility": "MAIN",
  "timestamp": "2025-05-21T14:30:00",
  "message_id": "MSG-001",
  "mrn": "P-1001",
  "account_id": "A-5001",
  "last_name": "Smith",
  "first_name": "John",
  "middle_init": "",
  "dob": "19800315",
  "gender": "M",
  "address": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zip": "62701",
  "phone": "555-0100",
  "marital_status": "M",
  "religion": "",
  "next_of_kin": [
    { "name": "Jane Smith", "relationship": "SPO", "phone": "555-0101" }
  ],
  "has_allergies": true,
  "allergies": [
    { "type": "DA", "allergen": "Penicillin", "severity": "SEVERE" }
  ],
  "diagnosis": "Chest pain",
  "diagnosis_code": "R07.9",
  "diagnosis_date": "20250521"
}
```

Generated output:
```
MSH|^~\&|ER|HOSPITAL|LAB|MAIN|2025-05-21T14:30:00||ADT^A04|MSG-001|P|2.3
PID|1|P-1001|A-5001||Smith^John^||19800315|M||123 Main St^^Springfield^IL^62701||555-0100|||M||
NK1|1|Jane Smith|SPO|555-0101
AL1|1|DA|Penicillin||SEVERE
DG1|1||R07.9^Chest pain||20250521
```

Key observations from this example:

- **`{{#if next_of_kin.length}}`** — The condition checks the array's `.length` property. If the array is empty, the entire NK1 block (including the `{{#each}}`) is skipped. This prevents generating an empty `NK1` segment.
- **`{{#each next_of_kin}}`** — Generates one `NK1` segment per entry, with `{{index}}` auto-incrementing. If there were 5 next-of-kin entries, you'd get 5 NK1 segments without changing the template.
- **`{{#if diagnosis}}`** — The `DG1` segment only appears when a diagnosis value exists. If the patient had no diagnosis on file, that line is omitted.
- **Empty fields like `{{middle_init}}`** — When a field is empty, it renders as an empty string, producing the correct HL7 empty field between the carets (`Smith^^` not `Smith^ ^`).

---

#### HL7 Repeating Fields and Separators

In HL7 flat file format, sub-fields within a segment are separated by `^` (caret), and repeating components within a sub-field use `&`. When you have multiple related fields (e.g., multiple phone numbers, address components, diagnosis codes), you need to join them with the appropriate separator.

**Example PID segment with name components:**

In HL7, the patient name field (PID-5) uses `^` to separate last name, first name, middle initial, and suffix:
```
PID|||{{mrn}}||{{last_name}}^{{first_name}}^{{middle_init}}^{{suffix}}|
```

With data: `last_name=Smith, first_name=John, middle_init=J, suffix=Jr` → `Smith^John^J^Jr`
With data: `last_name=Smith, first_name=John, middle_init=, suffix=` → `Smith^John^^`

The empty fields produce empty slots between carets. This is correct HL7 — each position has meaning.

**Method 1 — Manual `{{#if}}` chaining (prevents empty slots):**

If you want to skip empty components entirely, use `{{#if}}` to conditionally insert the separator:

```
PID|||{{mrn}}||{{last_name}}{{#if first_name}}^{{first_name}}{{/if}}{{#if middle_init}}^{{middle_init}}{{/if}}
```

With data: `last_name=Smith, first_name=John, middle_init=` → `Smith^John` (no trailing empty slot)
With data: `last_name=Smith, first_name=, middle_init=` → `Smith`

**Method 2 — `join()` function (cleaner syntax):**

The `join` transformation function does the same thing more concisely:

```
PID|||{{mrn}}||{{join('^', last_name, first_name, middle_init, suffix)}}|
```

`join` takes a separator as the first argument, then any number of field names. It filters out empty/null values and joins the rest with the separator.

**Examples:**

| Template | Data | Output |
|---|---|---|
| `{{join('^', last, first, mid)}}` | last=Smith, first=John, mid=J | `Smith^John^J` |
| `{{join('^', last, first, mid)}}` | last=Smith, first=John, mid= | `Smith^John` |
| `{{join('^', phone_1, phone_2, phone_3)}}` | phone_1=555-0100, phone_2=, phone_3=555-0102 | `555-0100^555-0102` |
| `{{join('^', dx_1, dx_2, dx_3)}}` | dx_1=R07.9, dx_2=, dx_3=I10 | `R07.9^I10` |
| `{{join('^', street, city, state, zip)}}` | Full address | `123 Main St^Springfield^IL^62701` |
| `{{join(' & ', phone_1, phone_2)}}` | Two phones | `555-0100 & 555-0101` |

**Real HL7 PID segment with `join()`:**

```
MSH|^~\&|{{sending_app}}|{{sending_facility}}|{{receiving_app}}|{{receiving_facility}}|{{timestamp}}||ADT^A04|{{message_id}}|P|2.3
PID|||{{mrn}}||{{join('^', last_name, first_name, middle_init, suffix)}}||{{dob}}|{{gender}}||{{join('^', street, city, state, zip)}}||{{phone}}|||{{marital_status}}
```

Compare this to the equivalent manual `{{#if}}` version — `join()` eliminates dozens of repeated `{{#if}}{{/if}}` blocks.

**Using `join()` with `{{#each}}` arrays:**

When iterating over an array with `{{#each}}`, each item's fields are available individually. You can use `join()` within the loop body:

```
{{#each phone_numbers}}NK1|{{index}}|{{name}}|{{relationship}}|{{join('^', area, number, ext)}}{{/each}}
```

This is particularly useful for HL7 segments that have compound fields with multiple sub-components. In the NK1 example above, if each phone entry has `area`, `number`, and `ext`, the `join()` call produces `555^0100^101` rather than requiring separate `{{area}}^{{number}}^{{ext}}` templates.

1. Select a template from the **Template** dropdown, or leave it blank to create a new one
2. Enter a **Template Name**
3. Write your template in the Monaco editor (syntax-highlighted for Handlebars)
4. Click **Save** to persist it

Default template when creating new: `{{mrn}}|{{last_name}}|{{first_name}}|{{dob}}|{{gender}}`

The editor shows real-time brace-matching validation — if your `{{` and `}}` are unbalanced, a red error banner appears.

### 5.3 Testing with Sample Data

Click **Render** to test your template against sample data. The system uses hardcoded sample values (`first_name: John`, `last_name: Doe`, etc.) to demonstrate the output. The rendered output appears in the **Output Preview** panel alongside a **Token Reference** card showing available syntax options.

### 5.4 Template Library

The **Template Library** section at the bottom provides starter templates for common formats:

- **JSON Output** — Template producing a JSON object
- **CSV Row** — Template for CSV row output
- **XML Element** — Template for XML record output
- **HL7 Segment** — Template for an HL7 ADT segment

Click any library template to load its content into the editor.

### 5.5 From Sample Generator

A modal dialog accessed from the Template Editor that helps you create templates from existing sample output:

1. Paste a sample output line into the textarea
2. Click **Smart Tokenize** — auto-detects delimiters (`,`, `|`, `\t`) and wraps non-delimiter parts in `{{}}`
3. Edit field names using the **Field Name** input + **Replace** button to replace selected text
4. Click clickable **Source Columns** tokens to insert at cursor position
5. Use **Use as Template** to load the result into the Monaco editor

This is especially useful when you have an existing output format and want to create a matching template quickly.

---

## 6. Processing Jobs

The Processing Jobs page lists all data processing jobs and their current status. Navigate to it via the sidebar or dashboard.

### 6.1 Job Lifecycle

Jobs go through these statuses:

```
PENDING → PROCESSING → COMPLETED
                    → FAILED (or cancelled)
```

### 6.2 Monitoring Progress

The job list shows:

- **File name** — The source file being processed
- **Status badge** — Color-coded: Pending (gray), Processing (amber), Completed (green), Failed (red) with appropriate icons
- **Format** — The output format
- **Progress bar** — Visual indicator with row counts (`processed / total`)
- **Created date** — When the job was started

Click any job row to expand it and see detailed progress metrics:
- **Total Rows**, **Processed**, **Failed**, and **Speed** (rows/second)
- A larger progress bar with percentage
- Error logs (for failed jobs, shown in a red panel with JSON-formatted error details)

Active jobs (PROCESSING, PENDING) auto-poll every 3 seconds for progress updates. Completed and failed jobs stop polling.

### 6.3 Downloading Results

For completed jobs, click the download icon (or the **Download** button in the expanded view). The browser downloads the output file named `output-<id>.<format>`.

### 6.4 Cancelling Jobs

Active jobs (PENDING or PROCESSING) show a cancel button (X icon). Click it to cancel the job. Cancelled jobs are marked as FAILED.

### 6.5 Filtering and Searching

Use the **search box** to filter jobs by file name or job ID. Use the **status filter** dropdown to show only jobs with a specific status (All, Pending, Processing, Completed, Failed).

---

## 7. Saved Profiles

The Saved Profiles page stores reusable mapping configurations. Navigate to it via the sidebar.

### 7.1 Saving and Loading Profiles

To save a profile:
1. Go to the **Mapping Designer**
2. Configure your mappings, template, and output format
3. Enter a **Profile Name** in the right sidebar
4. Click **Save Profile**

On the Saved Profiles page, each profile card shows:
- **Profile name**
- **Description** (if set)
- **Version number** (incremented on each save)
- **Mapping count**
- **Last updated date**

Click **Load** to open the profile in the Mapping Designer with all settings restored.

### 7.2 Cloning, Exporting, and Importing

Each profile card has action buttons:

| Action | Description |
|---|---|
| **Clone** (Copy icon) | Creates a copy of the profile with a "(Copy)" suffix and incremented version |
| **Export** (Download icon) | Downloads the profile as a `.json` file for backup or sharing |
| **Delete** (Trash icon) | Permanently deletes the profile (requires confirmation) |

The page header has two additional buttons:

| Button | Description |
|---|---|
| **Import** | Opens a file picker for `.json` profile files. Imports the profile into your account. |
| **Create New Profile** | Navigates to the Mapping Designer to create a fresh profile |

### 7.3 Searching Profiles

Use the **search box** to filter profiles by name or description.

---

## 8. Settings

The Settings page lets you manage your account and application preferences. Navigate to it via the sidebar.

### 8.1 Profile Settings

Edit your **Name** and view your **Email** (email is read-only). Click **Save Changes** to update.

### 8.2 Security

Change your password:
1. Enter your **Current Password**
2. Enter a **New Password**
3. **Confirm Password**
4. Click **Update Password**

### 8.3 API Keys

API keys allow programmatic access to the DataMapper Pro API for automation, CI/CD integration, and custom scripting.

#### Key Format

Generated keys use the format: `dmp_` followed by 32 random lowercase alphanumeric characters.

```
dmp_a3k8fj2m9xq7r5b1v4n6w0c8p3y6e1t
```

#### Key Lifecycle

1. **Generate** — Click **Generate New** in the API Access card. The key is generated in your browser using `crypto.randomBytes`.
2. **Copy immediately** — Click **Copy** to save the key. Once you navigate away or regenerate, the key **cannot be retrieved** again — it is never stored on the server in plain text.
3. **Use** — Include the key in the `Authorization` header of API requests (see [Section 12 — API Reference](#12-api-reference)).
4. **Regenerate** — If a key is compromised or lost, generate a new one. This invalidates the previous key.

#### Usage

```bash
# cURL
curl -X GET http://localhost:3002/api/jobs \
  -H "Authorization: Bearer dmp_a3k8fj2m9xq7r5b1v4n6w0c8p3y6e1t" \
  -H "Content-Type: application/json"

# PowerShell
Invoke-RestMethod -Uri "http://localhost:3002/api/jobs" `
  -Headers @{ Authorization = "Bearer dmp_a3k8fj2m9xq7r5b1v4n6w0c8p3y6e1t" }

# Python (requests)
import requests
headers = {"Authorization": "Bearer dmp_a3k8fj2m9xq7r5b1v4n6w0c8p3y6e1t"}
response = requests.get("http://localhost:3002/api/jobs", headers=headers)
```

#### Security Best Practices

- Treat your API key like a password. **Never share it** in logs, screenshots, or version control.
- If you suspect a key has been exposed, **generate a new one immediately**.
- Store the key in a **secrets manager** (e.g., HashiCorp Vault, AWS Secrets Manager, .env files, GitHub Secrets) rather than hard-coding it in scripts.
- Rotate keys periodically as part of your security policy.
- The API key is currently **generated and stored client-side only**. Server-side key validation and role-based scoping are not yet implemented. The key serves as a bearer token for the current session.

### 8.4 Export Defaults

Set your preferred defaults:
- **Default Output Format**: CSV, JSON, XML, Text, HL7, Pipe-Delimited
- **Default Delimiter**: Comma, Tab, Pipe, Semicolon

### 8.5 Appearance

Toggle between **Dark Mode** and **Light Mode**. The selected theme is saved to `localStorage` and persists across sessions.

The **About** card shows the application version (`1.0.0`) and the current environment mode.

### 8.6 Notification Preferences

Toggle notification settings:
- **Job completion notifications**
- **Job failure alerts**
- **Weekly usage summary**

---

## 9. Validation Rules

Validation rules enforce data quality constraints on your output. Rules are configured per profile and run during job processing. When a row fails validation, it is **skipped** in the output but processing continues. Failed rows are collected in the job's error log with descriptive messages.

| # | Rule | Value Type | Behavior |
|---|---|---|---|
| 1 | `required` | — | Fails if the field value is null, undefined, or empty string |
| 2 | `maxLength` | Number | Fails if the string length exceeds the given value |
| 3 | `minLength` | Number | Fails if the string length is below the given value |
| 4 | `regex` | String (pattern) | Tests the field value against a JavaScript RegExp pattern |
| 5 | `date` | — | Fails if the value cannot be parsed as a valid Date |
| 6 | `email` | — | Fails if the value does not match `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| 7 | `number` | — | Fails if the value is not a valid number |
| 8 | `lookup` | String[] | Fails if the field value is not in the allowed list |
| 9 | `enum` | String[] or comma-separated | Same behavior as `lookup` |

**Example validation configuration** (from the Fixed-Width Employee Export seed profile):

```json
{
  "validationRules": [
    { "field": "email", "type": "required" },
    { "field": "email", "type": "email" },
    { "field": "employee_id", "type": "required" },
    { "field": "full_name", "type": "maxLength", "value": "50" },
    { "field": "salary", "type": "number" },
    { "field": "status", "type": "enum", "value": "Active,Inactive,Leave,Terminated" }
  ]
}
```

This configuration:
- Ensures `employee_id` and `email` are never empty
- Validates that `email` has a valid format
- Limits `full_name` to 50 characters
- Confirms `salary` is numeric
- Restricts `status` to one of four allowed values

**Validation output** (sample from the seed data):
```json
{
  "row": 6,
  "errors": ["Email validation failed: diana.martinez@example.com"],
  "fieldErrors": { "email": "Invalid email format" }
}
```

---

## 10. Appendix A: Transformation Functions

### String Functions

| # | Function | Syntax | Description | Example Input | Output |
|---|---|---|---|---|---|
| 1 | `trim` | `trim(field)` | Removes leading/trailing whitespace | `trim("  hello  ")` | `hello` |
| 2 | `upper` | `upper(field)` | Converts to uppercase | `upper("hello")` | `HELLO` |
| 3 | `lower` | `lower(field)` | Converts to lowercase | `lower("HELLO")` | `hello` |
| 4 | `substring` | `substring(field, start, end?)` | Extracts substring from `start` to `end` (exclusive, default end is end of string) | `substring("hello", 0, 2)` | `he` |
| 5 | `replace` | `replace(field, search, replacement)` | Replaces all occurrences of `search` with `replacement` | `replace("1-2-3", "-", "")` | `123` |
| 6 | `padStart` | `padStart(field, length, char?)` | Pads the start of a string to reach `length` using `char` (default: space) | `padStart("42", 5, "0")` | `00042` |
| 7 | `padEnd` | `padEnd(field, length, char?)` | Pads the end of a string to reach `length` using `char` (default: space) | `padEnd("42", 5, "0")` | `42000` |
| 8 | `concat` | `concat(...fields)` | Concatenates multiple values into one string | `concat("John", " ", "Doe")` | `John Doe` |

### Date Functions

| # | Function | Syntax | Description | Example Input | Output |
|---|---|---|---|---|---|
| 9 | `formatDate` | `formatDate(field, pattern)` | Formats a date value according to a pattern | `formatDate("1990-01-15", "yyyyMMdd")` | `19900115` |
| 10 | `parseDate` | `parseDate(field)` | Parses a date string and returns ISO format | `parseDate("01/15/1990")` | `1990-01-15T05:00:00.000Z` |

**Date format patterns**: `yyyy` (4-digit year), `MM` (2-digit month), `dd` (2-digit day), `HH` (2-digit hours), `mm` (2-digit minutes), `ss` (2-digit seconds).

### Numeric Functions

| # | Function | Syntax | Description | Example Input | Output |
|---|---|---|---|---|---|
| 11 | `round` | `round(field, decimals?)` | Rounds a number to the given decimal places | `round(3.14159, 2)` | `3.14` |
| 12 | `formatNumber` | `formatNumber(field, format?)` | Formats a number with locale-aware formatting | `formatNumber(1234.5, "0,0.00")` | `1,234.50` |
| 13 | `parseInt` | `parseInt(field)` | Parses a string as an integer | `parseInt("42")` | `42` |
| 14 | `parseFloat` | `parseFloat(field)` | Parses a string as a float | `parseFloat("3.14")` | `3.14` |

### Logic Functions

| # | Function | Syntax | Description | Example |
|---|---|---|---|---|
| 15 | `coalesce` | `coalesce(...fields)` | Returns the first non-null, non-empty value | `coalesce(phone, email, "N/A")` → first found |
| 16 | `if` | `if(condition, trueVal, falseVal)` | Returns `trueVal` if `condition` is truthy, else `falseVal` | `if(status, "Active", "Inactive")` |
| 17 | `case` | `case(value, match1, out1, match2, out2, ..., default?)` | Sequential pattern matching — compares `value` against pairs, returns matching output or default | `case(type, "A", "Type A", "B", "Type B", "Unknown")` |
| 18 | `switch` | `switch(value, object, default?)` | Object-lookup dispatch — uses `value` as key in an object, returns matched value or default | `switch(dept, {"HR": "Human Resources"}, "Other")` |
| 19 | `join` | `join(separator, ...fields)` | Joins non-empty field values with a separator | `join('^', last, first, mid)` | `Smith^John^J` |

### Real-World Expression Examples from Seed Data

The following examples are taken from the pre-seeded mapping profiles:

**Full name concatenation:**
```
concat({{first_name}}, ' ', {{last_name}})
```
Input: `first_name: "John"`, `last_name: "Smith"` → Output: `"John Smith"`

**Nested function calls (transformations within expressions):**
```
upper(concat({{customer_name}}, ' <', {{customer_email}}, '>'))
```
Input: `customer_name: "Alice Johnson"`, `customer_email: "alice.j@email.com"`
Output: `ALICE JOHNSON <ALICE.J@EMAIL.COM>`

**Conditional salary banding using nested `if`:**
```
if({{salary}} > 100000, 'Senior', if({{salary}} > 75000, 'Mid', 'Junior'))
```
- `salary: 105000` → `"Senior"`
- `salary: 85000` → `"Mid"`
- `salary: 65000` → `"Junior"`

**BMI calculation with rounding:**
```
round({{weight_kg}} / ({{height_cm}} / 100 * {{height_cm}} / 100), 1)
```
Input: `weight_kg: 82`, `height_cm: 178` → `82 / (1.78 * 1.78)` → `25.9`

**Performance rating label using `case`:**
```
case({{performance_rating}}, 5, 'Excellent', 4, 'Good', 3, 'Average', 2, 'Below Average', 1, 'Poor', 'Not Rated')
```

**Insurance name lookup using `switch`:**
```
switch({{insurance}}, {"BlueCross":"BlueCross BlueShield","Kaiser":"Kaiser Permanente","Aetna":"Aetna Inc.","Cigna":"Cigna Corp"}, "Self-Pay")
```

**Computed total with discount:**
```
({{unit_price}} * {{quantity}}) * (1 - {{discount}} / 100)
```
Input: `unit_price: 29.99`, `quantity: 2`, `discount: 10`
Output: `(29.99 * 2) * (1 - 0.10)` → `53.982`

**Contact info fallback chain:**
```
coalesce({{phone}}, {{email}}, 'No contact')
```
Returns the first non-empty value from `phone`, then `email`, then the literal `"No contact"`.

### Expression Syntax Reference

- `{{field_name}}` — References a source field value
- `'literal string'` — Use single quotes for string literals
- `123`, `3.14` — Numeric literals
- `true`, `false` — Boolean literals
- `null` — Null literal
- Functions can be **nested**: `upper(concat({{first}}, ' ', {{last}}))` is valid
- Operators: `+`, `-`, `*`, `/`, `>`, `<`, `>=`, `<=`, `==`, `!=`, `&&`, `||`
- Parentheses for grouping: `({{a}} + {{b}}) * {{c}}`

---

## 11. Appendix B: Output Formats

### CSV (Comma-Separated Values)
- **Extension**: `.csv`
- **Config**: `delimiter` (comma, tab, pipe, semicolon), `includeHeader` (boolean)
- **Use case**: Universal data interchange, spreadsheet import

### JSON
- **Extension**: `.json`
- **Config**: `pretty` (boolean — indented vs compact), `jsonLines` (boolean — NDJSON mode, one JSON object per line)
- **Use case**: Web APIs, programmatic consumption

### XML
- **Extension**: `.xml`
- **Config**: `rootElement` (outer wrapper name), `itemElement` (per-record element name)
- **Use case**: Legacy system integration, SOAP web services
- **Default**: `<root><item>...</item></root>`

### HL7 v2.3
- **Extension**: `.hl7`
- **Config**: None
- **Use case**: Healthcare data interchange
- **Format**: Pipe-delimited (`|`) fields, caret (`^`) component separators, carriage return (`\r`) segment terminators
- **Example segments**: MSH (message header), PID (patient identification), NK1 (next of kin), OBX (observation)

### Pipe-Delimited
- **Extension**: `.txt`
- **Config**: `includeHeader` (boolean)
- **Use case**: Healthcare, mainframe systems

### Tab-Delimited
- **Extension**: `.tsv`
- **Config**: `includeHeader` (boolean)
- **Use case**: Spreadsheet interchange, database exports

### Fixed-Width
- **Extension**: `.txt`
- **Config**: Per-field configuration array:
  ```json
  {
    "fixedWidthConfig": [
      { "field": "employee_id", "width": 10, "align": "left", "padChar": " " },
      { "field": "full_name", "width": 25, "align": "left", "padChar": " " },
      { "field": "salary", "width": 12, "align": "right", "padChar": " " }
    ]
  }
  ```
- **Use case**: Mainframe, legacy systems, COBOL-style reports

### Plain Text (Free Form)
- **Extension**: `.txt`
- **Config**: None
- **Use case**: Simple flat file output, raw template rendering

### Output Format Mapping

| Format | MIME Type | Extension |
|---|---|---|
| CSV | `text/csv` | `.csv` |
| JSON | `application/json` | `.json` |
| XML | `application/xml` | `.xml` |
| HL7 | `text/plain` | `.hl7` |
| Pipe | `text/plain` | `.txt` |
| Tab | `text/tab-separated-values` | `.tsv` |
| Fixed-Width | `text/plain` | `.txt` |
| Free Form | `text/plain` | `.txt` |

---

## 12. Appendix C: Seed Data Examples

The demo environment includes pre-seeded data that demonstrates all major features. Here is a summary:

### Uploaded Files

| File Name | Rows | Columns | Owner | Description |
|---|---|---|---|---|
| Patient Records.csv | 25 | 24 | Admin User | Patient demographics, diagnoses, medications, vitals |
| Employee Directory.csv | 30 | 16 | Admin User | Employee profiles, salaries, departments, performance |
| Order History.csv | 25 | 17 | Demo User | E-commerce orders, pricing, shipping, discounts |
| Financial Transactions.csv | 20 | 10 | Admin User | Accounting entries, debits/credits, vendor data |

### Mapping Profiles

| Profile Name | Creator | Key Features Demonstrated |
|---|---|---|
| All 16 Transformation Functions | Admin | Every string, date, numeric, and logic function applied to patient data |
| Complex Template Engine | Admin | `{{#if}}...{{else}}...{{/if}}` with XML output, computed fields |
| Conditional Mapping & Logic | Admin | Nested `if`, `case`, `switch`, `coalesce`, conditional field mapping |
| Fixed-Width Employee Export | Demo | Fixed-width output format with 6 validation rules |
| HL7 Patient Export | Admin | Healthcare HL7 v2.3 format with PID/NK1/OBX segments |
| Financial JSON Report | Admin | Pretty-printed JSON with constants, computed fields, `coalesce` |
| Orders Tab-Delimited | Demo | Tab-separated format with constants and expressions |
| Patient Summary (Pipe-Delimited) | Demo | Pipe-delimited text with string transformations and BMI calculation |

### Processing Jobs

| Job | Status | Format | Rows | Profile |
|---|---|---|---|---|
| All 16 Functions | COMPLETED | CSV | 25/25 | All 16 Transformation Functions |
| Complex Template | COMPLETED | XML | 25/25 | Complex Template Engine |
| Conditional Mapping | FAILED (3 errors) | CSV | 18/30 | Conditional Mapping & Logic |
| HL7 Export | PROCESSING | HL7 | 10/25 | HL7 Patient Export |
| Financial Report | COMPLETED | JSON | 20/20 | Financial JSON Report |
| Fixed-Width Export | PENDING | Fixed-Width | 0/30 | Fixed-Width Employee Export |
| Orders Tab-Delimited | COMPLETED | Tab | 25/25 | Orders Tab-Delimited |
| Patient Summary | COMPLETED | Pipe | 25/25 | Patient Summary (Pipe-Delimited) |
| 5 Historical Jobs | COMPLETED | CSV | 25/25 | All 16 Functions (reused) |

### Sample HL7 Message Output

The HL7 Patient Export profile generates messages like:

```
MSH|^~\&|DATAMAPPER|HOSPITAL|RECEIVER|FACILITY|2025-01-15T08:30:00||ADT^A04|MSG-P-001|P|2.3
PID|1|P-001||SMITH^JOHN||19850315|M||A+|123 Main St^^Springfield^IL^62701||555-0201|john.smith@email.com
NK1|1|Jane Smith|SPO|555-0301
OBX|1|TX|SMOKING||Former
```

### Sample Fixed-Width Output

The Fixed-Width Employee Export profile produces records like:

```
1001      John Smith             Engineering           105000     Active    
1002      Jane Doe               Marketing              95000     Active    
1003      Bob Johnson            Engineering             75000     Active    
```

Each field has a specified width (10, 25, 20, 12, 10 characters), alignment, and pad character.

### Sample Failed Job Error Log

The Conditional Mapping job failed with 3 validation errors:

```json
[
  { "row": 6, "errors": ["Email validation failed: diana.martinez@example.com"] },
  { "row": 19, "errors": ["Status validation failed: Leave"] },
  { "row": 24, "errors": ["Salary validation failed"] }
]
```

This demonstrates how validation rules catch data quality issues during processing.

---

## 13. API Reference

### 13.1 Base URL and Authentication

**Base URL**: `http://localhost:3002/api`

All endpoints require authentication via a **Bearer JWT token** or **API key**, except `register`, `login`, `forgot-password`, and `reset-password`:

```
Authorization: Bearer <jwt_token_or_api_key>
```

**Authentication Flow:**
1. Call `POST /api/auth/login` with valid credentials to receive an `access_token`
2. Include the token in the `Authorization` header of subsequent requests
3. The token expires after 24 hours (`JWT_EXPIRATION` configurable)
4. On a 401 response, re-authenticate and obtain a new token

**Content-Type**: `application/json` for all request bodies (except file uploads which use `multipart/form-data`)

**Global constraints**:
- All endpoints under the `/api` global prefix
- `ValidationPipe` with `transform: true` and `whitelist: true`
- Rate limited to 100 requests per 60 seconds per IP
- Helmet security headers + compression enabled

---

### 13.2 Auth Endpoints

Open endpoints (no JWT required):

| Method | Path | Request Body | Response |
|---|---|---|---|
| `POST` | `/auth/register` | `{ email, password, name }` | `{ access_token, user }` |
| `POST` | `/auth/login` | `{ email, password }` | `{ access_token, user }` |
| `POST` | `/auth/forgot-password` | `{ email }` | `{ message }` |
| `POST` | `/auth/reset-password` | `{ token, newPassword }` | `{ message }` |

JWT-required:

| Method | Path | Request Body | Response |
|---|---|---|---|
| `GET` | `/auth/profile` | — | User object |
| `PUT` | `/auth/profile` | `{ name }` | Updated user |
| `PUT` | `/auth/password` | `{ currentPassword, newPassword }` | `{ message }` |

**Validation rules**:
- `register`: email must be valid, password min 6 chars, name required
- `login`: email and password required
- `reset-password` / `password`: newPassword min 6 chars

**Notes**:
- First registered user gets `role: "ADMIN"`, subsequent users get `role: "USER"`
- Forgot-password sends bcrypt-hashed token via SMTP with 1-hour expiry
- Response is intentionally vague on forgot-password to prevent email enumeration

---

### 13.3 Files Endpoints

All JWT required.

| Method | Path | Params / Body | Response |
|---|---|---|---|
| `POST` | `/files/upload` | `multipart/form-data`: `file`, `sheetName?`, `delimiter?`, `hasHeader?` | `UploadedFile` |
| `GET` | `/files` | `?page=1&limit=20` | Paginated `UploadedFile[]` |
| `GET` | `/files/:id` | — | `UploadedFile` |
| `GET` | `/files/:id/preview` | `?page=1&limit=20` | `{ columns, rows, total, page, limit, totalPages }` |
| `DELETE` | `/files/:id` | — | `{ message }` |

**Upload response includes**:
- `id`, `originalName`, `filename`, `mimeType`, `size`, `rowCount`
- `columns`: auto-detected column metadata (name, type: `number|date|string`, sampleValues)
- `preview`: first 100 rows of data
- `sheetNames`: list of sheets (Excel only)

**Notes**:
- Supported formats: CSV, XLSX, XLS (max 500 MB)
- Files stored as `{uuid}.{ext}` in configured upload directory
- Delete blocked if file has active processing jobs (409 Conflict)

---

### 13.4 Mappings Endpoints

All JWT required. Define how source fields map to destination fields.

| Method | Path | Request Body | Response |
|---|---|---|---|
| `POST` | `/mappings` | `{ profileId, name, description?, template, mappings[] }` | `MappingProfile` |
| `GET` | `/mappings` | — | `MappingProfile[]` |
| `GET` | `/mappings/:id` | — | `MappingProfile` |
| `PUT` | `/mappings/:id` | Partial of create body | `MappingProfile` (version++) |
| `DELETE` | `/mappings/:id` | — | 200 OK |
| `POST` | `/mappings/:id/clone` | — | `MappingProfile` (Copy) |

**FieldMapping schema**:
```json
{
  "destinationField": "output_name",
  "sourceField": "source_col",
  "constant": "StaticValue",
  "expression": "concat({{a}}, ' ', {{b}})",
  "transformation": "upper",
  "condition": {
    "field": "status",
    "operator": "equals|notEquals|contains|greaterThan|lessThan|isEmpty|isNotEmpty",
    "value": "Active"
  }
}
```

---

### 13.5 Profiles Endpoints

All JWT required. Full lifecycle for mapping profiles with search, clone, and workspace import/export.

| Method | Path | Params / Body | Response |
|---|---|---|---|
| `POST` | `/profiles` | `{ name, description?, template, configurationJson, id? }` | `MappingProfile` |
| `GET` | `/profiles` | `?search=&page=1&limit=20` | Paginated `MappingProfile[]` |
| `GET` | `/profiles/:id` | — | `MappingProfile` |
| `PUT` | `/profiles/:id` | `{ name, description?, template, configurationJson }` | `MappingProfile` (version++) |
| `DELETE` | `/profiles/:id` | — | 200 OK |
| `POST` | `/profiles/:id/clone` | — | New `MappingProfile` |
| `GET` | `/profiles/:id/export` | — | `{ name, description, template, configurationJson, version, exportedAt }` |
| `POST` | `/profiles/import` | `{ name, description?, template, configurationJson }` | `MappingProfile` |
| `GET` | `/profiles/workspace/export` | — | `{ exportedAt, profiles[], databaseConnections[] }` |
| `POST` | `/profiles/workspace/import` | `{ profiles[], databaseConnections[] }` | `{ profiles: N, databaseConnections: N }` |

**Notes**:
- Search is case-insensitive on `name` and `description`
- Workspace export includes all profiles and DB connections (passwords excluded)
- If `profiles/create` includes an `id`, it updates the existing profile

---

### 13.6 Jobs Endpoints

All JWT required. Jobs process data through the ETL pipeline.

| Method | Path | Params / Body | Response |
|---|---|---|---|
| `POST` | `/jobs` | `CreateJobDto` | `ProcessingJob` |
| `GET` | `/jobs` | `?status=&page=1&limit=20` | Paginated `ProcessingJob[]` |
| `GET` | `/jobs/:id` | — | `ProcessingJob` (with file + profile) |
| `GET` | `/jobs/:id/progress` | — | `{ id, status, totalRows, processedRows, failedRows, progress }` |
| `GET` | `/jobs/:id/download` | — | Binary file stream |
| `POST` | `/jobs/:id/cancel` | — | Updated job (status → FAILED) |
| `DELETE` | `/jobs/:id` | — | 200 OK |

**CreateJobDto**:
```json
{
  "fileId": "uuid (optional — source file)",
  "databaseConnectionId": "uuid (optional — source DB)",
  "querySql": "SELECT * FROM ... (optional)",
  "profileId": "uuid (optional — use existing profile)",
  "outputFormat": "csv|json|xml|pipe|tab|fixedwidth|txt",
  "template": "string (optional, overrides profile template)",
  "mappings": [ { "destinationField": "...", "sourceField": "...", ... } ],
  "outputOptions": {
    "delimiter": ",",
    "includeHeader": true,
    "pretty": true,
    "rootElement": "root",
    "itemElement": "item",
    "fixedWidthConfig": [ { "field": "id", "width": 10, "align": "left", "padChar": " " } ]
  }
}
```

**Job statuses**: `PENDING → PROCESSING → COMPLETED` or `FAILED` (cancelled = FAILED).

**Notes**:
- Processing starts immediately in the background via Bull queue
- Download requires job to be COMPLETED (404 if not)
- Delete blocked if job is still PENDING or PROCESSING (409 Conflict)

---

### 13.7 Templates Endpoints

All JWT required. Handlebars-style output templates.

| Method | Path | Request Body | Response |
|---|---|---|---|
| `GET` | `/templates` | — | `{ data: Template[] }` |
| `GET` | `/templates/:id` | — | `{ id, name, description, content, version, createdAt, updatedAt }` |
| `POST` | `/templates` | `{ name, template, description? }` | Created template |
| `PUT` | `/templates/:id` | `{ name?, template?, description? }` | Updated template (version++) |
| `DELETE` | `/templates/:id` | — | `{ deleted: true }` |
| `POST` | `/templates/render-inline` | `{ template, context: { row, index? } }` | `{ output }` |
| `POST` | `/templates/:id/render` | `{ row, index? }` | `{ output }` |

---

### 13.8 Transformations Endpoints

All JWT required. Test transformation expressions.

| Method | Path | Request Body | Response |
|---|---|---|---|
| `POST` | `/transformations/apply` | `{ expression, row }` | Transformed value |
| `POST` | `/transformations/apply-row` | `{ mappings: [{ destination, expression }], row }` | Transformed row |

**Supported functions (19)**: `trim`, `upper`, `lower`, `substring`, `replace`, `padStart`, `padEnd`, `concat`, `formatDate`, `parseDate`, `round`, `formatNumber`, `parseInt`, `parseFloat`, `coalesce`, `if`, `case`, `switch`, `join`.

---

### 13.9 Validation Endpoints

All JWT required. Validate rows against rules.

| Method | Path | Request Body | Response |
|---|---|---|---|
| `POST` | `/validation/row` | `{ row, rules[] }` | `{ valid, errors[], fieldErrors{} }` |
| `POST` | `/validation/rows` | `{ rows[], rules[] }` | `{ results[], summary: { totalRows, validRows, invalidRows } }` |

**ValidationRule schema**:
```json
{
  "field": "email",
  "type": "required|maxLength|minLength|regex|date|email|number|lookup|enum",
  "value": "50",
  "message": "Custom error message (optional)"
}
```

---

### 13.10 Export Endpoint

All JWT required.

| Method | Path | Request Body | Response |
|---|---|---|---|
| `POST` | `/export` | `{ rows[], format, options? }` | `{ content, format, rowCount }` |

**Supported formats**: `csv`, `pipe`, `tab`, `json`, `xml`, `fixedwidth`

**Options**:
- `delimiter`, `lineEnding`, `encoding` — for delimited formats
- `includeHeaders`, `jsonLines` — boolean flags
- `xmlRoot`, `xmlItem` — element names for XML
- `fixedWidthConfig` — `[{ field, width, align, padChar }]`

---

### 13.11 Database Connections Endpoints

All JWT required. Manage external database connections.

| Method | Path | Request Body | Response |
|---|---|---|---|
| `POST` | `/database-connections` | `{ name, type, host, port, databaseName, username, password, sslEnabled? }` | Connection (no password) |
| `GET` | `/database-connections` | — | Connection[] (no passwords) |
| `GET` | `/database-connections/:id` | — | Connection (no password) |
| `PUT` | `/database-connections/:id` | Any subset of create fields | Updated connection |
| `DELETE` | `/database-connections/:id` | — | `{ deleted: true }` |
| `POST` | `/database-connections/:id/test` | — | `{ success: true, message }` |
| `POST` | `/database-connections/:id/query` | `{ sql }` | `{ columns[], rows[], rowCount }` |

**Supported types**: `mssql`, `postgresql`, `mysql`

**Notes**:
- Passwords encrypted with AES-256-GCM before storage
- Never returned in API responses
- Test runs `SELECT 1 AS ok` against the database
- Query returns column metadata + row data

---

### 13.12 Notifications Endpoints

All JWT required.

| Method | Path | Request Body | Response |
|---|---|---|---|
| `GET` | `/notifications/preferences` | — | `NotificationPreferences` |
| `PUT` | `/notifications/preferences` | `{ jobCompleted?, jobFailed?, weeklySummary?, weeklySummaryDay?, weeklySummaryTime? }` | Updated preferences |

**NotificationPreferences schema**:
```json
{
  "jobCompleted": true,
  "jobFailed": true,
  "weeklySummary": false,
  "weeklySummaryDay": "Monday",
  "weeklySummaryTime": "09:00"
}
```

**Validation**: `weeklySummaryTime` must match `HH:MM` format (24-hour).

---

### 13.13 Text to Table Endpoints

All JWT required. Parse unstructured text into structured tables.

| Method | Path | Request Body | Response |
|---|---|---|---|
| `POST` | `/text-to-table/parse` | `{ text, separators[], parseMode?, hasHeader?, hl7*? }` | `{ columns, rows }` |
| `POST` | `/text-to-table/parse-file` | `multipart/form-data`: `file`, `sheetName?` | `{ columns, rows }` |
| `POST` | `/text-to-table/import` | `{ connectionId, tableName, columns[], rows[], dropExisting?, batchSize? }` | `{ tableName, rowsInserted, ddlStatements[] }` |

**Parse modes**: `flat` (default), `hierarchical`, `hl7-flat`

**HL7 options**: `hl7FieldSep` (default `|`), `hl7CompSep` (`^`), `hl7RepSep` (`~`), `hl7EscapeChar` (`\`), `hl7SubCompSep` (`&`), `hl7AutoDetect` (default `true`), `hl7ExpandComponents` (default `true`)

**Import** creates a table via DDL and inserts rows in batches using the target DB connection.

---

### 13.14 Spec Evaluator Endpoints

All JWT required. Upload specification documents and evaluate data files against them.

| Method | Path | Params / Body | Response |
|---|---|---|---|
| `POST` | `/spec-evaluator/upload` | `multipart/form-data`: `file`, `name?`, `description?`, `tags?` | Spec document with fields/formats/rules |
| `GET` | `/spec-evaluator` | `?page=1&limit=20&tag=` | Paginated `SpecDocument[]` |
| `GET` | `/spec-evaluator/:id` | — | Spec document with last 10 evaluations |
| `DELETE` | `/spec-evaluator/:id` | — | `{ deleted: true }` |
| `POST` | `/spec-evaluator/:id/evaluate` | `multipart/form-data`: `file` | `{ id, status: "PENDING" }` |
| `GET` | `/spec-evaluator/:id/evaluations` | — | `SpecEvaluation[]` (last 20) |
| `GET` | `/spec-evaluator/evaluations/:evalId` | — | `SpecEvaluation` with `specDocument` |
| `POST` | `/spec-evaluator/:id/generate-template` | — | Created `MappingProfile` |

**Supported spec file types**: `docx`, `xlsx`, `xls`, `pdf`, `txt`, `csv`, `tsv`, `dat`, `hl7`

**Evaluation result**:
```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "score": 92.5,
  "fieldCoverage": {},
  "issues": [],
  "summary": "92.5% of fields match the specification",
  "inputFilename": "data.csv",
  "inputRowCount": 500
}
```

**Notes**: Evaluation runs asynchronously via Bull queue. Check status via GET evaluations/:evalId.

---

### 13.15 Admin Endpoints

JWT + Admin role required.

| Method | Path | Params / Body | Response |
|---|---|---|---|
| `GET` | `/admin/users` | `?search=&page=1&limit=50` | Paginated users with `_count` of relationships |
| `GET` | `/admin/users/:id` | — | User with `_count` |
| `PUT` | `/admin/users/:id` | `{ name?, email?, role? }` | Updated user |
| `DELETE` | `/admin/users/:id` | — | Updated user (`isActive: false`) |

**Valid roles**: `ADMIN`, `USER`

**Restrictions**: Cannot modify or deactivate the super admin (`admin@datamapperpro.com`). Deletion is a soft-deactivate (sets `isActive: false`).

---

### 13.16 Shared Types

**PaginatedResponse** (used by all list endpoints):
```json
{
  "data": [ ... ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

**User** (returned from auth/profile):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "USER",
  "isActive": true,
  "notificationPreferences": { "jobCompleted": true, "jobFailed": true, "weeklySummary": false, "weeklySummaryDay": "Monday", "weeklySummaryTime": "09:00" },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**ProcessingJob**:
```json
{
  "id": "uuid",
  "status": "PENDING | PROCESSING | COMPLETED | FAILED",
  "totalRows": 100,
  "processedRows": 95,
  "failedRows": 5,
  "errorLog": [ { "row": 12, "errors": ["Email validation failed"], "fieldErrors": { "email": "Invalid format" } } ],
  "outputFormat": "csv",
  "outputFile": "output-uuid.csv",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "uploadedFile": { "id": "uuid", "originalName": "data.csv" },
  "profile": { "id": "uuid", "name": "My Profile" }
}
```

---

### 13.17 Error Codes

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

**Standard error response**:
```json
{
  "message": "Description of the error",
  "error": "Error type",
  "statusCode": 400
}
```

**Validation error response**:
```json
{
  "message": ["field1 must be a string", "field2 must be an email"],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 13.18 Common Patterns

#### Pagination

All list endpoints support the same pagination pattern:

```
GET /api/jobs?page=2&limit=20
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |

Response includes pagination metadata alongside the `data` array.

#### Date Format

All date-time fields use **ISO 8601** format: `2025-05-15T08:00:00.000Z`

#### File Upload

File uploads use `multipart/form-data`:

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | CSV or XLSX file (max 500 MB) |
| `sheetName` | string | No | Specific Excel sheet (XLSX only) |
| `delimiter` | string | No | Custom delimiter for CSV (default `,`) |
| `hasHeader` | boolean | No | Whether first row is a header (default `true`) |

#### Endpoint Summary

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

---

### 13.19 Rate Limiting

The API is protected by a global rate limiter:

| Limit | Window | Scope |
|---|---|---|
| 100 requests | 60 seconds | Per IP address |

When the limit is exceeded, the API returns:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

The response includes a `Retry-After` header indicating the number of seconds to wait before retrying. Rate limits are configured via the `@nestjs/throttler` package and can be adjusted in `backend/src/app.module.ts`.
