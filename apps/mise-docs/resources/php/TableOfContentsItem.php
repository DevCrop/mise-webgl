<?php

declare(strict_types=1);

namespace Mise\Docs;

use InvalidArgumentException;

final readonly class TableOfContentsItem
{
    public function __construct(
        public string $id,
        public int $level,
        public string $label,
    ) {
        if (!in_array($level, [2, 3], true) || $id === '' || $label === '') {
            throw new InvalidArgumentException('MISE Docs table of contents item is invalid.');
        }
    }
}
