<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<a class="mise-c-skip-link" href="#main-content">본문으로 건너뛰기</a>
<div class="mise-l-docs-shell" data-mise-component="docs-shell" data-mise-controller="toc">
  <div class="mise-l-docs-shell__header"><?= $renderSlot($slots['header'] ?? new \Mise\Php\Slot()) ?></div>
  <aside class="mise-l-docs-shell__sidebar"><?= $renderSlot($slots['sidebar'] ?? new \Mise\Php\Slot()) ?></aside>
  <main class="mise-l-docs-shell__article" id="main-content" tabindex="-1"><?= $renderSlot($slots['article'] ?? new \Mise\Php\Slot()) ?></main>
  <aside class="mise-l-docs-shell__toc"><?= $renderSlot($slots['toc'] ?? new \Mise\Php\Slot()) ?></aside>
</div>
