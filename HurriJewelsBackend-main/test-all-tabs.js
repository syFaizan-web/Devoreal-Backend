const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Create a test image file
const testImagePath = path.join(__dirname, 'test-image.png');
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

async function testAllTabs() {
  const form = new FormData();

  // Main product fields
  form.append('name', 'Complete Test Product');
  form.append('shortDescription', 'A comprehensive test product with all tabs');
  form.append('price', '199.99');

  // Add main image
  form.append('mainImage', fs.createReadStream(testImagePath));

  // Add multiple images for media tab
  form.append('images', fs.createReadStream(testImagePath));
  form.append('images', fs.createReadStream(testImagePath));

  // Basic Tab - ALL FIELDS
  form.append('basic[categoryId]', 'test-category-id');
  form.append('basic[collectionId]', 'test-collection-id');
  form.append('basic[signaturePieceId]', 'test-signature-id');
  form.append('basic[brand]', 'Test Brand');
  form.append('basic[weight]', '150');
  form.append('basic[gender]', 'Unisex');
  form.append('basic[size]', 'M');
  form.append('basic[colors]', '["Red", "Blue", "Green"]');
  form.append('basic[colorName]', 'Multi-Color');
  form.append('basic[description]', 'Complete test product description');
  form.append('basic[tagNumber]', 'TAG001');
  form.append('basic[stock]', '100');
  form.append('basic[tags]', '["test", "premium", "jewelry"]');
  form.append('basic[slug]', 'complete-test-product');
  form.append('basic[status]', 'active');
  form.append('basic[visibility]', 'PUBLIC');
  form.append('basic[publishedAt]', '2025-01-01T00:00:00Z');
  form.append('basic[isSignaturePiece]', 'true');
  form.append('basic[isFeatured]', 'true');
  form.append('basic[signatureLabel]', 'Premium Collection');
  form.append('basic[signatureStory]', 'Handcrafted with love');
  form.append('basic[allowBackorder]', 'true');
  form.append('basic[isPreorder]', 'false');
  form.append('basic[minOrderQty]', '1');
  form.append('basic[maxOrderQty]', '10');
  form.append('basic[leadTimeDays]', '7');
  form.append('basic[hsCode]', '711319');
  form.append('basic[warrantyInfo]', '2 years warranty');
  form.append('basic[badges]', '[{"title":"Eco-friendly"},{"title":"Handmade"}]');
  form.append('basic[sales]', '50');
  form.append('basic[quantity]', '100');
  form.append('basic[reviewUi]', 'stars');
  form.append('basic[soldUi]', 'counter');

  // Pricing Tab - ALL FIELDS
  form.append('pricing[price]', '199.99');
  form.append('pricing[priceUSD]', '19.99');
  form.append('pricing[currency]', 'PKR');
  form.append('pricing[discount]', '10');
  form.append('pricing[discountType]', 'percentage');
  form.append('pricing[compareAtPrice]', '249.99');
  form.append('pricing[saleStartAt]', '2025-01-01T00:00:00Z');
  form.append('pricing[saleEndAt]', '2025-12-31T23:59:59Z');
  form.append('pricing[discountLabel]', 'Limited Time Offer');
  form.append('pricing[tax]', '5');

  // Media Tab - ALL FIELDS
  form.append('media[images]', '["image1.jpg", "image2.jpg"]');
  form.append('media[videoFile]', 'product-video.mp4');

  // SEO Tab - ALL FIELDS
  form.append('seo[seoTitle]', 'Complete Test Product - Premium Jewelry');
  form.append('seo[seoDescription]', 'Buy the best test product with complete features');
  form.append('seo[canonicalUrl]', 'https://example.com/products/complete-test-product');
  form.append('seo[ogImage]', 'https://example.com/og-image.jpg');

  // Attributes & Tags Tab - ALL FIELDS
  form.append('attributesTag[attributes]', '{"material":"Gold","purity":"18K","style":"Modern"}');
  form.append('attributesTag[tags]', '["jewelry","gold","premium","test"]');

  // Variants Tab - ALL FIELDS
  form.append('variants[variants]', '{"sizes":["S","M","L"],"colors":["Red","Blue"]}');

  // Inventory Tab - ALL FIELDS
  form.append('inventory[sku]', 'TEST-SKU-001');
  form.append('inventory[barcode]', '123456789012');
  form.append('inventory[inventoryQuantity]', '100');
  form.append('inventory[lowStockThreshold]', '10');
  form.append('inventory[reorderPoint]', '5');
  form.append('inventory[reorderQuantity]', '50');
  form.append('inventory[supplier]', 'Test Supplier');
  form.append('inventory[supplierSku]', 'SUP-SKU-001');
  form.append('inventory[costPrice]', '150.00');
  form.append('inventory[margin]', '25');
  form.append('inventory[location]', 'Warehouse A');
  form.append('inventory[warehouse]', 'Main Warehouse');
  form.append('inventory[binLocation]', 'A1-B2-C3');
  form.append('inventory[lastRestocked]', '2025-01-01T00:00:00Z');
  form.append('inventory[nextRestockDate]', '2025-02-01T00:00:00Z');
  form.append('inventory[inventoryStatus]', 'in_stock');
  form.append('inventory[trackInventory]', 'true');
  form.append('inventory[reservedQuantity]', '5');
  form.append('inventory[availableQuantity]', '95');

  // Reels Tab - ALL FIELDS
  form.append('reels[platform]', 'Instagram');
  form.append('reels[reelTitle]', 'Test Product Showcase');
  form.append('reels[reelDescription]', 'Amazing test product in action');
  form.append('reels[reelLanguage]', 'en');
  form.append('reels[captionsUrl]', 'https://example.com/captions.vtt');
  form.append('reels[thumbnailUrl]', 'https://example.com/thumbnail.jpg');
  form.append('reels[durationSec]', '30');
  form.append('reels[aspectRatio]', '9:16');
  form.append('reels[ctaUrl]', 'https://example.com/buy-now');
  form.append('reels[reelTags]', '#jewelry #premium #test');
  form.append('reels[isPublic]', 'true');
  form.append('reels[isPinned]', 'false');
  form.append('reels[reelOrder]', '1');

  // Item Details Tab - ALL FIELDS
  form.append('itemDetails[material]', '18K Gold');
  form.append('itemDetails[warranty]', '2 years manufacturer warranty');
  form.append('itemDetails[certification]', 'ISO 9001 certified');
  form.append('itemDetails[vendorName]', 'Premium Jewelry Co.');
  form.append('itemDetails[shippingFreeText]', 'Free shipping on orders over $100');
  form.append('itemDetails[qualityGuaranteeText]', '100% satisfaction guarantee');
  form.append('itemDetails[careInstructionsText]', 'Clean with soft cloth, avoid chemicals');
  form.append('itemDetails[didYouKnow]', 'This product is handcrafted by master artisans');
  form.append(
    'itemDetails[faqs]',
    '[{"q":"What is the return policy?","a":"30 days return policy"}]',
  );
  form.append('itemDetails[sellerBlurb]', 'We are passionate about creating beautiful jewelry');
  form.append(
    'itemDetails[trustBadges]',
    '[{"title":"Eco-friendly","icon":"leaf"},{"title":"Handmade","icon":"hand"}]',
  );

  // Shipping & Policies Tab - ALL FIELDS
  form.append('shippingPolicies[shippingInfo]', 'Standard shipping 3-5 business days');
  form.append('shippingPolicies[shippingNotes]', 'Handle with care, fragile item');
  form.append('shippingPolicies[packagingDetails]', 'Gift box with protective padding');
  form.append('shippingPolicies[returnPolicy]', '30 days return policy');
  form.append('shippingPolicies[returnWindowDays]', '30');
  form.append('shippingPolicies[returnFees]', '5.00');
  form.append('shippingPolicies[isReturnable]', 'true');
  form.append('shippingPolicies[exchangePolicy]', 'Free exchange within 30 days');
  form.append('shippingPolicies[warrantyPeriodMonths]', '24');
  form.append('shippingPolicies[warrantyType]', 'manufacturer');
  form.append('shippingPolicies[originCountry]', 'Pakistan');
  form.append('shippingPolicies[weightKg]', '0.1');
  form.append('shippingPolicies[dimensions]', '5x3x2 cm');

  try {
    console.log('🚀 Testing product creation with ALL tabs...');

    const response = await fetch('http://localhost:5000/products', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
      },
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! Product created with all tabs:');
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

      // Verify all 10 tabs are present
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

      console.log('\n🔍 Tab Verification:');
      expectedTabs.forEach(tabName => {
        const isCreated = createdTabs.includes(tabName);
        console.log(
          `  ${isCreated ? '✅' : '❌'} ${tabName}: ${isCreated ? 'Created' : 'Missing'}`,
        );
      });

      const allTabsCreated = expectedTabs.every(tabName => createdTabs.includes(tabName));
      console.log(
        `\n🎯 Result: ${allTabsCreated ? 'ALL TABS CREATED SUCCESSFULLY!' : 'SOME TABS MISSING'}`,
      );
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

// Run the test
testAllTabs();
