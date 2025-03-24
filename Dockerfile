# Build stage
FROM composer:latest AS composer

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-scripts --no-autoloader --no-dev

# Final stage
FROM php:8.2-fpm-alpine

# Install dependencies and clean up in a single layer
RUN apk add --no-cache \
    libzip \
    zip \
    unzip \
    mysql-client \
    curl \
    bash \
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/cfg/gpg/gpg.155B6D79CA56EA34.key' > /etc/apk/keys/caddy.key \
    && echo "https://dl.cloudsmith.io/public/caddy/stable/alpine/any-version/main" >> /etc/apk/repositories \
    && apk add --no-cache caddy \
    && docker-php-ext-install -j$(nproc) pdo_mysql zip opcache \
    && rm -rf /tmp/* /var/cache/apk/*

# Configure PHP for production
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && echo "opcache.enable=1" >> "$PHP_INI_DIR/conf.d/opcache.ini" \
    && echo "opcache.memory_consumption=128" >> "$PHP_INI_DIR/conf.d/opcache.ini" \
    && echo "opcache.interned_strings_buffer=8" >> "$PHP_INI_DIR/conf.d/opcache.ini" \
    && echo "opcache.max_accelerated_files=4000" >> "$PHP_INI_DIR/conf.d/opcache.ini" \
    && echo "opcache.revalidate_freq=2" >> "$PHP_INI_DIR/conf.d/opcache.ini" \
    && echo "opcache.fast_shutdown=1" >> "$PHP_INI_DIR/conf.d/opcache.ini"

# Copy composer from build stage
COPY --from=composer /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer dependencies from the build stage
COPY --from=composer /app/vendor/ /var/www/vendor/

# Copy application files
COPY . /var/www/

# Copy Caddyfile
COPY docker/caddyfile /etc/caddy/Caddyfile

# Copy entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set correct permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage /var/www/bootstrap/cache

# Expose port
EXPOSE 80

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
