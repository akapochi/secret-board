'use strict';
const http = require('http');
const router = require('./lib/router');

// createServer は関数を引数にとる
// createServer の返り値はオブジェクトなので、server変数に代入
const server = http.createServer((req, res) => {
  router.route(req, res); // <- lib/router.jsに任せている
}).on('error', (e) => {
  console.error('Server Error', e);
}).on('clientError', (e) => {
  console.error('Client Error', e);
});

const port = 8000;
server.listen(port, () => {
  console.info(`ポート${port}番でサーバーを起動！`);
});