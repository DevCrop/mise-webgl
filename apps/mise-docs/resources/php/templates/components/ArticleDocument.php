<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<article class="mise-c-article" data-mise-component="article-document">
  <header class="mise-c-article__header">
    <p class="mise-c-eyebrow"><?= $escape->text($props->string('status')) ?> · MISE</p>
    <h1 class="mise-c-article__title" id="overview" data-mise-heading><?= $escape->text($props->string('title')) ?></h1>
    <p class="mise-c-article__lead"><?= $escape->text($props->string('summary')) ?></p>
  </header>
  <div class="mise-c-article__body"><?= $renderSlot($slots['content'] ?? new \Mise\Php\Slot()) ?></div>
</article>
