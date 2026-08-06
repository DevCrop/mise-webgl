<?php

declare(strict_types=1);

namespace Mise\Php;

use InvalidArgumentException;

final class UrlPolicy
{
    /** @var list<string> */
    private const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

    public function validate(string $url): string
    {
        if ($url === '' || preg_match('/[\x00-\x1F\x7F]/', $url) === 1) {
            throw new InvalidArgumentException('MISE URL is invalid.');
        }
        if (str_starts_with($url, '//')) {
            throw new InvalidArgumentException('MISE protocol-relative URL is forbidden.');
        }

        $scheme = parse_url($url, PHP_URL_SCHEME);
        if ($scheme === null) {
            return $url;
        }
        if ($scheme === false || !in_array(strtolower($scheme), self::ALLOWED_SCHEMES, true)) {
            throw new InvalidArgumentException('MISE URL scheme is forbidden.');
        }

        return $url;
    }
}
