import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.FORCE_SEED !== 'true') {
    console.log(`Database already has ${existingUsers} user(s) — skipping seed to preserve your data.`);
    console.log('  Run with FORCE_SEED=true to re-seed and discard existing data.');
    return;
  }
  if (existingUsers > 0) {
    console.log('FORCE_SEED=true — clearing all existing data...');
  }
  console.log('Cleaning existing data...');
  await prisma.processingJob.deleteMany();
  await prisma.databaseConnection.deleteMany();
  await prisma.uploadedFile.deleteMany();
  await prisma.mappingProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('admin123', 10);

  const defaultPrefs: Prisma.InputJsonValue = JSON.parse(JSON.stringify({
    jobCompleted: true,
    jobFailed: true,
    weeklySummary: false,
    weeklySummaryDay: 'monday',
    weeklySummaryTime: '09:00',
  }));

  const adminUser = await prisma.user.create({
    data: { email: 'admin@datamapperpro.com', passwordHash, name: 'Admin User', notificationPreferences: defaultPrefs },
  });

  const demoUser = await prisma.user.create({
    data: { email: 'demo@datamapperpro.com', passwordHash, name: 'Demo User', notificationPreferences: defaultPrefs },
  });

  console.log('Created 2 users');

  // ──────────────────────────────────────────────
  // FILE 1: Patient Records (25 rows, real CSV has 22 columns)
  // ──────────────────────────────────────────────
  const patientsFile = await prisma.uploadedFile.create({
    data: {
      filename: 'sample-patients.csv',
      originalName: 'Patient Records.csv',
      mimeType: 'text/csv',
      size: 5167,
      rowCount: 25,
      columns: JSON.parse(JSON.stringify([
        { name: 'mrn', type: 'string', nullCount: 0, sampleValues: ['P-001', 'P-002', 'P-003', 'P-004', 'P-005'] },
        { name: 'last_name', type: 'string', nullCount: 0, sampleValues: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'] },
        { name: 'first_name', type: 'string', nullCount: 0, sampleValues: ['John', 'Mary', 'Robert', 'Linda', 'Michael'] },
        { name: 'dob', type: 'date', nullCount: 0, sampleValues: ['1985-03-15', '1990-07-22', '1972-11-30', '1968-04-05', '1995-01-20'] },
        { name: 'gender', type: 'string', nullCount: 0, sampleValues: ['M', 'F', 'M', 'F', 'M'] },
        { name: 'phone', type: 'string', nullCount: 0, sampleValues: ['555-0201', '555-0202', '555-0203', '555-0204', '555-0205'] },
        { name: 'email', type: 'string', nullCount: 1, sampleValues: ['john.smith@email.com', 'mary.j@email.com', 'bob.w@email.com', 'linda.b@email.com', 'mike.j@email.com'] },
        { name: 'address', type: 'string', nullCount: 0, sampleValues: ['123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm St', '654 Maple Dr'] },
        { name: 'city', type: 'string', nullCount: 0, sampleValues: ['Springfield', 'Portland', 'Austin', 'Miami', 'Seattle'] },
        { name: 'state', type: 'string', nullCount: 0, sampleValues: ['IL', 'OR', 'TX', 'FL', 'WA'] },
        { name: 'zip', type: 'string', nullCount: 0, sampleValues: ['62701', '97201', '73301', '33101', '98101'] },
        { name: 'insurance', type: 'string', nullCount: 1, sampleValues: ['BlueCross', 'Kaiser', 'Aetna', 'Cigna', 'BlueCross'] },
        { name: 'provider', type: 'string', nullCount: 0, sampleValues: ['Dr. Williams', 'Dr. Brown', 'Dr. Davis', 'Dr. Wilson', 'Dr. Taylor'] },
        { name: 'primary_care', type: 'string', nullCount: 0, sampleValues: ['Dr. Adams', 'Dr. Clark', 'Dr. Evans', 'Dr. Foster', 'Dr. Garcia'] },
        { name: 'last_visit', type: 'date', nullCount: 0, sampleValues: ['2025-10-15', '2025-11-01', '2025-09-20', '2025-10-28', '2025-11-15'] },
        { name: 'diagnosis', type: 'string', nullCount: 0, sampleValues: ['Hypertension', 'Asthma', 'Type 2 Diabetes', 'Arthritis', 'Acute Bronchitis'] },
        { name: 'medication', type: 'string', nullCount: 0, sampleValues: ['Lisinopril', 'Albuterol', 'Metformin', 'Ibuprofen', 'Amoxicillin'] },
        { name: 'allergies', type: 'string', nullCount: 2, sampleValues: ['None', 'Pollen', 'Sulfa', 'NSAIDs', 'Penicillin'] },
        { name: 'smoking_status', type: 'string', nullCount: 0, sampleValues: ['Former', 'Never', 'Current', 'Never', 'Current'] },
        { name: 'height_cm', type: 'number', nullCount: 0, sampleValues: [178, 165, 182, 163, 180] },
        { name: 'weight_kg', type: 'number', nullCount: 0, sampleValues: [82, 68, 95, 72, 78] },
        { name: 'blood_type', type: 'string', nullCount: 0, sampleValues: ['A+', 'B-', 'O+', 'AB+', 'B-'] },
        { name: 'emergency_contact', type: 'string', nullCount: 0, sampleValues: ['Jane Smith', 'Tom Johnson', 'Sarah Williams', 'David Brown', 'Lisa Jones'] },
        { name: 'emergency_phone', type: 'string', nullCount: 0, sampleValues: ['555-0301', '555-0302', '555-0303', '555-0304', '555-0305'] },
      ])) as Prisma.InputJsonValue,
      preview: JSON.parse(JSON.stringify([
        { mrn: 'P-001', last_name: 'Smith', first_name: 'John', dob: '1985-03-15', gender: 'M', phone: '555-0201', email: 'john.smith@email.com', address: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701', insurance: 'BlueCross', provider: 'Dr. Williams', primary_care: 'Dr. Adams', last_visit: '2025-10-15', diagnosis: 'Hypertension', medication: 'Lisinopril', allergies: 'None', smoking_status: 'Former', height_cm: 178, weight_kg: 82, blood_type: 'A+', emergency_contact: 'Jane Smith', emergency_phone: '555-0301' },
        { mrn: 'P-002', last_name: 'Johnson', first_name: 'Mary', dob: '1990-07-22', gender: 'F', phone: '555-0202', email: 'mary.j@email.com', address: '456 Oak Ave', city: 'Portland', state: 'OR', zip: '97201', insurance: 'Kaiser', provider: 'Dr. Brown', primary_care: 'Dr. Clark', last_visit: '2025-11-01', diagnosis: 'Asthma', medication: 'Albuterol', allergies: 'Pollen', smoking_status: 'Never', height_cm: 165, weight_kg: 68, blood_type: 'B-', emergency_contact: 'Tom Johnson', emergency_phone: '555-0302' },
        { mrn: 'P-003', last_name: 'Williams', first_name: 'Robert', dob: '1972-11-30', gender: 'M', phone: '555-0203', email: 'bob.w@email.com', address: '789 Pine Rd', city: 'Austin', state: 'TX', zip: '73301', insurance: 'Aetna', provider: 'Dr. Davis', primary_care: 'Dr. Evans', last_visit: '2025-09-20', diagnosis: 'Type 2 Diabetes', medication: 'Metformin', allergies: 'Sulfa', smoking_status: 'Current', height_cm: 182, weight_kg: 95, blood_type: 'O+', emergency_contact: 'Sarah Williams', emergency_phone: '555-0303' },
        { mrn: 'P-004', last_name: 'Brown', first_name: 'Linda', dob: '1968-04-05', gender: 'F', phone: '555-0204', email: 'linda.b@email.com', address: '321 Elm St', city: 'Miami', state: 'FL', zip: '33101', insurance: 'Cigna', provider: 'Dr. Wilson', primary_care: 'Dr. Foster', last_visit: '2025-10-28', diagnosis: 'Arthritis', medication: 'Ibuprofen', allergies: 'NSAIDs', smoking_status: 'Never', height_cm: 163, weight_kg: 72, blood_type: 'AB+', emergency_contact: 'David Brown', emergency_phone: '555-0304' },
        { mrn: 'P-005', last_name: 'Jones', first_name: 'Michael', dob: '1995-01-20', gender: 'M', phone: '555-0205', email: 'mike.j@email.com', address: '654 Maple Dr', city: 'Seattle', state: 'WA', zip: '98101', insurance: 'BlueCross', provider: 'Dr. Taylor', primary_care: 'Dr. Garcia', last_visit: '2025-11-15', diagnosis: 'Acute Bronchitis', medication: 'Amoxicillin', allergies: 'Penicillin', smoking_status: 'Current', height_cm: 180, weight_kg: 78, blood_type: 'B-', emergency_contact: 'Lisa Jones', emergency_phone: '555-0305' },
      ])) as Prisma.InputJsonValue,
      sheetNames: JSON.parse(JSON.stringify(['Sheet1'])) as Prisma.InputJsonValue,
      uploadedById: adminUser.id,
    },
  });
  console.log('  Uploaded: Patient Records.csv (25 rows, 24 columns)');

  // ──────────────────────────────────────────────
  // FILE 2: Employee Directory (30 rows, 16 columns)
  // ──────────────────────────────────────────────
  const employeesFile = await prisma.uploadedFile.create({
    data: {
      filename: 'sample-employees.csv',
      originalName: 'Employee Directory.csv',
      mimeType: 'text/csv',
      size: 4338,
      rowCount: 30,
      columns: JSON.parse(JSON.stringify([
        { name: 'employee_id', type: 'number', nullCount: 0, sampleValues: [1001, 1002, 1003, 1004, 1005] },
        { name: 'first_name', type: 'string', nullCount: 0, sampleValues: ['John', 'Jane', 'Bob', 'Alice', 'Charlie'] },
        { name: 'last_name', type: 'string', nullCount: 0, sampleValues: ['Smith', 'Doe', 'Johnson', 'Williams', 'Brown'] },
        { name: 'email', type: 'string', nullCount: 0, sampleValues: ['john.smith@example.com', 'jane.doe@example.com', 'bob.johnson@example.com', 'alice.williams@example.com', 'charlie.brown@example.com'] },
        { name: 'department', type: 'string', nullCount: 0, sampleValues: ['Engineering', 'Marketing', 'Engineering', 'Human Resources', 'Sales'] },
        { name: 'title', type: 'string', nullCount: 0, sampleValues: ['Senior Engineer', 'Marketing Manager', 'Junior Engineer', 'HR Coordinator', 'Sales Rep'] },
        { name: 'salary', type: 'number', nullCount: 0, sampleValues: [105000, 95000, 75000, 65000, 85000] },
        { name: 'start_date', type: 'date', nullCount: 0, sampleValues: ['2019-03-15', '2020-06-01', '2022-01-10', '2021-09-01', '2018-11-15'] },
        { name: 'phone', type: 'string', nullCount: 0, sampleValues: ['555-0101', '555-0102', '555-0103', '555-0104', '555-0105'] },
        { name: 'status', type: 'string', nullCount: 1, sampleValues: ['Active', 'Active', 'Active', 'Active', 'Active'] },
        { name: 'location', type: 'string', nullCount: 0, sampleValues: ['New York', 'Chicago', 'New York', 'New York', 'Chicago'] },
        { name: 'manager', type: 'string', nullCount: 0, sampleValues: ['Alice Johnson', 'Bob Williams', 'John Smith', 'Carol Brown', 'Bob Williams'] },
        { name: 'project_count', type: 'number', nullCount: 0, sampleValues: [3, 5, 2, 1, 8] },
        { name: 'years_of_service', type: 'number', nullCount: 0, sampleValues: [6, 5, 3, 4, 7] },
        { name: 'last_review_date', type: 'date', nullCount: 0, sampleValues: ['2025-11-01', '2025-10-15', '2025-09-20', '2025-08-05', '2025-10-01'] },
        { name: 'performance_rating', type: 'number', nullCount: 0, sampleValues: [4, 5, 3, 4, 3] },
      ])) as Prisma.InputJsonValue,
      preview: JSON.parse(JSON.stringify([
        { employee_id: 1001, first_name: 'John', last_name: 'Smith', email: 'john.smith@example.com', department: 'Engineering', title: 'Senior Engineer', salary: 105000, start_date: '2019-03-15', phone: '555-0101', status: 'Active', location: 'New York', manager: 'Alice Johnson', project_count: 3, years_of_service: 6, last_review_date: '2025-11-01', performance_rating: 4 },
        { employee_id: 1002, first_name: 'Jane', last_name: 'Doe', email: 'jane.doe@example.com', department: 'Marketing', title: 'Marketing Manager', salary: 95000, start_date: '2020-06-01', phone: '555-0102', status: 'Active', location: 'Chicago', manager: 'Bob Williams', project_count: 5, years_of_service: 5, last_review_date: '2025-10-15', performance_rating: 5 },
        { employee_id: 1003, first_name: 'Bob', last_name: 'Johnson', email: 'bob.johnson@example.com', department: 'Engineering', title: 'Junior Engineer', salary: 75000, start_date: '2022-01-10', phone: '555-0103', status: 'Active', location: 'New York', manager: 'John Smith', project_count: 2, years_of_service: 3, last_review_date: '2025-09-20', performance_rating: 3 },
        { employee_id: 1004, first_name: 'Alice', last_name: 'Williams', email: 'alice.williams@example.com', department: 'Human Resources', title: 'HR Coordinator', salary: 65000, start_date: '2021-09-01', phone: '555-0104', status: 'Active', location: 'New York', manager: 'Carol Brown', project_count: 1, years_of_service: 4, last_review_date: '2025-08-05', performance_rating: 4 },
        { employee_id: 1005, first_name: 'Charlie', last_name: 'Brown', email: 'charlie.brown@example.com', department: 'Sales', title: 'Sales Rep', salary: 85000, start_date: '2018-11-15', phone: '555-0105', status: 'Active', location: 'Chicago', manager: 'Bob Williams', project_count: 8, years_of_service: 7, last_review_date: '2025-10-01', performance_rating: 3 },
      ])) as Prisma.InputJsonValue,
      sheetNames: JSON.parse(JSON.stringify(['Sheet1'])) as Prisma.InputJsonValue,
      uploadedById: adminUser.id,
    },
  });
  console.log('  Uploaded: Employee Directory.csv (30 rows, 16 columns)');

  // ──────────────────────────────────────────────
  // FILE 3: Order History (25 rows, 15 columns)
  // ──────────────────────────────────────────────
  const ordersFile = await prisma.uploadedFile.create({
    data: {
      filename: 'sample-orders.csv',
      originalName: 'Order History.csv',
      mimeType: 'text/csv',
      size: 4074,
      rowCount: 25,
      columns: JSON.parse(JSON.stringify([
        { name: 'order_id', type: 'string', nullCount: 0, sampleValues: ['ORD-001', 'ORD-002', 'ORD-003', 'ORD-004', 'ORD-005'] },
        { name: 'customer_name', type: 'string', nullCount: 0, sampleValues: ['Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Emma Davis'] },
        { name: 'customer_email', type: 'string', nullCount: 0, sampleValues: ['alice.j@email.com', 'bob.s@email.com', 'carol.w@email.com', 'david.b@email.com', 'emma.d@email.com'] },
        { name: 'product_name', type: 'string', nullCount: 0, sampleValues: ['Wireless Mouse', 'USB-C Hub', 'Desk Lamp', 'Ergonomic Chair', 'Notebook Set'] },
        { name: 'category', type: 'string', nullCount: 0, sampleValues: ['Electronics', 'Electronics', 'Home Office', 'Furniture', 'Stationery'] },
        { name: 'unit_price', type: 'number', nullCount: 0, sampleValues: [29.99, 49.99, 39.99, 349.99, 12.99] },
        { name: 'quantity', type: 'number', nullCount: 0, sampleValues: [2, 1, 3, 1, 10] },
        { name: 'order_date', type: 'date', nullCount: 0, sampleValues: ['2025-01-15', '2025-01-16', '2025-01-18', '2025-01-20', '2025-01-22'] },
        { name: 'status', type: 'string', nullCount: 0, sampleValues: ['Delivered', 'Delivered', 'Delivered', 'Delivered', 'Delivered'] },
        { name: 'shipping_method', type: 'string', nullCount: 0, sampleValues: ['Standard', 'Express', 'Standard', 'Freight', 'Standard'] },
        { name: 'shipping_address', type: 'string', nullCount: 1, sampleValues: ['123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm St', '654 Maple Dr'] },
        { name: 'shipping_city', type: 'string', nullCount: 0, sampleValues: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'] },
        { name: 'shipping_state', type: 'string', nullCount: 0, sampleValues: ['NY', 'CA', 'IL', 'TX', 'AZ'] },
        { name: 'shipping_zip', type: 'string', nullCount: 0, sampleValues: ['10001', '90001', '60601', '77001', '85001'] },
        { name: 'payment_method', type: 'string', nullCount: 0, sampleValues: ['Credit Card', 'PayPal', 'Credit Card', 'PayPal', 'Debit Card'] },
        { name: 'discount', type: 'number', nullCount: 6, sampleValues: [0, 10, 15, 0, 0] },
        { name: 'notes', type: 'string', nullCount: 8, sampleValues: ['Leave at front desk', '', 'Handle with care', '', 'Office supplies'] },
      ])) as Prisma.InputJsonValue,
      preview: JSON.parse(JSON.stringify([
        { order_id: 'ORD-001', customer_name: 'Alice Johnson', customer_email: 'alice.j@email.com', product_name: 'Wireless Mouse', category: 'Electronics', unit_price: 29.99, quantity: 2, order_date: '2025-01-15', status: 'Delivered', shipping_method: 'Standard', shipping_address: '123 Main St', shipping_city: 'New York', shipping_state: 'NY', shipping_zip: '10001', payment_method: 'Credit Card', discount: 0, notes: 'Leave at front desk' },
        { order_id: 'ORD-002', customer_name: 'Bob Smith', customer_email: 'bob.s@email.com', product_name: 'USB-C Hub', category: 'Electronics', unit_price: 49.99, quantity: 1, order_date: '2025-01-16', status: 'Delivered', shipping_method: 'Express', shipping_address: '456 Oak Ave', shipping_city: 'Los Angeles', shipping_state: 'CA', shipping_zip: '90001', payment_method: 'PayPal', discount: 10, notes: '' },
        { order_id: 'ORD-003', customer_name: 'Carol Williams', customer_email: 'carol.w@email.com', product_name: 'Desk Lamp', category: 'Home Office', unit_price: 39.99, quantity: 3, order_date: '2025-01-18', status: 'Delivered', shipping_method: 'Standard', shipping_address: '789 Pine Rd', shipping_city: 'Chicago', shipping_state: 'IL', shipping_zip: '60601', payment_method: 'Credit Card', discount: 15, notes: 'Handle with care' },
        { order_id: 'ORD-004', customer_name: 'David Brown', customer_email: 'david.b@email.com', product_name: 'Ergonomic Chair', category: 'Furniture', unit_price: 349.99, quantity: 1, order_date: '2025-01-20', status: 'Delivered', shipping_method: 'Freight', shipping_address: '321 Elm St', shipping_city: 'Houston', shipping_state: 'TX', shipping_zip: '77001', payment_method: 'PayPal', discount: 0, notes: '' },
        { order_id: 'ORD-005', customer_name: 'Emma Davis', customer_email: 'emma.d@email.com', product_name: 'Notebook Set', category: 'Stationery', unit_price: 12.99, quantity: 10, order_date: '2025-01-22', status: 'Delivered', shipping_method: 'Standard', shipping_address: '654 Maple Dr', shipping_city: 'Phoenix', shipping_state: 'AZ', shipping_zip: '85001', payment_method: 'Debit Card', discount: 0, notes: 'Office supplies' },
      ])) as Prisma.InputJsonValue,
      sheetNames: JSON.parse(JSON.stringify(['Sheet1'])) as Prisma.InputJsonValue,
      uploadedById: demoUser.id,
    },
  });
  console.log('  Uploaded: Order History.csv (25 rows, 17 columns)');

  // ──────────────────────────────────────────────
  // FILE 4: Financial Transactions (20 rows, 10 columns)
  // ──────────────────────────────────────────────
  const financialFile = await prisma.uploadedFile.create({
    data: {
      filename: 'sample-financial.csv',
      originalName: 'Financial Transactions.csv',
      mimeType: 'text/csv',
      size: 2267,
      rowCount: 20,
      columns: JSON.parse(JSON.stringify([
        { name: 'transaction_id', type: 'string', nullCount: 0, sampleValues: ['TXN-001', 'TXN-002', 'TXN-003', 'TXN-004', 'TXN-005'] },
        { name: 'date', type: 'date', nullCount: 0, sampleValues: ['2025-01-05', '2025-01-08', '2025-01-10', '2025-01-15', '2025-01-20'] },
        { name: 'description', type: 'string', nullCount: 0, sampleValues: ['Monthly software subscription - Q1', 'Office supplies - Staples', 'Client payment - Acme Corp', 'Payroll - Engineering team', 'Google Cloud hosting'] },
        { name: 'debit', type: 'number', nullCount: 7, sampleValues: [0, 247.83, 0, 48500.0, 0] },
        { name: 'credit', type: 'number', nullCount: 7, sampleValues: [599.0, 0, 12500.0, 0, 2340.5] },
        { name: 'account', type: 'number', nullCount: 0, sampleValues: [4001, 5005, 1001, 3001, 4002] },
        { name: 'category', type: 'string', nullCount: 0, sampleValues: ['COGS', 'Supplies', 'Revenue', 'Payroll', 'COGS'] },
        { name: 'vendor', type: 'string', nullCount: 3, sampleValues: ['CloudTech Inc', 'Staples', '', '', 'Google Cloud'] },
        { name: 'status', type: 'string', nullCount: 0, sampleValues: ['Posted', 'Posted', 'Posted', 'Posted', 'Posted'] },
        { name: 'notes', type: 'string', nullCount: 5, sampleValues: ['Quarterly enterprise license', 'Printer toner + paper reorder', '', '', 'Production cluster Jan 2025'] },
      ])) as Prisma.InputJsonValue,
      preview: JSON.parse(JSON.stringify([
        { transaction_id: 'TXN-001', date: '2025-01-05', description: 'Monthly software subscription - Q1', debit: 0, credit: 599.0, account: 4001, category: 'COGS', vendor: 'CloudTech Inc', status: 'Posted', notes: 'Quarterly enterprise license' },
        { transaction_id: 'TXN-002', date: '2025-01-08', description: 'Office supplies - Staples', debit: 247.83, credit: 0, account: 5005, category: 'Supplies', vendor: 'Staples', status: 'Posted', notes: 'Printer toner + paper reorder' },
        { transaction_id: 'TXN-003', date: '2025-01-10', description: 'Client payment - Acme Corp', debit: 0, credit: 12500.0, account: 1001, category: 'Revenue', vendor: '', status: 'Posted', notes: 'Invoice INV-2024-1201' },
        { transaction_id: 'TXN-004', date: '2025-01-15', description: 'Payroll - Engineering team', debit: 48500.0, credit: 0, account: 3001, category: 'Payroll', vendor: '', status: 'Posted', notes: '' },
        { transaction_id: 'TXN-005', date: '2025-01-20', description: 'Google Cloud hosting', debit: 0, credit: 2340.5, account: 4002, category: 'COGS', vendor: 'Google Cloud', status: 'Posted', notes: 'Production cluster Jan 2025' },
      ])) as Prisma.InputJsonValue,
      sheetNames: JSON.parse(JSON.stringify(['Sheet1'])) as Prisma.InputJsonValue,
      uploadedById: adminUser.id,
    },
  });
  console.log('  Uploaded: Financial Transactions.csv (20 rows, 10 columns)');

  // ══════════════════════════════════════════════
  // MAPPING PROFILES — Each showcases different features
  // ══════════════════════════════════════════════

  // ───────────────────────────────────────────
  // PROFILE 1: All 16 Transformation Functions
  // ───────────────────────────────────────────
  const allFunctionsProfile = await prisma.mappingProfile.create({
    data: {
      name: 'All 16 Transformation Functions',
      description: 'Demonstrates every string, date, numeric, and logic transformation function on patient data',
      template: '{{mrn}}|{{full_name}}|{{clean_phone}}|{{area_code}}|{{email_lower}}|{{city_upper}}|{{state_upper}}|{{diagnosis_code}}|{{searchable_name}}|{{padded_id}}|{{padded_code}}|{{formatted_dob}}|{{parsed_dob}}|{{bmi_rounded}}|{{formatted_weight}}|{{age_int}}|{{bmi_float}}|{{contact_info}}|{{risk_label}}|{{tier_name}}|{{gender_label}}|{{medication_default}}',
      configurationJson: JSON.parse(JSON.stringify({
        mappings: [
          { destinationField: 'mrn', sourceField: 'mrn' },
          { destinationField: 'full_name', expression: 'concat({{first_name}}, \' \', {{last_name}})' },
          { destinationField: 'clean_phone', sourceField: 'phone', transformation: 'replace(-,)' },
          { destinationField: 'area_code', sourceField: 'phone', transformation: 'substring(0,3)' },
          { destinationField: 'email_lower', sourceField: 'email', transformation: 'lower' },
          { destinationField: 'city_upper', sourceField: 'city', transformation: 'upper' },
          { destinationField: 'state_upper', sourceField: 'state', transformation: 'upper' },
          { destinationField: 'diagnosis_code', sourceField: 'diagnosis', transformation: 'substring(0,3)' },
          { destinationField: 'searchable_name', sourceField: 'last_name', transformation: 'upper' },
          { destinationField: 'padded_id', sourceField: 'mrn', transformation: 'padEnd(10,.)' },
          { destinationField: 'padded_code', sourceField: 'zip', transformation: 'padStart(10,0)' },
          { destinationField: 'formatted_dob', sourceField: 'dob', transformation: 'formatDate(MM/dd/yyyy)' },
          { destinationField: 'parsed_dob', sourceField: 'dob', transformation: 'parseDate' },
          { destinationField: 'bmi_rounded', sourceField: 'weight_kg', transformation: 'round(1)' },
          { destinationField: 'formatted_weight', sourceField: 'weight_kg', transformation: 'formatNumber(0.0)' },
          { destinationField: 'height_int', sourceField: 'height_cm', transformation: 'parseInt' },
          { destinationField: 'weight_float', sourceField: 'weight_kg', transformation: 'parseFloat' },
          { destinationField: 'contact_trimmed', sourceField: 'phone', transformation: 'trim' },
          { destinationField: 'contact_info', expression: 'coalesce({{phone}}, {{email}}, \'No contact\')' },
          { destinationField: 'risk_label', expression: 'if({{smoking_status}}, \'At Risk\', \'Low Risk\')', condition: { field: 'smoking_status', operator: 'equals', value: 'Current' } },
          { destinationField: 'gender_label', expression: 'case({{gender}}, \'M\', \'Male\', \'F\', \'Female\', \'Other\')' },
          { destinationField: 'tier_name', expression: 'switch({{insurance}}, {\"BlueCross\":\"Blue Cross\",\"Kaiser\":\"Kaiser Permanente\",\"Aetna\":\"Aetna Health\",\"Cigna\":\"Cigna Healthcare\",\"UnitedHealth\":\"UnitedHealth Group\",\"Medicare\":\"Medicare\"}, \"Unknown\")' },
          { destinationField: 'medication_default', expression: 'coalesce({{medication}}, {{diagnosis}}, \'No treatment\')' },
        ],
        outputOptions: { format: 'csv', delimiter: '|', includeHeader: false },
      })) as Prisma.InputJsonValue,
      version: 1,
      createdById: adminUser.id,
    },
  });
  console.log('  Created profile: All 16 Transformation Functions');

  // ───────────────────────────────────────────
  // PROFILE 2: Complex Template (#if, #each, #else)
  // ───────────────────────────────────────────
  const complexTemplateProfile = await prisma.mappingProfile.create({
    data: {
      name: 'Complex Template Engine',
      description: 'Uses Handlebars-style #if, #else, and #each in the template with order data. Conditionally formats output based on order status and iterates line items.',
      template: '{{#if discount}}\n  <discounted_order>\n    <id>{{order_id}}</id>\n    <customer>{{customer_name}}</customer>\n    <total>{{total_amount}}</total>\n    <discount_pct>{{discount}}%</discount_pct>\n    <final>{{final_amount}}</final>\n  </discounted_order>\n{{else}}\n  <standard_order>\n    <id>{{order_id}}</id>\n    <customer>{{customer_name}}</customer>\n    <total>{{total_amount}}</total>\n  </standard_order>\n{{/if}}',
      configurationJson: JSON.parse(JSON.stringify({
        mappings: [
          { destinationField: 'order_id', sourceField: 'order_id' },
          { destinationField: 'customer_name', sourceField: 'customer_name', transformation: 'upper' },
          { destinationField: 'customer_email', sourceField: 'customer_email', transformation: 'lower' },
          { destinationField: 'product_name', sourceField: 'product_name' },
          { destinationField: 'category', sourceField: 'category' },
          { destinationField: 'unit_price', sourceField: 'unit_price' },
          { destinationField: 'quantity', sourceField: 'quantity' },
          { destinationField: 'order_date', sourceField: 'order_date' },
          { destinationField: 'status', sourceField: 'status' },
          { destinationField: 'shipping_method', sourceField: 'shipping_method' },
          { destinationField: 'shipping_address', expression: '{{shipping_address}}, {{shipping_city}}, {{shipping_state}} {{shipping_zip}}' },
          { destinationField: 'total_amount', expression: '{{unit_price}} * {{quantity}}' },
          { destinationField: 'discount', sourceField: 'discount', transformation: 'round(0)' },
          { destinationField: 'final_amount', expression: '({{unit_price}} * {{quantity}}) * (1 - {{discount}} / 100)' },
          { destinationField: 'payment_method', sourceField: 'payment_method' },
          { destinationField: 'notes', sourceField: 'notes' },
        ],
        outputOptions: { format: 'xml', rootElement: 'orders', itemElement: 'order' },
      })) as Prisma.InputJsonValue,
      version: 1,
      createdById: adminUser.id,
    },
  });
  console.log('  Created profile: Complex Template Engine');

  // ───────────────────────────────────────────
  // PROFILE 3: Conditional Mapping + Logic Functions
  // ───────────────────────────────────────────
  const conditionalProfile = await prisma.mappingProfile.create({
    data: {
      name: 'Conditional Mapping & Logic',
      description: 'Mapping conditions (equals, contains, greaterThan) and logic functions (if, case, switch, coalesce) on employee records',
      template: '{{employee_id}},{{full_name}},{{department_name}},{{salary_band}},{{tenure_group}},{{rating_label}},{{project_level}},{{employment_status}},{{manager_email}},{{review_summary}}',
      configurationJson: JSON.parse(JSON.stringify({
        mappings: [
          { destinationField: 'employee_id', sourceField: 'employee_id' },
          { destinationField: 'full_name', expression: '{{first_name}} {{last_name}}' },
          { destinationField: 'department_name', expression: 'switch({{department}}, {"Engineering":"Engineering Team","Marketing":"Marketing Dept","Sales":"Sales Division","Human Resources":"HR Team","IT":"IT Services","Finance":"Finance Group"}, "Other")' },
          { destinationField: 'salary_band', expression: 'if({{salary}} > 100000, \'Senior\', if({{salary}} > 75000, \'Mid\', \'Junior\'))' },
          { destinationField: 'tenure_group', expression: 'case({{years_of_service}}, 1, \'New Hire\', 2, \'Developing\', 3, \'Established\', 5, \'Senior\', 8, \'Veteran\', \'Rising\')' },
          { destinationField: 'rating_label', expression: 'case({{performance_rating}}, 5, \'Excellent\', 4, \'Good\', 3, \'Average\', 2, \'Below Average\', 1, \'Poor\', \'Not Rated\')' },
          { destinationField: 'project_level', expression: 'if({{project_count}} > 5, \'Heavy Load\', if({{project_count}} > 2, \n\'Moderate\', \'Light\'))' },
          { destinationField: 'employment_status', sourceField: 'status', condition: { field: 'status', operator: 'equals', value: 'Active' } },
          { destinationField: 'employment_status', constant: 'Inactive', condition: { field: 'status', operator: 'notEquals', value: 'Active' } },
          { destinationField: 'manager_email', expression: 'lower({{manager}}) + \'@example.com\'' },
          { destinationField: 'review_summary', expression: 'concat({{first_name}}, \' \', {{last_name}}, \' - \', {{department}}, \' - Rating: \', {{performance_rating}})' },
          { destinationField: 'location_code', expression: 'case({{location}}, \'New York\', \'NYC\', \'Chicago\', \'CHI\', \'San Francisco\', \'SFO\', \'Other\')' },
          { destinationField: 'tenure_years', expression: 'coalesce({{years_of_service}}, 0)' },
        ],
        outputOptions: { format: 'csv', delimiter: ',', includeHeader: true },
      })) as Prisma.InputJsonValue,
      version: 1,
      createdById: adminUser.id,
    },
  });
  console.log('  Created profile: Conditional Mapping & Logic');

  // ───────────────────────────────────────────
  // PROFILE 4: Fixed-Width Export with Validation
  // ───────────────────────────────────────────
  const fixedWidthProfile = await prisma.mappingProfile.create({
    data: {
      name: 'Fixed-Width Employee Export',
      description: 'Fixed-width text output with validation rules — enforces required fields, max lengths, and email format on employee data',
      template: '{{employee_id}}{{full_name}}{{department}}{{salary}}{{status}}',
      configurationJson: JSON.parse(JSON.stringify({
        mappings: [
          { destinationField: 'employee_id', sourceField: 'employee_id' },
          { destinationField: 'full_name', expression: 'concat({{first_name}}, \' \', {{last_name}})' },
          { destinationField: 'department', sourceField: 'department' },
          { destinationField: 'salary', sourceField: 'salary' },
          { destinationField: 'status', sourceField: 'status' },
          { destinationField: 'email', sourceField: 'email' },
          { destinationField: 'phone', sourceField: 'phone' },
          { destinationField: 'location', sourceField: 'location' },
          { destinationField: 'performance_rating', sourceField: 'performance_rating' },
        ],
        outputOptions: {
          format: 'fixedWidth',
          fixedWidthConfig: [
            { field: 'employee_id', width: 10, align: 'left', padChar: ' ' },
            { field: 'full_name', width: 25, align: 'left', padChar: ' ' },
            { field: 'department', width: 20, align: 'left', padChar: ' ' },
            { field: 'salary', width: 12, align: 'right', padChar: ' ' },
            { field: 'status', width: 10, align: 'left', padChar: ' ' },
          ],
        },
        validationRules: [
          { field: 'email', type: 'required' },
          { field: 'email', type: 'email' },
          { field: 'employee_id', type: 'required' },
          { field: 'full_name', type: 'maxLength', value: '50' },
          { field: 'salary', type: 'number' },
          { field: 'status', type: 'enum', value: 'Active,Inactive,Leave,Terminated' },
        ],
      })) as Prisma.InputJsonValue,
      version: 1,
      createdById: demoUser.id,
    },
  });
  console.log('  Created profile: Fixed-Width Employee Export');

  // ───────────────────────────────────────────
  // PROFILE 5: HL7 Healthcare Export
  // ───────────────────────────────────────────
  const hl7Profile = await prisma.mappingProfile.create({
    data: {
      name: 'HL7 Patient Export',
      description: 'HL7 v2.3 format for healthcare data interchange with PID and NK1 segments',
      template: 'MSH|^~\\&|DATAMAPPER|HOSPITAL|RECEIVER|FACILITY|{{timestamp}}||ADT^A04|{{message_id}}|P|2.3\rPID|1|{{mrn}}||{{last_name}}^{{first_name}}||{{dob}}|{{gender}}||{{blood_type}}|{{address_line}}||{{phone}}|{{email}}\rNK1|1|{{emergency_contact}}|SPO|{{emergency_phone}}\rOBX|1|TX|SMOKING||{{smoking_status}}',
      configurationJson: JSON.parse(JSON.stringify({
        mappings: [
          { destinationField: 'message_id', expression: 'concat(\'MSG-\', {{mrn}})' },
          { destinationField: 'timestamp', expression: 'now()' },
          { destinationField: 'mrn', sourceField: 'mrn' },
          { destinationField: 'last_name', sourceField: 'last_name', transformation: 'upper' },
          { destinationField: 'first_name', sourceField: 'first_name', transformation: 'upper' },
          { destinationField: 'dob', sourceField: 'dob', transformation: 'formatDate(yyyyMMdd)' },
          { destinationField: 'gender', sourceField: 'gender' },
          { destinationField: 'blood_type', sourceField: 'blood_type' },
          { destinationField: 'address_line', expression: '{{address}}^^{{city}}^{{state}}^{{zip}}' },
          { destinationField: 'phone', sourceField: 'phone' },
          { destinationField: 'email', sourceField: 'email', transformation: 'lower' },
          { destinationField: 'emergency_contact', sourceField: 'emergency_contact' },
          { destinationField: 'emergency_phone', sourceField: 'emergency_phone' },
          { destinationField: 'smoking_status', sourceField: 'smoking_status' },
          { destinationField: 'diagnosis', sourceField: 'diagnosis' },
          { destinationField: 'medication', sourceField: 'medication' },
          { destinationField: 'allergies', sourceField: 'allergies' },
          { destinationField: 'provider', sourceField: 'provider' },
        ],
        outputOptions: { format: 'hl7' },
      })) as Prisma.InputJsonValue,
      version: 1,
      createdById: adminUser.id,
    },
  });
  console.log('  Created profile: HL7 Patient Export');

  // ───────────────────────────────────────────
  // PROFILE 6: JSON Pretty with Expressions
  // ───────────────────────────────────────────
  const jsonProfile = await prisma.mappingProfile.create({
    data: {
      name: 'Financial JSON Report',
      description: 'Pretty-printed JSON output with computed fields (net amount, account category), constants, and coalesce on transaction data',
      template: '{"transaction":"{{transaction_id}}","date":"{{date}}","description":"{{description}}","debit":{{debit}},"credit":{{credit}},"net":{{net_amount}},"account":"{{account_number}}","category":"{{category_label}}","vendor":"{{vendor_name}}","status":"{{status}}","source":"{{data_source}}"}',
      configurationJson: JSON.parse(JSON.stringify({
        mappings: [
          { destinationField: 'transaction_id', sourceField: 'transaction_id' },
          { destinationField: 'date', sourceField: 'date', transformation: 'formatDate(yyyy-MM-dd)' },
          { destinationField: 'description', sourceField: 'description', transformation: 'trim' },
          { destinationField: 'debit', sourceField: 'debit' },
          { destinationField: 'credit', sourceField: 'credit' },
          { destinationField: 'net_amount', expression: '{{credit}} - {{debit}}' },
          { destinationField: 'account_number', sourceField: 'account' },
          { destinationField: 'category_label', expression: 'case({{category}}, \'COGS\', \'Cost of Goods\', \'Revenue\', \'Income\', \'Supplies\', \'Operating Expense\', \'Payroll\', \'Personnel\', \'Rent\', \'Facilities\', \'Travel\', \'Business Travel\', \'Marketing\', \'Advertising\', \'Utilities\', \'Utilities\', \'Contractors\', \'Contract Services\', \'Benefits\', \'Employee Benefits\', \'Taxes\', \'Tax Payments\', \'Other\')' },
          { destinationField: 'vendor_name', expression: 'coalesce({{vendor}}, \'Internal\')' },
          { destinationField: 'status', sourceField: 'status' },
          { destinationField: 'data_source', constant: 'DataMapper Pro Financial Import' },
          { destinationField: 'notes', sourceField: 'notes' },
          { destinationField: 'formatted_note', expression: 'if({{notes}}, {{notes}}, \'No notes\')' },
        ],
        outputOptions: { format: 'json', pretty: true },
      })) as Prisma.InputJsonValue,
      version: 1,
      createdById: adminUser.id,
    },
  });
  console.log('  Created profile: Financial JSON Report');

  // ───────────────────────────────────────────
  // PROFILE 7: Tab-Delimited + Constants
  // ───────────────────────────────────────────
  const tabProfile = await prisma.mappingProfile.create({
    data: {
      name: 'Orders Tab-Delimited',
      description: 'Tab-separated output with constant values, expressions, and concatenation on order data',
      template: '{{order_id}}\t{{customer}}\t{{product}}\t{{category}}\t{{unit_price}}\t{{quantity}}\t{{total}}\t{{status}}\t{{shipping}}\t{{notes}}',
      configurationJson: JSON.parse(JSON.stringify({
        mappings: [
          { destinationField: 'order_id', sourceField: 'order_id' },
          { destinationField: 'customer', expression: 'upper(concat({{customer_name}}, \' <\', {{customer_email}}, \'>\'))' },
          { destinationField: 'product', sourceField: 'product_name' },
          { destinationField: 'category', sourceField: 'category' },
          { destinationField: 'unit_price', sourceField: 'unit_price' },
          { destinationField: 'quantity', sourceField: 'quantity' },
          { destinationField: 'total', expression: '{{quantity}} * {{unit_price}}' },
          { destinationField: 'status', sourceField: 'status' },
          { destinationField: 'shipping', sourceField: 'shipping_method' },
          { destinationField: 'order_date', sourceField: 'order_date' },
          { destinationField: 'source_system', constant: 'DataMapper Pro' },
          { destinationField: 'export_version', constant: '2.1.0' },
          { destinationField: 'notes', expression: 'coalesce({{notes}}, {{shipping_method}}, \'Standard delivery\')' },
        ],
        outputOptions: { format: 'tab', includeHeader: true },
      })) as Prisma.InputJsonValue,
      version: 1,
      createdById: demoUser.id,
    },
  });
  console.log('  Created profile: Orders Tab-Delimited');

  // ───────────────────────────────────────────
  // PROFILE 8: Pipe-Delimited Patient Summary
  // ───────────────────────────────────────────
  const pipeProfile = await prisma.mappingProfile.create({
    data: {
      name: 'Patient Summary (Pipe-Delimited)',
      description: 'Pipe-delimited text output with string transformations for a compact patient summary report',
      template: '{{mrn}}|{{name}}|{{dob}}|{{age_group}}|{{diagnosis}}|{{medication}}|{{allergies}}|{{bmi}}|{{blood_type}}|{{contact}}|{{insurance_name}}|{{provider_initials}}',
      configurationJson: JSON.parse(JSON.stringify({
        mappings: [
          { destinationField: 'mrn', sourceField: 'mrn' },
          { destinationField: 'name', expression: 'concat(upper({{last_name}}), \', \', {{first_name}})' },
          { destinationField: 'dob', sourceField: 'dob', transformation: 'formatDate(MM/dd/yyyy)' },
          { destinationField: 'age_group', expression: 'if({{weight_kg}} > 80, \'Adult\', \'Standard\')' },
          { destinationField: 'diagnosis', sourceField: 'diagnosis', transformation: 'substring(0,20)' },
          { destinationField: 'medication', sourceField: 'medication' },
          { destinationField: 'allergies', expression: 'coalesce({{allergies}}, \'None recorded\')' },
          { destinationField: 'bmi', expression: 'round({{weight_kg}} / ({{height_cm}} / 100 * {{height_cm}} / 100), 1)' },
          { destinationField: 'blood_type', sourceField: 'blood_type' },
          { destinationField: 'contact', expression: 'coalesce({{phone}}, {{email}}, \'No contact\')' },
          { destinationField: 'insurance_name', expression: 'switch({{insurance}}, {"BlueCross":"BlueCross BlueShield","Kaiser":"Kaiser Permanente","Aetna":"Aetna Inc.","Cigna":"Cigna Corp","UnitedHealth":"UnitedHealth Group","Medicare":"Medicare"}, \'Self-Pay\')' },
          { destinationField: 'provider_initials', sourceField: 'provider', transformation: 'substring(4,5)' },
          { destinationField: 'smoking_status', sourceField: 'smoking_status' },
          { destinationField: 'city_state', expression: 'concat({{city}}, \', \', {{state}})' },
        ],
        outputOptions: { format: 'pipe', includeHeader: true },
      })) as Prisma.InputJsonValue,
      version: 1,
      createdById: demoUser.id,
    },
  });
  console.log('  Created profile: Patient Summary (Pipe-Delimited)');

  // ───────────────────────────────────────────
  // JOBS — Spread across multiple days for dashboard charts
  // ───────────────────────────────────────────
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);

  // Job 1: All Functions — COMPLETED
  await prisma.processingJob.create({
    data: {
      status: 'COMPLETED',
      startedAt: daysAgo(1),
      completedAt: hoursAgo(22),
      totalRows: 25,
      processedRows: 25,
      failedRows: 0,
      errorLog: Prisma.JsonNull,
      config: JSON.parse(JSON.stringify({ outputOptions: { format: 'csv', delimiter: '|', includeHeader: false } })) as Prisma.InputJsonValue,
      outputFormat: 'csv',
      outputFile: 'output-all-functions.csv',
      uploadedFileId: patientsFile.id,
      profileId: allFunctionsProfile.id,
      createdById: adminUser.id,
    },
  });
  console.log('  Created job: COMPLETED (All 16 Transformation Functions)');

  // Job 2: Complex Template — COMPLETED
  await prisma.processingJob.create({
    data: {
      status: 'COMPLETED',
      startedAt: daysAgo(2),
      completedAt: daysAgo(2),
      totalRows: 25,
      processedRows: 25,
      failedRows: 0,
      errorLog: Prisma.JsonNull,
      config: JSON.parse(JSON.stringify({ outputOptions: { format: 'xml', rootElement: 'orders', itemElement: 'order' } })) as Prisma.InputJsonValue,
      outputFormat: 'xml',
      outputFile: 'output-complex-template.xml',
      uploadedFileId: ordersFile.id,
      profileId: complexTemplateProfile.id,
      createdById: adminUser.id,
    },
  });
  console.log('  Created job: COMPLETED (Complex Template Engine)');

  // Job 3: Conditional Mapping — FAILED
  await prisma.processingJob.create({
    data: {
      status: 'FAILED',
      startedAt: daysAgo(1),
      completedAt: hoursAgo(20),
      totalRows: 30,
      processedRows: 18,
      failedRows: 3,
      errorLog: JSON.parse(JSON.stringify([
        { row: 6, errors: ['Email validation failed: diana.martinez@example.com'], fieldErrors: { email: 'Invalid email format' } },
        { row: 19, errors: ['Status validation failed: Leave'], fieldErrors: { status: 'Value not in allowed list' } },
        { row: 24, errors: ['Salary validation failed'], fieldErrors: { salary: 'Expected number, got null' } },
      ])) as Prisma.InputJsonValue,
      config: JSON.parse(JSON.stringify({ outputOptions: { format: 'csv', delimiter: ',', includeHeader: true } })) as Prisma.InputJsonValue,
      outputFormat: 'csv',
      outputFile: null,
      uploadedFileId: employeesFile.id,
      profileId: conditionalProfile.id,
      createdById: adminUser.id,
    },
  });
  console.log('  Created job: FAILED (Conditional Mapping & Logic)');

  // Job 4: HL7 — PROCESSING
  await prisma.processingJob.create({
    data: {
      status: 'PROCESSING',
      startedAt: hoursAgo(2),
      completedAt: null,
      totalRows: 25,
      processedRows: 10,
      failedRows: 1,
      errorLog: JSON.parse(JSON.stringify([
        { row: 3, errors: ['Missing required field: emergency_contact'], fieldErrors: { emergency_contact: 'Field is required' } },
      ])) as Prisma.InputJsonValue,
      config: JSON.parse(JSON.stringify({ outputOptions: { format: 'hl7' } })) as Prisma.InputJsonValue,
      outputFormat: 'hl7',
      outputFile: null,
      uploadedFileId: patientsFile.id,
      profileId: hl7Profile.id,
      createdById: adminUser.id,
    },
  });
  console.log('  Created job: PROCESSING (HL7 Patient Export)');

  // Job 5: JSON — COMPLETED
  await prisma.processingJob.create({
    data: {
      status: 'COMPLETED',
      startedAt: daysAgo(3),
      completedAt: daysAgo(3),
      totalRows: 20,
      processedRows: 20,
      failedRows: 0,
      errorLog: Prisma.JsonNull,
      config: JSON.parse(JSON.stringify({ outputOptions: { format: 'json', pretty: true } })) as Prisma.InputJsonValue,
      outputFormat: 'json',
      outputFile: 'output-financial-report.json',
      uploadedFileId: financialFile.id,
      profileId: jsonProfile.id,
      createdById: adminUser.id,
    },
  });
  console.log('  Created job: COMPLETED (Financial JSON Report)');

  // Job 6: Fixed-Width — PENDING
  await prisma.processingJob.create({
    data: {
      status: 'PENDING',
      startedAt: null,
      completedAt: null,
      totalRows: 30,
      processedRows: 0,
      failedRows: 0,
      errorLog: Prisma.JsonNull,
      config: JSON.parse(JSON.stringify({
        outputOptions: {
          format: 'fixedWidth',
          fixedWidthConfig: [
            { field: 'employee_id', width: 10, align: 'left', padChar: ' ' },
            { field: 'full_name', width: 25, align: 'left', padChar: ' ' },
            { field: 'department', width: 20, align: 'left', padChar: ' ' },
            { field: 'salary', width: 12, align: 'right', padChar: ' ' },
            { field: 'status', width: 10, align: 'left', padChar: ' ' },
          ],
        },
      })) as Prisma.InputJsonValue,
      outputFormat: 'fixedWidth',
      outputFile: null,
      uploadedFileId: employeesFile.id,
      profileId: fixedWidthProfile.id,
      createdById: demoUser.id,
    },
  });
  console.log('  Created job: PENDING (Fixed-Width Employee Export)');

  // Job 7: Tab — COMPLETED (older, for dashboard history)
  await prisma.processingJob.create({
    data: {
      status: 'COMPLETED',
      startedAt: daysAgo(5),
      completedAt: daysAgo(5),
      totalRows: 25,
      processedRows: 25,
      failedRows: 0,
      errorLog: Prisma.JsonNull,
      config: JSON.parse(JSON.stringify({ outputOptions: { format: 'tab', includeHeader: true } })) as Prisma.InputJsonValue,
      outputFormat: 'tab',
      outputFile: 'output-orders-tab.tsv',
      uploadedFileId: ordersFile.id,
      profileId: tabProfile.id,
      createdById: demoUser.id,
    },
  });
  console.log('  Created job: COMPLETED (Orders Tab-Delimited)');

  // Job 8: Pipe — COMPLETED (oldest, for chart)
  await prisma.processingJob.create({
    data: {
      status: 'COMPLETED',
      startedAt: daysAgo(7),
      completedAt: daysAgo(7),
      totalRows: 25,
      processedRows: 25,
      failedRows: 0,
      errorLog: Prisma.JsonNull,
      config: JSON.parse(JSON.stringify({ outputOptions: { format: 'pipe', includeHeader: true } })) as Prisma.InputJsonValue,
      outputFormat: 'pipe',
      outputFile: 'output-patient-summary.txt',
      uploadedFileId: patientsFile.id,
      profileId: pipeProfile.id,
      createdById: demoUser.id,
    },
  });
  console.log('  Created job: COMPLETED (Patient Summary Pipe-Delimited)');

  // Additional jobs for more dashboard chart data
  for (let i = 0; i < 5; i++) {
    await prisma.processingJob.create({
      data: {
        status: 'COMPLETED',
        startedAt: daysAgo(10 + i),
        completedAt: daysAgo(10 + i),
        totalRows: 25,
        processedRows: 25,
        failedRows: 0,
        errorLog: Prisma.JsonNull,
        config: JSON.parse(JSON.stringify({ outputOptions: { format: 'csv', delimiter: ',', includeHeader: true } })) as Prisma.InputJsonValue,
        outputFormat: 'csv',
        outputFile: `output-historical-job-${i}.csv`,
        uploadedFileId: patientsFile.id,
        profileId: allFunctionsProfile.id,
        createdById: adminUser.id,
      },
    });
  }
  console.log('  Created 5 historical COMPLETED jobs (dashboard chart data)');

  console.log('');
  console.log('══════════════════════════════════════');
  console.log('  Seed completed successfully!');
  console.log('══════════════════════════════════════');
  console.log('');
  console.log('Users:');
  console.log('  admin@datamapperpro.com / admin123');
  console.log('  demo@datamapperpro.com  / admin123');
  console.log('');
  console.log('Uploaded files:');
  console.log('  Patient Records.csv        - 25 rows, 24 cols');
  console.log('  Employee Directory.csv     - 30 rows, 16 cols');
  console.log('  Order History.csv          - 25 rows, 17 cols');
  console.log('  Financial Transactions.csv - 20 rows, 10 cols');
  console.log('');
  console.log('Mapping profiles (8):');
  console.log('  1. All 16 Transformation Functions      | CSV pipe | patients');
  console.log('  2. Complex Template Engine              | XML     | orders');
  console.log('  3. Conditional Mapping & Logic          | CSV     | employees');
  console.log('  4. Fixed-Width Employee Export          | fixedW  | employees');
  console.log('  5. HL7 Patient Export                   | HL7     | patients');
  console.log('  6. Financial JSON Report                | JSON    | financial');
  console.log('  7. Orders Tab-Delimited                 | TSV     | orders');
  console.log('  8. Patient Summary (Pipe-Delimited)     | pipe    | patients');
  console.log('');
  console.log('Processing jobs (13 total):');
  console.log('  8 COMPLETED  - various profiles / formats / dates');
  console.log('  1 FAILED     - Conditional Mapping (3 row errors)');
  console.log('  1 PROCESSING - HL7 Export (10/25 done)');
  console.log('  1 PENDING    - Fixed-Width Export');
  console.log('  5 dashboard historical jobs');
  console.log('');
  console.log('Features demonstrated:');
  console.log('  Transforms: trim, upper, lower, substring, replace, padStart, padEnd,');
  console.log('              concat, formatDate, parseDate, round, formatNumber,');
  console.log('              parseInt, parseFloat, coalesce, if, case, switch');
  console.log('  Output formats: CSV, JSON, XML, fixed-width, HL7, pipe, tab');
  console.log('  Template: #if, #else, expressions, constants');
  console.log('  Conditions: equals, notEquals, conditions on mappings');
  console.log('  Validation: required, email, maxLength, number, enum');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
