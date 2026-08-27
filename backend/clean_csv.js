const fs = require('fs');
const { parse } = require('csv-parse/sync');

const data = fs.readFileSync('../raw.csv', 'utf8');
const records = parse(data, { columns: true });
const lines = ['companyName,email,phoneNumber,contactPerson'];

records.forEach(r => {
  const escapeCsv = (str) => {
    if (str === '-') return '';
    if (str.includes(',') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const cName = escapeCsv(r['Company Name'] || '');
  const email = escapeCsv(r['Email'] || '');
  const phone = escapeCsv(r['Phone No'] || '');
  const person = escapeCsv(r['Name'] || '');

  lines.push(`${cName},${email},${phone},${person}`);
});

fs.writeFileSync('../sponsors_ready.csv', lines.join('\n'));
console.log('Cleaned ' + records.length + ' records');
