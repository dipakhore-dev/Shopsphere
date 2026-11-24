/**
 * Development helper: creates categories, an APPROVED demo seller and ~24 demo products
 * so the storefront has something to show before the seller-application flow exists (Phase 5).
 *
 *   npm run seed:demo
 *
 * Safe to re-run: categories are upserted and the demo seller's products are rebuilt.
 * Refuses to run in production.
 */
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { SellerProfile } from '../models/SellerProfile.js';
import { User } from '../models/User.js';
import { ROLES, SELLER_STATUS } from '../utils/constants.js';
import { slugify } from '../utils/slug.js';

if (env.isProduction) {
  console.error('seed:demo is disabled in production.');
  process.exit(1);
}

const DEMO_EMAIL = 'demo.seller@shopsphere.test';

const CATEGORIES = [
  { name: 'Electronics', description: 'Audio, wearables and smart devices' },
  { name: 'Fashion', description: 'Clothing, footwear and accessories' },
  { name: 'Home & Kitchen', description: 'Cookware, decor and appliances' },
  { name: 'Books', description: 'Fiction, non-fiction and study guides' },
  { name: 'Beauty & Care', description: 'Skincare, grooming and wellness' },
  { name: 'Sports & Fitness', description: 'Gear for training and the outdoors' },
];

// [name, brand, price Rs, discount Rs | null, stock, tags, description]
const CATALOG = {
  Electronics: [
    ['Auralis Wireless Earbuds Pro', 'Auralis', 4999, 3499, 120, ['earbuds', 'bluetooth', 'audio'], 'Active noise cancelling earbuds with 28-hour battery life, fast charging and a pocket-sized case.'],
    ['NovaTech 20000mAh Power Bank', 'NovaTech', 2499, 1799, 300, ['power bank', 'charger'], 'Slim 22.5W fast-charging power bank with two USB-C ports and a digital battery display.'],
    ['Pulse Fit Smart Band 5', 'Pulse', 2999, null, 80, ['smartwatch', 'fitness', 'tracker'], 'AMOLED fitness band with heart-rate, SpO2 and sleep tracking. Water resistant to 50 metres.'],
    ['Orbit Bluetooth Speaker Mini', 'Orbit', 1999, 1499, 0, ['speaker', 'bluetooth', 'audio'], 'Portable speaker with 360-degree sound, 12-hour playtime and an IPX6 splash-proof body.'],
  ],
  Fashion: [
    ['Kora Cotton Crew T-Shirt (Pack of 2)', 'Kora', 1299, 899, 200, ['tshirt', 'cotton', 'menswear'], 'Soft 100% combed cotton t-shirts with a regular fit and reinforced collar that keeps its shape.'],
    ['Stride Everyday Running Shoes', 'Stride', 3499, 2599, 60, ['shoes', 'running', 'footwear'], 'Lightweight mesh running shoes with cushioned midsole and a durable grip outsole.'],
    ['Linea Slim Fit Denim Jeans', 'Linea', 2299, null, 90, ['jeans', 'denim'], 'Mid-rise stretch denim jeans with a tapered leg that stays comfortable all day.'],
    ['Haven Canvas Backpack 25L', 'Haven', 1799, 1299, 45, ['backpack', 'bag', 'travel'], 'Water-resistant canvas backpack with a padded laptop sleeve and three organiser pockets.'],
  ],
  'Home & Kitchen': [
    ['Hearth Non-Stick Cookware Set (5 pcs)', 'Hearth', 3999, 2799, 35, ['cookware', 'kitchen', 'non-stick'], 'Induction-friendly non-stick set with a kadhai, frying pan, tawa and two lids. PFOA free.'],
    ['Brewmate Electric Kettle 1.5L', 'Brewmate', 1499, 999, 150, ['kettle', 'appliance'], 'Stainless steel kettle with auto shut-off, boil-dry protection and a 1500W rapid heating element.'],
    ['Lumen Bedside Table Lamp', 'Lumen', 1299, null, 70, ['lamp', 'decor', 'lighting'], 'Dimmable LED lamp with a warm wooden base and three colour temperatures.'],
    ['Nest Memory Foam Pillow (Set of 2)', 'Nest', 2199, 1599, 0, ['pillow', 'bedding'], 'Contoured memory foam pillows that support the neck, with a washable breathable cover.'],
  ],
  Books: [
    ['The Quiet Compiler', 'Lantern Press', 599, 449, 500, ['programming', 'software', 'nonfiction'], 'A practical, readable guide to how compilers turn source code into running programs.'],
    ['Monsoon Letters', 'Lantern Press', 399, null, 250, ['fiction', 'novel'], 'A tender novel of two families and the letters that connect them across one long monsoon.'],
    ['Atlas of Small Habits', 'Parchment', 499, 379, 320, ['self help', 'habits'], 'Short, research-backed chapters on building routines that last, with weekly exercises.'],
    ['Geometry in Pictures (Class 10)', 'Parchment', 349, null, 400, ['study', 'maths', 'school'], 'Visual explanations and solved examples that make geometry easy to revise before exams.'],
  ],
  'Beauty & Care': [
    ['Dewdrop Vitamin C Face Serum 30ml', 'Dewdrop', 899, 649, 180, ['serum', 'skincare', 'vitamin c'], 'Lightweight brightening serum with 10% vitamin C and hyaluronic acid. Suitable for daily use.'],
    ['Terra Neem Herbal Shampoo 300ml', 'Terra', 349, null, 260, ['shampoo', 'herbal', 'haircare'], 'Sulphate-free neem and amla shampoo that cleanses gently and reduces scalp dryness.'],
    ['Smooth Edge Trimmer Kit', 'Smooth Edge', 1999, 1399, 55, ['trimmer', 'grooming'], 'Cordless trimmer with titanium blades, 90-minute runtime and five length guards.'],
    ['Calm Cloud Sunscreen SPF 50', 'Calm Cloud', 549, 449, 140, ['sunscreen', 'spf', 'skincare'], 'Non-greasy PA++++ sunscreen with no white cast, made for humid weather.'],
  ],
  'Sports & Fitness': [
    ['Ironleaf Yoga Mat 6mm', 'Ironleaf', 999, 699, 110, ['yoga', 'mat', 'fitness'], 'Anti-slip TPE yoga mat with alignment lines and a carry strap.'],
    ['Forge Adjustable Dumbbell Pair', 'Forge', 4999, 3999, 25, ['dumbbell', 'strength', 'weights'], 'Quick-adjust dumbbells from 2 to 12 kg per hand, with a compact storage tray.'],
    ['Swift Skipping Rope Pro', 'Swift', 499, null, 210, ['skipping', 'cardio', 'rope'], 'Ball-bearing speed rope with adjustable length and foam handles.'],
    ['Trailblazer 1L Insulated Bottle', 'Trailblazer', 899, 649, 175, ['bottle', 'insulated', 'hiking'], 'Double-wall steel bottle that keeps drinks cold for 24 hours or hot for 12.'],
  ],
};

const paise = (rupees) => Math.round(rupees * 100);

async function main() {
  await connectDB();

  // ----- categories -----
  const categoryBySlug = {};
  for (const [index, def] of CATEGORIES.entries()) {
    const existing = await Category.findOne({ name: def.name });
    const doc = existing ?? new Category(def);
    doc.set({ ...def, sortOrder: index, isActive: true });
    await doc.save();
    categoryBySlug[def.name] = doc;
  }

  // ----- demo seller -----
  let user = await User.findOne({ email: DEMO_EMAIL });
  let generatedPassword = null;
  if (!user) {
    generatedPassword = `${crypto.randomBytes(9).toString('base64url')}aA1`;
    user = await User.create({
      name: 'Demo Seller',
      email: DEMO_EMAIL,
      password: generatedPassword,
      role: ROLES.SELLER,
      isEmailVerified: true,
    });
  }

  let store = await SellerProfile.findOne({ user: user._id });
  if (!store) {
    store = await SellerProfile.create({
      user: user._id,
      storeName: 'Orbit & Co. Store',
      description: 'Demo store used for development.',
      status: SELLER_STATUS.APPROVED,
    });
  }

  // ----- products -----
  await Product.deleteMany({ seller: user._id });

  let index = 0;
  for (const [categoryName, items] of Object.entries(CATALOG)) {
    for (const [name, brand, price, discount, stock, tags, description] of items) {
      index += 1;
      await Product.create({
        seller: user._id,
        store: store._id,
        name,
        brand,
        description,
        category: categoryBySlug[categoryName]._id,
        tags,
        price: paise(price),
        ...(discount ? { discountPrice: paise(discount) } : {}),
        stock,
        // Placeholder artwork served by the React app itself (client/public/placeholders), so it works offline
        // and never depends on a third-party image site. Real uploads go through Cloudinary.
        images: ['a', 'b', 'c'].map((v) => ({ url: `/placeholders/${slugify(categoryName)}-${v}.svg` })),
        specifications: [
          { key: 'Brand', value: brand },
          { key: 'Warranty', value: categoryName === 'Books' ? 'Not applicable' : '1 year' },
          { key: 'Country of origin', value: 'India' },
        ],
        // DEMO numbers so sorting by rating/popularity can be tried. Ratings become real with reviews (Phase 5); soldCount now changes with real orders.
        averageRating: Math.min(5, Number((3.4 + ((index * 37) % 17) / 10).toFixed(1))),
        reviewCount: 12 + ((index * 53) % 400),
        soldCount: (index * 97) % 900,
      });
    }
  }

  console.log(`\nCategories: ${CATEGORIES.length}   Products: ${index}`);
  console.log('\nDemo seller login');
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(
    generatedPassword
      ? `  password: ${generatedPassword}   (shown once - save it)`
      : '  password: (account already existed - use the password printed the first time)',
  );
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
