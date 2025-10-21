const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Create a test image file
const testImagePath = path.join(__dirname, 'debug-test-image.png');
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

async function debugTest() {
  const form = new FormData();

  // Main product fields
  form.append('name', 'Debug Test Product');
  form.append('shortDescription', 'Debug test product');
  form.append('price', '99.99');

  // Add main image
  form.append('mainImage', fs.createReadStream(testImagePath));

  // Add multiple images for media tab
  form.append('images', fs.createReadStream(testImagePath));

  // Test ALL tabs with minimal data
  form.append('basic[brand]', 'Debug Brand');
  form.append('basic[weight]', '100');
  form.append('basic[gender]', 'Unisex');

  form.append('pricing[price]', '99.99');
  form.append('pricing[currency]', 'PKR');

  form.append('media[images]', '["test1.jpg", "test2.jpg"]');
  form.append('media[videoFile]', 'test-video.mp4');

  form.append('seo[seoTitle]', 'Debug Test Product');
  form.append('seo[seoDescription]', 'Debug test product description');

  form.append('attributesTag[attributes]', '{"test":"value"}');
  form.append('attributesTag[tags]', '["debug", "test"]');

  form.append('variants[variants]', '{"sizes":["S","M"]}');

  form.append('inventory[sku]', 'DEBUG-SKU-001');
  form.append('inventory[barcode]', '123456789');

  form.append('reels[platform]', 'Instagram');
  form.append('reels[reelTitle]', 'Debug Reel');

  form.append('itemDetails[material]', 'Test Material');
  form.append('itemDetails[warranty]', '1 year');

  form.append('shippingPolicies[shippingInfo]', 'Standard shipping');
  form.append('shippingPolicies[returnPolicy]', '30 days return');

  try {
    console.log('🔍 Debug test - sending minimal data for all tabs...');

    const response = await fetch('http://localhost:5000/products', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! Debug test completed:');
      console.log('📊 Main Product:', {
        id: result.productMain.id,
        name: result.productMain.name,
        image: result.productMain.image,
        price: result.productMain.price,
      });

      console.log('📋 Child Tabs Created:', result.childTabs.length);
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

// Run the debug test
debugTest();
