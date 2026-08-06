<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<?php if ($props->boolean('ordered')): ?>
  <ol class="mise-c-document-list"><?= $renderSlot($slots['items'] ?? new \Mise\Php\Slot()) ?></ol>
<?php else: ?>
  <ul class="mise-c-document-list"><?= $renderSlot($slots['items'] ?? new \Mise\Php\Slot()) ?></ul>
<?php endif; ?>
