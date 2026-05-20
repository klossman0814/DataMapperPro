# Template Conditionals & Loops

Comprehensive guide to `{{#if}}` and `{{#each}}` in DataMapper Pro templates.

---

## 1. Token Basics

Before using conditionals and loops, understand how field values are inserted:

| Syntax | Description | Example |
|---|---|---|
| `{{field}}` | Insert a mapped destination field value | `{{last_name}}` |
| `{{row.field}}` | Explicit row-prefixed reference (same data) | `{{row.first_name}}` |
| `{{index}}` | Current row number (1-based in job output) | `Record #{{index}}` |

Unknown tokens render as empty strings (no error).

---

## 2. Conditionals (`{{#if}}` / `{{/if}}`)

### 2.1 Basic If

```
{{#if field_name}}
Content shown when field_name is truthy
{{/if}}
```

- `{{#if field_name}}`, `{{/if}}`, and `{{else}}` **must each be on their own line**
- Leading/trailing whitespace on these lines is ignored
- Content lines between `{{#if}}` and `{{/if}}` are rendered conditionally

**Example — include an address line only when present:**

```
PID|||{{id}}||{{name}}
{{#if address}}
ADDR|{{address}}|{{city}}|{{state}}|{{zip}}
{{/if}}
```

If `address` is empty/null, the `ADDR` line is omitted entirely.

### 2.2 If/Else

```
{{#if field_name}}
Content shown when field_name is truthy
{{else}}
Content shown when field_name is falsy
{{/if}}
```

The `{{else}}` line must also be on its own line (with optional whitespace).

**Example — status indicator:**

```
{{#if active}}
STATUS|Active|{{last_login}}
{{else}}
STATUS|Inactive|Never
{{/if}}
```

### 2.3 Truthiness Rules

The condition passes when the field value is **not** any of:

| Value | Truthy? | Notes |
|---|---|---|
| `"hello"` | Yes | Non-empty string |
| `42` | Yes | Non-zero number |
| `true` | No | `true` is explicitly falsy |
| `0` | **No** | Zero is falsy |
| `""` | No | Empty string |
| `null` | No | Null |
| `undefined` | No | Missing field |

> **Note:** `true` and `0` are treated as falsy. This differs from JavaScript. If you need to check for a zero value, use a transformation expression like `if(count >= 0, 'has value', 'no value')` in the mapping instead.

### 2.4 Nested Conditionals

Conditionals can nest inside each other. Each level is tracked independently.

```
{{#if section_a}}
Section A content
{{#if detail_mode}}
Detailed section A content
{{/if}}
{{else}}
{{#if section_b}}
Section B content
{{/if}}
{{/if}}
```

### 2.5 Checking Multiple Fields

Conditionals test a single field. To combine conditions, nest them:

```
{{#if email}}
{{#if opted_in}}
EMAIL|{{email}}|{{name}}
{{/if}}
{{/if}}
```

---

## 3. Loops (`{{#each}}` / `{{/each}}`)

### 3.1 Basic Each

```
{{#each list_field}}item content{{/each}}
```

- The **entire `{{#each}}...{{/each}}` must be on a single line** (unlike `{{#if}}`)
- `list_field` must be an array column in your source data
- Inside the loop body, `{{field}}` refers to properties of the **current item**, not the top-level row
- Each iteration's output is joined with newlines

**Example — iterate over phone numbers:**

Source row: `{ name: "John", phones: [{ type: "home", num: "555-0100" }, { type: "work", num: "555-0200" }] }`

Template:
```
{{#each phones}}{{type}}|{{num}}{{/each}}
```

Output:
```
home|555-0100
work|555-0200
```

### 3.2 Accessing the Index

Inside an `{{#each}}`, the `{{index}}` variable is the 0-based position:

```
{{#each items}}{{index}}. {{name}}{{/each}}
```

Given `items: [{name:"A"},{name:"B"}]`, output:
```
0. A
1. B
```

> In the final job output, row-level `{{index}}` is 1-based. Inside an `{{#each}}`, it's 0-based relative to the list.

### 3.3 Nested Tokens Inside Each

The loop body can use any property of the current array item:

Source row: `{ orders: [{ id: "ORD1", total: 100 }, { id: "ORD2", total: 250 }] }`

```
{{#each orders}}{{id}}|${{total}}{{/each}}
```

Output:
```
ORD1|$100
ORD2|$250
```

### 3.4 Combining Each with If (Limitation)

Because `{{#each}}` must be on a single line and `{{#if}}` requires multiple lines, **you cannot directly nest an `{{#if}}` inside an `{{#each}}`**.

Instead, filter your data at the source (mapping/transformation stage) or use this pattern:

```
{{#each phone_numbers}}{{type}}|{{num}}{{/each}}
```

If you need conditional output within a loop, pre-process the data in a mapping expression to produce only the items you want.

---

## 4. Combining Conditionals and Loops

Since `{{#if}}` works at the line level and `{{#each}}` works on a single line, you can use them together **at the line level**:

```
{{#if has_orders}}
{{#each orders}}{{id}}|${{total}}{{/each}}
{{/if}}
```

This renders the loop line only when `has_orders` is truthy. The loop output (multiple lines joined by newlines) becomes part of the conditional block.

**Multi-row example:**

```
PID|{{id}}|{{name}}|{{dob}}
{{#if phone_numbers}}
{{#each phone_numbers}}{{type}}|{{num}}{{/each}}
{{/if}}
{{#if email}}
EMAIL|{{email}}
{{/if}}
```

---

## 5. Real-World Patterns

### 5.1 HL7-Style Messages

```
MSH|^~\&|{{source}}|{{facility}}|||{{timestamp}}||ADT^A01|||2.5.1
EVN|A01|{{timestamp}}
PID|||{{mrn}}||{{last_name}}^{{first_name}}||{{dob}}|{{gender}}|||{{street}}^^{{city}}^{{state}}^{{zip}}
{{#if phone}}
NK1||{{phone}}|^PRN^PH
{{/if}}
{{#each insurance}}
IN1||{{provider}}|{{policy_id}}|{{group_id}}
{{/each}}
```

### 5.2 CSV with Optional Columns

```
{{id}},{{name}},{{email}}
{{#if phone}}{{id}},{{name}},{{phone}}{{/if}}
```

Which gives rows with and without the phone column depending on availability.

### 5.3 JSON-Like Token Output

```
{"id":"{{id}}","name":"{{name}}"}
{{#if email}},{"id":"{{id}}","email":"{{email}}"}{{/if}}
```

### 5.4 Conditional Delimiter

```
{{#if separator}}{{separator}}{{/if}}{{field}}
```

---

## 6. Limitations

| Limitation | Details |
|---|---|
| `{{#if}}` must be on its own line | Cannot do `{{#if x}}{{x}}{{/if}}` on one line |
| `{{#else}}` must be on its own line | Cannot put `{{else}}` inline |
| `{{#each}}` must be on a **single** line | Cannot span multiple lines |
| No `{{#unless}}` | Use `{{#if field}}{{else}}...{{/if}}` instead |
| No comparison operators in `{{#if}}` | `{{#if count > 5}}` is **not** supported. Use mapping expressions instead |
| No logical operators | `{{#if a && b}}` is **not** supported. Nest conditionals |
| Array fields must exist | If the field for `{{#each}}` is not an array, the loop outputs nothing (no error) |
| `0` is falsy | Zero is treated as falsy, so `{{#if count}}` fails when count is 0 |

### 6.1 Workarounds for Comparisons

To check `count > 5` or other comparisons, use a transformation in your mapping to create a boolean-like field:

- Mapping: `has_many = if(count > 5, 'yes', '')`
- Template: `{{#if has_many}}...{{/if}}`

### 6.2 Workarounds for Logical AND

To check `a AND b`, use nested conditionals:

```
{{#if a}}
{{#if b}}
Both A and B are truthy
{{/if}}
{{/if}}
```

---

## 7. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Conditional block always renders | Field name typo in `{{#if}}` | Check the field name matches a destination field exactly |
| Conditional block never renders | Field is `0`, `false`, or empty string | Use a mapping transformation to convert to a truthy value |
| Loop outputs nothing | Field is not an array, or field name is wrong | Verify the source column contains arrays |
| Loop content is on one line | `{{#each}}` spans multiple lines but engine expects single line | Put `{{#each list}}content{{/each}}` all on one line |
| `{{` or `}}` showing in output | Unbalanced braces | Every `{{` must have a matching `}}` |
| Line breaks missing in loop output | Items joined with newlines automatically | If you want items on the same line, use the template in a single-line format |
| Error on saved profile load | Template contains unsupported syntax | Strip any `{{#unless}}`, `{{#with}}`, or comparison operators |
