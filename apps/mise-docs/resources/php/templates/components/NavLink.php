<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<li>
  <a
    class="mise-c-nav-link"
    href="<?= $escape->attribute($url->validate($props->string('href'))) ?>"
    <?php if ($props->boolean('current')): ?>aria-current="page"<?php endif; ?>
  ><?= $escape->text($props->string('label')) ?></a>
</li>
