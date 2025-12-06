import CartModal from './CartModal.mjs';
import { CART_KEY, LAST_ORDER_KEY, getLocalStorage, setLocalStorage, formatCurrency } from './utils.mjs';

const orderList = document.getElementById('orderList');
const orderTotal = document.getElementById('orderTotal');
const summaryMeta = document.getElementById('summaryMeta');
const emptyNotice = document.getElementById('emptyNotice');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutStatus = document.getElementById('checkoutStatus');
const submitButton = checkoutForm?.querySelector('.checkout-submit');

const cartModal = new CartModal();
cartModal.init();

function aggregateCartItems(items = []) {
  if (!Array.isArray(items)) return [];

  const map = new Map();
  items.forEach((item) => {
    const quantity = item.quantity ?? 1;
    if (!map.has(item.Id)) {
      map.set(item.Id, { ...item, quantity });
    } else {
      const existing = map.get(item.Id);
      existing.quantity += quantity;
    }
  });

  return Array.from(map.values());
}

function getCartItems() {
  return aggregateCartItems(getLocalStorage(CART_KEY) ?? []);
}

function renderOrderSummary() {
  const items = getCartItems();
  const itemCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const total = items.reduce((sum, item) => sum + item.Price * (item.quantity ?? 1), 0);

  if (!orderList || !orderTotal || !emptyNotice || !summaryMeta) return;

  if (items.length === 0) {
    orderList.innerHTML = '';
    emptyNotice.hidden = false;
    summaryMeta.textContent = 'No products in the cart';
  } else {
    const markup = items
      .map(
        (item) => `
          <li class="order-item">
            <img src="${item.Image}" alt="${item.ImageAlt ?? item.Name}" />
            <div class="order-item__body">
              <div class="order-item__header">
                <h3>${item.Name}</h3>
                <span>${formatCurrency(item.Price)}</span>
              </div>
              <p class="order-item__meta">Quantity: ${item.quantity}</p>
              <p class="order-item__subtotal">Subtotal: ${formatCurrency(item.Price * item.quantity)}</p>
            </div>
          </li>
        `
      )
      .join('');
    orderList.innerHTML = markup;
    emptyNotice.hidden = true;
    summaryMeta.textContent = `Items: ${itemCount}`;
  }

  orderTotal.textContent = formatCurrency(total);
  orderTotal.dataset.raw = String(total);
}

function persistLastOrder(payload) {
  setLocalStorage(LAST_ORDER_KEY, payload);
}

function showStatus(message, type = 'info') {
  if (!checkoutStatus) return;
  checkoutStatus.textContent = message;
  checkoutStatus.dataset.status = type;
}

function resetForm() {
  if (!checkoutForm) return;
  checkoutForm.reset();
}

function handleSubmit(event) {
  event.preventDefault();
  const items = getCartItems();
  if (items.length === 0) {
    showStatus('Your cart is empty. Add items before submitting.', 'error');
    return;
  }

  if (!checkoutForm || !submitButton) return;

  const formData = new FormData(checkoutForm);
  const totalAmount = Number(orderTotal?.dataset.raw ?? 0);

  const payload = {
    customer: {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      zip: formData.get('zip'),
      notes: formData.get('notes'),
    },
    items,
    total: totalAmount,
    totalLabel: formatCurrency(totalAmount),
    submittedAt: new Date().toISOString(),
    status: 'Preparing shipment',
  };

  submitButton.disabled = true;
  showStatus('Sending your order…', 'pending');

  setTimeout(() => {
    persistLastOrder(payload);
    setLocalStorage(CART_KEY, []);
    window.dispatchEvent(new CustomEvent('cart:updated'));
    renderOrderSummary();
    resetForm();
    showStatus('Order received! Redirecting to confirmation…', 'success');
    submitButton.disabled = false;

    setTimeout(() => {
      window.location.href = '../orders/index.html';
    }, 900);
  }, 1600);
}

renderOrderSummary();

if (checkoutForm) {
  checkoutForm.addEventListener('submit', handleSubmit);
}

window.addEventListener('cart:updated', renderOrderSummary);
window.addEventListener('storage', (event) => {
  if (event.key === CART_KEY) {
    renderOrderSummary();
  }
});
