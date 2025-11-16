import ProductData from './ProductData.mjs';
import CartModal from './CartModal.mjs';
import { getParam, formatCurrency } from './utils.mjs';

const DEFAULT_CATEGORY = 'tents';

function titleCase(value = '') {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function renderStatus(message, statusEl) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.hidden = !message;
}

function renderProducts(container, products = []) {
  if (!container) return;

  if (!products.length) {
    container.innerHTML = '';
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
            <a class="button" href="../product_pages/?product=${product.Id}">
              View details
            </a>
          </div>
        </article>
      `
    )
    .join('');

  container.innerHTML = markup;
}

async function initListings() {
  const category = getParam('category') ?? DEFAULT_CATEGORY;
  const title = document.getElementById('listingTitle');
  const tagline = document.getElementById('listingTagline');
  const listContainer = document.querySelector('[data-product-list]');
  const status = document.getElementById('listingStatus');

  if (title) {
    title.textContent = `Top Products${category ? `: ${titleCase(category)}` : ''}`;
  }

  if (tagline && category !== DEFAULT_CATEGORY) {
    tagline.textContent = `Curated gear from our ${titleCase(category)} collection.`;
  }

  renderStatus('Loading products…', status);

  const dataSource = new ProductData(category);

  try {
    const products = await dataSource.getData();
    renderProducts(listContainer, products);

    if (!products.length) {
      renderStatus('No products found for this category.', status);
    } else {
      renderStatus('', status);
    }
  } catch (error) {
    console.error('Unable to load products', error);
    renderProducts(listContainer, []);
    renderStatus('There was a problem loading the products. Please try again later.', status);
  }
}

const cartModal = new CartModal();
cartModal.init();

initListings();
