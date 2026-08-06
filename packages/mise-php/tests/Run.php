<?php

declare(strict_types=1);

use Mise\Php\GenericComponent;
use Mise\Php\Props;
use Mise\Php\RenderContext;
use Mise\Php\Slot;
use Mise\Php\TemplateRegistry;
use Mise\Php\UrlPolicy;
use function Mise\Php\createMiseRenderer;

require_once dirname(__DIR__) . '/src/bootstrap.php';

$renderer = createMiseRenderer();
$content = (new Slot())->component(new GenericComponent(
    'Text',
    new Props(['text' => '<script>alert(1)</script>']),
));
$callout = new GenericComponent(
    'Callout',
    new Props(['title' => '<중요>']),
    ['content' => $content],
);
$output = $renderer->render($callout, new RenderContext('ko', '/ko'));

assertContains('&lt;중요&gt;', $output, 'title escaping');
assertContains('&lt;script&gt;alert(1)&lt;/script&gt;', $output, 'Slot escaping');
assertNotContains('<script>', $output, 'raw script rejection');

$urls = new UrlPolicy();
assertSame('/ko/guide', $urls->validate('/ko/guide'), 'relative URL');
assertSame('https://example.com/docs', $urls->validate('https://example.com/docs'), 'HTTPS URL');
assertThrows(fn (): string => $urls->validate('javascript:alert(1)'), 'unsafe URL scheme');
assertThrows(fn (): string => $urls->validate('//example.com'), 'protocol-relative URL');

$registry = new TemplateRegistry(
    dirname(__DIR__) . '/templates/components',
    ['Traversal' => '../components/Text.php', 'Invalid' => 'Text.txt'],
);
assertThrows(fn (): string => $registry->resolve('Invalid'), 'template extension');
assertThrows(fn (): string => $registry->resolve('../Traversal'), 'Component name');

echo "MISE PHP TEST PASS\n";

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

function assertSame(string $expected, string $actual, string $label): void
{
    if ($expected !== $actual) {
        throw new RuntimeException('FAIL ' . $label);
    }
}

function assertThrows(callable $callback, string $label): void
{
    try {
        $callback();
    } catch (InvalidArgumentException) {
        return;
    }

    throw new RuntimeException('FAIL ' . $label);
}
