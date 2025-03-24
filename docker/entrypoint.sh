#!/bin/bash
set -e

# Check if public directory exists
if [ ! -d "/var/www/public" ]; then
    echo "ERROR: Public directory not found!"
    echo "Current directory contents:"
    ls -la /var/www
    exit 1
fi

# Check if index.php exists
if [ ! -f "/var/www/public/index.php" ]; then
    echo "ERROR: index.php not found in public directory!"
    echo "Public directory contents:"
    ls -la /var/www/public
    exit 1
fi

echo "Installing dependencies..."
composer install --no-interaction --optimize-autoloader

if [ ! -s /var/www/.env ]; then
    echo "Initializing .env file..."
    cp /var/www/.env.example /var/www/.env
    php artisan key:generate --force
fi

echo "Setting permissions..."
chmod -R 775 /var/www/storage /var/www/bootstrap/cache
chown -R www-data:www-data /var/www

echo "Clearing cache..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Running migrations..."
php artisan migrate --force

echo "Optimizing Laravel..."
php artisan optimize

echo "Starting PHP-FPM in background..."
php-fpm -D

# Start Laravel scheduler in background
echo "Starting Laravel scheduler (cron)..."
php /var/www/artisan schedule:work &

echo "Starting Caddy..."
exec caddy run --config /etc/caddy/Caddyfile
