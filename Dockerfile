FROM php:8.4-fpm-alpine

# Set working directory
WORKDIR /var/www

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    libzip-dev \
    oniguruma-dev \
    zip \
    unzip \
    sqlite-dev \
    sqlite \
    && curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/cfg/gpg/gpg.155B6D79CA56EA34.key' > /etc/apk/keys/caddy.key \
    && echo "https://dl.cloudsmith.io/public/caddy/stable/alpine/any-version/main" >> /etc/apk/repositories \
    && apk add --no-cache caddy

# Install PHP extensions
RUN docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    pdo_sqlite \
    bcmath \
    zip \
    opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy configuration files
COPY docker/php/php.ini $PHP_INI_DIR/conf.d/custom.ini
COPY docker/php/opcache.ini $PHP_INI_DIR/conf.d/opcache.ini
COPY docker/caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Make entrypoint executable
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy application files
COPY --chown=www-data:www-data . /var/www/

# Set permissions
RUN chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Remove development files
RUN rm -rf /var/www/.git*

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
