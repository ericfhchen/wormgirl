# Configuration Files

This directory contains **most** project configuration files organized in one place.

## Files

- **`.eslintrc.json`** - ESLint configuration for code linting
- **`postcss.config.js`** - PostCSS configuration for CSS processing
- **`tailwind.config.js`** - Tailwind CSS configuration
- **`sanity.config.ts`** - Sanity CMS configuration
- **`next.config.js`** - Next.js configuration
- **`.cursorrules`** - Cursor IDE configuration rules

## Root Directory Files

Some configuration files must remain in the root directory for tool compatibility:

- **`tsconfig.json`** - TypeScript configuration (Next.js requires this in root)

## Symlinks

Configuration files are symlinked to the root directory because tools expect them there:

- `/next.config.js` → `config/next.config.js`
- `/.eslintrc.json` → `config/.eslintrc.json`
- `/postcss.config.js` → `config/postcss.config.js`

## Benefits

- **Centralized Configuration**: Most configs in one place
- **Clean Root Directory**: Minimal scattered config files
- **Tool Compatibility**: Symlinks ensure tools can find configs
- **Easy Maintenance**: Related files grouped together

## Notes

- All configurations are updated to reference the new `src/` directory structure
- Path aliases in TypeScript are configured to work with the `src/` directory
- Build artifacts are stored in the separate `build/` directory 