import { ProductData } from '../types';

export async function fetchProductByBarcode(barcode: string): Promise<ProductData | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      return {
        name: p.product_name || 'Unknown Product',
        ingredients: p.ingredients_text || '',
        image: p.image_front_url,
        brand: p.brands,
        nutriscore: p.nutriscore_grade,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}
