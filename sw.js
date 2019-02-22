/**
 * Created by root on 2/19/19.
 */
var cacheName = 'book-pwa-0-1';
var cacheFiles = [
    '/',
    './index.html',
    './base64util.js',
    './index.js',
    './style.css',
    './img/book.png',
    './img/loading.svg'
];

// 监听install事件
self.addEventListener('install', function (event) {
    console.log('Service Worker 状态： install');
    var cacheOpenPromise = caches.open(cacheName).then(function (cache) {
        return cache.addAll(cacheFiles);
    });
    event.waitUntil(cacheOpenPromise);
});

self.addEventListener('fetch', function (event) {
    // 需要缓存的xhr请求
    var cacheRequestUrls = [
        '/book?'
    ];
    console.log('现在正在请求：' + event.request.url);

    // 判断当前请求是否需要缓存
    var needCache = cacheRequestUrls.some(function (url) {
        return event.request.url.indexOf(url) > -1;
    });

    /**** 这里是对XHR数据缓存的相关操作 ****/
    if (needCache) {
        // 需要缓存
        // 使用fetch请求数据，并将请求结果clone一份缓存到cache
        // 此部分缓存后在browser中使用全局变量caches获取
        caches.open(cacheName).then(function (cache) {
            return fetch(event.request).then(function (response) {
                cache.put(event.request.url, response.clone());
                return response;
            });
        });
    } else {
        // 非api请求，直接查询cache
        // 如果有cache则直接返回，否则通过fetch请求
        event.respondWith(
            caches.match(event.request).then(function (cache) {
                return cache || fetch(event.request);
            }).catch(function (err) {
                console.log(err);
                return fetch(event.request);
            })
        );
    }
});

// 监听activate事件，激活后通过cache的key来判断是否更新cache中的静态资源
self.addEventListener('activate', function (event) {
    console.log('Service Worker 状态： activate');
    var cachePromise = caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) {
            if (key !== cacheName) {
                return caches.delete(key);
            }
        }));
    })
    event.waitUntil(cachePromise);
    return self.clients.claim();
});

self.addEventListener('push', function (event) {
    var data = event.data;
    console.log('Service Worker 状态： push');
    const options = {
        body: 'Pwa push service works.',
        icon: 'img/icons/book-72.png'
    };
    if (event.data) {
        data = data.json();
        console.log('push的数据为：', data);
        event.waitUntil(self.registration.showNotification(data,options));
    }
    else {
        console.log('push没有任何数据');
    }
});

self.addEventListener('notificationclick', function (e) {
    var action = e.action;
    console.log(`action tag: ${e.notification.tag}`, `action: ${action}`);

    switch (action) {
        case 'show-book':
            console.log('show-book');
            break;
        case 'contact-me':
            console.log('contact-me');
            break;
        default:
            console.log(`未处理的action: ${e.action}`);
            action = 'default';
            break;
    }
    e.notification.close();

    e.waitUntil(
        // 获取所有clients
        self.clients.matchAll().then(function (clients) {
            if (!clients || clients.length === 0) {
                self.clients.openWindow && self.clients.openWindow('http://127.0.0.1:8085');
                return;
            }
            clients[0].focus && clients[0].focus();
            clients.forEach(function (client) {
                // 使用postMessage进行通信
                client.postMessage(action);
            });
        })
    );
});


/* =========================== */
/* background sync demo相关部分 */
/* =========================== */
class SimpleEvent {
    constructor() {
        this.listenrs = {};
    }

    once(tag, cb) {
        this.listenrs[tag] || (this.listenrs[tag] = []);
        this.listenrs[tag].push(cb);
    }

    trigger(tag, data) {
        this.listenrs[tag] = this.listenrs[tag] || [];
        let listenr;
        while (listenr = this.listenrs[tag].shift()) {
            listenr(data)
        }
    }
}

const simpleEvent = new SimpleEvent();
self.addEventListener('sync', function (e) {
    console.log(`service worker需要进行后台同步，tag: ${e.tag}`);
    var init = {
        method: 'GET'
    };
    if (e.tag === 'sample_sync') {
        var request = new Request(`sync?name=AlienZHOU`, init);
        e.waitUntil(
            fetch(request).then(function (response) {
                response.json().then(console.log.bind(console));
                return response;
            })
        );
    }    // sample_sync_event同步事件，使用postMessage来进行数据通信
    else if (e.tag === 'sample_sync_event') {
        let msgPromise = new Promise(function (resolve, reject) {
            // 监听message事件中触发的事件通知
            simpleEvent.once('bgsync', function (data) {
                resolve(data);
            });
            // 五秒超时
            setTimeout(resolve, 5000);
        });

        e.waitUntil(
            msgPromise.then(function (data) {
                var name = data && data.name ? data.name : 'anonymous';
                var request = new Request(`sync?name=${name}`, init);
                return fetch(request)
            }).then(function (response) {
                response.json().then(console.log.bind(console));
                return response;
            })
        );
    }
});
