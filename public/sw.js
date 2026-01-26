self.addEventListener("push", function (event) {
  if (!event.data) return;

  var data = event.data.json();

  var options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-72.png",
    tag: data.tag || "default",
    renotify: true,
    data: { link: data.link || "/" },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title || "ShiftFlow", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var link = event.notification.data && event.notification.data.link ? event.notification.data.link : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(link);
          return;
        }
      }
      return clients.openWindow(link);
    })
  );
});
