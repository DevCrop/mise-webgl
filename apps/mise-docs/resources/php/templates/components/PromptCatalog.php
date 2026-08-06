<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<section class="mise-c-prompt-catalog" aria-labelledby="public-prompts-title" data-mise-component="prompt-catalog">
  <h2 id="public-prompts-title" data-mise-heading><?= $escape->text($props->string('title')) ?></h2>
  <div class="mise-c-prompt-catalog__items">
    <?= $renderSlot($slots['items'] ?? new \Mise\Php\Slot()) ?>
  </div>
</section>
