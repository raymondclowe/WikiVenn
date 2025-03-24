#!/bin/bash

# Set the worker URL
WORKER_URL="http://localhost:8787" # Replace with your worker URL

# Test case 1: Valid Wikipedia pages
echo "Test case 1: Valid Wikipedia pages"
RESPONSE=$(curl -s "${WORKER_URL}/api/wiki?page1=Albert Einstein&page2=Quantum mechanics")
if echo "$RESPONSE" | grep -q "uniqueA"; then
  echo "Test case 1: Passed"
else
  echo "Test case 1: Failed"
  echo "Response: $RESPONSE"
fi

# Test case 2: Missing page1 parameter
echo "Test case 2: Missing page1 parameter"
RESPONSE=$(curl -s "${WORKER_URL}/api/wiki?page2=Quantum mechanics")
if echo "$RESPONSE" | grep -q "Missing page1"; then
  echo "Test case 2: Passed"
else
  echo "Test case 2: Failed"
  echo "Response: $RESPONSE"
fi

# Test case 3: Invalid Wikipedia page
echo "Test case 3: Invalid Wikipedia page"
RESPONSE=$(curl -s "${WORKER_URL}/api/wiki?page1=NonExistentPage&page2=Quantum mechanics")
if echo "$RESPONSE" | grep -q "Error fetching wiki data"; then
  echo "Test case 3: Passed"
else
  echo "Test case 3: Failed"
  echo "Response: $RESPONSE"
fi
