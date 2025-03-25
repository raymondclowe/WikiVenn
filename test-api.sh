#!/bin/bash

# Test API endpoint with known Wikipedia pages
test_api() {
  echo "Testing API with 'Albert Einstein' and 'Quantum mechanics'..."
  response=$(curl -s "https://wikivenn-worker.raymondclowe.workers.dev/api/wiki?page1=Albert%20Einstein&page2=Quantum%20mechanics")
  
  if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to API"
    return 1
  fi

  status_code=$(curl -s -o /dev/null -w "%{http_code}" "https://wikivenn-worker.raymondclowe.workers.dev/api/wiki?page1=Albert%20Einstein&page2=Quantum%20mechanics")
  
  if [ "$status_code" -eq 500 ]; then
    echo "❌ API returned 500 error"
    echo "Response: $response"
    return 1
  elif [ "$status_code" -ne 200 ]; then
    echo "❌ API returned unexpected status: $status_code"
    echo "Response: $response"
    return 1
  fi

  # Validate response structure
  if ! jq -e '.uniqueA and .uniqueB and .intersection' <<< "$response" >/dev/null; then
    echo "❌ Invalid response structure"
    echo "Response: $response"
    return 1
  fi

  echo "✅ API test passed"
  echo "Response sample:"
  echo "$response" | jq 'with_entries(.value |= .[0:2])'
  return 0
}

# Install jq if not present
if ! command -v jq &> /dev/null; then
  echo "Installing jq for JSON parsing..."
  sudo apt-get install -y jq
fi

# Run tests
test_api
exit $?
