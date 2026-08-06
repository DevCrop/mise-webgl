<?php

declare(strict_types=1);

namespace Mise\Php;

require_once __DIR__ . '/Props.php';
require_once __DIR__ . '/Slot.php';
require_once __DIR__ . '/Component.php';
require_once __DIR__ . '/RenderContext.php';
require_once __DIR__ . '/ComponentRenderer.php';
require_once __DIR__ . '/Escaper.php';
require_once __DIR__ . '/UrlPolicy.php';
require_once __DIR__ . '/TemplateRegistry.php';
require_once __DIR__ . '/GenericComponent.php';
require_once __DIR__ . '/PhpComponentRenderer.php';

function createMiseRenderer(?string $templateRoot = null): PhpComponentRenderer
{
    $sourceRoot = dirname(__DIR__) . '/templates/components';
    $distributionRoot = __DIR__ . '/templates/components';
    $root = $templateRoot ?? (is_dir($distributionRoot) ? $distributionRoot : $sourceRoot);

    return new PhpComponentRenderer(new TemplateRegistry($root, [
        'Callout' => 'Callout.php',
        'ErrorPage' => 'StatusPage.php',
        'NotFoundPage' => 'StatusPage.php',
        'Text' => 'Text.php',
        'WebglSurface' => 'WebglSurface.php',
    ]));
}
