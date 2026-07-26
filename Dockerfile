# syntax=docker/dockerfile:1.7

FROM node:20.19.5-bookworm-slim@sha256:9e70124bd00f47dd023e349cd587132ae61892acc0e47ed641416c3e18f401c3 AS frontend

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json vite.config.ts ./
COPY resources/ resources/
RUN npm run build

FROM php:8.2-apache-bookworm@sha256:cd6e09f114ca406c0707688dd4a3b3ac2511675238af23b76862a5be98b3bad7 AS runtime

ENV APACHE_DOCUMENT_ROOT=/var/www/app/public \
    PORTFOLIO_APP_ROOT=/var/www/app

COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker/apache-security.conf /etc/apache2/conf-available/zz-portfolio-security.conf
COPY docker/php.ini "$PHP_INI_DIR/conf.d/portfolio.ini"

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && a2enmod expires headers rewrite \
    && a2enconf zz-portfolio-security

WORKDIR /var/www/app

COPY --chown=root:root public/ public/
COPY --chown=root:root resources/data/ resources/data/
COPY --chown=root:root resources/views/ resources/views/
COPY --from=frontend --chown=root:root /workspace/public/build/ public/build/

RUN find /var/www/app -type d -exec chmod 0755 {} + \
    && find /var/www/app -type f -exec chmod 0644 {} +

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD ["php", "-r", "$body = @file_get_contents('http://127.0.0.1/'); exit($body === false ? 1 : 0);"]
