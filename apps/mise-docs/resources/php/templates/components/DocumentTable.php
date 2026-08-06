<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<div class="mise-c-document-table-wrap" data-mise-component="document-table">
  <table class="mise-c-document-table">
    <thead><?= $renderSlot($slots['head'] ?? new \Mise\Php\Slot()) ?></thead>
    <tbody><?= $renderSlot($slots['body'] ?? new \Mise\Php\Slot()) ?></tbody>
  </table>
</div>
