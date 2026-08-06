<?php

declare(strict_types=1);

namespace Mise\Docs;

final readonly class Route
{
    public function __construct(
        public string $locale,
        public string $name,
        public int $status,
        public string $path,
    ) {
    }
}
