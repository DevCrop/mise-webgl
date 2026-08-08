<?php

declare(strict_types=1);

if ($argc < 3) {
    fwrite(STDERR, "Usage: php ExportStatic.php <dist-directory> <base-path>\n");
    exit(1);
}

$distDirectory = realpath($argv[1]);
$basePath = $argv[2];
if (!is_string($distDirectory) || !is_dir($distDirectory)) {
    fwrite(STDERR, "MISE Docs dist directory is missing.\n");
    exit(1);
}
if ($basePath === '' || $basePath[0] !== '/') {
    fwrite(STDERR, "MISE Docs base path must start with /.\n");
    exit(1);
}

require_once $distDirectory . '/app/bootstrap.php';

$sitemapPath = $distDirectory . '/data/sitemap.json';
if (!is_file($sitemapPath)) {
    fwrite(STDERR, "MISE Docs sitemap is missing.\n");
    exit(1);
}

/** @var array{routes?: list<array{route?: string}>} $sitemap */
$sitemap = json_decode((string) file_get_contents($sitemapPath), true, 512, JSON_THROW_ON_ERROR);
$application = createMiseDocsApplication($basePath);
$publicDirectory = $distDirectory . '/public';
$routes = [];

foreach ($sitemap['routes'] ?? [] as $item) {
    $route = is_array($item) ? ($item['route'] ?? null) : null;
    if (!is_string($route) || $route === '') {
        continue;
    }
    $routes[$route] = true;
}

if ($routes === []) {
    fwrite(STDERR, "MISE Docs sitemap has no routes.\n");
    exit(1);
}

foreach (array_keys($routes) as $route) {
    $response = $application->handle(toRequestUri($basePath, $route));
    if ($response->status !== 200) {
        fwrite(STDERR, "MISE Docs static export failed for {$route}.\n");
        exit(1);
    }
  writeHtml($publicDirectory, $route, $response->body);
}

$home = $application->handle(toRequestUri($basePath, '/ko'));
if ($home->status !== 200) {
    fwrite(STDERR, "MISE Docs static export failed for /ko.\n");
    exit(1);
}

writeHtml($publicDirectory, '/ko', $home->body);
if ($basePath === '/') {
    file_put_contents($publicDirectory . '/index.html', redirectDocument($basePath . '/ko/'));
} else {
    file_put_contents(
        $publicDirectory . '/index.html',
        redirectDocument(rtrim($basePath, '/') . '/ko/'),
    );
}

fwrite(STDOUT, 'MISE DOCS STATIC EXPORT PASS routes=' . count($routes) . PHP_EOL);

function writeHtml(string $publicDirectory, string $route, string $body): void
{
    $relative = trim($route, '/');
    $targetDirectory = $publicDirectory . ($relative === '' ? '' : '/' . $relative);
    if (!is_dir($targetDirectory) && !mkdir($targetDirectory, 0775, true) && !is_dir($targetDirectory)) {
        throw new RuntimeException('MISE Docs static export could not create directory.');
    }
    if (file_put_contents($targetDirectory . '/index.html', $body) === false) {
        throw new RuntimeException('MISE Docs static export could not write HTML.');
    }
}

function redirectDocument(string $target): string
{
    $escaped = htmlspecialchars($target, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    return '<!doctype html><html lang="ko"><head>'
        . '<meta charset="utf-8">'
        . '<meta http-equiv="refresh" content="0; url=' . $escaped . '">'
        . '<link rel="canonical" href="' . $escaped . '">'
        . '<title>MISE Documentation</title>'
        . '</head><body>'
        . '<p><a href="' . $escaped . '">MISE Documentation</a></p>'
        . '</body></html>';
}

function toRequestUri(string $basePath, string $route): string
{
    if ($basePath === '/') {
        return $route;
    }

    return rtrim($basePath, '/') . $route;
}
