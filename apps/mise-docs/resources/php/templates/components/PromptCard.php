<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<article class="mise-c-prompt-card" id="<?= $escape->attribute($props->string('id')) ?>" data-mise-component="prompt-card">
  <header class="mise-c-prompt-card__header">
    <h3 data-mise-heading><?= $escape->text($props->string('title')) ?></h3>
    <p><span><?= $escape->text($props->string('status')) ?></span> · v<?= $escape->text($props->string('version')) ?></p>
  </header>
  <p><?= $escape->text($props->string('summary')) ?></p>
  <p>검증: <code><?= $escape->text($props->string('evidence')) ?></code></p>
  <?= $renderSlot($slots['copy'] ?? new \Mise\Php\Slot()) ?>
</article>
