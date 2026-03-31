#!/bin/bash
set -e

# Switch to release branch or create it
#git fetch origin release || echo "No remote release branch found"
git checkout release #|| git checkout -b release

# Remove all content (optional)
#git rm -rf .

# Checkout dist and docs from master
git checkout master -- dist docs

# Commit and push changes
git add dist docs
git commit -m "Sync dist and docs from master"
git push origin release

# Switch back to master
git checkout master
