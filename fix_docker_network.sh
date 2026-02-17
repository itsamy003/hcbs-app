#!/bin/bash
set -e

echo "--> [1/4] Configuring iptables-legacy..."

# Ensure legacy binaries exist
if [ ! -f /usr/sbin/iptables-legacy ]; then
    echo "Error: iptables-legacy not found. Please install iptables package."
    exit 1
fi

# Force switch to legacy
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy || echo "ip6tables-legacy not set"

echo "Current iptables version: $(iptables --version)"

echo "--> [2/4] Restarting Docker..."
# Handle Snap Docker specifically if present
if snap list docker >/dev/null 2>&1; then
    echo "Restarting Snap Docker..."
    sudo snap restart docker
else
    echo "Restarting System Docker..."
    sudo systemctl restart docker
fi

echo "--> [3/4] Cleaning up Docker networks..."
# Remove any networks that might have partially created
docker network prune -f

echo "--> [4/4] Verifying fix..."
TEST_NET="fix-check-net-$(date +%s)"
if docker network create "$TEST_NET"; then
    echo "Verification Successful: Network '$TEST_NET' created."
    docker network rm "$TEST_NET"
else
    echo "Verification Failed!"
    exit 1
fi

echo "Done. Please try your 'docker compose up' again."
