<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<?php if ($props->boolean('header')): ?>
  <th scope="col"><?= $renderSlot($slots['content'] ?? new \Mise\Php\Slot()) ?></th>
<?php else: ?>
  <td><?= $renderSlot($slots['content'] ?? new \Mise\Php\Slot()) ?></td>
<?php endif; ?>
