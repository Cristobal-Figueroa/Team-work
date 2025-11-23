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

const listingState = {
  category: DEFAULT_CATEGORY,
  products: [],
  minPrice: 0,
  maxPrice: 0,
  filters: {
    search: '',
    maxPrice: null,
  },
};

const SKELETON_CARD_COUNT = 6;

function createSkeletonMarkup(count = SKELETON_CARD_COUNT) {
  return Array.from({ length: count })
    .map(
      () => `
        <article class="product-card product-card--skeleton" aria-hidden="true">
          <div class="product-card__media skeleton-block"></div>
          <div class="product-card__body">
            <div class="skeleton-line skeleton-line--title"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line skeleton-line--short"></div>
            <div class="skeleton-button"></div>
          </div>
        </article>
      `
    )
    .join('');
}

function derivePriceRange(products = []) {
  if (!products.length) {
    return { min: 0, max: 0 };
  }

  const prices = products.map((item) => Number(item.Price) || 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

function normalizeText(value = '') {
  return value.toString().toLowerCase().trim();
}

function applyProductFilters(products = [], filters = listingState.filters) {
  const searchTerm = normalizeText(filters.search);
  const hasSearch = Boolean(searchTerm);
  const priceLimit = typeof filters.maxPrice === 'number' ? filters.maxPrice : null;

  return products.filter((product) => {
    const price = Number(product.Price) || 0;
    const matchesPrice = priceLimit ? price <= priceLimit + 0.0001 : true;

    if (!hasSearch) {
      return matchesPrice;
    }

    const haystack = normalizeText(`${product.Name} ${product.Tagline ?? ''} ${product.Description ?? ''}`);
    const matchesSearch = haystack.includes(searchTerm);

    return matchesSearch && matchesPrice;
  });
}

function renderProductGrid(container, products = [], category = DEFAULT_CATEGORY) {
  if (!container) return;

  if (!products.length) {
    container.innerHTML = `
      <section class="product-grid product-grid--empty">
        <p>No products found for the selected filters.</p>
      </section>
    `;
    return;
  }

  const markup = products
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
    .join('');

  container.innerHTML = `<section class="product-grid">${markup}</section>`;
}

function updateResultCount(element, total, filtered) {
  if (!element) return;

  if (total === 0) {
    element.textContent = 'No products available.';
    return;
  }

  const label = filtered === total ? `Showing ${filtered} product${filtered === 1 ? '' : 's'}` : `Showing ${filtered} of ${total} product${total === 1 ? '' : 's'}`;
  element.textContent = label;
}

function updatePriceIndicator(input, indicator, range = {}) {
  if (!indicator || !input) return;

  const maxBound = typeof range.max === 'number' ? range.max : listingState.maxPrice;
  const value = Number(input.value) || 0;

  if (!maxBound || value >= maxBound) {
    indicator.textContent = 'All prices';
  } else {
    indicator.textContent = `Up to ${formatCurrency(value, { minimumFractionDigits: 0 })}`;
  }
}

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

async function renderListing(categoryParam) {
  const category = categoryParam ?? DEFAULT_CATEGORY;
  if (!ensureContainer()) return;

  const displayName = titleCase(category);
  if (pageTitle) pageTitle.textContent = `Top Products: ${displayName}`;
  if (pageLead) {
    pageLead.textContent = `Explore the best of our ${displayName} collection.`;
  }

  const controlsMarkup = `
    <section class="product-toolbar" aria-label="Product filters">
      <div class="product-toolbar__group">
        <label class="field-label" for="productSearch">Search</label>
        <input
          id="productSearch"
          type="search"
          name="search"
          class="field-input"
          placeholder="Search by name or description"
          autocomplete="off"
        />
      </div>
      <div class="product-toolbar__group">
        <label class="field-label" for="priceFilter">Max price</label>
        <div class="range-control">
          <input id="priceFilter" type="range" min="0" max="0" value="0" step="10" />
          <span id="priceIndicator" class="range-control__value">All prices</span>
        </div>
      </div>
      <div class="product-toolbar__summary" id="productSummary" aria-live="polite"></div>
    </section>
    <div id="productListing" class="product-listing"></div>
  `;

  appContainer.innerHTML = controlsMarkup;

  const listingElement = document.getElementById('productListing');
  const searchInput = document.getElementById('productSearch');
  const priceInput = document.getElementById('priceFilter');
  const priceIndicator = document.getElementById('priceIndicator');
  const summaryElement = document.getElementById('productSummary');

  if (listingElement) {
    listingElement.innerHTML = `<section class="product-grid">${createSkeletonMarkup()}</section>`;
  }

  setStatus('Loading products…');

  const dataSource = new ProductData(category);

  try {
    const products = await dataSource.getData();

    listingState.category = category;
    listingState.products = products;
    listingState.filters = {
      search: '',
      maxPrice: null,
    };

    const { min, max } = derivePriceRange(products);
    listingState.minPrice = min;
    listingState.maxPrice = max;

    if (priceInput) {
      priceInput.min = String(min || 0);
      priceInput.max = String(max || 0);
      priceInput.value = String(max || 0);
      listingState.filters.maxPrice = max || null;
      updatePriceIndicator(priceInput, priceIndicator, { max });
    }

    const filtered = applyProductFilters(products, listingState.filters);
    if (listingElement) {
      renderProductGrid(listingElement, filtered, category);
    }
    updateResultCount(summaryElement, products.length, filtered.length);
    setStatus(products.length ? '' : 'No products available for this category.');

    if (searchInput) {
      searchInput.value = listingState.filters.search;
      searchInput.addEventListener('input', () => {
        listingState.filters.search = searchInput.value;
        const updated = applyProductFilters(listingState.products, listingState.filters);
        if (listingElement) {
          renderProductGrid(listingElement, updated, listingState.category);
        }
        updateResultCount(summaryElement, listingState.products.length, updated.length);
      });
    }

    if (priceInput) {
      priceInput.addEventListener('input', () => {
        const value = Number(priceInput.value) || listingState.maxPrice;
        listingState.filters.maxPrice = value >= listingState.maxPrice ? null : value;
        updatePriceIndicator(priceInput, priceIndicator, { max: listingState.maxPrice });
        const updated = applyProductFilters(listingState.products, listingState.filters);
        if (listingElement) {
          renderProductGrid(listingElement, updated, listingState.category);
        }
        updateResultCount(summaryElement, listingState.products.length, updated.length);
      });
    }
  } catch (error) {
    console.error('Unable to load products', error);
    if (listingElement) {
      listingElement.innerHTML = `
        <section class="product-grid product-grid--error">
          <p>We had a problem loading the products. Please try again later.</p>
        </section>
      `;
    }
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
