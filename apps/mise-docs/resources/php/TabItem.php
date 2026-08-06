<?php

declare(strict_types=1);

namespace Mise\Docs;

final readonly class TabItem
{
    public function __construct(
        public string $id,
        public string $label,
        public string $content,
    ) {
    }
}
