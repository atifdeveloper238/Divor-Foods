// ============================================================
// Polls Supabase for new orders and fires a Chrome notification.
// Uses polling (every 20s) via the REST API + anon key, so no
// extra libraries are needed inside the extension.
// Fill in SUPABASE_URL / SUPABASE_ANON_KEY below (same as js/supabase-config.js).
// ============================================================

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const POLL_INTERVAL_SECONDS = 20;

async function checkForNewOrders() {
  const { lastSeenOrderId } = await chrome.storage.local.get('lastSeenOrderId');

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?select=id,customer_name,total&order=id.desc&limit=5`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) return;
  const orders = await res.json();
  if (!orders.length) return;

  const newest = orders[0].id;

  if (lastSeenOrderId === undefined) {
    // first run — just record current newest, don't spam old orders
    await chrome.storage.local.set({ lastSeenOrderId: newest });
    return;
  }

  const newOrders = orders.filter(o => o.id > lastSeenOrderId);
  newOrders.reverse().forEach(o => {
    chrome.notifications.create('order-' + o.id, {
      type: 'basic',
      iconUrl: 'icon.png',
      title: `New order #${o.id}`,
      message: `${o.customer_name} — Rs. ${o.total}`,
      priority: 2
    });
  });

  if (newOrders.length) {
    await chrome.storage.local.set({ lastSeenOrderId: newest });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('pollOrders', { periodInMinutes: POLL_INTERVAL_SECONDS / 60 });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'pollOrders') checkForNewOrders();
});

chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'YOUR_ADMIN_PAGE_URL/admin.html' });
});
