<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dist/app/bootstrap.php';

$home = createMiseDocsApplication()->handle('/ko?source=test');
assertSame(200, $home->status, 'home status');
assertContains('<!doctype html>', $home->body, 'Document Component');
assertContains('aria-current="page"', $home->body, 'active navigation');
assertContains('data-mise-component="docs-shell"', $home->body, 'DocsShell Component');
assertCount(1, '<main', $home->body, 'single main');
assertCount(2, '<aside', $home->body, 'two asides');
assertCount(1, '<h1', $home->body, 'single h1');
assertNotContains('<script>', $home->body, 'raw script');
assertContains('data-mise-component="document-table"', $home->body, 'compiled document table');
assertContains('1. 문서 지위', $home->body, 'compiled document body');

$homeTrailingSlash = createMiseDocsApplication()->handle('/ko/');
assertSame(200, $homeTrailingSlash->status, 'trailing slash home status');

$navigationSource = file_get_contents(dirname(__DIR__) . '/dist/data/navigation.json');
if (!is_string($navigationSource)) {
    throw new RuntimeException('FAIL navigation fixture');
}
$navigation = json_decode($navigationSource, true, 64, JSON_THROW_ON_ERROR);
foreach ($navigation['items'] ?? [] as $item) {
    $route = is_array($item) ? ($item['route'] ?? null) : null;
    if (!is_string($route)) {
        throw new RuntimeException('FAIL navigation route fixture');
    }
    $response = createMiseDocsApplication()->handle($route);
    assertSame(200, $response->status, "navigation route {$route}");
    assertNotContains('문서를 찾을 수 없습니다', $response->body, "navigation body {$route}");
}

$notFound = createMiseDocsApplication()->handle('/ko/missing');
assertSame(404, $notFound->status, 'not-found status');
assertContains('문서를 찾을 수 없습니다', $notFound->body, 'not-found Component');

$scss = createMiseDocsApplication()->handle('/ko/scss');
assertSame(200, $scss->status, 'generated route status');
assertContains('MISE SCSS System', $scss->body, 'generated route title');

$subpath = createMiseDocsApplication('/manual');
$subpathHome = $subpath->handle('/manual/ko');
assertSame(200, $subpathHome->status, 'subpath home');
assertContains('href="/manual/assets/MiseUi.css"', $subpathHome->body, 'subpath stylesheet');
assertContains('href="/manual/ko"', $subpathHome->body, 'subpath navigation');
assertContains('href="/manual/ko/architecture"', $subpathHome->body, 'subpath document content link');
assertSame(404, $subpath->handle('/ko')->status, 'subpath boundary');

echo "MISE DOCS PHP TEST PASS\n";

function assertSame(int $expected, int $actual, string $label): void
{
    if ($expected !== $actual) {
        throw new RuntimeException('FAIL ' . $label);
    }
}

function assertContains(string $expected, string $actual, string $label): void
{
    if (!str_contains($actual, $expected)) {
        throw new RuntimeException('FAIL ' . $label);
    }
}

function assertNotContains(string $expected, string $actual, string $label): void
{
    if (str_contains($actual, $expected)) {
        throw new RuntimeException('FAIL ' . $label);
    }
}

function assertCount(int $expected, string $needle, string $haystack, string $label): void
{
    if (substr_count($haystack, $needle) !== $expected) {
        throw new RuntimeException('FAIL ' . $label);
    }
}
