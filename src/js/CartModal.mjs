import { CART_KEY, getLocalStorage, setLocalStorage, formatCurrency } from './utils.mjs';

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

export default class CartModal {
  constructor({ buttonSelector = '#cartButton', modalSelector = '#cartModal' } = {}) {
    this.button = document.querySelector(buttonSelector);
    this.modal = document.querySelector(modalSelector);
    this.dialog = this.modal?.querySelector('.cart-modal__dialog');
    this.itemsList = this.modal?.querySelector('#cartItems');
    this.totalElement = this.modal?.querySelector('#cartTotal');
    this.emptyMessage = this.modal?.querySelector('#cartEmptyMessage');
    this.closeButtons = this.modal?.querySelectorAll('[data-cart-close]') ?? [];

    this.updateState = this.updateState.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  init() {
    if (!this.button || !this.modal) return;

    this.button.dataset.count = '0';

    this.button.addEventListener('click', () => {
      this.open();
    });

    this.closeButtons.forEach((btn) =>
      btn.addEventListener('click', () => {
        this.close();
      })
    );

    window.addEventListener('cart:updated', this.updateState);
    window.addEventListener('storage', (event) => {
      if (event.key === CART_KEY) {
        this.updateState();
      }
    });

    this.updateState();
  }

  open() {
    this.updateState();
    this.modal?.setAttribute('aria-hidden', 'false');
    this.button?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('cart-open');

    document.addEventListener('keydown', this.handleKeydown);

    const closeButton = this.modal?.querySelector('.cart-modal__close');
    closeButton?.focus();
  }

  close() {
    this.modal?.setAttribute('aria-hidden', 'true');
    this.button?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('cart-open');

    document.removeEventListener('keydown', this.handleKeydown);
    this.button?.focus();
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  getItems() {
    return getLocalStorage(CART_KEY) ?? [];
  }

  updateState() {
    const items = this.getItems();
    const aggregated = aggregateCartItems(items);
    const itemCount = aggregated.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    const total = aggregated.reduce((sum, item) => sum + item.Price * (item.quantity ?? 1), 0);

    if (this.button) {
      this.button.dataset.count = String(itemCount);
      this.button.textContent = itemCount > 0 ? `View cart (${itemCount})` : 'View cart';
    }

    if (this.emptyMessage) {
      this.emptyMessage.hidden = aggregated.length > 0;
    }

    if (this.itemsList) {
      if (aggregated.length === 0) {
        this.itemsList.innerHTML = '';
      } else {
        const itemsMarkup = aggregated
          .map(
            (item) => `
              <li class="cart-modal__item" data-item-id="${item.Id}">
                <img src="${item.Image}" alt="${item.ImageAlt ?? item.Name}" />
                <div class="cart-modal__details">
                  <h3>${item.Name}</h3>
                  <p class="cart-modal__quantity">Quantity: ${item.quantity}</p>
                  <p class="cart-modal__price">${formatCurrency(item.Price * item.quantity)}</p>
                </div>
                <button class="cart-modal__remove" type="button" aria-label="Remove ${item.Name} from cart">&times;</button>
              </li>
            `
          )
          .join('');
        this.itemsList.innerHTML = itemsMarkup;

        this.itemsList.querySelectorAll('.cart-modal__remove').forEach((button) => {
          button.addEventListener('click', this.handleRemove);
        });
      }
    }

    if (this.totalElement) {
      this.totalElement.textContent = formatCurrency(total);
    }
  }

  handleRemove(event) {
    const itemElement = event.currentTarget.closest('.cart-modal__item');
    const itemId = itemElement?.dataset.itemId;
    if (!itemId) return;

    const items = getLocalStorage(CART_KEY);
    if (!Array.isArray(items)) return;

    const updated = items.filter((item) => item.Id !== itemId);
    setLocalStorage(CART_KEY, updated);

    window.dispatchEvent(new CustomEvent('cart:updated'));
    this.updateState();
  }
}
