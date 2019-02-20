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
        icon: 'img/icons/book-72.png',
        badge: 'img/icons/book-32.png'
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
