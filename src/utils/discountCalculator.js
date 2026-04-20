/**
 * Calculate Senior/PWD discounts with VAT-inclusive pricing
 * 
 * Rules:
 * - Prices are VAT-inclusive (12%)
 * - Senior/PWD discount = 20% AFTER removing VAT
 * - Discount applies ONLY to selected quantities per item (discountQty)
 * - Maximum total discount cap: ₱250 per transaction
 * 
 * @param {Array} cart - Cart items with structure: {product_id, name, price, qty, discountQty}
 * @returns {Object} Discount calculation result
 */
export const calculateSeniorPWDDiscount = async (cart) => {
  try {
    // Validation
    if (!Array.isArray(cart) || cart.length === 0) {
      throw new Error('Cart must be a non-empty array');
    }

    const items = [];
    let subtotal = 0;
    let totalDiscountAmount = 0;

    // Process each item
    for (const item of cart) {
      // Validate required fields
      if (!item.product_id || !item.name || item.price === undefined || item.qty === undefined) {
        throw new Error(`Invalid item: missing required fields for ${item.name || 'unknown'}`);
      }

      const price = Number(item.price);
      const qty = Number(item.qty);
      let discountQty = Number(item.discountQty) || 0;

      // Validation rules
      if (price < 0) throw new Error(`Invalid price for ${item.name}: price cannot be negative`);
      if (qty < 0) throw new Error(`Invalid quantity for ${item.name}: qty cannot be negative`);
      if (discountQty < 0) throw new Error(`Invalid discount quantity for ${item.name}: discountQty cannot be negative`);
      if (discountQty > qty) {
        console.warn(`⚠️ discountQty (${discountQty}) exceeds qty (${qty}) for ${item.name}. Capping to qty.`);
        discountQty = qty;
      }

      // Calculate per item
      const normalQty = qty - discountQty;

      // For discounted portion
      const vatExemptPrice = price / 1.12;
      const discountedPrice = vatExemptPrice * 0.8; // 20% discount
      const discountedTotal = discountedPrice * discountQty;

      // For non-discounted portion
      const normalTotal = price * normalQty;

      // Item totals
      const itemTotal = discountedTotal + normalTotal;
      const originalItemTotal = price * qty;
      const itemDiscountAmount = originalItemTotal - itemTotal;

      subtotal += originalItemTotal;
      totalDiscountAmount += itemDiscountAmount;

      items.push({
        product_id: item.product_id,
        name: item.name,
        qty,
        discountQty,
        normalQty,
        price,
        vatExemptPrice: parseFloat(vatExemptPrice.toFixed(2)),
        discountedPrice: parseFloat(discountedPrice.toFixed(2)),
        originalTotal: parseFloat(originalItemTotal.toFixed(2)),
        discountedTotal: parseFloat(discountedTotal.toFixed(2)),
        normalTotal: parseFloat(normalTotal.toFixed(2)),
        itemTotal: parseFloat(itemTotal.toFixed(2)),
        discountAmount: parseFloat(itemDiscountAmount.toFixed(2)),
      });
    }

    // Apply discount cap (₱250 max)
    const DISCOUNT_CAP = 250;
    let appliedDiscount = totalDiscountAmount;
    if (totalDiscountAmount > DISCOUNT_CAP) {
      console.warn(`⚠️ Total discount (₱${totalDiscountAmount.toFixed(2)}) exceeds cap (₱${DISCOUNT_CAP}). Capping to ₱${DISCOUNT_CAP}.`);
      appliedDiscount = DISCOUNT_CAP;
    }

    const totalPayable = subtotal - appliedDiscount;

    return {
      success: true,
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscountCalculated: parseFloat(totalDiscountAmount.toFixed(2)),
      totalDiscountApplied: parseFloat(appliedDiscount.toFixed(2)),
      discountCapped: appliedDiscount < totalDiscountAmount,
      discountCapAmount: DISCOUNT_CAP,
      totalPayable: parseFloat(totalPayable.toFixed(2)),
      items,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
};

/**
 * Convenience function to validate and prepare cart for checkout
 * @param {Array} cart - Raw cart data
 * @returns {Object} Validation result
 */
export const validateCartForDiscount = async (cart) => {
  if (!Array.isArray(cart)) {
    return { valid: false, message: 'Cart must be an array' };
  }

  if (cart.length === 0) {
    return { valid: false, message: 'Cart is empty' };
  }

  for (const item of cart) {
    if (!item.product_id || !item.name || item.price === undefined || item.qty === undefined) {
      return { valid: false, message: `Item missing required fields: ${JSON.stringify(item)}` };
    }

    if (Number(item.discountQty) > Number(item.qty)) {
      return { 
        valid: false, 
        message: `Discount quantity exceeds item quantity for ${item.name}` 
      };
    }

    if (Number(item.qty) <= 0) {
      return { valid: false, message: `Invalid quantity for ${item.name}` };
    }
  }

  return { valid: true };
};
