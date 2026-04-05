import http from 'http';

function testChat(msg) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ messages: [{ role: 'user', content: msg }] });
    const req = http.request({
      hostname: 'localhost', port: 3000, path: '/api/chat', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let fullBody = '';
      res.on('data', (chunk) => { fullBody += chunk.toString(); });
      res.on('end', () => {
        // Extract text content
        const textParts = [];
        for (const line of fullBody.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6));
              if (d.content) textParts.push(d.content);
            } catch {}
          }
        }
        resolve(textParts.join(''));
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const msg = "Je suis autoconstructeur et je planifie la construction d'un garage double 24×28. J'ai besoin d'une estimation complète des matériaux.";
console.log(`\n📤 Testing: ${msg}\n`);
console.log('Waiting for response...\n');

const response = await testChat(msg);
console.log('=== LLM RESPONSE ===');
console.log(response);
console.log('\n=== END ===');

// Check for recalculation patterns
const badPatterns = [
  /\d+\s*÷\s*1\.33\s*[=≈]/,
  /périmètre\s*÷/i,
  /\d+\s*×\s*8\s*pi/,
  /84\s*pi/,
];
let issues = 0;
for (const pat of badPatterns) {
  if (pat.test(response)) {
    console.log(`⚠️  Found recalculation pattern: ${pat}`);
    issues++;
  }
}
if (issues === 0) console.log('✅ No manual recalculation detected');

// Check that BOM quantities appear
const expected = { '95': 'colombages', '53': 'contreplaqué', '25': 'bardeaux' };
for (const [qty, name] of Object.entries(expected)) {
  if (response.includes(qty)) {
    console.log(`✅ Found ${qty} (${name})`);
  } else {
    console.log(`❌ Missing ${qty} (${name})`);
  }
}
