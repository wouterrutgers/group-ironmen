#!/bin/bash
set -e

function shutdown {
    echo "Shutting down services..."
    kill -TERM $(jobs -p) 2>/dev/null || true
    kill -QUIT $(cat /var/run/php-fpm.pid) 2>/dev/null || true
}
trap shutdown SIGTERM SIGINT

echo "Installing dependencies..."
composer install --no-interaction --optimize-autoloader --no-dev

chown -R www-data:www-data /var/www

find /var/www -type d -exec chmod 755 {} \;
find /var/www -type f -exec chmod 644 {} \;

if [ ! -s ".env" ]; then
    echo "Creating .env file..."
    cat .env.example > .env
    php artisan key:generate --force
fi

php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
php artisan update-collection-pages

php-fpm -D

php artisan schedule:work &

echo "Starting Caddy server..."
exec caddy run --config /etc/caddy/Caddyfile
