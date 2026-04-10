const path = require('path');
const argsPath = '/sandbox/README.md';

const physicalPath = path.join(process.cwd(), 'sandbox', argsPath.slice('/sandbox/'.length));
console.log('physicalPath for /sandbox/README.md:', physicalPath);

const cwd = process.cwd();
console.log('process.cwd():', cwd);
