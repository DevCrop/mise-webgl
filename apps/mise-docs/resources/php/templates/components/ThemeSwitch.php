<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<div class="mise-c-theme-switch mise-c-js-control" data-mise-component="theme-switch" aria-label="색상 테마">
  <button class="mise-c-button mise-c-button--quiet" type="button" data-mise-theme-value="light" aria-pressed="false">밝게</button>
  <button class="mise-c-button mise-c-button--quiet" type="button" data-mise-theme-value="dark" aria-pressed="false">어둡게</button>
</div>
