document.getElementById('openAdmin').addEventListener('click', () => {
  chrome.tabs.create({ url: 'YOUR_ADMIN_PAGE_URL/admin.html' });
});
