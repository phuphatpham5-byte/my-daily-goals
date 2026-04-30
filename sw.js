const CACHE_NAME = 'dashboard-cache-v2'; // Đổi từ v1 sang v2
const urlsToCache = ['/', '/index.html', '/style.css', '/app.js'];

// Cài đặt và lưu cache mới
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
    self.skipWaiting(); // Ép Service worker mới hoạt động ngay lập tức
});

// Kích hoạt và Xóa cache phiên bản cũ
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Đang xóa cache cũ:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch data
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
