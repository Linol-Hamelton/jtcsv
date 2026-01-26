"const { spawn } = require('child_process');
const cmd = spawn('node', ['bin/jtcsv.js', 'json-to-csv', 'test-good.json', 'test-rename.csv', '--rename={\"id\":\"ID\",\"name\":\"FullName\"}']);
cmd.stdout.on('data', (data) => console.log(data.toString()));
cmd.stderr.on('data', (data) => console.error(data.toString()));
cmd.on('close', (code) => console.log('Exit code:', code));"