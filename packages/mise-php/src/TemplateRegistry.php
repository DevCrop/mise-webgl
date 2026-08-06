<?php

declare(strict_types=1);

namespace Mise\Php;

use InvalidArgumentException;
use RuntimeException;

final class TemplateRegistry
{
    private const COMPONENT_NAME = '/^[A-Z][A-Za-z0-9]*$/D';

    private readonly string $root;

    /** @param array<string, string> $templates */
    public function __construct(string $root, private readonly array $templates)
    {
        $resolved = realpath($root);
        if ($resolved === false) {
            throw new InvalidArgumentException('MISE template root is invalid.');
        }
        $this->root = $resolved;
    }

    public function resolve(string $component): string
    {
        if (preg_match(self::COMPONENT_NAME, $component) !== 1) {
            throw new InvalidArgumentException('MISE Component name is invalid.');
        }
        $relativePath = $this->templates[$component] ?? null;
        if (!is_string($relativePath) || pathinfo($relativePath, PATHINFO_EXTENSION) !== 'php') {
            throw new InvalidArgumentException('MISE Component template is not registered.');
        }

        $resolved = realpath($this->root . DIRECTORY_SEPARATOR . $relativePath);
        if ($resolved === false || !is_file($resolved) || !$this->contains($resolved)) {
            throw new RuntimeException('MISE Component template path is invalid.');
        }

        return $resolved;
    }

    private function contains(string $path): bool
    {
        return $path === $this->root
            || str_starts_with($path, $this->root . DIRECTORY_SEPARATOR);
    }
}
