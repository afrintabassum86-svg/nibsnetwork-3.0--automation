import http from 'http';

http.get('http://43.205.138.253/api/script-status', (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => console.log(data));
}).on('error', (e) => console.log(e.message));
