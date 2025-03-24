#!/bin/bash
set -e

# Handle graceful shutdown
function shutdown {
    echo "Shutting down services..."
    kill -TERM $(jobs -p) 2>/dev/null || true
    kill -QUIT $(cat /var/run/php-fpm.pid) 2>/dev/null || true
}
trap shutdown SIGTERM SIGINT

# Install dependencies
echo "Installing dependencies..."
composer install --no-interaction --optimize-autoloader --no-dev

# Setup environment if needed
if [ ! -s ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    php artisan key:generate --force
fi

# Create storage link
if [ ! -L /var/www/public/storage ]; then
    php artisan storage:link
fi

# Optimize application
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations if requested
php artisan migrate --force

# Start PHP-FPM
php-fpm -D

# Start scheduler if enabled
php artisan schedule:work &

# Start Caddy
echo "Starting Caddy server..."
exec caddy run --config /etc/caddy/Caddyfile
