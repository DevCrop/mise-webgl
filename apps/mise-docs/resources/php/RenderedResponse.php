<?php

declare(strict_types=1);

namespace Mise\Docs;

final readonly class RenderedResponse
{
    public function __construct(
        public int $status,
        public string $body,
    ) {
    }
}
