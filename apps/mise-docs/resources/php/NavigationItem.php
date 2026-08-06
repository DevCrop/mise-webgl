<?php

declare(strict_types=1);

namespace Mise\Docs;

final readonly class NavigationItem
{
    public function __construct(
        public string $label,
        public string $href,
        public string $section,
        public bool $current = false,
    ) {
    }
}
