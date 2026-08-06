<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<section class="mise-c-webgl-example" aria-labelledby="webgl-example-title" data-mise-component="webgl-example">
  <h2 id="webgl-example-title" data-mise-heading><?= $escape->text($props->string('title')) ?></h2>
  <p><?= $escape->text($props->string('description')) ?></p>
  <?= $renderSlot($slots['surface'] ?? new \Mise\Php\Slot()) ?>
</section>
