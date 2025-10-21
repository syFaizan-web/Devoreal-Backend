const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Create a test image file
const testImagePath = path.join(__dirname, 'test-fix-image.png');
if (!fs.existsSync(testImagePath)) {
  // Create a simple 1x1 pixel PNG
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x0f, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  fs.writeFileSync(testImagePath, pngBuffer);
}

async function testFix() {
  const form = new FormData();

  // Main product fields
  form.append('name', 'Fix Test Product');
  form.append('shortDescription', 'Testing the fix for all tabs');
  form.append('price', '99.99');

  // Add main image
  form.append('image', fs.createReadStream(testImagePath));

  // Test ALL tabs with JSON strings (as they are being sent from Postman)
  form.append(
    'basic',
    JSON.stringify({
      categoryId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      collectionId: 'c9b1f8a6-2f3e-4a6b-9db2-1a2b3c4d5e6f',
      brand: 'Test Brand',
      weight: 150.5,
      gender: 'Unisex',
      size: 'Medium',
      colors: ['red', 'blue'],
      colorName: 'Ocean Blue',
      description: 'This is a comprehensive test product description.',
      tagNumber: 'TEST-001',
      stock: 100,
      tags: ['test', 'sample'],
      slug: 'test-product-slug',
      status: 'active',
      visibility: 'PUBLIC',
      publishedAt: '2025-01-21T10:00:00.000Z',
      isSignaturePiece: false,
      isFeatured: true,
      signatureLabel: 'Test Collection',
      signatureStory: 'A short story describing the test collection.',
      allowBackorder: false,
      isPreorder: false,
      minOrderQty: 1,
      maxOrderQty: 10,
      leadTimeDays: 5,
      hsCode: '123.45',
      warrantyInfo: '1 year warranty',
      badges: ['new', 'featured'],
      sales: 50,
      quantity: 100,
    }),
  );

  form.append(
    'pricing',
    JSON.stringify({
      price: 99.99,
      priceUSD: 99.99,
      currency: 'USD',
      discount: 10,
      discountType: 'percentage',
      compareAtPrice: 119.99,
      saleStartAt: '2025-01-21T00:00:00.000Z',
      saleEndAt: '2025-02-21T23:59:59.000Z',
      discountLabel: '10% Off',
      tax: 8.5,
    }),
  );

  form.append(
    'media',
    JSON.stringify({
      images: ['uploads/image1.jpg', 'uploads/image2.jpg'],
      videoFile: 'uploads/product-video.mp4',
    }),
  );

  form.append(
    'seo',
    JSON.stringify({
      seoTitle: 'Test Product - Best Quality',
      seoDescription: 'High quality test product with excellent features',
      canonicalUrl: 'https://example.com/test-product',
      ogImage: 'https://example.com/og-image.jpg',
    }),
  );

  form.append(
    'attributesTag',
    JSON.stringify({
      attributes: '{"material":"cotton","color":"blue"}',
      tags: '["cotton","blue","comfortable"]',
    }),
  );

  form.append(
    'variants',
    JSON.stringify({
      variants: '["size-s","size-m","size-l"]',
    }),
  );

  form.append(
    'inventory',
    JSON.stringify({
      sku: 'TEST-SKU-001',
      barcode: '123456789012',
      inventoryQuantity: 100,
      lowStockThreshold: 10,
      reorderPoint: 20,
      reorderQuantity: 50,
      supplier: 'Test Supplier',
      supplierSku: 'SUP-TEST-001',
      costPrice: 50.0,
      margin: 50,
      location: 'Warehouse A',
      warehouse: 'Main Warehouse',
      binLocation: 'A1-B2',
      lastRestocked: '2025-01-15T10:00:00.000Z',
      nextRestockDate: '2025-02-15T10:00:00.000Z',
      inventoryStatus: 'in_stock',
      trackInventory: true,
      reservedQuantity: 5,
      availableQuantity: 95,
    }),
  );

  form.append(
    'reels',
    JSON.stringify({
      platform: 'Instagram',
      reelTitle: 'Test Product Reel',
      reelDescription: 'Amazing test product showcase',
      reelLanguage: 'en',
      captionsUrl: 'https://example.com/captions.vtt',
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      durationSec: 30,
      aspectRatio: '9:16',
      ctaUrl: 'https://example.com/buy-now',
      reelTags: 'test,product,amazing',
      isPublic: true,
      isPinned: false,
      reelOrder: 1,
    }),
  );

  form.append(
    'itemDetails',
    JSON.stringify({
      material: '100% Cotton',
      warranty: '1 Year Manufacturer Warranty',
      certification: 'ISO 9001',
      vendorName: 'Test Vendor',
      shippingFreeText: 'Free shipping on orders over $50',
      qualityGuaranteeText: '100% satisfaction guarantee',
      careInstructionsText: 'Machine wash cold, tumble dry low',
      didYouKnow: 'This product is eco-friendly',
      faqs: '[{"question":"What is the material?","answer":"100% Cotton"}]',
      sellerBlurb: 'We are committed to quality',
      trustBadges: '[{"name":"Quality Assured","icon":"quality.png"}]',
    }),
  );

  form.append(
    'shippingPolicies',
    JSON.stringify({
      shippingInfo: 'Standard shipping 3-5 business days',
      shippingNotes: 'Handle with care',
      packagingDetails: 'Eco-friendly packaging',
      returnPolicy: '30-day return policy',
      returnWindowDays: 30,
      returnFees: 5.99,
      isReturnable: true,
      exchangePolicy: 'Easy exchange within 30 days',
      warrantyPeriodMonths: 12,
      warrantyType: 'manufacturer',
      originCountry: 'USA',
      weightKg: 0.5,
      dimensions: '10x15x5 cm',
    }),
  );

  try {
    console.log('🔧 Testing the fix for all tabs...');
    console.log('📋 Sending JSON strings for all 10 tabs');

    const response = await fetch('http://localhost:5000/products', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ SUCCESS! Fix test completed:');
      console.log('📊 Main Product:', {
        id: result.productMain.id,
        name: result.productMain.name,
        image: result.productMain.image,
        price: result.productMain.price,
      });

      console.log('\n📋 Child Tabs Created:', result.childTabs.length);
      result.childTabs.forEach((tab, index) => {
        const tabName = Object.keys(tab)[0];
        console.log(`  ${index + 1}. ${tabName}: ${tab[tabName].id}`);
      });

      // Check which tabs are missing
      const expectedTabs = [
        'basic',
        'pricing',
        'media',
        'seo',
        'attributesTag',
        'variants',
        'inventory',
        'reels',
        'itemDetails',
        'shippingPolicies',
      ];
      const createdTabs = result.childTabs.map(tab => Object.keys(tab)[0]);

      console.log('\n🔍 Tab Status:');
      expectedTabs.forEach(tabName => {
        const isCreated = createdTabs.includes(tabName);
        console.log(
          `  ${isCreated ? '✅' : '❌'} ${tabName}: ${isCreated ? 'Created' : 'Missing'}`,
        );
      });

      const allTabsCreated = expectedTabs.every(tabName => createdTabs.includes(tabName));
      console.log(`\n🎯 Result: ${allTabsCreated ? 'ALL TABS CREATED!' : 'SOME TABS MISSING'}`);

      if (!allTabsCreated) {
        const missingTabs = expectedTabs.filter(tabName => !createdTabs.includes(tabName));
        console.log(`❌ Missing tabs: ${missingTabs.join(', ')}`);
      }

      // Check image path
      if (result.productMain.image) {
        console.log(`\n📷 Image path stored: ${result.productMain.image}`);
      } else {
        console.log(`\n❌ Image path is empty!`);
      }
    } else {
      console.error('❌ FAILED:', result);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  }
}

// Run the fix test
testFix();
