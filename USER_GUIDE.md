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
3. [Mapping Designer](#3-mapping-designer)
   - [Selecting a Source File](#31-selecting-a-source-file)
   - [Adding Mappings](#32-adding-mappings)
   - [Auto-Mapping](#33-auto-mapping)
   - [Drag-and-Drop Mapping](#34-drag-and-drop-mapping)
   - [Transformations](#35-transformations)
   - [Expressions and Constants](#36-expressions-and-constants)
   - [Output Format](#37-output-format)
   - [Saving and Running](#38-saving-and-running)
4. [Template Editor](#4-template-editor)
   - [Template Syntax Reference](#41-template-syntax-reference)
   - [Creating a Template](#42-creating-a-template)
   - [Testing with Sample Data](#43-testing-with-sample-data)
   - [Template Library](#44-template-library)
5. [Processing Jobs](#5-processing-jobs)
   - [Job Lifecycle](#51-job-lifecycle)
   - [Monitoring Progress](#52-monitoring-progress)
   - [Downloading Results](#53-downloading-results)
   - [Cancelling Jobs](#54-cancelling-jobs)
6. [Saved Profiles](#6-saved-profiles)
   - [Saving a Profile](#61-saving-a-profile)
   - [Loading a Profile](#62-loading-a-profile)
   - [Cloning, Exporting, and Importing](#63-cloning-exporting-and-importing)
7. [Settings](#7-settings)
   - [Profile Settings](#71-profile-settings)
   - [Security](#72-security)
   - [API Keys](#73-api-keys)
   - [Export Defaults](#74-export-defaults)
   - [Appearance](#75-appearance)
8. [Appendix: Transformation Functions](#8-appendix-transformation-functions)
9. [Appendix: Output Formats](#9-appendix-output-formats)
10. [Appendix: Validation Rules](#10-appendix-validation-rules)

---

## 1. Getting Started

### 1.1 Logging In

Open the application in your browser. If running locally with Docker, go to `http://localhost:5173`.

The login screen shows the DataMapper Pro logo and a sign-in form:

| Field | Value (Demo) |
|---|---|
| Email | `admin@datamapperpro.com` |
| Password | `admin123` |

Enter the credentials and click **Sign In**.

### 1.2 Creating an Account

On the login screen, click **"Don't have an account? Create one"** to switch to the registration form. Fill in your name, email, and password (minimum 6 characters), then click **Create Account**.

After registration, you are automatically signed in and redirected to the Dashboard.

### 1.3 The Dashboard

The Dashboard provides an overview of your data mapping activity. It contains:

- **Stat cards** at the top showing total files, mappings, jobs, and success rate
- **Jobs Over Time** chart showing processing activity across the week
- **Quick action buttons** to upload a file, create a mapping, or start a new job
- **Recent Jobs** list showing the most recent 5 jobs with their status

Click the **Refresh** button (in the toolbar) or the **Retry** button on error to reload dashboard data.

---

## 2. Uploading Files

Navigate to the **Upload** page via the sidebar or dashboard quick-action button.

### 2.1 Drag-and-Drop Upload

The upload page shows a drop zone in the center of the screen. To upload:

1. **Drag** a CSV or Excel file from your file manager and drop it onto the zone, **or**
2. **Click** the drop zone to open a file browser dialog

Supported file types:
- `.csv` — Comma-separated values
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

- **Column type badges** — Each column shows its detected type, name, and null percentage. Columns with >10% null are highlighted in red.
- **Sortable columns** — Click any column header to sort ascending/descending. Click again to cycle through sort states.
- **Search** — Type in the search box to filter rows across all columns (global filter).
- **Pagination** — Choose rows per page (10, 25, 50, 100) and navigate pages with the arrow buttons.

After reviewing the preview, click **Continue to Mapping** to proceed to the Mapping Designer.

---

## 3. Mapping Designer

The Mapping Designer is where you connect source data fields to output fields. It is a split-screen interface with source columns on the left and mapping configuration on the right.

The page header has three action buttons:
- **Preview** — Generate a text preview of your current mappings
- **Save Profile** — Save the current configuration as a reusable profile
- **Run Job** — Start processing the file with the current mappings

### 3.1 Selecting a Source File

On the right sidebar, the **Source File** panel shows a dropdown of all your uploaded files. Select the file you want to use. If no files exist, a button links to the Upload page.

### 3.2 Adding Mappings

Type a destination field name into the input at the top of the **Field Mappings** section and click **Add Mapping** (or press Enter). Each mapping row has:

- **Destination Field**: The output field name (editable)
- **Source Field**: A dropdown of your source columns, or drag a column from the left panel onto this field
- **Transformation**: An optional dropdown of transformation functions
- **Expression / Constant**: An optional text field for fixed values or token expressions

Each mapping row is **draggable** (grab the grip icon on the left) to reorder mappings.

### 3.3 Auto-Mapping

Click the **Auto-Map** button to open the auto-mapping dialog. Enter your desired destination fields as a comma-separated list (e.g., `first_name, last_name, email, phone`). The system automatically matches each destination field to its best source column using fuzzy name matching (case-insensitive Levenshtein distance ≤ 2).

Click **Map** to apply the suggestions, or **Cancel** to dismiss.

### 3.4 Drag-and-Drop Mapping

The left panel lists all **Source Columns** with their types. Each source column is draggable:

1. **Drag** a source column name from the left panel
2. **Drop** it onto the **Source Field** area of the target mapping row

This sets the source field for that mapping to the dropped column.

### 3.5 Transformations

Each mapping can apply an optional transformation function. Select from the dropdown, which is grouped by category:

- **String**: Trim, Uppercase, Lowercase, Substring, Replace, Pad Start, Pad End, Concat
- **Date**: Format Date, Parse Date
- **Numeric**: Round, Format Number, Parse Int, Parse Float
- **Logic**: Coalesce, If/Else, Case, Switch

When a transformation is selected, the engine applies it to the source value before writing to the destination field.

### 3.6 Expressions and Constants

The **Expression / Constant** field serves two purposes:

- **Constant value**: Enter a static string like `"Active"` or `N/A` to use a fixed value for every row
- **Expression**: Use `{{field_name}}` syntax to reference source fields in a template expression, e.g., `{{first_name}} {{last_name}}`

This field is most useful when no source field is selected, or when you need to combine multiple source values.

### 3.7 Output Format

On the right sidebar, the **Output Format** dropdown lets you choose the format for the generated output file:

| Format | File Extension |
|---|---|
| Text | `.txt` |
| CSV | `.csv` |
| JSON | `.json` |
| XML | `.xml` |
| HL7 | `.hl7` |
| Pipe-Delimited | `.txt` |
| Tab-Delimited | `.tsv` |
| Fixed-Width | `.txt` |

### 3.8 Saving and Running

- **Save Profile**: Enter a profile name in the right sidebar, then click **Save Profile**. The profile is saved and appears on the Saved Profiles page.
- **Run Job**: Click **Run Job** to immediately start processing. A job must have at least one mapping and a selected file.

---

## 4. Template Editor

The Template Editor lets you create and test Handlebars-style output templates. Navigate to it via the sidebar.

### 4.1 Template Syntax Reference

The editor supports four syntax constructs:

| Syntax | Description | Example |
|---|---|---|
| `{{field}}` | Insert a field value | `{{last_name}}` |
| `{{row.field}}` | Insert a field value (explicit row prefix) | `{{row.first_name}}` |
| `{{#if field}}...{{/if}}` | Conditional block — renders content only if the field is truthy | `{{#if email}}{{email}}{{/if}}` |
| `{{#if field}}...{{else}}...{{/if}}` | Conditional with else branch | `{{#if active}}{{name}}{{else}}Inactive{{/if}}` |
| `{{#each list}}{{field}}{{/each}}` | Iterate over an array | `{{#each items}}{{name}}{{/each}}` |
| `{{index}}` | Current row index (0-based in preview, 1-based in output) | `Record #{{index}}` |

**Token reference** — Click the helper buttons above the editor to insert syntax templates:
- **`{{field}}`** — Inserts `{{}}` for field reference
- **`{{#if}}`** — Inserts an if/endif block
- **`{{#each}}`** — Inserts an each/endeach block

### 4.2 Creating a Template

1. Select a template from the **Template** dropdown, or leave it blank to create a new one
2. Enter a **Template Name**
3. Write your template in the Monaco editor (syntax-highlighted for Handlebars)
4. Click **Save** to persist it

Default template when creating new: `{{mrn}}|{{last_name}}|{{first_name}}|{{dob}}|{{gender}}`

The editor shows real-time brace-matching validation — if your `{{` and `}}` are unbalanced, a red error banner appears.

### 4.3 Testing with Sample Data

Click **Render** to test your template against sample data. The system uses hardcoded sample values (`first_name: John`, `last_name: Doe`, etc.) to demonstrate the output. The rendered output appears in the **Output Preview** panel alongside a **Token Reference** card showing available syntax options.

### 4.4 Template Library

The **Template Library** section at the bottom provides starter templates for common formats:

- **JSON Output** — Template producing a JSON object
- **CSV Row** — Template for CSV row output
- **XML Element** — Template for XML record output
- **HL7 Segment** — Template for an HL7 ADT segment

Click any library template to load its content into the editor.

---

## 5. Processing Jobs

The Processing Jobs page lists all data processing jobs and their current status. Navigate to it via the sidebar or dashboard.

### 5.1 Job Lifecycle

Jobs go through these statuses:

```
PENDING → PROCESSING → COMPLETED
                    → FAILED (or cancelled)
```

### 5.2 Monitoring Progress

The job list shows:

- **File name** — The source file being processed
- **Status badge** — Color-coded: Pending (gray), Processing (amber), Completed (green), Failed (red)
- **Format** — The output format
- **Progress bar** — Visual indicator with row counts (`processed / total`)
- **Created date** — When the job was started

Click any job row to expand it and see detailed progress metrics:
- **Total Rows**, **Processed**, **Failed**, and **Speed** (rows/second)
- A larger progress bar with percentage
- Error logs (for failed jobs, shown in a red panel)

Active jobs auto-poll every 3 seconds for progress updates. Completed and failed jobs stop polling.

### 5.3 Downloading Results

For completed jobs, click the download icon (or the **Download** button in the expanded view). The browser downloads the output file named `output-<id>.<format>`.

### 5.4 Cancelling Jobs

Active jobs (PENDING or PROCESSING) show a cancel button (X icon). Click it to cancel the job. Cancelled jobs are marked as FAILED.

### Filtering and Searching

Use the **search box** to filter jobs by file name or job ID. Use the **status filter** dropdown to show only jobs with a specific status (all, pending, processing, completed, failed).

---

## 6. Saved Profiles

The Saved Profiles page stores reusable mapping configurations. Navigate to it via the sidebar.

### 6.1 Saving a Profile

To save a profile:
1. Go to the **Mapping Designer**
2. Configure your mappings and template
3. Enter a **Profile Name** in the right sidebar
4. Click **Save Profile**

### 6.2 Loading a Profile

On the Saved Profiles page, each profile card shows:
- **Profile name**
- **Description** (if set)
- **Version number**
- **Mapping count**
- **Last updated date**

Click **Load** to open the profile in the Mapping Designer.

### 6.3 Cloning, Exporting, and Importing

Each profile card has action buttons:

| Action | Description |
|---|---|
| **Clone** (Copy icon) | Creates a copy of the profile with an incremented version number |
| **Export** (Download icon) | Downloads the profile as a `.json` file |
| **Delete** (Trash icon) | Permanently deletes the profile (requires confirmation) |

The page header has two additional buttons:

| Button | Description |
|---|---|
| **Import** | Opens a file picker for `.json` profile files. Imports the profile into your account. |
| **Create New Profile** | Navigates to the Mapping Designer to create a fresh profile |

Use the **search box** to filter profiles by name or description.

---

## 7. Settings

The Settings page lets you manage your account and application preferences. Navigate to it via the sidebar.

### 7.1 Profile Settings

Edit your **Name** and view your **Email** (email is read-only). Click **Save Changes** to update.

### 7.2 Security

Change your password:
1. Enter your **Current Password**
2. Enter a **New Password**
3. **Confirm Password**
4. Click **Update Password**

### 7.3 API Keys

Generate and manage API keys for programmatic access:
- Click **Generate New** to create a new API key (prefixed with `dmp_`)
- Click **Copy** to copy the key to your clipboard
- The key is displayed masked by default; generated keys are shown in plain text

### 7.4 Export Defaults

Set your preferred defaults:
- **Default Output Format**: CSV, JSON, XML, Text, HL7, Pipe-Delimited
- **Default Delimiter**: Comma, Tab, Pipe, Semicolon

### 7.5 Appearance

Toggle between **Dark Mode** and **Light Mode**. The selected theme is saved to `localStorage` and persists across sessions.

The **About** card shows the application version (`1.0.0`) and the current environment mode.

### Notification Preferences

Toggle notification settings:
- **Job completion notifications**
- **Job failure alerts**
- **Weekly usage summary**

---

## 8. Appendix: Transformation Functions

### String Functions

| Function | Syntax | Description | Example Input | Output |
|---|---|---|---|---|
| `trim` | `trim(field)` | Removes leading/trailing whitespace | `trim("  hello  ")` | `hello` |
| `upper` | `upper(field)` | Converts to uppercase | `upper("hello")` | `HELLO` |
| `lower` | `lower(field)` | Converts to lowercase | `lower("HELLO")` | `hello` |
| `substring` | `substring(field, start, end?)` | Extracts substring from `start` to `end` (exclusive) | `substring("hello", 0, 2)` | `he` |
| `replace` | `replace(field, search, replacement)` | Replaces all occurrences of `search` with `replacement` | `replace("1-2-3", "-", "")` | `123` |
| `padStart` | `padStart(field, length, char?)` | Pads the start of a string to reach `length` using `char` (default: space) | `padStart("42", 5, "0")` | `00042` |
| `padEnd` | `padEnd(field, length, char?)` | Pads the end of a string to reach `length` using `char` (default: space) | `padEnd("42", 5, "0")` | `42000` |
| `concat` | `concat(...fields)` | Concatenates multiple values into one string | `concat("John", " ", "Doe")` | `John Doe` |

### Date Functions

| Function | Syntax | Description | Example Input | Output |
|---|---|---|---|---|
| `formatDate` | `formatDate(field, pattern)` | Formats a date value according to a pattern | `formatDate(dob, "yyyyMMdd")` | `19900115` |
| `parseDate` | `parseDate(field)` | Parses a date string and returns ISO format | `parseDate("01/15/1990")` | `1990-01-15T...` |

**Date format patterns**: `yyyy` (year), `MM` (month, 2-digit), `dd` (day, 2-digit), `HH` (hours, 2-digit), `mm` (minutes, 2-digit), `ss` (seconds, 2-digit).

### Numeric Functions

| Function | Syntax | Description | Example Input | Output |
|---|---|---|---|---|
| `round` | `round(field, decimals?)` | Rounds a number to the given decimal places | `round(3.14159, 2)` | `3.14` |
| `formatNumber` | `formatNumber(field, format?)` | Formats a number with locale-aware formatting | `formatNumber(1234.5, "0,0.00")` | `1,234.50` |
| `parseInt` | `parseInt(field)` | Parses a string as an integer | `parseInt("42")` | `42` |
| `parseFloat` | `parseFloat(field)` | Parses a string as a float | `parseFloat("3.14")` | `3.14` |

### Logic Functions

| Function | Syntax | Description | Example |
|---|---|---|---|
| `coalesce` | `coalesce(...fields)` | Returns the first non-null, non-empty value | `coalesce(phone, email, "N/A")` |
| `if` | `if(condition, trueVal, falseVal)` | Returns `trueVal` if `condition` is truthy, else `falseVal` | `if(status, "Active", "Inactive")` |
| `case` | `case(value, match1, out1, match2, out2, ..., default?)` | Sequential pattern matching | `case(type, "A", "Type A", "B", "Type B", "Unknown")` |
| `switch` | `switch(value, object, default?)` | Object-lookup dispatch | `switch(dept, {"HR": "Human Resources"}, "Other")` |

---

## 9. Appendix: Output Formats

| Format | Config Options | Extension | Use Case |
|---|---|---|---|
| **CSV** | `delimiter` (comma/tab/pipe/semicolon), `includeHeader` | `.csv` | Universal data interchange |
| **JSON** | `pretty` (indented vs compact), `delimiter` (array vs NDJSON) | `.json` | Web APIs, programmatic consumption |
| **XML** | `rootElement`, `itemElement` | `.xml` | Legacy system integration, SOAP |
| **Fixed-width** | `fields: [{ name, width, align, padChar }]` | `.txt` | Mainframe, legacy systems |
| **Pipe-delimited** | — | `.txt` | Healthcare, mainframe |
| **Tab-delimited** | — | `.tsv` | Spreadsheet interchange |
| **Plain text** | — | `.txt` | Simple flat file output |
| **HL7-style** | Uses `\|` field delimiter, `^` component delimiter, `\r` line endings | `.hl7` | Healthcare data exchange |

---

## 10. Appendix: Validation Rules

| Rule | Value | Behavior |
|---|---|---|
| `required` | — | Fails if the field value is null, undefined, or empty string |
| `maxLength` | Number | Fails if the string length exceeds the given value |
| `minLength` | Number | Fails if the string length is below the given value |
| `regex` | String (pattern) | Tests the field value against a JavaScript RegExp pattern |
| `date` | — | Fails if the value cannot be parsed as a valid Date |
| `email` | — | Fails if the value does not match a basic email regex |
| `number` | — | Fails if the value is not a valid number |
| `lookup` | String[] | Fails if the field value is not in the allowed list |
| `enum` | String[] | Same behavior as `lookup` |

When a row fails validation, it is skipped in the output but processing continues. Failed rows are collected in the job's error log with descriptive messages.
