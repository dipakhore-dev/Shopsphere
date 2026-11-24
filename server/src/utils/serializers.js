/**
 * Explicit allow-list of user fields that may leave the server.
 * (An allow-list is safer than deleting sensitive fields: new fields added to
 * the schema later are private by default.)
 */
export function serializeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}

export function serializeCategory(category) {
  return {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
  };
}

const refId = (ref) => (ref && ref._id ? ref._id : ref);

/**
 * view = 'public'  -> what shoppers see
 * view = 'seller'  -> adds status, moderation and inventory fields (for the owner)
 * detail = false   -> lighter shape for listing cards
 */
export function serializeProduct(p, { view = 'public', detail = true } = {}) {
  const discountPercent =
    p.discountPrice != null && p.price > 0 ? Math.round(((p.price - p.discountPrice) / p.price) * 100) : 0;

  const out = {
    id: String(p._id),
    name: p.name,
    brand: p.brand,
    price: p.price,
    discountPrice: p.discountPrice ?? null,
    finalPrice: p.finalPrice,
    discountPercent,
    stock: p.stock,
    inStock: p.stock > 0,
    images: (p.images ?? []).map((i) => (view === 'seller' ? { url: i.url, publicId: i.publicId ?? null } : { url: i.url })),
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
    soldCount: p.soldCount,
    category: p.category?.name
      ? { id: String(refId(p.category)), name: p.category.name, slug: p.category.slug }
      : { id: String(refId(p.category)) },
    store: p.store?.storeName
      ? { id: String(refId(p.store)), storeName: p.store.storeName, slug: p.store.slug }
      : { id: String(refId(p.store)) },
    createdAt: p.createdAt,
  };

  if (detail) {
    out.description = p.description;
    out.specifications = (p.specifications ?? []).map((s) => ({ key: s.key, value: s.value }));
    out.tags = p.tags ?? [];
    out.updatedAt = p.updatedAt;
  }

  if (view === 'seller') {
    out.status = p.status;
    out.moderationStatus = p.moderationStatus;
    out.moderationReason = p.moderationReason ?? null;
    out.lowStockThreshold = p.lowStockThreshold;
    out.isLowStock = p.stock <= p.lowStockThreshold;
  }
  return out;
}

export function serializeAddress(a) {
  return {
    id: String(a._id),
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? '',
    landmark: a.landmark ?? '',
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    country: a.country,
    type: a.type,
    isDefault: a.isDefault,
  };
}

const CANCELLABLE = ['pending', 'confirmed', 'processing'];

export function serializeShipment(s) {
  return {
    id: String(s._id),
    store: { id: String(s.store), storeName: s.storeName },
    status: s.status,
    items: s.items.map((i) => ({
      productId: String(i.product),
      name: i.name,
      brand: i.brand ?? null,
      image: i.image ?? null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      unitFinalPrice: i.unitFinalPrice,
      lineTotal: i.lineTotal,
    })),
    subtotal: s.subtotal,
    shippingFee: s.shippingFee,
    total: s.total,
    statusHistory: (s.statusHistory ?? []).map((h) => ({ status: h.status, at: h.at, note: h.note ?? null })),
  };
}

export function serializeOrder(order, shipments = []) {
  const active = shipments.filter((s) => s.status !== 'cancelled');
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    total: order.total,
    shippingAddress: order.shippingAddress,
    placedAt: order.placedAt,
    cancelledAt: order.cancelledAt ?? null,
    cancellationReason: order.cancellationReason ?? null,
    canCancel: order.status !== 'cancelled' && active.length > 0 && active.every((s) => CANCELLABLE.includes(s.status)),
    shipments: shipments.map(serializeShipment),
  };
}
