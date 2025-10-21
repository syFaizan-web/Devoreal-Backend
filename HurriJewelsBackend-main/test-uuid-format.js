const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Create a test image file
const testImagePath = path.join(__dirname, 'test-uuid-format-image.png');
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

async function testUuidFormat() {
  const form = new FormData();

  // Main product fields
  form.append('name', 'UUID Format Test Product');
  form.append('shortDescription', 'Testing UUID format for product IDs');
  form.append('price', '99.99');

  // Add main image
  form.append('image', fs.createReadStream(testImagePath));

  // Test basic tab
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
      description: 'This is a test product for UUID format.',
      tagNumber: 'TEST-UUID-001',
      stock: 100,
      tags: ['test', 'uuid'],
      slug: 'test-uuid-product-slug',
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
      currency: 'USD',
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
    'variants',
    JSON.stringify({
      variants: '["size-s","size-m","size-l"]',
    }),
  );

  try {
    console.log('🔧 Testing UUID format for product IDs...');
    console.log('📋 Expected format: f47ac10b-58cc-4372-a567-0e02b2c3d479');

    const response = await fetch('http://localhost:5000/products', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ SUCCESS! UUID format test completed:');
      console.log('📊 Main Product:', {
        id: result.productMain.id,
        name: result.productMain.name,
        image: result.productMain.image,
        price: result.productMain.price,
      });

      // Check if the ID is in UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuidFormat = uuidRegex.test(result.productMain.id);

      console.log(`\n🔍 ID Format Check:`);
      console.log(`  ID: ${result.productMain.id}`);
      console.log(`  Format: ${isUuidFormat ? '✅ UUID Format' : '❌ Not UUID Format'}`);
      console.log(`  Expected: f47ac10b-58cc-4372-a567-0e02b2c3d479`);

      console.log('\n📋 Child Tabs Created:', result.childTabs.length);
      result.childTabs.forEach((tab, index) => {
        const tabName = Object.keys(tab)[0];
        const tabId = tab[tabName].id;
        const isTabUuidFormat = uuidRegex.test(tabId);
        console.log(`  ${index + 1}. ${tabName}: ${tabId} ${isTabUuidFormat ? '✅' : '❌'}`);
      });

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

// Run the UUID format test
testUuidFormat();
