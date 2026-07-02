@echo off
echo Building the project...
call npm run build

echo Installing Wrangler if not already installed...
call npm install -g wrangler

echo Deploying to Cloudflare Pages...
call wrangler pages deploy dist --project-name=cachama

echo Deployment complete. Your site will be available at https://cachama.pages.dev
echo You can set up your custom domain (cachama.com) in the Cloudflare Dashboard.
pause 