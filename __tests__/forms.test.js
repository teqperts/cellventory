// __tests__/forms.test.js

describe('Form Validation & Sanitization Business Logic', () => {
  const sanitizeItemInput = (raw) => {
    const { category, name, brand, model, part_type, quantity, cost_price, selling_price, notes } = raw;

    if (!category || !category.trim()) {
      return { valid: false, error: 'Category is required' };
    }

    if (!name || !name.trim()) {
      return { valid: false, error: 'Item Name is required' };
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return { valid: false, error: 'Quantity must be a positive integer greater than 0' };
    }

    const parsedCost = cost_price !== undefined && cost_price !== '' && !isNaN(cost_price)
      ? parseFloat(cost_price)
      : 0;

    const parsedSelling = selling_price !== undefined && selling_price !== '' && !isNaN(selling_price)
      ? parseFloat(selling_price)
      : 0;

    return {
      valid: true,
      data: {
        category: category.trim(),
        name: name.trim(),
        brand: (brand || '').trim(),
        model: (model || '').trim(),
        part_type: category === 'Spare Part' ? (part_type || '').trim() : '',
        quantity: parsedQty,
        cost_price: parsedCost,
        selling_price: parsedSelling,
        notes: (notes || '').trim(),
      },
    };
  };

  it('validates required category', () => {
    const res = sanitizeItemInput({ category: '', name: 'Screen', quantity: '1' });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Category is required');
  });

  it('validates required name', () => {
    const res = sanitizeItemInput({ category: 'Accessory', name: '  ', quantity: '1' });
    expect(res.valid).toBe(false);
    expect(res.error).toBe('Item Name is required');
  });

  it('validates quantity is a positive integer', () => {
    expect(sanitizeItemInput({ category: 'Mobile', name: 'iPhone', quantity: '0' }).valid).toBe(false);
    expect(sanitizeItemInput({ category: 'Mobile', name: 'iPhone', quantity: '-5' }).valid).toBe(false);
    expect(sanitizeItemInput({ category: 'Mobile', name: 'iPhone', quantity: 'abc' }).valid).toBe(false);
    expect(sanitizeItemInput({ category: 'Mobile', name: 'iPhone', quantity: '10' }).valid).toBe(true);
  });

  it('prevents NaN in prices when left empty or blank', () => {
    const res = sanitizeItemInput({
      category: 'Mobile',
      name: 'Google Pixel 8',
      quantity: '3',
      cost_price: '',
      selling_price: '',
    });

    expect(res.valid).toBe(true);
    expect(res.data.cost_price).toBe(0);
    expect(res.data.selling_price).toBe(0);
    expect(Number.isNaN(res.data.cost_price)).toBe(false);
    expect(Number.isNaN(res.data.selling_price)).toBe(false);
  });

  it('correctly sets part_type only when category is Spare Part', () => {
    const resPart = sanitizeItemInput({
      category: 'Spare Part',
      name: 'OLED Display',
      part_type: 'Display',
      quantity: '5',
    });
    expect(resPart.data.part_type).toBe('Display');

    const resMobile = sanitizeItemInput({
      category: 'Mobile',
      name: 'iPhone 12',
      part_type: 'Display',
      quantity: '1',
    });
    expect(resMobile.data.part_type).toBe('');
  });
});
