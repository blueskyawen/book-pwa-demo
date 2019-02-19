/**
 * Created by root on 2/19/19.
 */
var cacheName = 'book-pwa-0-0';
var apiCacheName = 'api-0-1-1';
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


