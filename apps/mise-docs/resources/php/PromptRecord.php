<?php

declare(strict_types=1);

namespace Mise\Docs;

final readonly class PromptRecord
{
    /** @param list<string> $tags */
    public function __construct(
        public string $id,
        public string $title,
        public string $summary,
        public string $status,
        public int $version,
        public array $tags,
        public string $route,
        public string $copyText,
        public string $lastVerified,
    ) {
    }
}
