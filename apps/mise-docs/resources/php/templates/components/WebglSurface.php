<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<div class="mise-c-webgl-surface" data-mise-component="webgl-surface" data-mise-docs-webgl data-mise-surface>
  <canvas class="mise-c-webgl-surface__canvas" data-mise-canvas aria-hidden="true"></canvas>
  <p class="mise-c-webgl-surface__fallback" data-mise-fallback role="status">
    <?= $escape->text($props->string('fallback')) ?>
  </p>
</div>
