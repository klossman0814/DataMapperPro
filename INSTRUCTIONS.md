# DataMapper Pro — User Instructions

> **Version:** 1.0  
> **Stack:** React SPA (port 5175 dev / port 80 prod) + NestJS API (port 3002)  
> **Demo login:** `admin@datamapperpro.com` / `admin123`

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [End-to-End Workflow (Order of Operations)](#2-end-to-end-workflow-order-of-operations)
3. [Authentication](#3-authentication)
4. [Dashboard](#4-dashboard)
5. [Data Sources](#5-data-sources)
   - [5.1 Upload Files](#51-upload-files)
   - [5.2 Database Connections](#52-database-connections)
   - [5.3 Text to Table](#53-text-to-table)
   - [5.4 Execute SQL Script Sets](#54-execute-sql-script-sets)
6. [Transformation](#6-transformation)
   - [6.1 Mapping Designer](#61-mapping-designer)
   - [6.2 Template Editor](#62-template-editor)
7. [Processing](#7-processing)
   - [7.1 Processing Jobs](#71-processing-jobs)
   - [7.2 Spec Evaluator](#72-spec-evaluator)
   - [7.3 Spec Builder](#73-spec-builder)
8. [Management](#8-management)
   - [8.1 Saved Profiles](#81-saved-profiles)
   - [8.2 Settings](#82-settings)
   - [8.3 User Guide](#83-user-guide)
   - [8.4 Admin Users](#84-admin-users)
9. [Output Formats](#9-output-formats)
10. [Transformation Functions Reference](#10-transformation-functions-reference)
11. [Template Syntax Reference](#11-template-syntax-reference)

---

## 1. Getting Started

### Running the Application

```bash
# Start all services with hot-reload
docker compose up -d

# Seed the demo user (one-time, after backend starts)
docker compose exec backend npx ts-node prisma/seed.ts
```

After startup, access the application at **http://localhost:5175**.

### Quick Start Flow

1. Log in with your credentials (or use the demo account above)
2. Go to **Upload** to import a CSV or Excel file
3. Go to **Mapping Designer** to create field mappings
4. Save your work as a **Profile**
5. Go to **Processing Jobs** to run and download the output

---

## 2. End-to-End Workflow (Order of Operations)

The typical profile lifecycle follows this sequence. Perform the steps in order — the output of each step feeds into the next.

```
Create Data Source → Map Fields → Add Template → Save Profile → Run Job → Download Output
```

### Step 1 — Create or Import a Data Source
**Page:** [Upload → File Upload](#51-upload-files) or [Database Query](#51-upload-files)

Upload a CSV/Excel file or run a database query. This creates a file record that the Mapping Designer can read.

### Step 2 — Map Source Fields to Destination Fields
**Page:** [Mapping Designer](#61-mapping-designer)

1. Select your uploaded file from the **Source File** dropdown
2. Drag source columns into mapping rows
3. For each mapping, set the destination field name and optionally add a constant, transformation, or condition
4. Choose your **Output Format** (CSV, JSON, XML, etc.)

### Step 3 — Design an Output Template (Optional)
**Pages:** [Mapping Designer](#61-mapping-designer) or [Template Editor](#62-template-editor)

Write a Handlebars-style template to control the exact output structure. Enable **Live Preview** to see changes in real time.

### Step 4 — Save as a Profile
**Page:** [Mapping Designer](#61-mapping-designer)

1. Enter a **Profile Name** and click **Save Profile**
2. The profile appears on the [Saved Profiles](#81-saved-profiles) page

### Step 5 — Run a Processing Job
**Page:** [Mapping Designer](#61-mapping-designer) or [Processing Jobs](#71-processing-jobs)

1. Click **Run Job** — the job runs through a streaming pipeline:
   ```
   Load rows → Map fields → Apply transforms → Render template → Validate
   ```
2. Monitor progress in real time on the **Processing Jobs** page

### Step 6 — Download the Output
**Page:** [Processing Jobs](#71-processing-jobs)

1. Wait for the job status to show **Completed**
2. Click **Download** to save the output file

### Alternative Workflows

| If you want to... | Follow this path |
|---|---|
| Import parsed text into a database table | Text to Table → Import |
| Execute SQL scripts against a database | SQL Script Sets → Execute |
| Test a template without a full job | Template Editor → Load Data → Live Preview |
| Validate data against a specification | Spec Builder → Spec Evaluator → Evaluate |
| Re-run a previous transformation | Saved Profiles → Load → Run Job |

---

## 3. Authentication

### Login

1. Navigate to `/login`
2. Enter your **Email** and **Password**
3. Click **Sign In**
4. On success, you are redirected to the Dashboard

### Register a New Account

1. On the Login page, click **Create Account**
2. Fill in **Name**, **Email**, and **Password**
3. Password strength is shown in real-time (Very Weak → Very Strong)
4. Click **Create Account** to register
5. You are automatically logged in

### Forgot Password

1. On the Login page, click **Forgot Password?**
2. Enter your email address
3. Click **Send Reset Link**
4. Check your email for the reset link

### Reset Password

1. Click the reset link from your email
2. Enter a new password (strength meter shown)
3. Confirm the password
4. Click **Reset Password**
5. You are redirected to log in with your new password

---

## 4. Dashboard

The Dashboard is the home page and provides an at-a-glance overview.

**What you see:**
- **Stat Cards** — Total Files, Total Mappings, Total Jobs, and Success Rate
- **Jobs Over Time Chart** — Line/area chart showing job volume over the last 7 days
- **Recent Jobs** — List of the 5 most recent jobs with status icons

**Quick-action buttons:**
- **Upload File** → go to the Upload page
- **Create Mapping** → go to the Mapping Designer
- **New Job** → go to the Processing Jobs page

Data loads automatically on page load. Use the **Retry** button if loading fails.

---

## 5. Data Sources

### 5.1 Upload Files

Import CSV or Excel files into the system.

**File mode:**
1. Switch to the **File Upload** tab
2. Drag & drop a file onto the drop zone, or click to browse
3. Supported formats: `.csv`, `.xlsx`, `.xls`, `.txt`, `.tsv`, `.dat`, `.hl7`
4. Maximum file size: 500 MB
5. After upload, configure:
   - **Delimiter** (auto-detected, editable)
   - **Header Row** toggle (first row contains column names)
   - **Sheet selection** (for multi-sheet Excel files)
6. Review the preview grid showing the first rows
7. Click **Continue to Mapping** to open the Mapping Designer with this file

**Database Query mode:**
1. Switch to the **Database Query** tab
2. Select a saved database connection
3. Enter a SQL query (e.g., `SELECT * FROM my_table LIMIT 100`)
4. Enter a query name
5. Click **Run Query** to preview results
6. Click **Save & Continue to Mapping** to proceed

**Previously uploaded files** are listed below the upload area with **Map** (open in designer) and **Delete** buttons.

### 5.2 Database Connections

Manage reusable connections to external databases.

**Create a connection:**
1. Click **New Connection**
2. Fill in the form:
   - **Name** — A label for this connection
   - **Type** — `SQL Server`, `PostgreSQL`, or `MySQL`
   - **Host** — Server hostname or IP
   - **Port** (auto-filled based on type, editable)
   - **Database** — Database name
   - **Username**
   - **Password**
   - **SSL** — Toggle to enable SSL
3. Click **Save Connection**

**Manage connections:**
- **Test** — Pings the database and shows success/failure
- **Edit** — Pre-fills the form with existing values
- **Delete** — Removes the connection (with confirmation)

Saved connections become available in the **Upload** page's Database Query tab and in the **Execute SQL Script Sets** page.

### 5.3 Text to Table

Parse delimited or hierarchical text and import it directly into a database table.

**Step 1 — Input:**
1. Paste text into the editor OR upload a text file (`.txt`, `.csv`, `.tsv`, `.dat`, `.hl7`, `.xlsx`, `.xls`)
2. Preview shows the first 2 lines of your input

**Step 2 — Configure:**
- **Separators** — Check the delimiter characters to use (`,`, `|`, `^`, `&`, etc.)
- **Custom Separator** — Enter a custom delimiter if needed
- **Parse Mode** — `Flat` (simple rows) or `Hierarchical` (nested structure)
- **Header Row** — Toggle whether the first row is column headers
- **Primary Separator** — Choose the main delimiter for multi-separator parsing
- **Trim Values** — Auto-trim whitespace from values
- **Skip Empty Lines** — Ignore blank lines
- **Force Text Columns** — Comma-separated column names to treat as text

**Step 3 — Preview:**
- View parsed columns with detected types, null counts, sample values
- **Schema Configuration** — Override auto-detected SQL types per column
- **Column Renaming** — Edit column names inline before import
- Scroll through paginated data preview

**Step 4 — Import:**
1. Select a target database connection
2. Enter a **Table Name**
3. Toggle **Drop Existing** to replace the table if it exists
4. Configure **Batch Size** for row insertion
5. Click **Import to Table**

### 5.4 Execute SQL Script Sets

Create, edit, and execute ordered sets of SQL statements against a database connection.

**Create a script set:**
1. Click **New Script Set**
2. Enter a **Name** and optional **Description**
3. Optionally select a **Default Connection**
4. Add SQL steps using **Add Step**
5. For each step:
   - Enter a **Step Name**
   - Write the **SQL statement**
   - Toggle **Enabled** to include/skip the step
   - Reorder steps using the **Up/Down** arrows
6. Click **Save**

**Execute:**
1. Select the target **Database Connection** (overrides the default if set)
2. Click **Execute**
3. Results show per-step success/failure, duration (ms), and rows affected
4. Click each result row to expand error details (if failed)

**Clone** an existing script set to reuse as a starting point.  
**Delete** removes the script set permanently.

---

## 6. Transformation

### 6.1 Mapping Designer

The core tool for mapping source data fields to destination fields.

**Load a source file:**
1. Select a file from the **Source File** dropdown (files uploaded via the Upload page)
2. Alternatively, load an existing profile via the URL parameter `?profileId=xxx`

**Create mappings:**
1. The **Mapping Canvas** shows source columns on the left
2. Drag a source column to the destination field, or
3. Use the **quick-add** source column button
4. For each mapping, configure:
   - **Destination Field** — Name of the output field
   - **Source Field** — Direct mapping from a source column
   - **Constant** — A static value (supports `{{token}}` replacement)
   - **Expression** — A transformation expression (e.g., `concat(first, ' ', last)`)
   - **Transformation** — Apply a simple transform (`upper`, `trim`, `formatDate(yyyyMMdd)`)
   - **Condition** — Skip the mapping if a condition is met:
     - `equals` / `notEquals` / `contains` / `greaterThan` / `lessThan` / `isEmpty` / `isNotEmpty`

**Template:**
1. The **Template Editor** lets you write a Handlebars-style output template
2. Drag source columns from the column list to insert `{{field}}` tokens
3. Use the **syntax helpers** to insert `{{#if}}`, `{{#each}}` blocks
4. Enable **Live Preview** to see real-time output as you type
5. Click **Preview** to generate a sample output

**Output Format:**
- Select from 9 output formats (CSV, JSON, XML, HL7, pipe-delimited, tab-delimited, fixed-width, free form, text)
- Optionally set a **custom file extension**

**Save your profile:**
1. Enter a **Profile Name**
2. Optionally add a **Description**
3. Click **Save Profile**
4. Saved profiles appear on the **Saved Profiles** page

**Run a job:**
1. Click **Run Job** to start processing
2. You are redirected to the **Processing Jobs** page to monitor progress
3. Once complete, download the output file

### 6.2 Template Editor

Design and test output templates independently.

**Select a template:**
- Choose from saved templates in the dropdown, or
- Start from a **Template Library** preset (JSON Output, CSV Row, XML Element, HL7 Segment)

**Edit the template:**
1. Write Handlebars-style syntax in the Monaco editor
2. Drag source columns from the **Columns** panel (when a data source is loaded)
3. Use the toolbar buttons to insert `{{field}}`, `{{#if}}`, `{{#each}}` syntax
4. Use **Transforms** to apply function-based transformations
5. Use **Field Builder** for guided field construction

**Data source (optional):**
- Switch between **File** and **Database** tabs
- Select a file or run a database query to load sample data for live preview
- Saved templates remember their associated data source

**Live Preview:**
- Toggle **Live: On/Off** to see real-time output as you type
- The preview renders against the first row of your data source

**Save:**
1. Enter a **Template Name**
2. Click **Save**
3. Use **Delete** to remove an existing template

---

## 7. Processing

### 7.1 Processing Jobs

Monitor and manage all data transformation jobs.

**Job list:**
- Each job row shows: name, status badge, output format, progress bar, and creation date
- Use the **Search** bar to filter by filename or ID
- Use the **Status filter** to show All / Pending / Processing / Completed / Failed jobs
- Click **Refresh** to manually reload

**Job actions:**
- Click a job row to expand details (progress, row counts, error log)
- **Download** — For completed jobs, download the output file
- **Cancel** — Stop a pending or in-progress job
- **Delete** — Remove a completed or failed job record

Jobs auto-poll every 3 seconds for live progress updates while in a `PENDING` or `PROCESSING` state.

### 7.2 Spec Evaluator

Upload specification documents and evaluate data extracts for compliance.

**Upload a spec:**
1. Drag & drop or click to upload an `.xlsx` / `.xls` spec file
2. Optionally enter a **Spec Name**
3. The spec is parsed to extract field definitions

**Review parsed fields:**
- Expand a spec in the list to see extracted fields
- Each field shows: field number, sub-field number, name, required/repeating flags, delimiter
- Toggle field **Include** to control which fields appear in the template

**Evaluate a data file:**
1. Click **Evaluate** on a spec
2. Select a data file (`.csv`, `.txt`, `.tsv`, `.dat`)
3. The evaluation runs asynchronously — progress is polled every 1.5 seconds
4. Results display:
   - **Compliance Score** (0–100)
   - **Field Coverage** — matched, missing, extra, type mismatches
   - **Issue Breakdown** — per-issue details with severity

**Manage specs:**
- Search and filter specs by tags
- Delete specs with confirmation

### 7.3 Spec Builder

Create specification spreadsheets from scratch.

1. Enter a **Spec Name**
2. Build rows in the table editor:
   - **Field Number** — Auto-incrementing
   - **Sub Field Number** — For nested/sub-fields
   - **Field Name** — Name of the field
   - **Required** — Toggle Y/N
   - **Repeating** — Toggle Y/N
   - **Include** — Toggle Y/N
   - **Delimiter** — Delimiter character
3. Click **Add Row** to add more fields
4. Click **Delete** on any row to remove it

**Import** an existing `.xlsx` / `.xls` file to seed the builder.  
**Export** downloads the spec as an `.xlsx` file ready for use in the Spec Evaluator.

Auto-saves to browser local storage.

---

## 8. Management

### 8.1 Saved Profiles

View, manage, and organize your saved mapping profiles.

**Features:**
- Grid layout showing profile cards with name, description, version, mapping count, and last updated date
- **Search** profiles by name or description
- **Load** — Opens the profile in the Mapping Designer
- **Report** — Opens a print-friendly profile report
- **Clone** — Creates a copy with " (Copy)" appended to the name, version starts at 1
- **Export** — Downloads the profile as a JSON file
- **Import** — Upload a previously exported JSON profile
- **Delete** — Remove a profile (with confirmation)
- **Create New Profile** — Opens the Mapping Designer for a fresh profile

### 8.2 Settings

Configure your account and application preferences.

**Profile:**
- Update your display **Name** (email is read-only)
- Change your **Password** (requires current password + new password + confirmation)

**API Key:**
- Generate or regenerate an API key (prefixed with `dmp_`)
- Copy to clipboard with one click

**Defaults:**
- Set default **Export Format** (applied when creating new jobs)
- Set default **Delimiter**

**Appearance:**
- Toggle **Dark Mode** on/off (persisted to browser)

**Notifications:**
- Configure notifications for job completion and failure alerts
- Set up a **Weekly Summary** with day and time picker
- Preview the summary before saving

**Workspace Backup:**
- **Export** — Download all profiles and database connections as a single JSON file
- **Import** — Restore a previously exported workspace backup

### 8.3 User Guide

In-app documentation viewer. Loads and renders the project's `USER_GUIDE.md` file.

- **Search** — Type to filter content to matching sections
- **Table of Contents** — Auto-generated from headings; click to navigate
- TOC highlights the current section as you scroll

### 8.4 Admin Users

> **Requires ADMIN role.** Visible only to admin users.

**User management:**
- Search users by name or email
- Table shows: name, email, role, active status, resource counts, creation date
- **Edit** — Change name, email, and role (USER / ADMIN)
- **Deactivate** — Disable a user's access (data is preserved)
- The super admin (`admin@datamapperpro.com`) is protected from editing/deactivation

---

## 9. Output Formats

| Format | Config Options | File Extension |
|---|---|---|
| **CSV** | Delimiter, include header | `.csv` |
| **JSON** | Pretty print, NDJSON vs array | `.json` |
| **XML** | Root element, item element | `.xml` |
| **Fixed-Width** | Field widths, alignment, pad character | `.txt` |
| **Pipe-Delimited** | — | `.txt` |
| **Tab-Delimited** | — | `.tsv` |
| **Plain Text** | — | `.txt` |
| **HL7-Style** | — | `.hl7` |
| **Free Form** | Custom template | `.txt` |

---

## 10. Transformation Functions Reference

| Function | Syntax | Example | Description |
|---|---|---|---|
| `trim` | `trim(field)` | `trim(last_name)` | Remove surrounding whitespace |
| `upper` | `upper(field)` | `upper(city)` | Convert to uppercase |
| `lower` | `lower(field)` | `lower(email)` | Convert to lowercase |
| `substring` | `substring(field, start, end?)` | `substring(phone, 0, 3)` | Extract a portion of the string |
| `replace` | `replace(field, search, replacement)` | `replace(phone, '-', '')` | Replace all occurrences |
| `padStart` | `padStart(field, len, char?)` | `padStart(id, 5, '0')` | Pad the start to reach length |
| `padEnd` | `padEnd(field, len, char?)` | `padEnd(code, 8, ' ')` | Pad the end to reach length |
| `concat` | `concat(...fields)` | `concat(first, ' ', last)` | Concatenate values together |
| `formatDate` | `formatDate(field, pattern)` | `formatDate(dob, 'yyyyMMdd')` | Format a date value |
| `parseDate` | `parseDate(field)` | `parseDate(date_str)` | Parse a string into a date |
| `round` | `round(field, decimals?)` | `round(amount, 2)` | Round a number |
| `formatNumber` | `formatNumber(field, format?)` | `formatNumber(price, '0,0.00')` | Format a number with pattern |
| `parseInt` | `parseInt(field)` | `parseInt(age)` | Parse as integer |
| `parseFloat` | `parseFloat(field)` | `parseFloat(weight)` | Parse as float |
| `coalesce` | `coalesce(...fields)` | `coalesce(phone, email, 'N/A')` | Return first non-null value |
| `if` | `if(condition, trueVal, falseVal)` | `if(status, 'Active', 'Inactive')` | Conditional value |
| `case` | `case(value, match1, out1, ..., default?)` | `case(type, 'A', 'Type A', 'B', 'Type B', 'Unknown')` | Multi-match conditional |
| `switch` | `switch(value, obj, default?)` | `switch(dept, {"HR":"Human Resources"}, "Other")` | Object-map conditional |
| `join` | `join(sep, field, ...)` | `join(', ', first, last)` | Join non-empty values with separator |

---

## 11. Template Syntax Reference

The template engine uses Handlebars-style syntax:

| Syntax | Description | Example |
|---|---|---|
| `{{field}}` | Insert a field's value | `{{last_name}}` |
| `{{row.field}}` | Insert a field value (explicit row context) | `{{row.email}}` |
| `{{index}}` | Insert the current row index (0-based) | `{{index}}` |
| `{{#if field}}...{{/if}}` | Conditionally include content if field is truthy | `{{#if middle_name}}{{middle_name}}{{/if}}` |
| `{{#if field}}...{{else}}...{{/if}}` | Conditional with else branch | `{{#if status}}Active{{else}}Inactive{{/if}}` |
| `{{#each list}}...{{/each}}` | Iterate over an array | `{{#each items}}{{name}}{{/each}}` |
| `{{#each list}}{{field}}{{/each}}` | Iterate with field reference | `{{#each rows}}{{col_a}},{{col_b}}{{/each}}` |

**Nesting:** Conditions and loops can be nested inside each other.  
**Escape:** Use `\{{text}}` to output literal `{{text}}` without substitution.
