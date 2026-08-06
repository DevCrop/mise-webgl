<?php

declare(strict_types=1);

namespace Mise\Docs;

use Mise\Php\Component;
use Mise\Php\GenericComponent;
use Mise\Php\Props;
use Mise\Php\Slot;
use RuntimeException;

final class DocumentComponentFactory
{
    /** @param list<array<string, mixed>> $blocks */
    public function slot(array $blocks, string $homeUrl): Slot
    {
        $slot = new Slot();
        foreach ($blocks as $block) {
            $slot = $slot->component($this->block($block, $homeUrl));
        }

        return $slot;
    }

    /** @param array<string, mixed> $block */
    private function block(array $block, string $homeUrl): Component
    {
        $name = $this->string($block, 'component');
        $props = $this->record($block['props'] ?? null, 'block Props');

        return match ($name) {
            'Heading' => $this->heading($props, $homeUrl),
            'Paragraph' => new GenericComponent('DocumentParagraph', new Props(), [
                'content' => $this->inlineSlot($props['content'] ?? null, $homeUrl),
            ]),
            'Callout' => new GenericComponent('DocumentCallout', new Props(), [
                'content' => $this->inlineSlot($props['content'] ?? null, $homeUrl),
            ]),
            'List' => $this->documentList($props, $homeUrl),
            'DataTable' => $this->dataTable($props, $homeUrl),
            'CodeBlock' => new GenericComponent('CodeBlock', new Props([
                'code' => $this->string($props, 'value'),
            ])),
            default => throw new RuntimeException('MISE Docs block Component is not allowed.'),
        };
    }

    /** @param array<string, mixed> $props */
    private function heading(array $props, string $homeUrl): Component
    {
        $level = $props['level'] ?? null;
        if (!is_int($level) || $level < 2 || $level > 6) {
            throw new RuntimeException('MISE Docs heading level is invalid.');
        }

        return new GenericComponent('DocumentHeading', new Props([
            'id' => $this->string($props, 'id'),
            'level' => (string) $level,
        ]), [
            'content' => $this->inlineSlot($props['content'] ?? null, $homeUrl),
        ]);
    }

    /** @param array<string, mixed> $props */
    private function documentList(array $props, string $homeUrl): Component
    {
        $ordered = $props['ordered'] ?? null;
        $items = $this->list($props['items'] ?? null, 'list items');
        if (!is_bool($ordered)) {
            throw new RuntimeException('MISE Docs list type is invalid.');
        }
        $slot = new Slot();
        foreach ($items as $item) {
            $slot = $slot->component(new GenericComponent('DocumentListItem', new Props(), [
                'content' => $this->inlineSlot($item, $homeUrl),
            ]));
        }

        return new GenericComponent('DocumentList', new Props(['ordered' => $ordered]), [
            'items' => $slot,
        ]);
    }

    /** @param array<string, mixed> $props */
    private function dataTable(array $props, string $homeUrl): Component
    {
        $headers = $this->list($props['headers'] ?? null, 'table headers');
        $rows = $this->list($props['rows'] ?? null, 'table rows');
        $head = $this->tableRows([$headers], true, $homeUrl);
        $body = $this->tableRows($rows, false, $homeUrl);

        return new GenericComponent('DocumentTable', new Props(), [
            'head' => $head,
            'body' => $body,
        ]);
    }

    /** @param list<mixed> $rows */
    private function tableRows(array $rows, bool $header, string $homeUrl): Slot
    {
        $output = new Slot();
        foreach ($rows as $row) {
            $cells = new Slot();
            foreach ($this->list($row, 'table row') as $cell) {
                $cells = $cells->component(new GenericComponent('DocumentTableCell', new Props([
                    'header' => $header,
                ]), [
                    'content' => $this->inlineSlot($cell, $homeUrl),
                ]));
            }
            $output = $output->component(new GenericComponent('DocumentTableRow', new Props(), [
                'cells' => $cells,
            ]));
        }

        return $output;
    }

    private function inlineSlot(mixed $value, string $homeUrl): Slot
    {
        $tokens = $this->list($value, 'inline tokens');
        $slot = new Slot();
        foreach ($tokens as $token) {
            $record = $this->record($token, 'inline token');
            $kind = $this->string($record, 'kind');
            $component = match ($kind) {
                'text' => new GenericComponent('InlineText', new Props([
                    'text' => $this->string($record, 'value'),
                ])),
                'code' => new GenericComponent('InlineCode', new Props([
                    'text' => $this->string($record, 'value'),
                ])),
                'link' => new GenericComponent('InlineLink', new Props([
                    'label' => $this->string($record, 'label'),
                    'href' => $this->publishedUrl($this->string($record, 'href'), $homeUrl),
                ])),
                default => throw new RuntimeException('MISE Docs inline token is not allowed.'),
            };
            $slot = $slot->component($component);
        }

        return $slot;
    }

    private function publishedUrl(string $href, string $homeUrl): string
    {
        if (!str_starts_with($href, '/ko')) {
            return $href;
        }

        return rtrim($homeUrl, '/') . substr($href, strlen('/ko'));
    }

    /** @param array<string, mixed> $value */
    private function string(array $value, string $key): string
    {
        $field = $value[$key] ?? null;
        if (!is_string($field)) {
            throw new RuntimeException('MISE Docs Component string is invalid.');
        }

        return $field;
    }

    /** @return array<string, mixed> */
    private function record(mixed $value, string $label): array
    {
        if (!is_array($value) || array_is_list($value)) {
            throw new RuntimeException("MISE Docs {$label} is invalid.");
        }

        return $value;
    }

    /** @return list<mixed> */
    private function list(mixed $value, string $label): array
    {
        if (!is_array($value) || !array_is_list($value)) {
            throw new RuntimeException("MISE Docs {$label} is invalid.");
        }

        return $value;
    }
}
