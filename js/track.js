async function trackOrder() {
  const id = document.getElementById('orderIdInput').value.trim();
  const resultEl = document.getElementById('result');
  const notFoundEl = document.getElementById('notFound');
  resultEl.classList.add('hidden');
  notFoundEl.classList.add('hidden');

  if (!id) return;

  const { data, error } = await supabaseClient.from('orders').select('*').eq('id', id).single();
  if (error || !data) {
    notFoundEl.classList.remove('hidden');
    return;
  }

  const statusLabels = {
    pending: 'Order received', confirmed: 'Confirmed', preparing: 'Being prepared',
    out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled'
  };

  resultEl.innerHTML = `
    <h3>Order #${data.id}</h3>
    <span class="status ${data.status}">${statusLabels[data.status] || data.status}</span>
    <div class="panel-row" style="margin-top:14px"><span>Items</span></div>
    ${data.items.map(i => `<div class="panel-row"><span>${i.name} × ${i.qty}</span><span>Rs. ${i.price * i.qty}</span></div>`).join('')}
    <div class="panel-row total"><span>Total (incl. delivery)</span><span>Rs. ${data.total}</span></div>
    ${data.rider_name ? `<p class="muted" style="margin-top:12px">Rider: <strong>${data.rider_name}</strong> — ${data.rider_phone || ''}</p>` : ''}
  `;
  resultEl.classList.remove('hidden');
}
