<?php

declare(strict_types=1);

namespace Mise\Php;

interface Component
{
    public function name(): string;

    public function props(): Props;

    /** @return array<string, Slot> */
    public function slots(): array;
}
