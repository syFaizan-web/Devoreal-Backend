import { PrismaClient, ArticleStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedBlog() {
  try {
    console.log('🌱 Starting blog seeding...');

    // Check if data already exists
    const existingUser = await prisma.user.findFirst();
    if (!existingUser) {
      console.log('❌ No users found. Please run user seeding first.');
      return;
    }

    // Create authors
    console.log('👤 Creating authors...');
    const authors = await Promise.all([
      prisma.author.create({
        data: {
          userId: existingUser.id,
          displayName: 'Sarah Johnson',
          bio: 'Expert jewelry designer with over 10 years of experience in sustainable jewelry practices.',
          experience: '10+ years in jewelry design and sustainable practices',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.author.create({
        data: {
          userId: existingUser.id,
          displayName: 'Michael Chen',
          bio: 'E-commerce specialist focused on jewelry retail strategies and digital marketing.',
          experience: '8+ years in e-commerce and digital marketing',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
    ]);

    console.log(`✅ Created ${authors.length} authors`);

    // Create categories
    console.log('📂 Creating categories...');
    const categories = await Promise.all([
      prisma.articleCategory.create({
        data: {
          name: 'Jewelry Trends',
          slug: 'jewelry-trends',
          description: 'Latest trends and styles in jewelry design',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.articleCategory.create({
        data: {
          name: 'E-commerce',
          slug: 'e-commerce',
          description: 'E-commerce strategies and tips for jewelry businesses',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.articleCategory.create({
        data: {
          name: 'Gemstone Guide',
          slug: 'gemstone-guide',
          description: 'Comprehensive guides about different gemstones',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.articleCategory.create({
        data: {
          name: 'Care & Maintenance',
          slug: 'care-maintenance',
          description: 'Tips for caring and maintaining your jewelry',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.articleCategory.create({
        data: {
          name: 'Industry News',
          slug: 'industry-news',
          description: 'Latest news and updates from the jewelry industry',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.articleCategory.create({
        data: {
          name: 'Customer Stories',
          slug: 'customer-stories',
          description: 'Real stories from our customers and their jewelry journeys',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
    ]);

    console.log(`✅ Created ${categories.length} categories`);

    // Create tags
    console.log('🏷️ Creating tags...');
    const tags = await Promise.all([
      prisma.articleTag.create({
        data: {
          name: 'Sustainability',
          slug: 'sustainability',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.articleTag.create({
        data: {
          name: 'E-commerce',
          slug: 'ecommerce',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.articleTag.create({
        data: {
          name: 'Diamond',
          slug: 'diamond',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.articleTag.create({
        data: {
          name: 'Jewelry',
          slug: 'jewelry',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
      prisma.articleTag.create({
        data: {
          name: 'Trends',
          slug: 'trends',
          isActive: true,
          createdBy: existingUser.id,
        },
      }),
    ]);

    console.log(`✅ Created ${tags.length} tags`);

    // Create articles
    console.log('📄 Creating articles...');
    const articles = await Promise.all([
      prisma.article.create({
        data: {
          title: 'The Future of Jewelry: Sustainable and Ethical Practices',
          slug: 'future-jewelry-sustainable-ethical-practices',
          summary: 'Explore how the jewelry industry is evolving towards more sustainable and ethical practices, from sourcing to manufacturing.',
          content: {
            blocks: [
              {
                type: 'heading',
                data: { text: 'Introduction', level: 2 },
                id: 'heading-1'
              },
              {
                type: 'paragraph',
                data: { text: 'The jewelry industry is undergoing a significant transformation as consumers become more conscious about the environmental and social impact of their purchases.' },
                id: 'paragraph-1'
              }
            ],
            version: '1.0',
            lastModified: new Date().toISOString()
          } as any,
          coverUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=400&fit=crop',
          readMinutes: 8,
          isFeatured: true,
          status: ArticleStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          author: { connect: { id: authors[0].id } },
          viewsCount: 1250,
          likesCount: 89,
          createdBy: existingUser.id,
        },
      }),
      prisma.article.create({
        data: {
          title: 'E-commerce Strategies for Jewelry Retailers',
          slug: 'ecommerce-strategies-jewelry-retailers',
          summary: 'Learn effective e-commerce strategies specifically tailored for jewelry retailers to boost online sales and customer engagement.',
          content: {
            blocks: [
              {
                type: 'heading',
                data: { text: 'Introduction', level: 2 },
                id: 'heading-1'
              },
              {
                type: 'paragraph',
                data: { text: 'The jewelry industry has seen tremendous growth in online sales, but success requires specific strategies tailored to the unique challenges of selling jewelry online.' },
                id: 'paragraph-1'
              }
            ],
            version: '1.0',
            lastModified: new Date().toISOString()
          } as any,
          coverUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop',
          readMinutes: 6,
          status: ArticleStatus.PUBLISHED,
          publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          author: { connect: { id: authors[1].id } },
          viewsCount: 980,
          likesCount: 67,
          createdBy: existingUser.id,
        },
      }),
    ]);

    console.log(`✅ Created ${articles.length} articles`);

    // Link articles to categories and tags
    console.log('🔗 Linking articles to categories and tags...');
    
    // Link articles to categories
    const articleCategoryLinks = [
      { articleIndex: 0, categorySlugs: ['jewelry-trends', 'industry-news'] },
      { articleIndex: 1, categorySlugs: ['e-commerce'] },
    ];

    for (const link of articleCategoryLinks) {
      const article = articles[link.articleIndex];
      if (article) {
        for (const categorySlug of link.categorySlugs) {
          const category = categories.find(cat => cat.slug === categorySlug);
          if (category) {
            await prisma.articleOnCategories.create({
              data: {
          articleId: article.id,
                articleCategoryId: category.id,
                createdBy: existingUser.id,
              },
            });
          }
        }
      }
    }

    // Link articles to tags
    const articleTagLinks = [
      { articleIndex: 0, tagSlugs: ['sustainability', 'ethics', 'jewelry', 'future'] },
      { articleIndex: 1, tagSlugs: ['ecommerce', 'jewelry', 'retail', 'strategy'] },
    ];

    for (const link of articleTagLinks) {
      const article = articles[link.articleIndex];
      if (article) {
        for (const tagSlug of link.tagSlugs) {
          const tag = tags.find(t => t.slug === tagSlug);
          if (tag) {
            await prisma.articleOnTags.create({
              data: {
          articleId: article.id,
                articleTagId: tag.id,
                createdBy: existingUser.id,
              },
            });
          }
        }
      }
    }

    console.log('✅ Blog seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding blog data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}