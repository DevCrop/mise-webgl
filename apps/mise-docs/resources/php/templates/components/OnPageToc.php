<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<nav aria-label="<?= $escape->attribute($props->string('label')) ?>" data-mise-component="on-page-toc">
  <p class="mise-c-eyebrow"><?= $escape->text($props->string('label')) ?></p>
  <a class="mise-c-toc-link" href="#overview" aria-current="location" data-mise-toc-link><?= $escape->text($props->string('heading')) ?></a>
  <div class="mise-c-toc-list"><?= $renderSlot($slots['items'] ?? new \Mise\Php\Slot()) ?></div>
</nav>
