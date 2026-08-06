<?php

declare(strict_types=1);

$requestPath = parse_url(is_string($_SERVER['REQUEST_URI'] ?? null) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
$publicRoot = realpath(__DIR__);
$staticFile = is_string($requestPath) ? realpath(__DIR__ . $requestPath) : false;
if (
    is_string($publicRoot)
    && is_string($staticFile)
    && is_file($staticFile)
    && str_starts_with($staticFile, $publicRoot . DIRECTORY_SEPARATOR)
) {
    return false;
}

require_once dirname(__DIR__) . '/app/bootstrap.php';

$requestUri = is_string($_SERVER['REQUEST_URI'] ?? null)
    ? $_SERVER['REQUEST_URI']
    : '/';
$application = createMiseDocsApplication();
$response = $application->handle($requestUri);

http_response_code($response->status);
header('Content-Type: text/html; charset=UTF-8');
echo $response->body;
