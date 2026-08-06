<?php

declare(strict_types=1);

namespace Mise\Php;

use InvalidArgumentException;

final class Props
{
    /** @param array<string, mixed> $values */
    public function __construct(private readonly array $values = [])
    {
    }

    /** @return array<string, mixed> */
    public function all(): array
    {
        return $this->values;
    }

    public function has(string $name): bool
    {
        return array_key_exists($name, $this->values);
    }

    public function value(string $name): mixed
    {
        return $this->values[$name] ?? null;
    }

    public function string(string $name): string
    {
        $value = $this->value($name);
        if (!is_string($value)) {
            throw new InvalidArgumentException('MISE Component string Prop is invalid.');
        }

        return $value;
    }

    public function boolean(string $name, bool $default = false): bool
    {
        if (!$this->has($name)) {
            return $default;
        }
        $value = $this->value($name);
        if (!is_bool($value)) {
            throw new InvalidArgumentException('MISE Component boolean Prop is invalid.');
        }

        return $value;
    }
}
