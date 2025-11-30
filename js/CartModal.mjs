import { CART_KEY, getLocalStorage, setLocalStorage, formatCurrency } from './utils.mjs';

const MIN_QUANTITY = 1;

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

function sanitizeQuantity(value) {
  const number = Number(value);
  if (Number.isNaN(number) || number < MIN_QUANTITY) return MIN_QUANTITY;
  return Math.floor(number);
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
    this.emptyButton = this.modal?.querySelector('[data-cart-empty]');
    this.continueButton = this.modal?.querySelector('[data-cart-continue]');

    this.updateState = this.updateState.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleQuantityButton = this.handleQuantityButton.bind(this);
    this.handleQuantityInput = this.handleQuantityInput.bind(this);
    this.handleEmptyCart = this.handleEmptyCart.bind(this);
    this.handleContinueShopping = this.handleContinueShopping.bind(this);
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

    if (this.emptyButton) {
      this.emptyButton.addEventListener('click', this.handleEmptyCart);
    }

    if (this.continueButton) {
      this.continueButton.addEventListener('click', this.handleContinueShopping);
    }

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

  saveItems(items) {
    setLocalStorage(CART_KEY, items);
    window.dispatchEvent(new CustomEvent('cart:updated'));
  }

  updateItemQuantity(itemId, quantity) {
    const sanitized = sanitizeQuantity(quantity);
    const aggregated = aggregateCartItems(this.getItems());
    const updated = aggregated
      .map((item) => (item.Id === itemId ? { ...item, quantity: sanitized } : item))
      .filter((item) => item.quantity >= MIN_QUANTITY);

    this.saveItems(updated);
    this.updateState();
  }

  adjustItemQuantity(itemId, delta) {
    const aggregated = aggregateCartItems(this.getItems());
    const updated = aggregated
      .map((item) => {
        if (item.Id !== itemId) return item;
        const nextQuantity = sanitizeQuantity((item.quantity ?? MIN_QUANTITY) + delta);
        return { ...item, quantity: nextQuantity };
      })
      .filter((item) => item.quantity >= MIN_QUANTITY);

    this.saveItems(updated);
    this.updateState();
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
                  <div class="cart-modal__details-header">
                    <h3>${item.Name}</h3>
                    <button class="cart-modal__remove" type="button" aria-label="Remove ${item.Name} from cart">&times;</button>
                  </div>
                  <p class="cart-modal__price">${formatCurrency(item.Price)}</p>
                  <div class="cart-modal__quantity-control" aria-label="Quantity for ${item.Name}">
                    <button class="quantity-btn" type="button" data-quantity="decrease">−</button>
                    <input
                      class="quantity-input"
                      type="number"
                      min="${MIN_QUANTITY}"
                      value="${item.quantity}"
                      inputmode="numeric"
                      aria-label="Quantity input for ${item.Name}"
                    />
                    <button class="quantity-btn" type="button" data-quantity="increase">+</button>
                  </div>
                  <p class="cart-modal__subtotal">Subtotal: ${formatCurrency(item.Price * item.quantity)}</p>
                </div>
              </li>
            `
          )
          .join('');
        this.itemsList.innerHTML = itemsMarkup;

        this.itemsList.querySelectorAll('.cart-modal__remove').forEach((button) => {
          button.addEventListener('click', this.handleRemove);
        });

        this.itemsList.querySelectorAll('.quantity-btn').forEach((button) => {
          button.addEventListener('click', this.handleQuantityButton);
        });

        this.itemsList.querySelectorAll('.quantity-input').forEach((input) => {
          input.addEventListener('change', this.handleQuantityInput);
          input.addEventListener('blur', this.handleQuantityInput);
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

    const aggregated = aggregateCartItems(this.getItems());
    const updated = aggregated.filter((item) => item.Id !== itemId);
    this.saveItems(updated);
    this.updateState();
  }

  handleQuantityButton(event) {
    const button = event.currentTarget;
    const itemElement = button.closest('.cart-modal__item');
    const itemId = itemElement?.dataset.itemId;
    if (!itemId) return;

    const action = button.dataset.quantity;
    const delta = action === 'decrease' ? -1 : 1;
    this.adjustItemQuantity(itemId, delta);
  }

  handleQuantityInput(event) {
    const input = event.currentTarget;
    const itemElement = input.closest('.cart-modal__item');
    const itemId = itemElement?.dataset.itemId;
    if (!itemId) return;

    const nextValue = sanitizeQuantity(input.value);
    input.value = String(nextValue);
    this.updateItemQuantity(itemId, nextValue);
  }

  handleEmptyCart() {
    this.saveItems([]);
    this.updateState();
  }

  handleContinueShopping() {
    this.close();
    this.button?.focus();
  }
}
