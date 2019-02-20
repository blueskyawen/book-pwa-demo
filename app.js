const util      = require('./util');
const http      = require('http');
const Koa       = require('koa');
const serve     = require('koa-static');
const Router    = require('koa-router');
const koaBody = require('koa-body');
const webpush = require('web-push');


const port = process.env.PORT || 8085;
const app = new Koa();
const router = new Router();

// VAPID keys should only be generated only once.
//const vapidKeys = webpush.generateVAPIDKeys();
const vapidKeys = {
    publicKey: 'BFDCYXeRB5ADrV0Vic3pjta30C7l9KEmW3ACmFVX7OorpliWh3-BZvgzwar69oNKngz8O_BYThLc4QGsdujrKjE',
    privateKey: 'WS4mZILCaIPofP_-1PGWNhrq2vLVuPqi6emQf4mL3KI'
};

webpush.setVapidDetails(
    'mailto:bluesky.liu@163.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);
const options = {
    //proxy: 'http://localhost:1087' // 使用FCM（Chrome）需要配置代理
};

router.get('/book', async (ctx, next) => {
    var query = ctx.request.query;
    var {q, fields} = query;
    var url = `https://api.douban.com/v2/book/search?q=${q}&fields=${fields}&count=10`;
    var res = await util.get(url);
    ctx.response.body = res;
});

/**
 * 提交subscription信息，并保存
 */
router.post('/subscription', koaBody(), async ctx => {
    console.log('提交subscription信息');
    var body = ctx.request.body;
    console.log(JSON.stringify(body));
    await util.saveRecord(body);
    ctx.response.body = {
        status: 0
    };
});

/**
 * 向push service推送信息
 * @param {*} subscription
 * @param {*} data
 */
function pushMessage(subscription, data1) {
    webpush.sendNotification(subscription, data1).then(data => {
        console.log('push service的相应数据:', JSON.stringify(data));
        return;
    }).catch(err => {
        // 判断状态码，440和410表示失效
        if (err.statusCode === 410 || err.statusCode === 404) {
            return util.remove(subscription);
        }
        else {
            console.log(subscription);
            console.log(err);
        }
    })
}

/**
 * 消息推送API，可以在管理后台进行调用
 * 本例子中，可以直接post一个请求来查看效果
 */
router.post('/push', koaBody(), async ctx => {
    let {uniqueid, payload} = JSON.parse(ctx.request.body);
    let list = await util.findAll();
    let status = list.length > 0 ? 0 : -1;

    console.log('uniqueid:'+uniqueid);
    console.log('payload:'+payload);
    for (let i = 0; i < list.length; i++) {
        let subscription = list[i].subscription;
        pushMessage(subscription, JSON.stringify(payload));
    }

    ctx.response.body = {
        status
    };
});


app.use(router.routes());
app.use(serve(__dirname));
app.listen(port, () => {
    console.log(`listen on port: ${port}`);
});
