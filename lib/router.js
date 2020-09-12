// index.jsから飛んできた

'use strict';
const postsHandler = require('./posts-handler');
const util = require('./handler-util');

function route(req, res) {
  switch (req.url) {
    case '/posts':
      postsHandler.handle(req, res); // <- lib/posts-handler.jsに任せている
      break;
    case '/logout':
      util.handleLogout(req, res); // <- lib/handler-util.jsに任せている
      break;
    default:
      util.handleNotFound(req, res); // <- lib/handler-util.jsに任せている
      break;
  }
}

module.exports = {
  route
};