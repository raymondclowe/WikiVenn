#!/bin/bash

# Debug version of API test script with more verbose output

debug_test() {
  local page1=$1
  local page2=$2
  
  echo "=== DEBUG TEST: '$page1' vs '$page2' ==="
  
  # 1. Test raw Wikipedia API response
  echo -e "\n1. Testing Wikipedia API response for '$page1'..."
  wiki1=$(curl -s "https://en.m.wikipedia.org/wiki/$page1")
  echo "Response length: ${#wiki1} characters"
  echo "First 200 chars:"
  echo "${wiki1:0:200}..."
  
  echo -e "\n2. Testing Wikipedia API response for '$page2'..."
  wiki2=$(curl -s "https://en.m.wikipedia.org/wiki/$page2") 
  echo "Response length: ${#wiki2} characters"
  echo "First 200 chars:"
  echo "${wiki2:0:200}..."

  # 2. Test our API endpoint
  echo -e "\n3. Testing our API endpoint..."
  api_response=$(curl -s "https://wikivenn-worker.raymondclowe.workers.dev/api/wiki?page1=$page1&page2=$page2")
  echo "API Response:"
  echo "$api_response" | jq .

  # 3. Validate response
  echo -e "\n4. Validating response..."
  if ! jq -e '.uniqueA? and .uniqueB? and .intersection?' <<< "$api_response" >/dev/null; then
    echo "❌ Invalid response structure"
    return 1
  fi

  uniqueA_len=$(jq -r '.uniqueA | length' <<< "$api_response")
  uniqueB_len=$(jq -r '.uniqueB | length' <<< "$api_response")
  intersection_len=$(jq -r '.intersection | length' <<< "$api_response")
  
  echo "Results:"
  echo "- uniqueA topics: $uniqueA_len"
  echo "- uniqueB topics: $uniqueB_len" 
  echo "- intersection topics: $intersection_len"

  if [ $uniqueA_len -eq 0 ] && [ $uniqueB_len -eq 0 ] && [ $intersection_len -eq 0 ]; then
    echo "❌ All results empty"
    return 1
  fi

  echo "✅ Debug test complete"
  return 0
}

# Run debug test
debug_test "Albert_Einstein" "Quantum_mechanics"
