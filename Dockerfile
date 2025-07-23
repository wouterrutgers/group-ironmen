FROM php:8.4-fpm-alpine

WORKDIR /var/www

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

RUN docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    pdo_sqlite \
    bcmath \
    zip \
    opcache

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY docker/php/php.ini $PHP_INI_DIR/conf.d/custom.ini
COPY docker/php/opcache.ini $PHP_INI_DIR/conf.d/opcache.ini
COPY docker/caddyfile /etc/caddy/Caddyfile
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

COPY --chown=www-data:www-data . /var/www/
RUN find /var/www -type d -exec chmod 755 {} + && \
    find /var/www -type f -exec chmod 644 {} +

RUN chmod -R 775 /var/www/storage /var/www/bootstrap/cache

RUN rm -rf /var/www/.git*

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
