<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<section class="mise-c-navigation-section" data-mise-component="navigation-section">
  <h2><?= $escape->text($props->string('label')) ?></h2>
  <ul class="mise-c-nav-list"><?= $renderSlot($slots['items'] ?? new \Mise\Php\Slot()) ?></ul>
</section>
