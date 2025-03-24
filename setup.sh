#!/bin/bash

# Install Node.js and npm
sudo apt-get update
sudo apt-get install -y nodejs npm

# Install wrangler
npm install -g @cloudflare/wrangler

# Create a new Cloudflare Workers project
wrangler init wikivenn-worker

# Configure the project with KV storage binding
# (This will need to be done manually in wrangler.toml)

echo "Cloudflare Workers project initialized. Please configure KV storage binding in wrangler.toml."
