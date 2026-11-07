import type { ChangedFile } from './files'

const components = [
  'Address',
  'Avatar',
  'Badge',
  'Banner',
  'Basket',
  'Billing',
  'Brand',
  'Button',
  'Card',
  'Cart',
  'Checkout',
  'Coupon',
  'Delivery',
  'Discount',
  'Filter',
  'Footer',
  'Gallery',
  'Header',
  'Invoice',
  'Locale',
  'Loyalty',
  'Menu',
  'Order',
  'Payment',
  'Price',
  'Product',
  'Profile',
  'Promo',
  'Rating',
  'Receipt',
  'Refund',
  'Review',
  'Search',
  'Shipping',
  'Size',
  'Stock',
  'Store',
  'Tracking',
  'Voucher',
  'Wishlist',
]

const forms = ['', 'Item', 'List', 'Panel', 'Dialog']

/**
 * The 200 files that the runner lists for a turn that changed 247: one icon
 * import in each component. The runner counts the other 47.
 */
export const iconFiles: readonly ChangedFile[] = forms.flatMap((form) =>
  components.map((name): ChangedFile => ({
    path: `src/components/${name}${form}.tsx`,
    change: 'modified',
    added: 1,
    removed: 1,
  })),
)
