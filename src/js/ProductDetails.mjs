import { CART_KEY, setLocalStorage, getLocalStorage, formatCurrency } from './utils.mjs';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export default class ProductDetails {
  constructor(productId, dataSource) {
    this.productId = productId;
    this.product = null;
    this.dataSource = dataSource;
  }

  async init() {
    if (!this.productId) {
      this.renderError('The requested product was not found.');
      return;
    }

    try {
      this.product = await this.dataSource.findProductById(this.productId);
    } catch (error) {
      console.error('Unable to retrieve product data', error);
    }

    if (!this.product) {
      this.renderError('Product unavailable or incorrect ID.');
      return;
    }

    this.renderProductDetails();

    const addButton = document.getElementById('addToCart');
    if (addButton) {
      addButton.addEventListener('click', this.addToCart.bind(this));
    }
  }

  addToCart() {
    const currentCart = ensureArray(getLocalStorage(CART_KEY));
    currentCart.push({ ...this.product, quantity: 1 });
    setLocalStorage(CART_KEY, currentCart);

    window.dispatchEvent(new CustomEvent('cart:updated'));

    const confirmation = document.getElementById('cartConfirmation');
    if (confirmation) {
      confirmation.textContent = `${this.product.Name} was added to the cart.`;
      confirmation.classList.add('is-visible');
      setTimeout(() => confirmation.classList.remove('is-visible'), 2500);
    }
  }

  renderProductDetails() {
    const heading = document.getElementById('productName');
    const tagline = document.getElementById('productTagline');
    const container = document.getElementById('productDetails');

    if (heading) heading.textContent = this.product.Name;
    if (tagline) tagline.textContent = this.product.Tagline;

    if (!container) return;

    container.innerHTML = `
      <article class="product-card product-card--detail">
        <div class="product-card__media">
          <img src="${this.product.Image}" alt="${this.product.ImageAlt}" />
        </div>
        <div class="product-card__body">
          <p class="product-card__price">${formatCurrency(this.product.Price)}</p>
          <p class="product-card__description">${this.product.Description}</p>
          ${this.renderListSection('Key features', this.product.Features)}
          ${this.renderListSection('Included in the box', this.product.Includes)}
          <button id="addToCart" class="button button--primary" type="button">
            Add to cart
          </button>
          <p id="cartConfirmation" class="product-card__confirmation"></p>
        </div>
      </article>
    `;
  }

  renderListSection(title, data = []) {
    if (!data.length) {
      return '';
    }

    const items = data.map((item) => `<li>${item}</li>`).join('');
    return `
      <section class="product-card__section">
        <h3>${title}</h3>
        <ul>
          ${items}
        </ul>
      </section>
    `;
  }

  renderError(message) {
    const container = document.getElementById('productDetails');
    const heading = document.getElementById('productName');

    if (heading) heading.textContent = 'Product not found';
    if (!container) return;

    container.innerHTML = `
      <div class="product-card product-card--error">
        <p>${message}</p>
        <a class="button" href="../index.html">Back to catalog</a>
      </div>
    `;
  }
}
