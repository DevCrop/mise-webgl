<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<div class="mise-c-search mise-c-js-control" data-mise-component="search-dialog" data-mise-controller="dialog search">
  <button class="mise-c-button mise-c-button--primary" type="button" data-mise-dialog-open>문서 검색</button>
  <dialog class="mise-c-dialog" aria-labelledby="search-dialog-title">
    <div class="mise-c-dialog__header">
      <h2 id="search-dialog-title">문서 검색</h2>
      <button class="mise-c-button mise-c-button--quiet" type="button" data-mise-dialog-close>닫기</button>
    </div>
    <label class="mise-c-search__label" for="docs-search-input">검색어</label>
    <input id="docs-search-input" type="search" data-mise-search-input autofocus>
    <ul class="mise-c-nav-list">
      <?= $renderSlot($slots['results'] ?? new \Mise\Php\Slot()) ?>
    </ul>
  </dialog>
</div>
