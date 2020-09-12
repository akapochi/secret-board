// index.jsから飛んできた

'use strict';
const postsHandler = require('./posts-handler');

function route(req, res) {
  switch (req.url) {
    case '/posts':
      postsHandler.handle(req, res); // <- lib/posts-handlerに任せている
      break;
    case '/logout':
      //TODO ログアウト処理
      break;
    default:
      break;
  }
}

module.exports = {
  route
};