import CartModal from './CartModal.mjs';
import { LAST_ORDER_KEY, getLocalStorage, formatCurrency } from './utils.mjs';

const orderCard = document.getElementById('orderCard');
const orderStatusLabel = document.getElementById('orderStatusLabel');
const orderEmpty = document.getElementById('orderEmpty');

const cartModal = new CartModal();
cartModal.init();

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function buildItemsList(items = []) {
  if (!items.length) return '<p>No items found.</p>';
  return `
    <ul class="order-card__items">
      ${items
        .map(
          (item) => `
            <li>
              <div>
                <strong>${item.Name}</strong>
                <p>Quantity: ${item.quantity}</p>
              </div>
              <span>${formatCurrency(item.Price * item.quantity)}</span>
            </li>
          `
        )
        .join('')}
    </ul>
  `;
}

function renderOrder() {
  if (!orderCard || !orderStatusLabel || !orderEmpty) return;

  const payload = getLocalStorage(LAST_ORDER_KEY);
  if (!payload) {
    orderCard.innerHTML = '';
    orderEmpty.hidden = false;
    orderStatusLabel.textContent = '';
    return;
  }

  orderEmpty.hidden = true;
  orderStatusLabel.textContent = payload.status ?? 'In progress';

  orderCard.innerHTML = `
    <article class="order-card__body">
      <header>
        <p class="order-card__date">${formatDate(payload.submittedAt)}</p>
        <p class="order-card__total">${payload.totalLabel ?? formatCurrency(payload.total ?? 0)}</p>
      </header>
      <section>
        <h3>Shipping to</h3>
        <p>${payload.customer.fullName}</p>
        <p>${payload.customer.address}, ${payload.customer.city}, ${payload.customer.state} ${payload.customer.zip}</p>
      </section>
      <section>
        <h3>Items</h3>
        ${buildItemsList(payload.items)}
      </section>
      <footer>
        <p class="order-card__status">${payload.status ?? 'Preparing shipment'}</p>
      </footer>
    </article>
  `;
}

renderOrder();
