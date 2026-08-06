<?php

declare(strict_types=1);

namespace Mise\Docs;

use JsonException;
use RuntimeException;

final class PublicPromptCatalog
{
    /** @var list<PromptRecord> */
    private array $records;

    public function __construct(string $dataRoot)
    {
        $root = rtrim($dataRoot, '/\\');
        $index = $this->decode($root . '/prompt-index.json');
        if (($index['schemaVersion'] ?? null) !== 1 || !is_array($index['items'] ?? null)) {
            throw new RuntimeException('MISE Docs Prompt index schema is invalid.');
        }
        $records = [];
        foreach ($index['items'] as $item) {
            if (!is_array($item) || !is_string($item['id'] ?? null)) {
                throw new RuntimeException('MISE Docs Prompt index record is invalid.');
            }
            $prompt = $this->decode($root . '/prompts/' . $item['id'] . '.json');
            $records[] = $this->record($prompt);
        }
        $this->records = $records;
    }

    /** @return list<PromptRecord> */
    public function records(): array
    {
        return $this->records;
    }

    /** @return array<string, mixed> */
    private function decode(string $path): array
    {
        $source = @file_get_contents($path);
        if (!is_string($source)) {
            throw new RuntimeException('MISE Docs Prompt data is unavailable.');
        }
        try {
            $value = json_decode($source, true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new RuntimeException('MISE Docs Prompt data is invalid.');
        }
        if (!is_array($value)) {
            throw new RuntimeException('MISE Docs Prompt data shape is invalid.');
        }

        return $value;
    }

    /** @param array<string, mixed> $value */
    private function record(array $value): PromptRecord
    {
        foreach (['id', 'title', 'sourceSummary', 'status', 'route', 'copyText', 'lastVerified'] as $field) {
            if (!is_string($value[$field] ?? null)) {
                throw new RuntimeException('MISE Docs Prompt field is invalid.');
            }
        }
        if (!is_int($value['version'] ?? null) || !is_array($value['tags'] ?? null)) {
            throw new RuntimeException('MISE Docs Prompt version or tags are invalid.');
        }
        $tags = [];
        foreach ($value['tags'] as $tag) {
            if (!is_string($tag)) {
                throw new RuntimeException('MISE Docs Prompt tag is invalid.');
            }
            $tags[] = $tag;
        }

        return new PromptRecord(
            $value['id'],
            $value['title'],
            $value['sourceSummary'],
            $value['status'],
            $value['version'],
            $tags,
            $value['route'],
            $value['copyText'],
            $value['lastVerified'],
        );
    }
}
