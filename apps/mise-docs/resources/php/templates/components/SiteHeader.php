<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<header class="mise-c-site-header" data-mise-component="site-header">
  <a class="mise-c-brand" href="<?= $escape->attribute($url->validate($props->string('homeUrl'))) ?>">
    <span class="mise-c-brand__mark" aria-hidden="true">M</span>
    <span class="mise-c-brand__name"><?= $escape->text($props->string('brand')) ?></span>
    <span class="mise-c-brand__product">Docs</span>
  </a>
  <nav class="mise-c-site-header__nav" aria-label="주요 탐색">
    <a href="<?= $escape->attribute($url->validate($props->string('homeUrl'))) ?>">문서</a>
    <a href="<?= $escape->attribute($url->validate($props->string('componentsUrl'))) ?>">Component</a>
  </nav>
  <div class="mise-c-site-header__actions"><?= $renderSlot($slots['controls'] ?? new \Mise\Php\Slot()) ?></div>
</header>
