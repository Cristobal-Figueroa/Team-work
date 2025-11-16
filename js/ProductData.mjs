function convertToJson(res) {
  if (res.ok) {
    return res.json();
  }
  throw new Error('Bad Response');
}

export default class ProductData {
  constructor(category = 'tents') {
    this.category = category;
    this.basePath = './json';
    this.path = `${this.basePath}/${this.category}.json`;
  }

  async getData() {
    const response = await fetch(this.path);
    return convertToJson(response);
  }

  async findProductById(id) {
    const products = await this.getData();
    return products.find((item) => item.Id === id);
  }
}
