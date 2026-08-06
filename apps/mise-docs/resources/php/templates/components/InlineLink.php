<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<a class="mise-c-inline-link" href="<?= $escape->attribute($url->validate($props->string('href'))) ?>"><?= $escape->text($props->string('label')) ?></a>
