import { describe, test, expect } from '@jest/globals';
import { csvToJson } from '../index';

describe('CSV repair', () => {
  test('repairs shifted rows with trailing empty fields', () => {
    const csv = `name,phoneNumber,email,address,userAgent,hexcolor
"""Dr. Stephon Bartell III""",518-645-1743,srempel@medhurst.org,"""754 Schiller Skyway",,
Wolfshire,"AK 42653-8922""","""Opera/8.17""",#941f24,,
`;

    const rows = csvToJson(csv, {
      delimiter: ',',
      hasHeaders: true,
      repairRowShifts: true,
      normalizeQuotes: true
    });

    expect(rows[0]).toEqual({
      name: 'Dr. Stephon Bartell III',
      phoneNumber: '518-645-1743',
      email: 'srempel@medhurst.org',
      address: '754 Schiller Skyway\nWolfshire\nAK 42653-8922',
      userAgent: 'Opera/8.17',
      hexcolor: '#941f24'
    });
  });

  test('merges userAgent continuation rows and normalizes quotes', () => {
    const csv = `name,phoneNumber,email,address,userAgent,hexcolor
"""John""",123,john@example.com,"""Street 1""",,
City,"""ST 12345""""""","""Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML""","""like Gecko) Chrome/120.0 Safari/537.36""""""",#123abc,
`;

    const rows = csvToJson(csv, {
      delimiter: ',',
      hasHeaders: true,
      repairRowShifts: true,
      normalizeQuotes: true
    });

    expect(rows[0]).toEqual({
      name: 'John',
      phoneNumber: '123',
      email: 'john@example.com',
      address: 'Street 1\nCity\nST 12345',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML,like Gecko) Chrome/120.0 Safari/537.36',
      hexcolor: '#123abc'
    });
  });

  test('cleans phone numbers with extra quotes and escapes', () => {
    const csv = `name,phoneNumber,email,address,userAgent,hexcolor
"Jane","'\"+1 (579) 690-8383\"",jane@example.com,"Street 1",,`;

    const rows = csvToJson(csv, {
      delimiter: ',',
      hasHeaders: true,
      repairRowShifts: true,
      normalizeQuotes: true
    });

    expect(rows[0]).toEqual({
      name: 'Jane',
      phoneNumber: '+1 (579) 690-8383',
      email: 'jane@example.com',
      address: 'Street 1',
      userAgent: null,
      hexcolor: null
    });
  });
});
