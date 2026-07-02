#!/bin/bash

# Build the project
echo "Building the project..."
npm run build

# Install Wrangler if not already installed
if ! command -v wrangler &>/dev/null; then
  echo "Installing Wrangler..."
  npm install -g wrangler
fi

# Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
wrangler pages deploy dist --project-name=cachama

echo "Deployment complete. Your site will be available at https://cachama.pages.dev"
echo "You can set up your custom domain (cachama.com) in the Cloudflare Dashboard." 