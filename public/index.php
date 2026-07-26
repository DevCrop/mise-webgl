<?php

declare(strict_types=1);

const VITE_ENTRY = 'resources/ts/app.ts';

function resolveProjectRoot(): string
{
    $configuredRoot = getenv('PORTFOLIO_APP_ROOT');
    $candidates = array_filter([
        is_string($configuredRoot) ? $configuredRoot : null,
        __DIR__ . '/..',
        __DIR__ . '/../app',
    ], static fn (?string $path): bool => is_string($path) && $path !== '');

    foreach ($candidates as $candidate) {
        $root = realpath($candidate);
        if (
            is_string($root)
            && is_file($root . '/resources/data/portfolio.json')
            && is_dir($root . '/resources/views')
        ) {
            return $root;
        }
    }

    throw new RuntimeException('Portfolio application root is unavailable.');
}

function escape(string|int|float $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * @return array{scripts: list<string>, styles: list<string>}
 */
function viteAssets(): array
{
    $devServer = getenv('VITE_DEV_SERVER');
    if (is_string($devServer) && $devServer !== '') {
        $origin = rtrim($devServer, '/');

        return [
            'scripts' => [$origin . '/build/@vite/client', $origin . '/build/' . VITE_ENTRY],
            'styles' => [],
        ];
    }

    $manifestPath = __DIR__ . '/build/.vite/manifest.json';
    if (!is_file($manifestPath)) {
        throw new RuntimeException('Frontend manifest is missing. Run npm run build.');
    }

    $manifest = json_decode(
        (string) file_get_contents($manifestPath),
        true,
        512,
        JSON_THROW_ON_ERROR,
    );
    $entry = $manifest[VITE_ENTRY] ?? null;
    if (!is_array($entry) || !isset($entry['file'])) {
        throw new RuntimeException('Frontend entry is missing from the Vite manifest.');
    }

    return [
        'scripts' => ['/build/' . ltrim((string) $entry['file'], '/')],
        'styles' => array_map(
            static fn (string $file): string => '/build/' . ltrim($file, '/'),
            isset($entry['css']) && is_array($entry['css']) ? $entry['css'] : [],
        ),
    ];
}

try {
    define('PROJECT_ROOT', resolveProjectRoot());

    header('Content-Type: text/html; charset=UTF-8');
    if (getenv('VITE_DEV_SERVER') === false) {
        header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    }

    $portfolio = json_decode(
        (string) file_get_contents(PROJECT_ROOT . '/resources/data/portfolio.json'),
        true,
        512,
        JSON_THROW_ON_ERROR,
    );
    if (!is_array($portfolio)) {
        throw new RuntimeException('Portfolio data must be an object.');
    }

    $profile = is_array($portfolio['profile'] ?? null) ? $portfolio['profile'] : [];
    $works = is_array($portfolio['projects'] ?? null) ? $portfolio['projects'] : [];
    $assets = viteAssets();
    $title = escape((string) ($profile['name'] ?? 'Personal Portfolio'));
    $pageId = 'home';

    require PROJECT_ROOT . '/resources/views/layouts/app.php';
} catch (Throwable $error) {
    http_response_code(500);
    error_log('[portfolio] bootstrap_failed');
    echo '<!doctype html><html lang="ko"><meta charset="utf-8"><title>Portfolio unavailable</title>';
    echo '<body><h1>페이지를 불러올 수 없습니다.</h1></body></html>';
}
