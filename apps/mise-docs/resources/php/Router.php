<?php

declare(strict_types=1);

namespace Mise\Docs;

use InvalidArgumentException;

final readonly class Router
{
    public function __construct(private string $basePath = '/')
    {
        if ($basePath === '' || $basePath[0] !== '/') {
            throw new InvalidArgumentException('MISE Docs base path is invalid.');
        }
    }

    public function match(string $requestUri): Route
    {
        $path = parse_url($requestUri, PHP_URL_PATH);
        if (!is_string($path) || preg_match('/[\x00-\x1F\x7F]/', $path) === 1) {
            return new Route('ko', 'error', 400, '/ko');
        }
        $relative = $this->relativePath(rawurldecode($path));
        if ($relative === null) {
            return new Route('ko', 'not-found', 404, '/ko');
        }
        $normalized = '/' . trim($relative, '/');
        if ($normalized === '/') {
            $normalized = '/ko';
        }
        if (!preg_match('#^/ko(?:/[a-z0-9-]+)*$#', $normalized)) {
            return new Route('ko', 'error', 400, '/ko');
        }

        return new Route('ko', 'document', 200, $normalized);
    }

    private function relativePath(string $path): ?string
    {
        if ($this->basePath === '/') {
            return $path;
        }
        $base = rtrim($this->basePath, '/');
        if ($path === $base) {
            return '/';
        }
        if (!str_starts_with($path, $base . '/')) {
            return null;
        }

        return substr($path, strlen($base));
    }
}
