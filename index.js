'use strict';
const http = require('http');
const auth = require('http-auth');
const router = require('./lib/router');

const basic = auth.basic({
  realm: 'Enter username and password.',
  file: './users.htpasswd'
});

// createServer は関数を引数にとる
// createServer の返り値はオブジェクトなので、server変数に代入
const server = http.createServer(basic, (req, res) => {
  router.route(req, res); // <- lib/router.jsに任せている
}).on('error', (e) => {
  console.error('Server Error', e);
}).on('clientError', (e) => {
  console.error('Client Error', e);
});

const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.info(`ポート${port}番でサーバーを起動！`);
});