import ProductData from './ProductData.mjs';
import ProductDetails from './ProductDetails.mjs';
import CartModal from './CartModal.mjs';
import { getParam, formatCurrency } from './utils.mjs';

const cartModal = new CartModal();
cartModal.init();

const appContainer = document.getElementById('app');
const statusElement = document.getElementById('appStatus');
const pageTitle = document.getElementById('pageTitle');
const pageLead = document.getElementById('pageLead');

const queryCategory = getParam('category');
const queryProduct = getParam('product');

const DEFAULT_CATEGORY = 'tents';

const categories = [
  {
    id: 'tents',
    name: 'Tents',
    description: 'Weather-ready shelters for every expedition.',
    icon: '⛺',
  },
  {
    id: 'backpacks',
    name: 'Backpacks',
    description: 'Ergonomic packs to carry everything you need.',
    icon: '🎒',
  },
  {
    id: 'sleeping-bags',
    name: 'Sleeping Bags',
    description: 'Thermal rest for a cozy night outdoors.',
    icon: '🛏️',
  },
  {
    id: 'hammocks',
    name: 'Hammocks',
    description: 'Relax under the stars with ultimate comfort.',
    icon: '🪢',
  },
];

function setStatus(message) {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.hidden = !message;
}

function ensureContainer() {
  if (!appContainer) {
    console.warn('App container not found');
    return false;
  }
  appContainer.innerHTML = '';
  return true;
}

function titleCase(value = '') {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function renderHome() {
  if (!ensureContainer()) return;

  if (pageTitle) pageTitle.textContent = 'GearUp Adventures';
  if (pageLead) {
    pageLead.textContent =
      'Discover the best gear to sleep outside and choose the category that fits your next adventure.';
  }

  const markup = `
    <section class="category-grid">
      ${categories
        .map(
          (category) => `
            <article class="category-card">
              <div class="category-card__icon" aria-hidden="true">${category.icon}</div>
              <h2>${category.name}</h2>
              <p>${category.description}</p>
              <a class="button" href="./index.html?category=${category.id}">
                Shop ${category.name}
              </a>
            </article>
          `
        )
        .join('')}
    </section>
  `;

  appContainer.innerHTML = markup;
  setStatus('');
}

function renderProducts(products = [], category = DEFAULT_CATEGORY) {
  if (!appContainer) return;

  if (!products.length) {
    appContainer.innerHTML = `
      <section class="product-grid product-grid--empty">
        <p>No products found for the selected category.</p>
      </section>
    `;
    return;
  }

  const markup = `
    <section class="product-grid">
      ${products
        .map(
          (product) => `
            <article class="product-card">
              <img src="${product.Image}" alt="${product.ImageAlt ?? product.Name}" />
              <div class="product-card__body">
                <h2>${product.Name}</h2>
                <p>${product.Tagline ?? product.Description ?? ''}</p>
                <p class="product-card__price">${formatCurrency(product.Price)}</p>
                <a class="button" href="./index.html?category=${category}&product=${product.Id}">
                  View details
                </a>
              </div>
            </article>
          `
        )
        .join('')}
    </section>
  `;

  appContainer.innerHTML = markup;
}

async function renderListing(categoryParam) {
  const category = categoryParam ?? DEFAULT_CATEGORY;
  if (!ensureContainer()) return;

  const displayName = titleCase(category);
  if (pageTitle) pageTitle.textContent = `Top Products: ${displayName}`;
  if (pageLead) {
    pageLead.textContent = `Explore the best of our ${displayName} collection.`;
  }

  setStatus('Loading products…');

  const dataSource = new ProductData(category);

  try {
    const products = await dataSource.getData();
    renderProducts(products, category);
    setStatus(products.length ? '' : 'No products available for this category.');
  } catch (error) {
    console.error('Unable to load products', error);
    appContainer.innerHTML = `
      <section class="product-grid product-grid--error">
        <p>We had a problem loading the products. Please try again later.</p>
      </section>
    `;
    setStatus('Error loading products.');
  }
}

async function renderDetail(productId, categoryParam) {
  const category = categoryParam ?? DEFAULT_CATEGORY;
  if (!ensureContainer()) return;

  if (pageTitle) pageTitle.textContent = 'Product details';
  if (pageLead) {
    pageLead.textContent = 'See everything about the product you selected.';
  }

  appContainer.innerHTML = `
    <section class="product-details">
      <a class="button button--ghost product-details__back" href="./index.html?category=${category}">
        ← Back to ${titleCase(category)}
      </a>
      <h2 id="productName" class="product-details__title">Loading…</h2>
      <p id="productTagline" class="product-details__tagline"></p>
      <div id="productDetails"></div>
      <p id="cartConfirmation" class="product-card__confirmation"></p>
    </section>
  `;

  setStatus('Loading product details…');

  const dataSource = new ProductData(category);
  const details = new ProductDetails(productId, dataSource, {
    heading: '#productName',
    tagline: '#productTagline',
    container: '#productDetails',
    confirmation: '#cartConfirmation',
  });

  try {
    await details.init();
    setStatus('');
  } catch (error) {
    console.error('Unable to load product detail', error);
    setStatus('We could not load the product details.');
  }
}

function bootstrap() {
  if (queryProduct) {
    renderDetail(queryProduct, queryCategory);
    return;
  }

  if (queryCategory) {
    renderListing(queryCategory);
    return;
  }

  renderHome();
}

bootstrap();
