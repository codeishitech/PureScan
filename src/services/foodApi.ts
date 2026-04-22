import { ProductData } from '../types';
import { MOCK_PRODUCTS } from '../mockProducts';

export async function fetchProductByBarcode(barcode: string): Promise<ProductData | null> {
  // Check mock database first
  if (MOCK_PRODUCTS[barcode]) {
    return MOCK_PRODUCTS[barcode];
  }

  try {
    const response = await fetch(`/api/food/${barcode}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

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
