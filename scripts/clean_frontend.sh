#!/bin/bash

# Clean script for MultiVote frontend
# Removes build artifacts and node_modules if needed

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

FRONTEND_DIR="$(dirname "$0")/../frontend"
FULL_CLEAN=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --full)
      FULL_CLEAN=true
      shift
      ;;
  esac
done

echo -e "${YELLOW}====================[ MultiVote Frontend Cleanup ]====================${NC}"

# Clean build directory
if [ -d "$FRONTEND_DIR/build" ]; then
  echo -e "${YELLOW}Removing frontend build directory...${NC}"
  rm -rf "$FRONTEND_DIR/build"
  echo -e "${GREEN}✓ Frontend build directory removed${NC}"
else
  echo -e "${GREEN}✓ Frontend build directory not found (already clean)${NC}"
fi

# Clean cache
if [ -d "$FRONTEND_DIR/.cache" ]; then
  echo -e "${YELLOW}Removing frontend cache...${NC}"
  rm -rf "$FRONTEND_DIR/.cache"
  echo -e "${GREEN}✓ Frontend cache removed${NC}"
fi

# Clean coverage reports
if [ -d "$FRONTEND_DIR/coverage" ]; then
  echo -e "${YELLOW}Removing frontend test coverage reports...${NC}"
  rm -rf "$FRONTEND_DIR/coverage"
  echo -e "${GREEN}✓ Frontend test coverage reports removed${NC}"
fi

# Remove node_modules only if full clean is requested
if [ "$FULL_CLEAN" = true ] && [ -d "$FRONTEND_DIR/node_modules" ]; then
  echo -e "${YELLOW}Removing frontend node_modules (full clean)...${NC}"
  rm -rf "$FRONTEND_DIR/node_modules"
  echo -e "${GREEN}✓ Frontend node_modules removed${NC}"
fi

echo -e "${GREEN}====================[ Frontend Cleanup Complete ]====================${NC}" 