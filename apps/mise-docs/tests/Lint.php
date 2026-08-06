<?php

declare(strict_types=1);

$appRoot = dirname(__DIR__);
$failures = [];
$templateContextMarkers = [
    '@var \\Mise\\Php\\Props $props',
    '@var array<string, \\Mise\\Php\\Slot> $slots',
    '@var \\Mise\\Php\\Escaper $escape',
    '@var \\Mise\\Php\\UrlPolicy $url',
    '$renderComponent',
    '$renderSlot',
];
foreach (['resources/php', 'public', 'tests'] as $directory) {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($appRoot . '/' . $directory),
    );
    foreach ($iterator as $file) {
        if (!$file->isFile() || $file->getExtension() !== 'php') {
            continue;
        }
        $command = escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($file->getPathname());
        exec($command, $output, $exitCode);
        if ($exitCode !== 0) {
            $failures[] = $file->getPathname();
        }

        if (str_contains($file->getPathname(), 'templates' . DIRECTORY_SEPARATOR . 'components')) {
            $source = file_get_contents($file->getPathname());
            foreach ($templateContextMarkers as $marker) {
                if (!is_string($source) || !str_contains($source, $marker)) {
                    $failures[] = $file->getPathname() . ' missing template context ' . $marker;
                }
            }
        }
        $output = [];
    }
}

if ($failures !== []) {
    fwrite(STDERR, 'DOCS PHP LINT FAIL: ' . implode(', ', $failures) . PHP_EOL);
    exit(1);
}

echo "MISE DOCS PHP LINT PASS\n";
