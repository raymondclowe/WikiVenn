const fs = require('fs');
const axios = require('axios');

// Load configuration from wrangler.toml
const config = fs.readFileSync('wrangler.toml', 'utf8');
const accountId = config.match(/account_id = "([^"]+)"/)[1];
const namespaceId = config.match(/binding = "WIKI_CACHE".*id = "([^"]+)"/ms)[1];
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!apiToken) {
  console.error('Error: CLOUDFLARE_API_TOKEN environment variable not set');
  process.exit(1);
}

const api = axios.create({
  baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`,
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  }
});

async function clearCache() {
  try {
    // List all keys
    const { data: listData } = await api.get('/keys');
    const keys = listData.result.map(k => k.name);
    
    if (keys.length === 0) {
      console.log('Cache is already empty');
      return;
    }

    // Delete all keys in batches
    console.log(`Deleting ${keys.length} keys...`);
    const { data: deleteData } = await api.delete('', { data: keys });
    
    if (deleteData.success) {
      console.log('Cache cleared successfully');
    } else {
      console.error('Error clearing cache:', deleteData.errors);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

clearCache();
