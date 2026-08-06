<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<article class="mise-c-article" data-mise-component="status-page">
  <h1 class="mise-c-article__title"><?= $escape->text($props->string('title')) ?></h1>
  <p><?= $escape->text($props->string('message')) ?></p>
</article>
