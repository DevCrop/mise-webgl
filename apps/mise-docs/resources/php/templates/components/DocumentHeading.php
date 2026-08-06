<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
$level = $props->string('level');
?>
<?php if ($level === '2'): ?>
  <h2 class="mise-c-document-heading" id="<?= $escape->attribute($props->string('id')) ?>" data-mise-heading><?= $renderSlot($slots['content'] ?? new \Mise\Php\Slot()) ?></h2>
<?php elseif ($level === '3'): ?>
  <h3 class="mise-c-document-heading mise-c-document-heading--nested" id="<?= $escape->attribute($props->string('id')) ?>" data-mise-heading><?= $renderSlot($slots['content'] ?? new \Mise\Php\Slot()) ?></h3>
<?php elseif ($level === '4'): ?>
  <h4 class="mise-c-document-heading mise-c-document-heading--nested" id="<?= $escape->attribute($props->string('id')) ?>" data-mise-heading><?= $renderSlot($slots['content'] ?? new \Mise\Php\Slot()) ?></h4>
<?php elseif ($level === '5'): ?>
  <h5 class="mise-c-document-heading mise-c-document-heading--nested" id="<?= $escape->attribute($props->string('id')) ?>" data-mise-heading><?= $renderSlot($slots['content'] ?? new \Mise\Php\Slot()) ?></h5>
<?php else: ?>
  <h6 class="mise-c-document-heading mise-c-document-heading--nested" id="<?= $escape->attribute($props->string('id')) ?>" data-mise-heading><?= $renderSlot($slots['content'] ?? new \Mise\Php\Slot()) ?></h6>
<?php endif; ?>
