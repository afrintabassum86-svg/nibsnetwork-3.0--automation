import http from 'http';

const data = JSON.stringify({ script: 'sync-blog' });

const options = {
    hostname: '43.205.138.253',
    port: 80,
    path: '/api/run-script',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log('Response:', body));
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
