#!/bin/bash

# Test cases - array of page1,page2 pairs
test_cases=(
  "InvalidPage1,InvalidPage2"  # Test error case first
  "Albert%20Einstein,Quantum%20mechanics"
  "Python%20(programming%20language),JavaScript" 
  "United%20States,Canada"
)

test_api() {
  local page1=$1
  local page2=$2
  
  echo "Testing API with '$page1' and '$page2'..."
  response=$(curl -s "https://wikivenn-worker.raymondclowe.workers.dev/api/wiki?page1=$page1&page2=$page2")
  
  if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to API"
    return 1
  fi

  status_code=$(curl -s -o /dev/null -w "%{http_code}" "https://wikivenn-worker.raymondclowe.workers.dev/api/wiki?page1=$page1&page2=$page2")
  
  echo "Raw response:"
  echo "$response" | jq .
  
  if [ "$status_code" -ne 200 ]; then
    echo "❌ API returned status: $status_code"
    return 1
  fi

  # Validate response structure
  if ! jq -e '.uniqueA? and .uniqueB? and .intersection?' <<< "$response" >/dev/null; then
    echo "❌ Invalid response structure - missing required fields"
    echo "Response: $response"
    return 1
  fi

  # Validate array contents
  if ! jq -e '.uniqueA[]? | .title and .count' <<< "$response" >/dev/null || \
     ! jq -e '.uniqueB[]? | .title and .count' <<< "$response" >/dev/null || \
     ! jq -e '.intersection[]? | .title and .count' <<< "$response" >/dev/null; then
    echo "❌ Invalid topic structure - missing title or count"
    echo "Response: $response"
    return 1
  fi

  # Check if arrays are empty
  if jq -e '(.uniqueA | length == 0) and (.uniqueB | length == 0) and (.intersection | length == 0)' <<< "$response" >/dev/null; then
    echo "❌ API returned empty results for all categories"
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

# Run all test cases
overall_result=0
for test_case in "${test_cases[@]}"; do
  IFS=',' read -r page1 page2 <<< "$test_case"
  test_api "$page1" "$page2" || overall_result=1
  echo ""
done

exit $overall_result
