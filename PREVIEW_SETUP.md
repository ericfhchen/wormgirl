# Sanity Live Preview Setup - Environment Variables

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Sanity Configuration (existing)
NEXT_PUBLIC_SANITY_PROJECT_ID=8dob17cg
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2023-12-01
SANITY_API_READ_TOKEN=your_sanity_read_token_here
SANITY_API_WRITE_TOKEN=your_sanity_write_token_here

# NEW: For preview functionality - add your read token here
NEXT_PUBLIC_SANITY_TOKEN=your_sanity_read_token_here

# MUX Configuration (existing)
MUX_TOKEN_ID=your_mux_token_id_here
MUX_TOKEN_SECRET=your_mux_token_secret_here
NEXT_PUBLIC_MUX_ENV_KEY=your_mux_env_key_here

# NEW: Preview URL Secret (generate a random string)
SANITY_PREVIEW_SECRET=your_random_secret_string_here
```

## Getting Your Sanity Tokens

1. Go to your Sanity dashboard: https://sanity.io/manage
2. Select your project: `8dob17cg`
3. Go to API settings
4. Create a new token with read permissions
5. Copy the token and add it to both `SANITY_API_READ_TOKEN` and `NEXT_PUBLIC_SANITY_TOKEN`

## Generate a Preview Secret

Generate a random string for `SANITY_PREVIEW_SECRET`:

```bash
# Option 1: Using openssl
openssl rand -hex 32

# Option 2: Using node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## How It Works

- **NEXT_PUBLIC_SANITY_TOKEN**: Used by the client to fetch draft content in preview mode
- **SANITY_PREVIEW_SECRET**: Used to validate preview URLs for security
- The live preview will show draft content when `?preview=true` is in the URL 