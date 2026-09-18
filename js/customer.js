// ============================================================
// CUSTOMER PAGE LOGIC - FIXED WITH IMAGE COMPRESSION
// ============================================================

let MENU = [];
let SETTINGS = null;
let CUSTOMER = null;
const cart = {};

// ---- IMAGE COMPRESS - YEH SAB SE IMPORTANT HAI ----
async function compressImage(file, maxWidth = 800, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
  });
}

// ---- AUTH TABS ----
function showAuthTab(name) {
  document.querySelectorAll('[data-authtab]').forEach(b => b.classList.toggle('active', b.dataset.authtab === name));
  document.getElementById('authtab-login').classList.toggle('active', name === 'login');
  document.getElementById('authtab-signup').classList.toggle('active', name === 'signup');
}

// ---- SESSION ----
async function restoreSession() {
  const id = localStorage.getItem('customer_id');
  if (!id) return;
  const { data, error } = await supabaseClient.rpc('customer_get', { p_id: id });
  if (error ||!data || data.length === 0) {
    localStorage.removeItem('customer_id');
    return;
  }
  setCustomer(data[0]);
}

function setCustomer(c) {
  CUSTOMER = c;
  localStorage.setItem('customer_id', c.id);
  document.getElementById('authPanel').classList.add('hidden');
  document.getElementById('accountPanel').classList.remove('hidden');
  document.getElementById('welcomeName').textContent = c.name;
  document.getElementById('custName').value = c.name;
  document.getElementById('custPhone').value = c.phone;
  document.getElementById('custLocation').value = c.location;
  loadChat();
  loadMyOrders();
}

const STATUS_LABELS = {
  pending: 'Order received', confirmed: 'Confirmed', preparing: 'Being prepared',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled'
};

async function loadMyOrders() {
  if (!CUSTOMER) return;
  const { data, error } = await supabaseClient
   .from('orders').select('*').eq('customer_id', CUSTOMER.id).order('id', { ascending: false });
  const listEl = document.getElementById('myOrdersList');
  if (error ||!data || data.length === 0) {
    listEl.innerHTML = '<p class="muted">No orders yet.</p>';
    return;
  }
  listEl.innerHTML = data.map(o => `
    <div class="panel-row" style="border-bottom:1px solid var(--line); padding:8px 0">
      <span>Order #${o.id} — ${new Date(o.created_at).toLocaleDateString()} — Rs. ${o.total}</span>
      <span class="status ${o.status}">${STATUS_LABELS[o.status] || o.status}</span>
    </div>
  `).join('');
}

async function customerSignup() {
  const name = document.getElementById('signupName').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPass').value;
  const location = document.getElementById('signupLocation').value.trim();
  const errEl = document.getElementById('signupErr');
  errEl.classList.add('hidden');
  if (!name ||!phone ||!password ||!location) {
    errEl.textContent = 'Please fill in every field.';
    errEl.classList.remove('hidden');
    return;
  }
  const { data, error } = await supabaseClient.rpc('customer_signup', {
    p_phone: phone, p_password: password, p_name: name, p_location: location
  });
  if (error) {
    errEl.textContent = error.message;
    errEl.classList.remove('hidden');
    return;
  }
  setCustomer(data[0]);
}

async function customerLogin() {
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginErr');
  errEl.classList.add('hidden');
  const { data, error } = await supabaseClient.rpc('customer_login', { p_phone: phone, p_password: password });
  if (error ||!data || data.length === 0) {
    errEl.textContent = 'Incorrect phone number or password.';
    errEl.classList.remove('hidden');
    return;
  }
  setCustomer(data[0]);
}

function customerLogout() {
  localStorage.removeItem('customer_id');
  CUSTOMER = null;
  document.getElementById('accountPanel').classList.add('hidden');
  document.getElementById('authPanel').classList.remove('hidden');
}

async function updateAccount() {
  alert('To change your saved name or location, please contact us via chat — account editing is coming soon.');
}

async function loadSettings() {
  const { data, error } = await supabaseClient.from('settings').select('*').eq('id', 1).single();
  if (error ||!data) return;
  SETTINGS = data;
  document.getElementById('kitchenName').textContent = data.kitchen_name || 'Home Kitchen';
  document.getElementById('kitchenPhone').textContent = data.kitchen_phone? '📞 ' + data.kitchen_phone : '';
  document.getElementById('kitchenLocation').textContent = data.kitchen_location? '📍 ' + data.kitchen_location : '';
  document.getElementById('kitchenDesc').textContent = data.kitchen_description || '';
  document.getElementById('epName').textContent = data.easypaisa_account_name || '';
  document.getElementById('epNumber').textContent = data.easypaisa_account_number || '';
  document.getElementById('deliveryChargeDisplay').textContent = 'Rs. ' + Number(data.delivery_charge || 0);
  if (!data.ordering_enabled) {
    document.getElementById('closedBanner').classList.remove('hidden');
  }
}

async function loadMenu() {
  const { data, error } = await supabaseClient
   .from('menu_items').select('*').eq('available', true).order('created_at');
  const list = document.getElementById('menuList');
  if (error ||!data || data.length === 0) {
    document.getElementById('noMenu').classList.remove('hidden');
    return;
  }
  MENU = data;
  list.innerHTML = MENU.map(item => `
    <div class="menu-item">
      ${item.photo_url? `<img src="${item.photo_url}" alt="${item.name}">` : ''}
      <div class="info">
        <div class="name">${item.name}</div>
        <div class="desc">${item.description || ''}</div>
        <div class="price">Rs. ${item.price}</div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
          <span id="qty-${item.id}">0</span>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function changeQty(id, delta) {
  if (SETTINGS &&!SETTINGS.ordering_enabled) return;
  cart[id] = Math.max(0, (cart[id] || 0) + delta);
  document.getElementById(`qty-${id}`).textContent = cart[id];
  renderCart();
}

function renderCart() {
  const lines = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartPanel = document.getElementById('cartPanel');
  if (lines.length === 0) { cartPanel.classList.add('hidden'); return; }
  cartPanel.classList.remove('hidden');
  let subtotal = 0;
  const html = lines.map(([id, qty]) => {
    const item = MENU.find(m => m.id === id);
    const lineTotal = item.price * qty;
    subtotal += lineTotal;
    return `<div class="panel-row"><span>${item.name} × ${qty}</span><span>Rs. ${lineTotal}</span></div>`;
  }).join('');
  document.getElementById('cartLines').innerHTML = html;
  const deliveryCharge = Number(SETTINGS?.delivery_charge || 0);
  document.getElementById('cartTotal').textContent = 'Rs. ' + (subtotal + deliveryCharge);
}

function togglePaymentFields() {
  const method = document.getElementById('paymentMethod').value;
  document.getElementById('easypaisaBox').classList.toggle('hidden', method!== 'easypaisa');
  document.getElementById('onlineBox').classList.toggle('hidden', method!== 'online');
}

// ---- place order - FINAL FIXED ----
async function placeOrder() {
  const errEl = document.getElementById('orderError');
  errEl.classList.add('hidden');
  const btn = document.querySelector('[onclick="placeOrder()"]') || document.getElementById('placeOrderBtn');
  if(btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }

  if (SETTINGS &&!SETTINGS.ordering_enabled) {
    errEl.textContent = 'Sorry, we are currently closed and not accepting orders.';
    errEl.classList.remove('hidden');
    if(btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    return;
  }
  if (!CUSTOMER) {
    errEl.textContent = 'Please log in or create an account above before ordering.';
    errEl.classList.remove('hidden');
    if(btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    return;
  }
  const lines = Object.entries(cart).filter(([, qty]) => qty > 0);
  if (lines.length === 0) {
    errEl.textContent = 'Your cart is empty.';
    errEl.classList.remove('hidden');
    if(btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    return;
  }

  const method = document.getElementById('paymentMethod').value;
  let screenshotUrl = null;

  if (method === 'easypaisa') {
    const fileInput = document.getElementById('screenshotInput');
    if (!fileInput.files[0]) {
      errEl.textContent = 'Please upload a screenshot of your EasyPaisa payment.';
      errEl.classList.remove('hidden');
      if(btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
      return;
    }
    try {
      if(btn) btn.textContent = 'Compressing & Uploading...';
      const originalFile = fileInput.files[0];
      const compressedFile = await compressImage(originalFile); // YAHAN COMPRESS HOGA

      console.log('Original:', (originalFile.size/1024/1024).toFixed(2) + 'MB', 'Compressed:', (compressedFile.size/1024).toFixed(2) + 'KB');

      const filePath = `${Date.now()}_${originalFile.name}`;
      const { error: uploadErr } = await supabaseClient.storage
       .from('payment-screenshots').upload(filePath, compressedFile);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabaseClient.storage.from('payment-screenshots').getPublicUrl(filePath);
      screenshotUrl = urlData.publicUrl;
    } catch (uploadError) {
      errEl.textContent = 'Screenshot upload failed: ' + uploadError.message;
      errEl.classList.remove('hidden');
      if(btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
      return;
    }
  }

  const items = lines.map(([id, qty]) => {
    const item = MENU.find(m => m.id === id);
    return { name: item.name, price: item.price, qty };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryCharge = Number(SETTINGS?.delivery_charge || 0);
  const total = subtotal + deliveryCharge;

  const { data: orderId, error: idErr } = await supabaseClient.rpc('get_next_order_id');
  if (idErr) {
    errEl.textContent = 'Could not create order ID: ' + idErr.message;
    errEl.classList.remove('hidden');
    if(btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    return;
  }

  const { data: orderData, error: orderErr } = await supabaseClient.from('orders').insert({
    id: orderId,
    customer_id: CUSTOMER.id,
    customer_name: CUSTOMER.name,
    customer_phone: CUSTOMER.phone,
    customer_location: CUSTOMER.location,
    items,
    delivery_charge: deliveryCharge,
    total,
    payment_method: method,
    payment_screenshot_url: screenshotUrl,
    status: 'pending'
  }).select().single();

  if (orderErr) {
    errEl.textContent = 'Could not place order: ' + orderErr.message;
    errEl.classList.remove('hidden');
    if(btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
    return;
  }

  // reset cart & show confirmation
  Object.keys(cart).forEach(k => cart[k] = 0);
  document.getElementById('cartPanel').classList.add('hidden');
  document.getElementById('screenshotInput').value = ''; // IMPORTANT: input clear yahan karo
  loadMenu();

  document.getElementById('confirmOrderId').textContent = '#' + orderData.id;
  document.getElementById('confirmPanel').classList.remove('hidden');
  loadMyOrders();
  if (orderData.rider_name) {
    document.getElementById('riderName').textContent = orderData.rider_name;
    document.getElementById('riderPhone').textContent = orderData.rider_phone || '';
    document.getElementById('riderInfo').classList.remove('hidden');
  }
  if(btn) { btn.disabled = false; btn.textContent = 'Place Order'; }
}

// ---- chat ----
async function loadChat() {
  if (!CUSTOMER) return;
  const { data } = await supabaseClient
   .from('chat_messages').select('*').eq('customer_id', CUSTOMER.id).order('created_at');
  renderChat(data || []);
}
function renderChat(messages) {
  const box = document.getElementById('chatBox');
  box.innerHTML = messages.map(m =>
    `<div class="chat-msg ${m.sender}">${m.message}</div>`
  ).join('');
  box.scrollTop = box.scrollHeight;
}
async function sendChatMessage() {
  if (!CUSTOMER) {
    alert('Please log in or create an account first to chat with us.');
    return;
  }
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  await supabaseClient.from('chat_messages').insert({
    customer_id: CUSTOMER.id, sender: 'customer', message
  });
  loadChat();
}
function subscribeChat() {
  if (!CUSTOMER) return;
  // پرانا چینل بند کرو تاکہ ڈبل میسج نہ آئے
  supabaseClient.removeAllChannels();
  
  supabaseClient.channel('customer-chat-' + CUSTOMER.id)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'chat_messages',
      filter: `customer_id=eq.${CUSTOMER.id}`
    }, payload => {
      const box = document.getElementById('chatBox');
      const m = payload.new;
      const div = document.createElement('div');
      div.className = `chat-msg ${m.sender}`;
      div.textContent = m.message;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
      // لِسٹ بھی ریفریش کرو تاکہ ایڈمن سائیڈ پر بھی نظر آئے
      if(document.getElementById('chatCustomerList')) loadChatCustomerList();
    }).subscribe();
}


// ---- init ----
(async function init() {
  await loadSettings();
  await loadMenu();
  await restoreSession();
  subscribeChat();
})();
