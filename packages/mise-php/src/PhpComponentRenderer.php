<?php

declare(strict_types=1);

namespace Mise\Php;

use Throwable;

final class PhpComponentRenderer implements ComponentRenderer
{
    public function __construct(
        private readonly TemplateRegistry $templates,
        private readonly Escaper $escaper = new Escaper(),
        private readonly UrlPolicy $urls = new UrlPolicy(),
    ) {
    }

    public function render(Component $component, RenderContext $context): string
    {
        $template = $this->templates->resolve($component->name());
        $props = $component->props();
        $slots = $component->slots();
        $escape = $this->escaper;
        $url = $this->urls;
        $renderComponent = fn (Component $child): string => $this->render($child, $context);
        $renderSlot = function (Slot $slot) use ($context): string {
            $html = '';
            foreach ($slot->items() as $item) {
                $html .= $this->render($item, $context);
            }

            return $html;
        };

        ob_start();
        try {
            require $template;
            $output = ob_get_clean();
        } catch (Throwable $error) {
            ob_end_clean();
            throw $error;
        }

        return is_string($output) ? $output : '';
    }
}
