# Install Git and GitHub CLI
winget install --id Git.Git -e
winget install --id GitHub.cli -e

# Go into skywatch folder
cd Download\skywatch

# Show files inside folder
dir

# Log in to GitHub
gh auth login

# Tell git who you are
git config --global user.name "Full Name"
git config --global user.email "E-mail Address"

# Upload porject
git init -b main
git add .
git commit -m "Initial Skywatch site"
gh repo create skywatch --public --source=. --push

# Open in browser
gh repo view --web

# Upload changes
git add .
git commit -m "What I changed"
git push

# Install Node.js
winget install OpenJS.NodeJS.LTS * npm command comes with it!
node --version
