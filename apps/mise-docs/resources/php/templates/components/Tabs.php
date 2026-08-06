<?php
/** @var \Mise\Php\Props $props */
/** @var array<string, \Mise\Php\Slot> $slots */
/** @var \Mise\Php\Escaper $escape */
/** @var \Mise\Php\UrlPolicy $url */
/** @var callable(\Mise\Php\Component): string $renderComponent */
/** @var callable(\Mise\Php\Slot): string $renderSlot */
?>
<section data-mise-component="tabs" data-mise-controller="tabs">
  <div role="tablist" aria-label="<?= $escape->attribute($props->string('label')) ?>">
    <?php foreach ($props->value('items') as $index => $item): ?>
      <button class="mise-c-tab" id="tab-<?= $escape->attribute($item->id) ?>" type="button" role="tab" aria-controls="panel-<?= $escape->attribute($item->id) ?>" aria-selected="<?= $index === 0 ? 'true' : 'false' ?>" tabindex="<?= $index === 0 ? '0' : '-1' ?>"><?= $escape->text($item->label) ?></button>
    <?php endforeach; ?>
  </div>
  <?php foreach ($props->value('items') as $item): ?>
    <div class="mise-c-tab-panel" id="panel-<?= $escape->attribute($item->id) ?>" role="tabpanel" aria-labelledby="tab-<?= $escape->attribute($item->id) ?>">
      <pre class="mise-c-code-block"><code><?= $escape->text($item->content) ?></code></pre>
    </div>
  <?php endforeach; ?>
</section>
