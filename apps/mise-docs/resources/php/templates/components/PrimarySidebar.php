<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<nav aria-label="<?= $escape->attribute($props->string('label')) ?>" data-mise-component="primary-sidebar" data-mise-controller="disclosure">
  <div class="mise-c-sidebar__header">
    <p class="mise-c-eyebrow">Documentation</p>
    <button class="mise-c-button mise-c-button--quiet mise-c-js-control" type="button" aria-controls="primary-navigation" aria-expanded="true">탐색 접기</button>
  </div>
  <div id="primary-navigation" data-mise-disclosure-panel>
    <?= $renderSlot($slots['items'] ?? new \Mise\Php\Slot()) ?>
  </div>
</nav>
