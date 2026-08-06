<?php

declare(strict_types=1);

namespace Mise\Php;

final readonly class RenderContext
{
    public function __construct(
        public string $locale = 'en',
        public string $basePath = '/',
    ) {
    }
}
