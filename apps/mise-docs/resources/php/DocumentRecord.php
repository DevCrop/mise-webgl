<?php

declare(strict_types=1);

namespace Mise\Docs;

use InvalidArgumentException;

final readonly class DocumentRecord
{
    /** @param list<array<string, mixed>> $content */
    /** @param list<TableOfContentsItem> $tableOfContents */
    public function __construct(
        public string $id,
        public string $locale,
        public int $order,
        public string $route,
        public string $section,
        public string $status,
        public string $title,
        public string $description,
        public array $content,
        public array $tableOfContents,
    ) {
        if (!preg_match('/^mise\.docs\.[a-z][a-z0-9-]*$/', $id)) {
            throw new InvalidArgumentException('MISE Docs document ID is invalid.');
        }
        if (!preg_match('#^/[a-z0-9/-]*$#', $route)) {
            throw new InvalidArgumentException('MISE Docs document route is invalid.');
        }
    }
}
