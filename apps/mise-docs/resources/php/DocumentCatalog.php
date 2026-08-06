<?php

declare(strict_types=1);

namespace Mise\Docs;

use JsonException;
use RuntimeException;

final class DocumentCatalog
{
    /** @var list<DocumentRecord> */
    private array $records;
    private string $dataRoot;

    public function __construct(string $dataRoot)
    {
        $this->dataRoot = rtrim($dataRoot, '/\\');
        $source = @file_get_contents($this->dataRoot . '/navigation.json');
        if (!is_string($source)) {
            throw new RuntimeException('MISE Docs navigation index is unavailable.');
        }
        try {
            $decoded = json_decode($source, true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new RuntimeException('MISE Docs navigation index is invalid.');
        }
        if (!is_array($decoded) || ($decoded['schemaVersion'] ?? null) !== 1 || !is_array($decoded['items'] ?? null)) {
            throw new RuntimeException('MISE Docs navigation schema is invalid.');
        }
        $records = [];
        foreach ($decoded['items'] as $item) {
            if (!is_array($item)) {
                throw new RuntimeException('MISE Docs navigation record is invalid.');
            }
            $records[] = $this->record($item);
        }
        $this->records = $records;
    }

    public function findByRoute(string $route): ?DocumentRecord
    {
        foreach ($this->records as $record) {
            if ($record->route === $route) {
                return $record;
            }
        }

        return null;
    }

    /** @return list<DocumentRecord> */
    public function records(): array
    {
        return $this->records;
    }

    /** @param array<string, mixed> $item */
    private function record(array $item): DocumentRecord
    {
        foreach (['id', 'locale', 'route', 'section', 'status', 'title'] as $field) {
            if (!is_string($item[$field] ?? null)) {
                throw new RuntimeException('MISE Docs navigation field is invalid.');
            }
        }
        if (!is_int($item['order'] ?? null)) {
            throw new RuntimeException('MISE Docs navigation order is invalid.');
        }
        $documentPath = $this->dataRoot . '/documents/' . $item['id'] . '.json';
        $documentSource = @file_get_contents($documentPath);
        if (!is_string($documentSource)) {
            throw new RuntimeException('MISE Docs document model is unavailable.');
        }
        try {
            $document = json_decode($documentSource, true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new RuntimeException('MISE Docs document model is invalid.');
        }
        $description = is_array($document) ? ($document['description'] ?? null) : null;
        if (!is_string($description)) {
            throw new RuntimeException('MISE Docs document description is invalid.');
        }
        $componentModel = is_array($document) ? ($document['componentModel'] ?? null) : null;
        $slots = is_array($componentModel) ? ($componentModel['slots'] ?? null) : null;
        $content = is_array($slots) ? ($slots['content'] ?? null) : null;
        if (!is_array($content) || !array_is_list($content)) {
            throw new RuntimeException('MISE Docs document content is invalid.');
        }
        $tableOfContents = $this->tableOfContents($document['toc'] ?? null);

        return new DocumentRecord(
            $item['id'],
            $item['locale'],
            $item['order'],
            $item['route'],
            $item['section'],
            $item['status'],
            $item['title'],
            $description,
            $content,
            $tableOfContents,
        );
    }

    /** @return list<TableOfContentsItem> */
    private function tableOfContents(mixed $value): array
    {
        if (!is_array($value) || !array_is_list($value)) {
            throw new RuntimeException('MISE Docs table of contents is invalid.');
        }
        $items = [];
        foreach ($value as $item) {
            if (
                !is_array($item)
                || !is_string($item['id'] ?? null)
                || !is_int($item['level'] ?? null)
                || !is_string($item['text'] ?? null)
            ) {
                throw new RuntimeException('MISE Docs table of contents record is invalid.');
            }
            $items[] = new TableOfContentsItem($item['id'], $item['level'], $item['text']);
        }

        return $items;
    }
}
