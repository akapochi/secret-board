// router.jsのcase '/posts'から飛んできた

'use strict';
const crypto = require('crypto');
const pug = require('pug');
const Cookies = require('cookies');
const moment = require('moment-timezone');
const util = require('./handler-util');
const Post = require('./post');

const trackingIdKey = 'tracking_id';

const oneTimeTokenMap = new Map(); // キーをユーザー名、値をトークンとする連想配列

function handle(req, res) {
  const cookies = new Cookies(req, res);
  const trackingId = addTrackingCookie(cookies, req.user);

  switch (req.method) {
    case 'GET':
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      Post.findAll({ order: [['id', 'DESC']] }).then((posts) => {
        posts.forEach(post => {
          post.formattedCreatedAt = moment(post.createdAt).tz('Asia/Tokyo').format('YYYY年MM月DD日 HH時mm分ss秒');
          post.content = post.content.replace(/\+/g, ' ');
        });
        const oneTimeToken = crypto.randomBytes(8).toString('hex');
        oneTimeTokenMap.set(req.user, oneTimeToken); // 連想配列にset
        res.end(pug.renderFile('./views/posts.pug', {
          posts: posts,
          user: req.user,
          oneTimeToken: oneTimeToken
        }));
        console.info(
          `閲覧されました： user：${req.user}, ` +
          `トラッキングID：${trackingId}, ` +
          `remoteAddress：${req.connection.remoteAddress} ` +
          `userAgent：${req.headers['user-agent']}`
        )
      });
      break;
    case 'POST':
      let body = '';
      req.on('data', (chunk) => {
        body = body + chunk;
      }).on('end', () => {
        const decoded = decodeURIComponent(body);
        const matchResult = decoded.match(/content=(.*)&oneTimeToken=(.*)/);
        if (!matchResult) {
          util.handleBadRequest(req, res);
        } else {
          const content = matchResult[1];
          const requestedOneTimeToken = matchResult[2];
          if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
            console.info('投稿されました: ' + content);
            Post.create({
              content: content,
              trackingCookie: trackingId,
              postedBy: req.user
            }).then(() => {
              oneTimeTokenMap.delete(req.user);
              handleRedirectPosts(req, res);
            });
          } else {
            util.handleBadRequest(req, res);
          }
        }
      });
      break;
    /*
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      const decoded = decodeURIComponent(body);
      const content = decoded.split('content=')[1];
      console.info(`投稿されました： ${content}`);
      handleRedirectPosts(req, res);
    });
    */
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

function handleDelete(req, res) {
  switch (req.method) {
    case 'POST':
      let body = '';
      req.on('data', (chunk) => {
        body = body + chunk;
      }).on('end', () => {
        const decoded = decodeURIComponent(body);
        const matchResult = decoded.match(/id=(.*)&oneTimeToken=(.*)/);
        if (!matchResult) {
          util.handleBadRequest(req, res);
        } else {
          const id = matchResult[1];
          const requestedOneTimeToken = matchResult[2];
          if (oneTimeTokenMap.get(req.user) === requestedOneTimeToken) {
            Post.findByPk(id).then((post) => {
              if (req.user === post.postedBy || req.user === 'admin') {
                post.destroy().then(() => {
                  console.info(
                    `削除されました： user：${req.user},  ` +
                    `remoteAddress： ${req.connection.remoteAddress}, ` +
                    `userAgent： ${req.headers['user-agent']} `
                  );
                  oneTimeTokenMap.delete(req.user);
                  handleRedirectPosts(req, res);
                });
              } else {
                util.handleBadRequest(req, res);
              }
            });
          }
        }
      });
      break;
    /*
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      const decoded = decodeURIComponent(body);
      const id = decoded.split('id=')[1];
      Post.findByPk(id).then((post) => {
        if (req.user === post.postedBy) {
          post.destroy().then(() => {
            handleRedirectPosts(req, res);
          });
        }
      });
    });
    break;
    */
    default:
      util.handleBadRequest(req, res);
      break;
  }
}

/**
 * Cookieに含まれているトラッキングIDに異常がなければその値を返し、
 * 存在しない場合や異常なものである場合には、再度作成しCookieに付与してその値を返す
 * @param {Cookies} cookies 
 * @param {String} userName
 * @return {String} トラッキングID 
 */
function addTrackingCookie(cookies, userName) {
  const requestedTrackingId = cookies.get(trackingIdKey);
  if (isValidTrackingId(requestedTrackingId, userName)) {
    return requestedTrackingId;
  } else {
    const originalId = parseInt(crypto.randomBytes(8).toString('hex'), 16);
    const tomorrow = new Date(Date.now() + (1000 * 60 * 60 * 24)); // 現在時刻の24時間後
    const trackingId = `${originalId}_${createValidHash(originalId, userName)}`;
    cookies.set(trackingIdKey, trackingId, { expires: tomorrow });
    return trackingId;
  }
}

function isValidTrackingId(trackingId, userName) {
  if (!trackingId) {
    return false;
  }
  const splitted = trackingId.split('_');
  const originalId = splitted[0];
  const requestedHash = splitted[1];
  return createValidHash(originalId, userName) === requestedHash;
}

const secretKey =
  'aa14eebbf74e591b7c6590185fec3b6d79b32a0d33379ec7939aac403e0ba9' +
  '9b88c864d1d961940b1a619859da0921bb0b550bebaef99c550e8979a16882' +
  '1220bcdbd02537acb3e9a0f881e971f583734b7a9f263d200ec0dce7f06584' +
  'e8ba1424ea0e92f49f6422a3b052f033249904ee9f6fe2f464cc8f23c5179c' +
  'b020c783245abcd597fc844ba7c4b8f54e4de604fd79a65ad1541ab2715972' +
  '14f8af3aecf83599bdb5fc441fad2077ea41096564cd195feb2b33853cf83c' +
  'f93d78e969b09aef1911a84a03d18075f6f4c7950b294eae204a3bd1fa5ab4' +
  '769d52fdeac8e533dc38770681cd4125e417483e38cd0bf8b202bb3e1a248d' +
  '2f826a02d960ee53';

function createValidHash(originalId, userName) {
  const sha1sum = crypto.createHash('sha1');
  sha1sum.update(originalId + userName + secretKey);
  return sha1sum.digest('hex');
}

function handleRedirectPosts(req, res) {
  res.writeHead(303, {
    'Location': '/posts'
  });
  res.end();
}

module.exports = {
  handle,
  handleDelete
};