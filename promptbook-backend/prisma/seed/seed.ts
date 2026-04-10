import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')
  await prisma.promptTag.deleteMany()
  await prisma.tagAlias.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.commentVote.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.vote.deleteMany()
  await prisma.userFavorite.deleteMany()
  await prisma.prompt.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
  
  const categories = await Promise.all([
    prisma.category.create({ data: { id: 'business', name: 'Business', slug: 'business', description: 'Business strategy, marketing, sales, productivity, and professional services', icon: '📈', color: '#f59e0b' } }),
    prisma.category.create({ data: { id: 'creative', name: 'Creative', slug: 'creative', description: 'Creative writing, visual arts, music, fashion, and entertainment media', icon: '🎨', color: '#8b5cf6' } }),
    prisma.category.create({ data: { id: 'design', name: 'Design', slug: 'design', description: 'Graphic design, UX/UI, branding, multimedia, and creative tools', icon: '🎯', color: '#7c3aed' } }),
    prisma.category.create({ data: { id: 'education', name: 'Education', slug: 'education', description: 'Teaching, tutoring, study guides, language learning, and critical thinking', icon: '📚', color: '#06b6d4' } }),
    prisma.category.create({ data: { id: 'entertainment', name: 'Entertainment', slug: 'entertainment', description: 'Games, roleplay, quizzes, humor, and interactive stories', icon: '🎮', color: '#dc2626' } }),
    prisma.category.create({ data: { id: 'health', name: 'Health', slug: 'health', description: 'Physical health, mental wellness, nutrition, alternative medicine, and self-care', icon: '🏥', color: '#059669' } }),
    prisma.category.create({ data: { id: 'lifestyle', name: 'Lifestyle', slug: 'lifestyle', description: 'Journaling, goal setting, travel planning, recipes, and daily utilities', icon: '🌟', color: '#ea580c' } }),
    prisma.category.create({ data: { id: 'research', name: 'Research', slug: 'research', description: 'Analysis, fact-checking, trend research, critical thinking, and data interpretation', icon: '🔍', color: '#ef4444' } }),
    prisma.category.create({ data: { id: 'technology', name: 'Technology', slug: 'technology', description: 'Programming, software development, AI/ML, data analytics, and technical documentation', icon: '💻', color: '#3b82f6' } }),
    prisma.category.create({ data: { id: 'writing', name: 'Writing', slug: 'writing', description: 'Content creation, copywriting, storytelling, translation, and communication skills', icon: '✍️', color: '#10b981' } })
  ])
  
  // Seed subcategories (Final list)
  const subcategories = await Promise.all([
    // Business
    prisma.subcategory.create({ data: { id: 'business_strategy', name: 'Business Strategy', slug: 'business_strategy', description: 'Strategic planning, business models, and operations', categoryId: 'business' } }),
    prisma.subcategory.create({ data: { id: 'marketing_sales', name: 'Marketing & Sales', slug: 'marketing_sales', description: 'Marketing campaigns, sales strategies, and customer acquisition', categoryId: 'business' } }),
    prisma.subcategory.create({ data: { id: 'productivity_organization', name: 'Productivity & Organization', slug: 'productivity_organization', description: 'Time management, workflow optimization, and organizational tools', categoryId: 'business' } }),
    prisma.subcategory.create({ data: { id: 'professional_services', name: 'Professional Services', slug: 'professional_services', description: 'Consulting, client services, and professional support', categoryId: 'business' } }),
    prisma.subcategory.create({ data: { id: 'finance_accounting', name: 'Finance & Accounting', slug: 'finance_accounting', description: 'Forecasts, budgeting, KPI dashboards, and reporting', categoryId: 'business' } }),
    prisma.subcategory.create({ data: { id: 'hr_people_ops', name: 'HR & People Ops', slug: 'hr_people_ops', description: 'Hiring, performance reviews, policies, and employer branding', categoryId: 'business' } }),
    prisma.subcategory.create({ data: { id: 'legal_operations', name: 'Legal & Operations', slug: 'legal_operations', description: 'Contract language assistance and operational checklists', categoryId: 'business' } }),
    prisma.subcategory.create({ data: { id: 'customer_success', name: 'Customer Success', slug: 'customer_success', description: 'Onboarding, playbooks, QBRs, and retention strategy', categoryId: 'business' } }),

    // Creative Arts & Media (category: creative)
    prisma.subcategory.create({ data: { id: 'creative_writing_poetry', name: 'Creative Writing & Poetry', slug: 'creative_writing_poetry', description: 'Fiction, poetry, creative narratives, and literary works', categoryId: 'creative' } }),
    prisma.subcategory.create({ data: { id: 'narrative_storytelling', name: 'Narrative & Storytelling', slug: 'narrative_storytelling', description: 'Narratives, story structures, and storytelling craft', categoryId: 'creative' } }),
    prisma.subcategory.create({ data: { id: 'visual_design', name: 'Visual Design', slug: 'visual_design', description: 'Art direction, visual composition, and design fundamentals', categoryId: 'creative' } }),
    prisma.subcategory.create({ data: { id: 'music_audio', name: 'Music & Audio', slug: 'music_audio', description: 'Music composition, audio content, and sound design', categoryId: 'creative' } }),
    prisma.subcategory.create({ data: { id: 'media_entertainment', name: 'Media & Entertainment', slug: 'media_entertainment', description: 'Entertainment content, media production, and creative projects', categoryId: 'creative' } }),

    // Design
    prisma.subcategory.create({ data: { id: 'ux_ui_design', name: 'UX/UI Design', slug: 'ux_ui_design', description: 'User experience, interface design, and usability', categoryId: 'design' } }),
    prisma.subcategory.create({ data: { id: 'branding_advertising', name: 'Branding & Advertising', slug: 'branding_advertising', description: 'Brand identity, advertising design, and marketing visuals', categoryId: 'design' } }),
    prisma.subcategory.create({ data: { id: 'product_design', name: 'Product Design', slug: 'product_design', description: 'End-to-end product thinking and UX strategy', categoryId: 'design' } }),
    prisma.subcategory.create({ data: { id: 'multimedia', name: 'Multimedia', slug: 'multimedia', description: 'Video, animation, interactive media, and multimedia content', categoryId: 'design' } }),
    prisma.subcategory.create({ data: { id: 'creative_tools', name: 'Creative Tools', slug: 'creative_tools', description: 'Design software, creative applications, and digital tools', categoryId: 'design' } }),

    // Education
    prisma.subcategory.create({ data: { id: 'teaching_tutoring', name: 'Teaching & Tutoring', slug: 'teaching_tutoring', description: 'Educational instruction, tutoring, and teaching assistance', categoryId: 'education' } }),
    prisma.subcategory.create({ data: { id: 'learning_assistance', name: 'Learning Assistance', slug: 'learning_assistance', description: 'Study help, homework support, and learning guidance', categoryId: 'education' } }),
    prisma.subcategory.create({ data: { id: 'study_guides_summaries', name: 'Study Guides & Summaries', slug: 'study_guides_summaries', description: 'Study materials, summaries, and educational resources', categoryId: 'education' } }),
    prisma.subcategory.create({ data: { id: 'language_learning', name: 'Language Learning', slug: 'language_learning', description: 'Language acquisition, practice, and linguistic education', categoryId: 'education' } }),
    prisma.subcategory.create({ data: { id: 'critical_thinking_problem_solving', name: 'Critical Thinking & Problem Solving', slug: 'critical_thinking_problem_solving', description: 'Analytical thinking, logic, and problem-solving skills', categoryId: 'education' } }),
    prisma.subcategory.create({ data: { id: 'curriculum_design', name: 'Curriculum Design', slug: 'curriculum_design', description: 'Learning outcomes, alignment, and course scaffolding', categoryId: 'education' } }),

    // Entertainment
    prisma.subcategory.create({ data: { id: 'games_recreation', name: 'Games & Recreation', slug: 'games_recreation', description: 'Gaming content, recreational activities, and entertainment', categoryId: 'entertainment' } }),
    prisma.subcategory.create({ data: { id: 'character_roleplay', name: 'Character & Roleplay', slug: 'character_roleplay', description: 'Character development, roleplay scenarios, and personas', categoryId: 'entertainment' } }),
    prisma.subcategory.create({ data: { id: 'quizzes_trivia', name: 'Quizzes & Trivia', slug: 'quizzes_trivia', description: 'Quiz creation, trivia questions, and knowledge games', categoryId: 'entertainment' } }),
    prisma.subcategory.create({ data: { id: 'jokes_humor', name: 'Jokes & Humor', slug: 'jokes_humor', description: 'Comedy, jokes, humorous content, and entertainment', categoryId: 'entertainment' } }),
    prisma.subcategory.create({ data: { id: 'interactive_stories', name: 'Interactive Stories', slug: 'interactive_stories', description: 'Choose-your-own-adventure, interactive narratives, and story games', categoryId: 'entertainment' } }),

    // Health & Wellness (category: health)
    prisma.subcategory.create({ data: { id: 'physical_health_fitness', name: 'Physical Health & Fitness', slug: 'physical_health_fitness', description: 'Exercise, fitness routines, and physical wellness', categoryId: 'health' } }),
    prisma.subcategory.create({ data: { id: 'mental_health', name: 'Mental Health', slug: 'mental_health', description: 'Mental wellness, stress management, and emotional health', categoryId: 'health' } }),
    prisma.subcategory.create({ data: { id: 'nutrition_food', name: 'Nutrition & Food', slug: 'nutrition_food', description: 'Diet, nutrition, meal planning, and healthy eating', categoryId: 'health' } }),
    prisma.subcategory.create({ data: { id: 'self_care_mindfulness', name: 'Self-Care & Mindfulness', slug: 'self_care_mindfulness', description: 'Personal wellness, mindfulness practices, and stress relief', categoryId: 'health' } }),
    prisma.subcategory.create({ data: { id: 'sleep_recovery', name: 'Sleep & Recovery', slug: 'sleep_recovery', description: 'Sleep hygiene, circadian health, and recovery plans', categoryId: 'health' } }),
    prisma.subcategory.create({ data: { id: 'women_health', name: "Women’s Health", slug: 'women_health', description: 'Hormonal health, pregnancy, and postpartum care', categoryId: 'health' } }),
    prisma.subcategory.create({ data: { id: 'men_health', name: "Men’s Health", slug: 'men_health', description: 'Strength, cardiovascular health, and longevity', categoryId: 'health' } }),

    // Lifestyle
    prisma.subcategory.create({ data: { id: 'goal_setting_productivity', name: 'Goal Setting & Productivity', slug: 'goal_setting_productivity', description: 'Personal goal planning, life productivity, and achievement strategies', categoryId: 'lifestyle' } }),
    prisma.subcategory.create({ data: { id: 'travel_planning', name: 'Travel Planning', slug: 'travel_planning', description: 'Trip planning, travel guides, and vacation assistance', categoryId: 'lifestyle' } }),
    prisma.subcategory.create({ data: { id: 'home_organization', name: 'Home Organization', slug: 'home_organization', description: 'Decluttering, systems, and household workflows', categoryId: 'lifestyle' } }),
    prisma.subcategory.create({ data: { id: 'finance_budgeting', name: 'Personal Finance & Budgeting', slug: 'finance_budgeting', description: 'Budgets, debt payoff, and savings plans', categoryId: 'lifestyle' } }),
    prisma.subcategory.create({ data: { id: 'hobbies_diy', name: 'Hobbies & DIY', slug: 'hobbies_diy', description: 'Maker projects, crafts, and weekend builds', categoryId: 'lifestyle' } }),
    prisma.subcategory.create({ data: { id: 'parenting_family', name: 'Parenting & Family', slug: 'parenting_family', description: 'Routines, activities, and developmental guidance', categoryId: 'lifestyle' } }),
    prisma.subcategory.create({ data: { id: 'sustainability', name: 'Sustainability', slug: 'sustainability', description: 'Low-waste living, repairs, and eco tips', categoryId: 'lifestyle' } }),

    // Research & Analysis (category: research)
    prisma.subcategory.create({ data: { id: 'analysis_reports', name: 'Analysis & Reports', slug: 'analysis_reports', description: 'Research analysis, comprehensive reports, and insights', categoryId: 'research' } }),
    prisma.subcategory.create({ data: { id: 'fact_checking', name: 'Fact Checking', slug: 'fact_checking', description: 'Information verification, fact validation, and accuracy checks', categoryId: 'research' } }),
    prisma.subcategory.create({ data: { id: 'data_interpretation', name: 'Data Interpretation', slug: 'data_interpretation', description: 'Data analysis, statistical interpretation, and insights extraction', categoryId: 'research' } }),
    prisma.subcategory.create({ data: { id: 'trend_research', name: 'Trend Research', slug: 'trend_research', description: 'Market trends, social patterns, and emerging developments', categoryId: 'research' } }),
    prisma.subcategory.create({ data: { id: 'data_visualization', name: 'Data Visualization', slug: 'data_visualization', description: 'Charts, storytelling with data, and dashboards', categoryId: 'research' } }),
    prisma.subcategory.create({ data: { id: 'experimental_design', name: 'Experimental Design', slug: 'experimental_design', description: 'Hypotheses, variables, and methodology planning', categoryId: 'research' } }),
    prisma.subcategory.create({ data: { id: 'literature_review', name: 'Literature Review', slug: 'literature_review', description: 'Systematic reviews, PRISMA, and source synthesis', categoryId: 'research' } }),

    // Technology & Development (category: technology)
    prisma.subcategory.create({ data: { id: 'programming_software', name: 'Programming & Software', slug: 'programming_software', description: 'Code development, software engineering, and programming assistance', categoryId: 'technology' } }),
    prisma.subcategory.create({ data: { id: 'ai_machine_learning', name: 'AI & Machine Learning', slug: 'ai_machine_learning', description: 'Artificial intelligence, ML models, and data science', categoryId: 'technology' } }),
    prisma.subcategory.create({ data: { id: 'data_analytics', name: 'Data Analytics', slug: 'data_analytics', description: 'Data analysis, visualization, and business intelligence', categoryId: 'technology' } }),
    prisma.subcategory.create({ data: { id: 'technical_documentation', name: 'Technical Documentation', slug: 'technical_documentation', description: 'Technical writing, API docs, and developer guides', categoryId: 'technology' } }),
    prisma.subcategory.create({ data: { id: 'cybersecurity', name: 'Cybersecurity', slug: 'cybersecurity', description: 'Threat modeling, secure coding, and blue team tasks', categoryId: 'technology' } }),
    prisma.subcategory.create({ data: { id: 'devops_sre', name: 'DevOps & SRE', slug: 'devops_sre', description: 'CI/CD, infra-as-code, incident response, and reliability', categoryId: 'technology' } }),
    prisma.subcategory.create({ data: { id: 'cloud_architecture', name: 'Cloud Architecture', slug: 'cloud_architecture', description: 'Designing scalable cloud systems and reference patterns', categoryId: 'technology' } }),
    prisma.subcategory.create({ data: { id: 'data_engineering', name: 'Data Engineering', slug: 'data_engineering', description: 'ETL/ELT, pipelines, warehousing, and data quality', categoryId: 'technology' } }),
    prisma.subcategory.create({ data: { id: 'testing_quality', name: 'Testing & Quality', slug: 'testing_quality', description: 'Test plans, automation, and property-based testing', categoryId: 'technology' } }),

    // Writing & Communication (category: writing)
    prisma.subcategory.create({ data: { id: 'content_writing', name: 'Content Writing', slug: 'content_writing', description: 'Articles, blogs, web content, and general writing', categoryId: 'writing' } }),
    prisma.subcategory.create({ data: { id: 'copywriting_ads', name: 'Copywriting & Ads', slug: 'copywriting_ads', description: 'Sales copy, advertisements, and persuasive content', categoryId: 'writing' } }),
    prisma.subcategory.create({ data: { id: 'translation_language', name: 'Translation & Language', slug: 'translation_language', description: 'Language translation, localization, and linguistic tasks', categoryId: 'writing' } }),
    prisma.subcategory.create({ data: { id: 'seo_writing', name: 'SEO Writing', slug: 'seo_writing', description: 'Keyword research, on-page SEO, and optimized web copy', categoryId: 'writing' } }),
    prisma.subcategory.create({ data: { id: 'academic_writing', name: 'Academic Writing', slug: 'academic_writing', description: 'Essays, literature reviews, and academic discourse', categoryId: 'writing' } })
  ])
  
  const users = await Promise.all([
    prisma.user.create({ data: { id: 'demo-user-id', email: 'demo@example.com', username: 'demouser', displayName: 'Demo User', bio: 'Demo user for testing', reputationScore: 120 } }),
    prisma.user.create({ data: { id: 'user-1', email: 'sarah@example.com', username: 'promptexpert', displayName: 'Sarah Johnson', bio: 'AI prompt engineering expert', reputationScore: 850 } }),
    prisma.user.create({ data: { id: 'user-2', email: 'mike@example.com', username: 'aiexplorer', displayName: 'Mike Chen', bio: 'AI researcher and developer', reputationScore: 420 } }),
    prisma.user.create({ data: { id: 'test-user-a', email: 'alice@test.com', username: 'alicetest', displayName: 'Alice Thompson', bio: 'Content creator and writer', reputationScore: 350 } }),
    prisma.user.create({ data: { id: 'test-user-b', email: 'bob@test.com', username: 'bobtest', displayName: 'Bob Rodriguez', bio: 'Software developer and tech enthusiast', reputationScore: 280 } }),
    prisma.user.create({ data: { id: 'test-user-c', email: 'carol@test.com', username: 'caroltest', displayName: 'Carol Kim', bio: 'Marketing specialist and AI explorer', reputationScore: 190 } })
  ])
  
  // Create normalized tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { id: 'tag-1', name: 'Customer Service', slug: 'customer-service', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-2', name: 'Communication', slug: 'communication', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-3', name: 'Empathy', slug: 'empathy', kind: 'tone' } }),
    prisma.tag.create({ data: { id: 'tag-4', name: 'Code Review', slug: 'code-review', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-5', name: 'Code Quality', slug: 'code-quality', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-6', name: 'Best Practices', slug: 'best-practices', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-7', name: 'Creative Writing', slug: 'creative-writing', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-8', name: 'Storytelling', slug: 'storytelling', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-9', name: 'Fiction', slug: 'fiction', kind: 'format' } }),
    prisma.tag.create({ data: { id: 'tag-10', name: 'Marketing', slug: 'marketing', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-11', name: 'Email', slug: 'email', kind: 'format' } }),
    prisma.tag.create({ data: { id: 'tag-12', name: 'Conversion', slug: 'conversion', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-13', name: 'Documentation', slug: 'documentation', kind: 'format' } }),
    prisma.tag.create({ data: { id: 'tag-14', name: 'API', slug: 'api', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-15', name: 'Development', slug: 'development', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-16', name: 'Social Media', slug: 'social-media', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-17', name: 'Content', slug: 'content', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-18', name: 'Engagement', slug: 'engagement', kind: 'topic' } }),
    prisma.tag.create({ data: { id: 'tag-19', name: 'Beginner', slug: 'beginner', kind: 'audience' } }),
    prisma.tag.create({ data: { id: 'tag-20', name: 'Intermediate', slug: 'intermediate', kind: 'audience' } }),
    prisma.tag.create({ data: { id: 'tag-21', name: 'Advanced', slug: 'advanced', kind: 'audience' } })
  ])
  
  // Create prompts with 0 initial votes - actual vote counts will be calculated from the votes table
  const prompts = await Promise.all([
    prisma.prompt.create({ data: { id: '1', title: 'Customer Support Response Generator', slug: 'customer-support-response-generator', content: "You are a customer support representative. Help me craft a response to this customer complaint:\n\n[COMPLAINT]\n\nPlease provide a response that is:\n- Empathetic and understanding\n- Professional and polite\n- Offers a practical solution\n- Acknowledges the customer's frustration", description: 'Generate empathetic and helpful customer support responses for various complaint scenarios.', authorId: 'user-1', categoryId: 'business', upvotes: 0, downvotes: 0, isSeed: true } }),
    prisma.prompt.create({ data: { id: '2', title: 'Code Review Assistant', slug: 'code-review-assistant', content: 'Please review this code and provide feedback on:\n\n```\n[CODE_HERE]\n```\n\nFocus on:\n- Code quality and readability\n- Potential bugs or issues\n- Performance improvements\n- Best practices and conventions\n- Security considerations', description: 'Comprehensive code review with suggestions for improvements, bug detection, and best practices.', authorId: 'user-2', categoryId: 'technology', upvotes: 0, downvotes: 0, isSeed: true } }),
    prisma.prompt.create({ data: { id: '3', title: 'Creative Story Starter', slug: 'creative-story-starter', content: 'Write the beginning of a story with the following elements:\n\n- Setting: [SETTING]\n- Main character: [CHARACTER]\n- Conflict: [CONFLICT]\n- Tone: [TONE]\n\nMake it engaging and leave the reader wanting more. Use vivid descriptions and strong character voice.', description: 'Generate compelling story openings with customizable elements for creative writing projects.', authorId: 'demo-user-id', categoryId: 'creative', upvotes: 0, downvotes: 0, isSeed: true } }),
    prisma.prompt.create({ data: { id: '4', title: 'Marketing Email Template', slug: 'marketing-email-template', content: 'Create a compelling marketing email for:\n\n- Product/Service: [PRODUCT]\n- Target Audience: [AUDIENCE]\n- Goal: [GOAL]\n- Call to Action: [CTA]\n\nMake it engaging, persuasive, and professional. Include subject line suggestions.', description: 'Generate effective marketing emails with customizable parameters for different products and audiences.', authorId: 'test-user-a', categoryId: 'business', upvotes: 0, downvotes: 0, isSeed: true } }),
    prisma.prompt.create({ data: { id: '5', title: 'API Documentation Generator', slug: 'api-documentation-generator', content: 'Generate comprehensive API documentation for:\n\n```\n[API_ENDPOINT_CODE]\n```\n\nInclude:\n- Endpoint description\n- Parameters and their types\n- Example requests and responses\n- Error codes and handling\n- Usage examples', description: 'Create clear and comprehensive API documentation from code examples.', authorId: 'test-user-b', categoryId: 'technology', upvotes: 0, downvotes: 0, isSeed: true } }),
    prisma.prompt.create({ data: { id: '6', title: 'Social Media Post Creator', slug: 'social-media-post-creator', content: 'Create engaging social media posts for:\n\n- Platform: [PLATFORM]\n- Topic: [TOPIC]\n- Brand Voice: [VOICE]\n- Include hashtags: [YES/NO]\n\nMake it viral-worthy and on-brand. Optimize for engagement.', description: 'Generate engaging social media content optimized for different platforms and brand voices.', authorId: 'test-user-c', categoryId: 'business', upvotes: 0, downvotes: 0, isSeed: true } })
  ])
  
  // Create prompt-tag relationships
  await Promise.all([
    // Prompt 1: Customer Support Response Generator
    prisma.promptTag.create({ data: { promptId: '1', tagId: 'tag-1', isPrimary: true, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '1', tagId: 'tag-2', isPrimary: false, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '1', tagId: 'tag-3', isPrimary: false, source: 'manual' } }),
    
    // Prompt 2: Code Review Assistant
    prisma.promptTag.create({ data: { promptId: '2', tagId: 'tag-4', isPrimary: true, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '2', tagId: 'tag-5', isPrimary: false, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '2', tagId: 'tag-6', isPrimary: false, source: 'manual' } }),
    
    // Prompt 3: Creative Story Starter
    prisma.promptTag.create({ data: { promptId: '3', tagId: 'tag-7', isPrimary: true, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '3', tagId: 'tag-8', isPrimary: false, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '3', tagId: 'tag-9', isPrimary: false, source: 'manual' } }),
    
    // Prompt 4: Marketing Email Template
    prisma.promptTag.create({ data: { promptId: '4', tagId: 'tag-10', isPrimary: true, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '4', tagId: 'tag-11', isPrimary: false, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '4', tagId: 'tag-12', isPrimary: false, source: 'manual' } }),
    
    // Prompt 5: API Documentation Generator
    prisma.promptTag.create({ data: { promptId: '5', tagId: 'tag-13', isPrimary: true, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '5', tagId: 'tag-14', isPrimary: false, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '5', tagId: 'tag-15', isPrimary: false, source: 'manual' } }),
    
    // Prompt 6: Social Media Post Creator
    prisma.promptTag.create({ data: { promptId: '6', tagId: 'tag-16', isPrimary: true, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '6', tagId: 'tag-17', isPrimary: false, source: 'manual' } }),
    prisma.promptTag.create({ data: { promptId: '6', tagId: 'tag-18', isPrimary: false, source: 'manual' } })
  ])
  
  // Assign subcategories for sample prompts using new slug-based IDs
  await Promise.all([
    prisma.prompt.update({ where: { id: '1' }, data: { subcategoryId: 'professional_services' } }), // Customer Support -> Professional Services
    prisma.prompt.update({ where: { id: '2' }, data: { subcategoryId: 'programming_software' } }), // Code Review -> Programming & Software
    prisma.prompt.update({ where: { id: '3' }, data: { subcategoryId: 'creative_writing_poetry' } }), // Creative Story -> Creative Writing & Poetry
    prisma.prompt.update({ where: { id: '4' }, data: { subcategoryId: 'marketing_sales' } }), // Marketing Email -> Marketing & Sales
    prisma.prompt.update({ where: { id: '5' }, data: { subcategoryId: 'technical_documentation' } }), // API Documentation -> Technical Documentation
    prisma.prompt.update({ where: { id: '6' }, data: { subcategoryId: 'marketing_sales' } }) // Social Media -> Marketing & Sales
  ])
  
  await Promise.all([
    prisma.vote.create({ data: { userId: 'demo-user-id', promptId: '1', voteType: 'upvote' } }),
    prisma.vote.create({ data: { userId: 'user-2', promptId: '1', voteType: 'upvote' } }),
    prisma.vote.create({ data: { userId: 'test-user-a', promptId: '3', voteType: 'upvote' } }),
    prisma.vote.create({ data: { userId: 'test-user-b', promptId: '3', voteType: 'upvote' } }),
    prisma.vote.create({ data: { userId: 'user-1', promptId: '4', voteType: 'upvote' } }),
    prisma.vote.create({ data: { userId: 'demo-user-id', promptId: '5', voteType: 'upvote' } })
  ])
  
  const comments = await Promise.all([
    prisma.comment.create({ data: { id: '1', content: "This is an excellent prompt! I've used it for customer support and it works really well.", authorId: 'user-1', promptId: '1' } }),
    prisma.comment.create({ data: { id: '2', content: 'Could you add more specific examples for different types of complaints?', authorId: 'user-2', promptId: '1' } }),
    prisma.comment.create({ data: { id: '4', content: 'Great story starter! Perfect for creative writing workshops.', authorId: 'test-user-a', promptId: '3' } }),
    prisma.comment.create({ data: { id: '5', content: 'I love the flexibility of this template. Very useful for different marketing campaigns.', authorId: 'test-user-b', promptId: '4' } }),
    prisma.comment.create({ data: { id: '6', content: 'Comprehensive documentation template. Saves so much time!', authorId: 'user-1', promptId: '5' } })
  ])
  
  await Promise.all([
    prisma.comment.create({ data: { id: '3', content: 'Agreed! The empathetic tone suggestion really makes a difference.', authorId: 'user-2', promptId: '1', parentId: '1' } }),
    prisma.comment.create({ data: { id: '7', content: 'Do you have examples for different story genres?', authorId: 'test-user-c', promptId: '3', parentId: '4' } })
  ])
  
  const favorites = await Promise.all([
    prisma.userFavorite.create({ data: { userId: 'demo-user-id', promptId: '1' } }),
    prisma.userFavorite.create({ data: { userId: 'demo-user-id', promptId: '2' } }),
    prisma.userFavorite.create({ data: { userId: 'user-1', promptId: '2' } }),
    prisma.userFavorite.create({ data: { userId: 'user-1', promptId: '3' } }),
    prisma.userFavorite.create({ data: { userId: 'test-user-a', promptId: '2' } }),
    prisma.userFavorite.create({ data: { userId: 'test-user-b', promptId: '3' } }),
    prisma.userFavorite.create({ data: { userId: 'test-user-c', promptId: '5' } })
  ])
  
  console.log('✅ Database seeded successfully!')
  console.log(`📊 Created:`)
  console.log(`   - ${categories.length} categories`)
  console.log(`   - ${subcategories.length} subcategories`)
  console.log(`   - ${users.length} users`)
  console.log(`   - ${tags.length} normalized tags`)
  console.log(`   - ${prompts.length} prompts (with 0 initial votes)`)
  console.log(`   - 7 comments (including 2 replies)`) 
  console.log(`   - ${favorites.length} user favorites`)
  console.log(`   - Sample votes and interactions (vote counts calculated from actual votes)`)
  
  console.log(`\n🔑 Test User Credentials:`)
  console.log(`   📧 alice@test.com (ID: test-user-a) - Alice Thompson`)
  console.log(`   📧 bob@test.com (ID: test-user-b) - Bob Rodriguez`)
  console.log(`   📧 carol@test.com (ID: test-user-c) - Carol Kim`)
  console.log(`   📧 demo@example.com (ID: demo-user-id) - Demo User`)
  console.log(`\n💡 Test Activity Flow:`)
  console.log(`   1. Sign in as any test user`)
  console.log(`   2. Vote/comment/favorite prompts created by other users`)
  console.log(`   3. Check the prompt owner's profile for activity feed updates`)
  console.log(`   4. Activities should appear instantly!`)
  console.log(`\n🏷️  Tag System:`)
  console.log(`   - Tags are now normalized with categories (topic, audience, tone, format, industry, language)`)
  console.log(`   - Each prompt has primary and secondary tags`)
  console.log(`   - Tags support aliases for synonyms and misspellings`)
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })


