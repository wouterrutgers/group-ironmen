FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    default-mysql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-install pdo_mysql zip

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . /var/www/
COPY --chown=www-data:www-data . /var/www/

RUN cp .env.example .env \
    && php artisan key:generate \
    && chown www-data:www-data .env

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
