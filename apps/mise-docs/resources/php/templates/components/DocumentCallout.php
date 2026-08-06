<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<aside class="mise-c-document-callout" data-mise-component="document-callout">
  <span class="mise-c-document-callout__mark" aria-hidden="true">!</span>
  <p><?= $renderSlot($slots['content'] ?? new \Mise\Php\Slot()) ?></p>
</aside>
