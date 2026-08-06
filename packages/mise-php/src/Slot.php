<?php

declare(strict_types=1);

namespace Mise\Php;

final class Slot
{
    /** @var list<Component> */
    private array $items = [];

    public function component(Component $component): self
    {
        $next = clone $this;
        $next->items[] = $component;

        return $next;
    }

    /** @return list<Component> */
    public function items(): array
    {
        return $this->items;
    }
}
