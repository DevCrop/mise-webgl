<?php

declare(strict_types=1);

namespace Mise\Php;

interface ComponentRenderer
{
    public function render(Component $component, RenderContext $context): string;
}
