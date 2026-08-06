<?php

declare(strict_types=1);

namespace Mise\Php;

final readonly class GenericComponent implements Component
{
    /** @param array<string, Slot> $slots */
    public function __construct(
        private string $componentName,
        private Props $componentProps = new Props(),
        private array $componentSlots = [],
    ) {
    }

    public function name(): string
    {
        return $this->componentName;
    }

    public function props(): Props
    {
        return $this->componentProps;
    }

    /** @return array<string, Slot> */
    public function slots(): array
    {
        return $this->componentSlots;
    }
}
