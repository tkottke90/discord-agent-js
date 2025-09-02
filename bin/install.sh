#! /bin/bash
#
# Install Script - Discord Agent
# ==============================
#
# This script will install the Discord Agent on your system by pulling
# the latest image from the Github Release and running it as a service.
#

# Get the latest release tag from Github
LATEST_RELEASE=$(curl -s https://api.github.com/repos/tkottke90/discord-agent-js/releases/latest | grep tag_name | cut -d '"' -f 4)

# Get the version number from the release tag (remove 'v' prefix)
VERSION=${LATEST_RELEASE#v}

# Pull the image tarball file from Github
echo "Downloading Docker image for version ${VERSION}..."
curl -sL https://github.com/tkottke90/discord-agent-js/releases/download/${LATEST_RELEASE}/discord-agent-${VERSION}.tar -o /tmp/discord-agent-${VERSION}.tar

# Pull the docker-compose file from Github (replace if exists)
echo "Downloading docker-compose.yaml..."
if [ -f "./docker-compose.yaml" ]; then
    echo "Existing docker-compose.yaml found, creating backup..."
    cp ./docker-compose.yaml ./docker-compose.yaml.backup.$(date +%s)
fi
curl -sL https://github.com/tkottke90/discord-agent-js/releases/download/${LATEST_RELEASE}/docker-compose.yaml -o ./docker-compose.yaml

# Load the image tarball file
echo "Loading Docker image..."
docker load -i /tmp/discord-agent-${VERSION}.tar

# Clean up the temporary tarball file
rm /tmp/discord-agent-${VERSION}.tar

# Start the service by running docker-compose up -d
echo "Starting Discord Agent service..."
docker-compose up -d

echo "Installation complete! Discord Agent ${VERSION} is now running."
echo "Use 'docker-compose logs -f' to view logs."