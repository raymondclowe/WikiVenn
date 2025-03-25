#!/bin/bash
echo "Clearing WikiVenn KV cache..."

# Get namespace ID from wrangler.toml
NAMESPACE_ID=$(grep -A1 "WIKI_CACHE" wrangler.toml | grep "id" | cut -d'"' -f2)

if [ -z "$NAMESPACE_ID" ]; then
  echo "Error: Could not find WIKI_CACHE namespace ID in wrangler.toml"
  exit 1
fi

# List and delete all keys
wrangler kv:key list --namespace-id=$NAMESPACE_ID | jq -r '.[].name' | while read key; do
  echo "Deleting key: $key"
  wrangler kv:key delete --namespace-id=$NAMESPACE_ID "$key"
done

echo "Cache cleared successfully"
