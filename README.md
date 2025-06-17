# Worm Girl Educational App

A single-page educational web application built with Next.js, featuring a persistent video player, modular content management with Sanity CMS, and seamless transitions between educational modules and content pages.

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Custom CSS Variables
- **CMS**: Sanity CMS with flexible schemas
- **Video**: MUX for optimized video delivery
- **State Management**: React Context API
- **Deployment**: Vercel-ready

## 📁 Project Structure

```
├── src/                       # Source code directory
│   ├── app/                   # Next.js App Router
│   │   ├── globals.css        # Global styles & Tailwind
│   │   ├── layout.tsx         # Root layout with providers
│   │   └── page.tsx           # Main page component
│   ├── components/            # Reusable UI components
│   │   ├── VideoPlayer.tsx    # Persistent video player
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── ContentPanel.tsx   # Dynamic content area
│   │   └── portableText/      # Sanity rich text renderers
│   ├── context/               # React Context providers
│   │   ├── VideoContext.tsx   # Video state management
│   │   └── PageStateContext.tsx # Page navigation state
│   ├── lib/                   # Utilities and API clients
│   │   └── sanity.ts          # Sanity client & GROQ queries
│   └── schemas/               # Sanity CMS schemas
│       ├── module.js          # Educational module schema
│       ├── contentPage.js     # Flexible content pages
│       └── index.js           # Schema exports
├── config/                    # ALL configuration files
│   ├── .eslintrc.json         # ESLint configuration
│   ├── postcss.config.js      # PostCSS configuration  
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   ├── sanity.config.ts       # Sanity CMS configuration
│   ├── next.config.js         # Next.js configuration
│   ├── tsconfig.json          # TypeScript configuration
│   ├── .cursorrules           # Cursor IDE rules
│   └── README.md              # Config documentation
├── build/                     # Build artifacts & TypeScript files
│   ├── tsconfig.tsbuildinfo   # TypeScript incremental build info
│   ├── next-env.d.ts          # Next.js TypeScript declarations
│   └── README.md              # Build directory documentation
├── scripts/                   # Package management files
│   ├── package-lock.json      # NPM dependency lock file
│   └── README.md              # Scripts directory documentation
├── docs/                      # Documentation & examples
│   ├── env.example            # Environment variables template
│   └── README.md              # Documentation index
├── README.md                  # Main project documentation
├── package.json               # Dependencies and scripts
└── [symlinks]                 # Essential config symlinks for tools
    ├── .eslintrc.json -> config/.eslintrc.json
    ├── next.config.js -> config/next.config.js
    ├── tsconfig.json -> config/tsconfig.json
    ├── postcss.config.js -> config/postcss.config.js
    └── package-lock.json -> scripts/package-lock.json
```

## 🧹 Ultra-Clean Organization

This project features an **ultra-clean root directory** with only essential files:

- **Root Directory**: Only `package.json`, `README.md`, and required symlinks
- **`src/`**: All source code organized by function
- **`config/`**: ALL configuration files centralized
- **`build/`**: Build artifacts and TypeScript files
- **`scripts/`**: Package management files
- **`docs/`**: Documentation and examples

**Benefits:**
- 🎯 **Instant Navigation**: Find any file type quickly
- 🧹 **Clean Root**: No scattered config files  
- 🔗 **Tool Compatibility**: Symlinks ensure tools work correctly
- 📋 **Easy Maintenance**: Related files grouped together

## 🛠 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your API keys:

```bash
cp docs/env.example .env.local
```

Fill in your environment variables in `.env.local`:

```env
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your_sanity_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2023-12-01
SANITY_API_READ_TOKEN=your_sanity_read_token
SANITY_API_WRITE_TOKEN=your_sanity_write_token

# MUX Configuration
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
NEXT_PUBLIC_MUX_ENV_KEY=your_mux_env_key
```

### 3. Set Up Sanity CMS

1. Create a new Sanity project:
   ```bash
   npx sanity@latest init
   ```

2. Install the MUX plugin in your Sanity Studio:
   ```bash
   cd your-sanity-studio
   npm install sanity-plugin-mux-input
   ```

3. Deploy your schemas to Sanity:
   ```bash
   npx sanity deploy
   ```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🎯 Key Features

### Persistent Video Player
- Seamless video transitions between modules
- Automatic switch to idle/looping video when main content ends
- MUX integration for optimized video delivery

### Modular Content System
- **Educational Modules**: Sequential video-based lessons with rich text articles
- **Content Pages**: Flexible layouts with categories, image galleries, and text blocks
- **Portable Text**: Custom rich text with footnotes, hover images, and inline videos

### Smart Navigation
- Sidebar with module progression and content page access
- State persistence when switching between modules and pages
- Visual indicators for current and completed modules

## 🧱 Content Models

### Module Schema
```javascript
{
  title: string,
  slug: slug,
  order: number,
  video: MUX video,
  idleVideo: MUX video,
  body: Portable Text,
  excerpt: string
}
```

### Content Page Schema
```javascript
{
  title: string,
  slug: slug,
  pageType: 'consulting' | 'stills' | 'installations' | 'about',
  sections: [categorySection | imageGallerySection | textBlock]
}
```

## 🔧 Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## 🚀 Deployment

This app is optimized for Vercel deployment:

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## 📝 Content Management

### Adding New Modules
1. Access your Sanity Studio
2. Create a new "Educational Module"
3. Upload main and idle videos via MUX integration
4. Write content using the rich text editor with custom components

### Creating Content Pages
1. Create a new "Content Page" in Sanity
2. Choose page type (consulting, stills, installations, about)
3. Add flexible sections using the modular content blocks

## 🎨 Customization

### Styling
- Modify `config/tailwind.config.js` for design tokens
- Update CSS variables in `src/app/globals.css`
- Customize components in the `src/components/` directory

### Content Types
- Add new schemas in `src/schemas/` directory
- Update the schema index file
- Extend GROQ queries in `src/lib/sanity.ts`

## 🏗️ Project Organization

This project follows a clean folder structure:

- **`src/`** - All source code
- **`config/`** - Configuration files
- **`docs/`** - Documentation and examples
- **Root** - Only essential files (package.json, Next.js configs)

Configuration files are organized in the `config/` directory with symlinks in the root where required by tools.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. 