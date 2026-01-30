/**
 * Advanced Example: Conditional Field Transformations
 * 
 * Demonstrates how to use jtcsv for complex data transformations
 * with conditional logic, field validation, and custom formatting.
 */

const { csvToJson, jsonToCsv, createCsvToJsonStream } = require('../../index.js');
const fs = require('fs');
const { pipeline } = require('stream/promises');

/**
 * Example 1: Conditional Transformation with Business Logic
 * 
 * Scenario: Process sales data with different tax rates based on region
 * and apply discounts for bulk purchases.
 */
async function exampleConditionalTransformation() {
  console.log('=== Example 1: Conditional Transformation ===\n');
  
  const salesCsv = `order_id,customer_id,region,product,quantity,unit_price,tax_rate
ORD001,CUST001,US,Widget A,10,25.99,0.08
ORD002,CUST002,EU,Widget B,5,49.99,0.21
ORD003,CUST003,US,Widget C,100,12.50,0.08
ORD004,CUST004,ASIA,Widget D,25,89.99,0.10
ORD005,CUST005,EU,Widget E,2,199.99,0.21`;

  const transformedData = csvToJson(salesCsv, {
    hasHeaders: true,
    parseNumbers: true,
    transform: (row) => {
      // Calculate subtotal
      const subtotal = row.quantity * row.unit_price;
      
      // Apply bulk discount (10% for 50+ units)
      let discountRate = 0;
      if (row.quantity >= 50) {
        discountRate = 0.10;
      } else if (row.quantity >= 20) {
        discountRate = 0.05;
      }
      
      const discountAmount = subtotal * discountRate;
      const discountedSubtotal = subtotal - discountAmount;
      
      // Calculate tax based on region
      let taxAmount = discountedSubtotal * row.tax_rate;
      
      // Special tax rules for specific regions
      if (row.region === 'EU' && discountedSubtotal > 1000) {
        taxAmount *= 0.9; // 10% tax reduction for large EU orders
      }
      
      const total = discountedSubtotal + taxAmount;
      
      // Add derived fields
      return {
        ...row,
        subtotal: Math.round(subtotal * 100) / 100,
        discount_rate: discountRate,
        discount_amount: Math.round(discountAmount * 100) / 100,
        discounted_subtotal: Math.round(discountedSubtotal * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        currency: row.region === 'EU' ? 'EUR' : 'USD',
        processed_at: new Date().toISOString(),
        
        // Add business logic flags
        is_bulk_order: row.quantity >= 20,
        requires_vat_certificate: row.region === 'EU' && total > 1000,
        is_export: row.region !== 'US'
      };
    }
  });

  console.log('Transformed Sales Data:');
  transformedData.forEach((order, index) => {
    console.log(`\nOrder ${index + 1}:`);
    console.log(`  ID: ${order.order_id}, Region: ${order.region}`);
    console.log(`  Product: ${order.product}, Quantity: ${order.quantity}`);
    console.log(`  Subtotal: ${order.currency} ${order.subtotal}`);
    console.log(`  Discount: ${order.currency} ${order.discount_amount} (${order.discount_rate * 100}%)`);
    console.log(`  Tax: ${order.currency} ${order.tax_amount}`);
    console.log(`  Total: ${order.currency} ${order.total}`);
    console.log(`  Flags: Bulk: ${order.is_bulk_order}, VAT Cert: ${order.requires_vat_certificate}, Export: ${order.is_export}`);
  });

  // Convert back to CSV with selected columns
  const outputCsv = jsonToCsv(transformedData, {
    template: {
      order_id: '',
      region: '',
      product: '',
      quantity: '',
      subtotal: '',
      discount_amount: '',
      tax_amount: '',
      total: '',
      currency: '',
      is_bulk_order: '',
      requires_vat_certificate: ''
    }
  });

  console.log('\nGenerated CSV for accounting system:');
  console.log(outputCsv);
}

/**
 * Example 2: Streaming with Real-time Validation
 * 
 * Scenario: Process large log files with validation and error handling
 */
async function exampleStreamingValidation() {
  console.log('\n\n=== Example 2: Streaming with Validation ===\n');
  
  // Simulate log data
  const logData = `timestamp,user_id,action,resource,status_code,response_time
2024-01-15T10:30:00Z,user123,GET,/api/users,200,145
2024-01-15T10:31:00Z,user456,POST,/api/orders,201,230
2024-01-15T10:32:00Z,user789,GET,/api/products,404,89
2024-01-15T10:33:00Z,user123,DELETE,/api/users/456,403,312
2024-01-15T10:34:00Z,user999,GET,/api/health,200,45
2024-01-15T10:35:00Z,user123,PUT,/api/orders/789,200,567`;

  const errorLog = [];
  const stats = {
    total: 0,
    success: 0,
    errors: 0,
    slowRequests: 0
  };

  const transformStream = createCsvToJsonStream({
    hasHeaders: true,
    parseNumbers: true,
    onError: (error, row, rowNumber) => {
      stats.errors++;
      errorLog.push({
        rowNumber,
        row,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return null; // Skip this row
    },
    validate: (row) => {
      // Validate required fields
      if (!row.timestamp || !row.user_id || !row.action) {
        throw new Error('Missing required fields');
      }
      
      // Validate timestamp format
      if (isNaN(new Date(row.timestamp).getTime())) {
        throw new Error('Invalid timestamp format');
      }
      
      // Validate status code
      if (row.status_code < 100 || row.status_code > 599) {
        throw new Error('Invalid HTTP status code');
      }
      
      // Validate response time
      if (row.response_time < 0 || row.response_time > 10000) {
        throw new Error('Invalid response time');
      }
      
      return true;
    },
    transform: (row) => {
      stats.total++;
      
      // Add derived fields
      const processedRow = {
        ...row,
        is_success: row.status_code >= 200 && row.status_code < 300,
        is_error: row.status_code >= 400,
        is_slow: row.response_time > 500,
        processing_timestamp: new Date().toISOString()
      };
      
      if (processedRow.is_success) {
        stats.success++;
      }
      if (processedRow.is_slow) {
        stats.slowRequests++;
      }
      
      return processedRow;
    }
  });

  // Process the data
  const { Readable, Writable } = require('stream');
  const readable = Readable.from([logData]);
  const results = [];

  const collector = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      results.push(chunk);
      callback();
    }
  });

  await pipeline(readable, transformStream, collector);

  console.log('Processing Statistics:');
  console.log(`  Total rows: ${stats.total}`);
  console.log(`  Successful: ${stats.success}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Slow requests (>500ms): ${stats.slowRequests}`);

  if (errorLog.length > 0) {
    console.log('\nError Log:');
    errorLog.forEach(error => {
      console.log(`  Row ${error.rowNumber}: ${error.error}`);
    });
  }

  console.log('\nSample Processed Rows:');
  results.slice(0, 3).forEach((row, index) => {
    console.log(`  ${index + 1}. ${row.user_id} - ${row.action} ${row.resource} - ${row.status_code} (${row.response_time}ms)`);
    console.log(`     Success: ${row.is_success}, Error: ${row.is_error}, Slow: ${row.is_slow}`);
  });
}

/**
 * Example 3: Database Export/Import Workflow
 * 
 * Scenario: Export data from database, transform, and import to another system
 */
async function exampleDatabaseWorkflow() {
  console.log('\n\n=== Example 3: Database Export/Import Workflow ===\n');
  
  // Simulate database export (in real scenario, this would come from PostgreSQL/MongoDB)
  const databaseData = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      department: 'Engineering',
      salary: 85000,
      hire_date: '2020-03-15',
      active: true
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      department: 'Marketing',
      salary: 72000,
      hire_date: '2021-07-22',
      active: true
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob@example.com',
      department: 'Sales',
      salary: 68000,
      hire_date: '2019-11-30',
      active: false
    }
  ];

  // Step 1: Export to CSV for HR system
  console.log('Step 1: Exporting to HR System CSV');
  const hrCsv = jsonToCsv(databaseData, {
    renameMap: {
      id: 'Employee_ID',
      name: 'Full_Name',
      email: 'Email_Address',
      department: 'Department',
      salary: 'Annual_Salary',
      hire_date: 'Hire_Date',
      active: 'Employment_Status'
    },
    transform: (row) => ({
      ...row,
      Employment_Status: row.active ? 'ACTIVE' : 'INACTIVE',
      Annual_Salary: `$${row.salary.toLocaleString()}`,
      Export_Date: new Date().toISOString().split('T')[0]
    })
  });

  console.log('HR System CSV:');
  console.log(hrCsv);

  // Step 2: Transform for payroll system (different format)
  console.log('\nStep 2: Transforming for Payroll System');
  const payrollData = databaseData
    .filter(employee => employee.active)
    .map(employee => ({
      employee_id: `EMP${employee.id.toString().padStart(4, '0')}`,
      employee_name: employee.name.toUpperCase(),
      department_code: employee.department.substring(0, 3).toUpperCase(),
      monthly_salary: Math.round(employee.salary / 12),
      tax_id: `TAX${employee.id.toString().padStart(6, '0')}`,
      payment_method: 'DIRECT_DEPOSIT',
      bank_account: `****${employee.id.toString().padStart(4, '0')}`
    }));

  const payrollCsv = jsonToCsv(payrollData, {
    delimiter: '|', // Payroll system uses pipe delimiter
    rfc4180Compliant: true
  });

  console.log('Payroll System CSV (pipe-delimited):');
  console.log(payrollCsv);

  // Step 3: Import transformed data (simulate reading CSV back)
  console.log('\nStep 3: Importing Transformed Data');
  const importedData = csvToJson(payrollCsv, {
    delimiter: '|',
    hasHeaders: true,
    parseNumbers: true
  });

  console.log('Imported Payroll Data:');
  importedData.forEach(employee => {
    console.log(`  ${employee.employee_id}: ${employee.employee_name} - ${employee.department_code} - $${employee.monthly_salary}/month`);
  });
}

/**
 * Example 4: API Stream Handling with Error Recovery
 * 
 * Scenario: Process streaming API responses with retry logic
 */
async function exampleApiStreamHandling() {
  console.log('\n\n=== Example 4: API Stream Handling ===\n');
  
  // Simulate API response stream
  const apiResponses = [
    'id,name,age,city\n1,Alice,30,New York\n2,Bob,25,Los Angeles\n3,Charlie,35,Chicago',
    'id,name,age,city\n4,Diana,28,Miami\n5,Eve,32,Seattle\n6,Frank,40,Boston',
    'id,name,age,city\n7,Grace,29,Denver\n8,Henry,31,Atlanta\n9,Ivy,27,Portland'
  ];

  const processedChunks = [];
  let chunkCount = 0;

  // Simulate processing each API response chunk
  for (const chunk of apiResponses) {
    chunkCount++;
    
    try {
      console.log(`Processing API chunk ${chunkCount}...`);
      
      const data = csvToJson(chunk, {
        hasHeaders: true,
        parseNumbers: true,
        onError: (error, row, rowNumber) => {
          console.warn(`  Warning in chunk ${chunkCount}, row ${rowNumber}: ${error.message}`);
          // In real scenario, you might log to monitoring system
          return null; // Skip problematic row
        },
        transform: (row) => {
          // Add metadata
          return {
            ...row,
            processed_chunk: chunkCount,
            processing_timestamp: new Date().toISOString(),
            data_source: 'api_stream'
          };
        }
      });
      
      processedChunks.push(...data);
      console.log(`  Successfully processed ${data.length} rows`);
      
    } catch (error) {
      console.error(`  Error processing chunk ${chunkCount}: ${error.message}`);
      // In real scenario, implement retry logic here
      console.log('  Implementing retry logic...');
      
      // Simulate retry
      try {
        const retryData = csvToJson(chunk, {
          hasHeaders: true,
          parseNumbers: false, // Try without number parsing
          transform: (row) => ({
            ...row,
            age: parseInt(row.age, 10) || 0, // Manual parsing
            processed_chunk: chunkCount,
            processing_timestamp: new Date().toISOString(),
            data_source: 'api_stream_retry',
            had_error: true
          })
        });
        
        processedChunks.push(...retryData);
        console.log(`  Retry successful: processed ${retryData.length} rows`);
      } catch (retryError) {
        console.error(`  Retry failed: ${retryError.message}`);
      }
    }
  }

  console.log('\nAPI Stream Processing Summary:');
  console.log(`  Total chunks: ${chunkCount}`);
  console.log(`  Total rows processed: ${processedChunks.length}`);
  
  // Aggregate data
  const averageAge = processedChunks.reduce((sum, row) => sum + row.age, 0) / processedChunks.length;
  const cities = [...new Set(processedChunks.map(row => row.city))];
  
  console.log(`  Average age: ${averageAge.toFixed(1)}`);
  console.log(`  Unique cities: ${cities.join(', ')}`);
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('='.repeat(80));
  console.log('ADVANCED JTCSV EXAMPLES');
  console.log('='.repeat(80));
  
  try {
    await exampleConditionalTransformation();
    await exampleStreamingValidation();
    await exampleDatabaseWorkflow();
    await exampleApiStreamHandling();
    
    console.log('\n' + '='.repeat(80));
    console.log('ALL EXAMPLES COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\nError running examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  exampleConditionalTransformation,
  exampleStreamingValidation,
  exampleDatabaseWorkflow,
  exampleApiStreamHandling
};