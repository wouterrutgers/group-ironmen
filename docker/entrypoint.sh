#!/bin/bash
set -e

if [ ! -s /var/www/.env ]; then
    echo "Initializing .env file..."
    cp /var/www/.env.example /var/www/.env
    php artisan key:generate --force
fi

echo "Setting permissions..."
chmod -R 775 /var/www/storage /var/www/bootstrap/cache
chown -R www-data:www-data /var/www

echo "Clearing and caching..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Running migrations..."
php artisan migrate --force

echo "Optimizing Laravel..."
php artisan optimize

echo "Starting PHP-FPM in background..."
php-fpm -D

echo "Starting Laravel scheduler..."
php /var/www/artisan schedule:work &

echo "Starting Caddy..."
exec caddy run --config /etc/caddy/Caddyfile
