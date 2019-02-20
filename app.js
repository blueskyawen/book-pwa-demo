const get       = require('./util').get;
const http      = require('http');
const Koa       = require('koa');
const serve     = require('koa-static');
const Router    = require('koa-router');
const koaBody = require('koa-body');

const port = process.env.PORT || 8085;
const app = new Koa();
const router = new Router();

router.get('/book', async (ctx, next) => {
    var query = ctx.request.query;
    var {q, fields} = query;
    var url = `https://api.douban.com/v2/book/search?q=${q}&fields=${fields}&count=10`;
    var res = await get(url);
    ctx.response.body = res;
});

/**
 * 提交subscription信息，并保存
 */
router.post('/subscription', koaBody(), async ctx => {
    var body = ctx.request.body;
    await util.saveRecord(body);
    ctx.response.body = {
        status: 0
    };
});

/**
 * 消息推送API，可以在管理后台进行调用
 * 本例子中，可以直接post一个请求来查看效果
 */
router.post('/push', koaBody(), async ctx => {
    var {uniqueid, payload} = ctx.request.body;
    var list = uniqueid ? await util.find({uniqueid}) : await util.findAll();
    var status = list.length > 0 ? 0 : -1;

    for (var i = 0; i < list.length; i++) {
        var subscription = list[i].subscription;
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
